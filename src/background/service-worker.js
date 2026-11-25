const extApi = typeof browser !== 'undefined' ? browser : chrome;

const cleanUrl = (raw) => String(raw).replace(/\s+/g, '');

const BUILDER_PAGE_PATH = 'src/builder/builder.html';
const OZON_HOME_URL = cleanUrl('https: / / www.ozon.ru /');
const OZON_CART_URL = cleanUrl('https: / / www.ozon.ru / cart');
const OZON_API_BASE = cleanUrl('https: / / www.ozon.ru / api / entrypoint-api.bx / page / json / v2');
const OZON_ADD_TO_CART_API = cleanUrl('https: / / www.ozon.ru / api / composer-api.bx / _action / addToCart');

async function openOrFocusBuilderTab() {
  const builderUrl = extApi.runtime.getURL(BUILDER_PAGE_PATH);
  const existingTabs = await extApi.tabs.query({ url: builderUrl });
  const targetTab = existingTabs.at(0);

  if (targetTab && typeof targetTab.id === 'number') {
    await extApi.tabs.update(targetTab.id, { active: true });
    if (typeof targetTab.windowId === 'number') {
      await extApi.windows.update(targetTab.windowId, { focused: true });
    }
    return targetTab;
  }

  return extApi.tabs.create({ url: builderUrl });
}

extApi.action.onClicked.addListener(() => {
  openOrFocusBuilderTab().catch((err) => {
    console.error('[Ozon PC Configurator] Ошибка открытия вкладки:', err);
  });
});

async function getOrCreateOzonTab(keepOpen = false) {
  const ozonTabs = await extApi.tabs.query({ url: '*://*.ozon.ru/*' });
  const existing = ozonTabs.at(0);
  if (existing && typeof existing.id === 'number') {
    return { tab: existing, createdTempTab: false };
  }
  const created = await extApi.tabs.create({ url: OZON_HOME_URL, active: false });
  await new Promise((resolve) => setTimeout(resolve, 3500));
  return { tab: created, createdTempTab: !keepOpen };
}

async function fetchViaOzonTabContext(fullUrl) {
  const { tab, createdTempTab } = await getOrCreateOzonTab(false);

  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (apiUrl) => {
        const res = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'x-o3-app-name': 'dweb_client',
            'x-o3-app-version': 'release_1-1-2026_1'
          }
        });
        if (!res.ok) return { ok: false, status: res.status };
        const json = await res.json();
        return { ok: true, data: json };
      },
      args: [fullUrl]
    });

    const payload = results?.at(0)?.result;
    if (!payload || !payload.ok) {
      throw new Error(`HTTP ${payload?.status || 403} даже через вкладку Ozon`);
    }
    return payload.data;
  } finally {
    if (createdTempTab && typeof tab?.id === 'number') {
      extApi.tabs.remove(tab.id).catch(() => {});
    }
  }
}
async function handleAddItemsToOzonCart(items) {
  const payloadItems = (items || [])
    .map((item) => ({
      id: Number.parseInt(String(item.id || '').replace(/[^\d]/g, ''), 10),
      quantity: Math.max(1, Number(item.quantity) || 1)
    }))
    .filter((entry) => Number.isFinite(entry.id) && entry.id > 0);

  if (payloadItems.length === 0) {
    throw new Error('В сборке нет товаров с валидным артикулом Ozon');
  }

  const { tab } = await getOrCreateOzonTab(true);
  const results = await extApi.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (cartApiUrl, cartItems) => {
      const res = await fetch(cartApiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-o3-app-name': 'dweb_client',
          'x-o3-app-version': 'release_1-1-2026_1'
        },
        body: JSON.stringify(cartItems)
      });
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true };
    },
    args: [OZON_ADD_TO_CART_API, payloadItems]
  });

  const execRes = results?.at(0)?.result;
  if (!execRes || !execRes.ok) {
    throw new Error(`Не удалось добавить в корзину Ozon (HTTP ${execRes?.status || 'Error'})`);
  }

  await extApi.tabs.update(tab.id, { url: OZON_CART_URL, active: true });
  if (typeof tab.windowId === 'number') {
    await extApi.windows.update(tab.windowId, { focused: true });
  }
  return { addedCount: payloadItems.length };
}

async function handleOzonApiFetch(relativeUrl) {
  const normalizedPath = String(relativeUrl || '').startsWith('/')
    ? relativeUrl
    : `/${relativeUrl || ''}`;
  const fullUrl = `${OZON_API_BASE}?url=${encodeURIComponent(normalizedPath)}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'x-o3-app-name': 'dweb_client',
        'x-o3-app-version': 'release_1-1-2026_1'
      }
    });

    if (response.ok) return response.json();
    if (response.status !== 403) {
      throw new Error(`HTTP ${response.status} при запросе к Ozon API`);
    }
  } catch (err) {
    if (!String(err.message).includes('403')) throw err;
  }

  return fetchViaOzonTabContext(fullUrl);
}

extApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'OPEN_BUILDER_TAB') {
    openOrFocusBuilderTab()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'FETCH_OZON_PAGE_JSON') {
    handleOzonApiFetch(message.relativeUrl)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'ADD_ITEMS_TO_OZON_CART') {
    handleAddItemsToOzonCart(message.items)
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
