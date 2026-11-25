(() => {
  const extApi = typeof browser !== 'undefined' ? browser : chrome;
  const CURRENT_BUILD_KEY = 'ozon_pc_current_build_v1';
  const cleanUrl = (raw) => String(raw).replace(/\s+/g, '');
  const FALLBACK_IMG = cleanUrl('https: / / ir.ozone.ru / s3 / multimedia-1-z / wc250 / 7000000000.jpg');

  if (document.getElementById('ozon-pc-builder-fab')) return;

  function detectCategoryFromBreadcrumbsAndTitle(breadcrumbsText, title) {
    const source = `${breadcrumbsText} ${title}`.toLowerCase();
    if (/материнск|motherboard|\bb450\b|\bb550\b|\bb650\b|\bx670\b|\bb760\b|\bz790\b|\bh610\b/i.test(source)) return 'motherboard';
    if (/процессор|ryzen\s*\d|core\s*i\d|core\s*ultra/i.test(source) && !/кулер|охлажд/i.test(source)) return 'cpu';
    if (/видеокарт|geforce|radeon|\brtx\b|\bgtx\b|\brx\s*\d{4}/i.test(source)) return 'gpu';
    if (/оперативн|модуль\s*памяти|\bddr4\b|\bddr5\b/i.test(source) && !/ssd|накопител|видеокарт/i.test(source)) return 'ram';
    if (/кулер|сжо|водян.*охлажд|охлаждение\s*процессор/i.test(source)) return 'cooler';
    if (/\bssd\b|nvme|жесткий\s*диск|\bhdd\b|накопител/i.test(source)) return 'storage';
    if (/блок\s*питания|80\s*plus/i.test(source)) return 'psu';
    if (/корпус\s*(для\s*пк|компьютер|игров|atx|matx|midi)/i.test(source) || /корпуса\b/i.test(breadcrumbsText)) return 'case';
    if (/вентилятор|термопаст/i.test(source)) return 'case_fans';
    if (/звуков.*карт/i.test(source)) return 'sound_card';
    if (/монитор/i.test(source)) return 'monitor';
    if (/клавиатур/i.test(source)) return 'keyboard';
    if (/мыш[ьиь]/i.test(source)) return 'mouse';
    if (/наушник|гарнитур|колонк|акустик/i.test(source)) return 'audio';
    if (/windows|лиценз.*по|операционн.*систем/i.test(source)) return 'software';
    return 'case_fans';
  }

  function extractFullCharacteristicsFromDom() {
    const pairs = [];
    const seen = new Set();

    const dlList = document.querySelectorAll('#section-characteristics dl, [data-widget="webCharacteristics"] dl');
    for (const dl of dlList) {
      const name = dl.querySelector('dt')?.textContent?.trim();
      const value = dl.querySelector('dd')?.textContent?.trim();
      if (name && value && !seen.has(name) && name.length < 70 && value.length < 140) {
        seen.add(name);
        pairs.push({ name, value });
      }
    }

    if (pairs.length === 0) {
      const shortWidget = document.querySelector('[data-widget="webShortCharacteristics"]');
      const rows = shortWidget ? shortWidget.querySelectorAll('dl, div > div') : [];
      for (const row of rows) {
        const spans = row.querySelectorAll('span, a, dd, dt');
        if (spans.length >= 2) {
          const name = spans.item(0)?.textContent?.trim();
          const value = spans.item(spans.length - 1)?.textContent?.trim();
          if (name && value && name !== value && !seen.has(name) && name.length < 60 && value.length < 100) {
            seen.add(name);
            pairs.push({ name, value });
          }
        }
      }
    }
    return pairs;
  }

  function extractRatingAndReviewsFromDom() {
    const scoreEl = document.querySelector('[data-widget="webSingleProductScore"]');
    const text = (scoreEl?.textContent || '').replace(/\u00A0/g, ' ').trim();
    const match = text.match(/([1-4]\.\d|5\.0)[\s•·]*([\d\s]+)\s*отзыв/i);
    if (!match) return { rating: 0, reviewsCount: 0 };
    return {
      rating: Number.parseFloat(match.at(1)),
      reviewsCount: Number.parseInt(match.at(2).replace(/[^\d]/g, ''), 10) || 0
    };
  }
  function parsePagePrices() {
    const bodyText = document.body?.innerText || '';
    const matches = bodyText.match(/[\d\s\u00A0]{3,10}\s*₽(?!\s*\/\s*мес)/g) || [];
    const values = matches
      .map((m) => Number.parseInt(m.replace(/[^\d]/g, ''), 10))
      .filter((v) => Number.isFinite(v) && v >= 100 && v <= 5000000);
    const unique = [...new Set(values)].sort((a, b) => a - b);
    const priceCard = unique.at(0) || 0;
    const priceRegular = unique.at(1) || priceCard;
    return { priceCard, priceRegular };
  }

  function collectProductFromPage() {
    const h1 = document.querySelector('h1');
    const title = (h1?.textContent || document.title || 'Товар Ozon').trim();
    const cleanPageUrl = window.location.href.split('?').at(0);
    const skuMatch = cleanPageUrl.match(/-(\d+)\/?$/);
    const id = skuMatch ? skuMatch.at(1) : `ozon-${Date.now()}`;

    const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const mainImg = document.querySelector('img[src*="ozone.ru"]')?.getAttribute('src');
    const image = ogImg || mainImg || FALLBACK_IMG;

    const breadcrumbsEl = document.querySelector('[data-widget="breadCrumbs"]');
    const breadcrumbsText = breadcrumbsEl?.textContent?.trim() || '';
    const fullSpecs = extractFullCharacteristicsFromDom();
    const specsSummary = fullSpecs.map((p) => `${p.name}: ${p.value}`).join(' | ');
    const { rating, reviewsCount } = extractRatingAndReviewsFromDom();
    const { priceCard, priceRegular } = parsePagePrices();

    return {
      categoryId: detectCategoryFromBreadcrumbsAndTitle(breadcrumbsText, title),
      product: {
        id,
        title,
        url: cleanPageUrl,
        image,
        priceCard,
        priceRegular,
        rating,
        reviewsCount,
        delivery: 'Со страницы товара Ozon',
        fullSpecs,
        rawSpecsText: `${title} | ${specsSummary}`
      }
    };
  }

  const MULTIPLE_SLOTS = new Set(['ram', 'storage', 'case_fans', 'monitor', 'audio', 'software']);

  async function addCurrentProductToBuild(btn) {
    const { categoryId, product } = collectProductFromPage();

    const res = await extApi.storage.local.get(CURRENT_BUILD_KEY);
    const current = res[CURRENT_BUILD_KEY] || { buildName: 'Моя сборка ПК', selected: {} };
    const selected = current.selected || {};
    const existing = selected[categoryId] || [];

    selected[categoryId] = MULTIPLE_SLOTS.has(categoryId) ? [...existing, product] : [product];

    await extApi.storage.local.set({
      [CURRENT_BUILD_KEY]: {
        buildName: current.buildName || 'Моя сборка ПК',
        selected,
        updatedAt: Date.now()
      }
    });

    btn.textContent = '✓ Добавлено! Открыть сборку';
    btn.style.background = '#009951';
    btn.dataset.added = '1';
  }

  function injectFloatingButton() {
    const fab = document.createElement('button');
    fab.id = 'ozon-pc-builder-fab';
    fab.type = 'button';
    fab.textContent = '+ В конфигуратор ПК';

    Object.assign(fab.style, {
      position: 'fixed',
      right: '22px',
      bottom: '22px',
      zIndex: '99999',
      background: '#005bff',
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 18px',
      fontSize: '14px',
      fontWeight: '700',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 6px 20px rgba(0, 91, 255, 0.35)',
      cursor: 'pointer'
    });

    fab.addEventListener('click', () => {
      if (fab.dataset.added === '1') {
        extApi.runtime.sendMessage({ type: 'OPEN_BUILDER_TAB' });
        return;
      }
      addCurrentProductToBuild(fab).catch((err) => {
        console.error('[Ozon PC Configurator] Ошибка добавления товара:', err);
      });
    });

    document.body.appendChild(fab);
  }

  injectFloatingButton();
})();
