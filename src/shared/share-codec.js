const PREFIX = 'OZPC1:';

function utf8ToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes.set([binary.charCodeAt(i)], i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeBuildCode({ buildName, selected }) {
  const compactSlots = {};
  for (const [catId, items] of Object.entries(selected || {})) {
    if (!Array.isArray(items) || items.length === 0) continue;
    compactSlots[catId] = items.map((item) => ({
      id: item.id,
      t: item.title,
      u: item.url,
      i: item.image,
      pc: item.priceCard,
      pr: item.priceRegular,
      q: Math.max(1, Number(item.quantity) || 1)
    }));
  }

  const payload = { v: 1, n: String(buildName || 'Моя сборка ПК').trim(), s: compactSlots };
  return `${PREFIX}${utf8ToBase64Url(JSON.stringify(payload))}`;
}

export function decodeBuildCode(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) throw new Error('Вставьте код сборки или JSON');

  let parsed;
  if (trimmed.startsWith('{')) {
    parsed = JSON.parse(trimmed);
  } else {
    const token = trimmed.includes(PREFIX)
      ? trimmed.slice(trimmed.indexOf(PREFIX) + PREFIX.length).split(/\s+/).at(0)
      : trimmed;
    parsed = JSON.parse(base64UrlToUtf8(token));
  }

  const sourceSlots = parsed?.s || parsed?.selected;
  if (!sourceSlots || typeof sourceSlots !== 'object') {
    throw new Error('Некорректный формат кода сборки');
  }

  const restored = {};
  for (const [catId, items] of Object.entries(sourceSlots)) {
    if (!Array.isArray(items)) continue;
    restored[catId] = items.map((item) => ({
      id: item.id,
      title: item.t || item.title || 'Товар Ozon',
      url: item.u || item.url || '',
      image: item.i || item.image || '',
      priceCard: Number(item.pc ?? item.priceCard) || 0,
      priceRegular: Number(item.pr ?? item.priceRegular ?? item.pc ?? item.priceCard) || 0,
      quantity: Math.max(1, Number(item.q ?? item.quantity) || 1),
      delivery: 'Импортировано из сборки',
      rawSpecsText: item.t || item.title || ''
    }));
  }

  return {
    buildName: String(parsed?.n || parsed?.buildName || 'Импортированная сборка').trim(),
    selected: restored
  };
}
