import { cleanUrl } from './constants.js';

const extApi = typeof browser !== 'undefined' ? browser : chrome;
const OZON_SITE_BASE = cleanUrl('https: / / www.ozon.ru');

export const FALLBACK_SVG_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg viewBox="0 0 80 80" width="80" height="80"><rect width="80" height="80" rx="10" fill="#f2f4f7"/><rect x="22" y="22" width="36" height="36" rx="6" fill="none" stroke="#9aa8b6" stroke-width="3"/><circle cx="40" cy="40" r="7" fill="#9aa8b6"/></svg>'
  );

function parsePriceNumber(rawText) {
  if (!rawText) return 0;
  const text = String(rawText).toLowerCase();
  if (text.includes('/мес') || text.includes('в месяц') || text.includes('долям')) {
    return 0;
  }
  const digits = text.replace(/[^\d]/g, '');
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function collectTextTokens(node, bucket = []) {
  if (!node) return bucket;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    if (trimmed) bucket.push(trimmed);
    return bucket;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectTextTokens(item, bucket);
    }
    return bucket;
  }
  if (typeof node === 'object') {
    if (typeof node.text === 'string') bucket.push(node.text.trim());
    if (typeof node.title === 'string') bucket.push(node.title.trim());
    for (const [key, val] of Object.entries(node)) {
      if (key === 'text' || key === 'title') continue;
      if (val && typeof val === 'object') {
        collectTextTokens(val, bucket);
      }
    }
  }
  return bucket;
}

function extractPricesFromTile(tile) {
  const tokens = collectTextTokens(tile.mainState || tile);
  const priceCandidates = [];

  for (const token of tokens) {
    if (token.includes('₽') || token.includes('руб')) {
      const val = parsePriceNumber(token);
      if (val >= 50 && val <= 5000000) {
        priceCandidates.push(val);
      }
    }
  }

  const uniqueSorted = [...new Set(priceCandidates)].sort((a, b) => a - b);
  const priceCard = uniqueSorted.at(0) || 0;
  const priceRegular = uniqueSorted.at(1) || priceCard;
  return { priceCard, priceRegular };
}
function extractRatingAndReviews(tile) {
  const rawBlob = JSON.stringify(tile.mainState || tile).replace(/\\u00a0/gi, ' ');
  let rating = 0;
  let reviewsCount = 0;

  const titleRatingMatch = rawBlob.match(/"(?:title|text)"\s*:\s*"\s*([3-4]\.\d|5\.0)\s*(?:[•·★*]|\s*")/);
  if (titleRatingMatch) {
    rating = Number.parseFloat(titleRatingMatch.at(1));
  }

  const reviewsMatch = rawBlob.match(/([\d\s]{1,10})\s*отзыв(?:а|ов)?/i);
  if (reviewsMatch) {
    reviewsCount = Number.parseInt(reviewsMatch.at(1).replace(/[^\d]/g, ''), 10) || 0;
  }

  return { rating, reviewsCount };
}

function extractImageUrl(tile) {
  const candidates = [];

  function walkImages(node) {
    if (!node) return;
    if (typeof node === 'string') {
      if (/ozone\.ru\/s3\/|cdn\d*\.ozone\.ru/i.test(node) || /\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(node)) {
        candidates.push(node);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walkImages(item);
      return;
    }
    if (typeof node === 'object') {
      for (const val of Object.values(node)) {
        if (val) walkImages(val);
      }
    }
  }

  walkImages(tile.tileImage || tile.rightState || tile);
  const rawImg = candidates.find((u) => u.startsWith('http')) || '';
  if (!rawImg) return FALLBACK_SVG_DATA_URI;
  return rawImg.replace('/wc50/', '/wc250/').replace('/wc100/', '/wc250/');
}

function extractTitleAndUrl(tile) {
  const actionLink = tile.action?.link || '';
  const cleanPath = actionLink.split('?').at(0) || '';
  const url = cleanPath.startsWith('http')
    ? cleanPath
    : cleanPath
      ? `${OZON_SITE_BASE}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`
      : '';

  const tokens = collectTextTokens(tile.mainState || tile);
  const title = tokens
    .filter((t) => t.length >= 12 && !t.includes('₽') && !/отзыв/i.test(t) && !/завтра|послезавтра|достав/i.test(t))
    .sort((a, b) => b.length - a.length)
    .at(0) || 'Товар Ozon';

  return { title, url };
}

function extractDelivery(tile) {
  const tokens = collectTextTokens(tile.multiButton || tile.mainState || tile);
  return tokens.find((t) => /завтра|послезавтра|доставит|курьер|пункт|январ|феврал|март|апрел|мая|июн|июл|август|сентябр|октябр|ноябр|декабр/i.test(t)) || 'Уточнить на Ozon';
}
function parseTileItem(tile, index) {
  if (!tile || typeof tile !== 'object') return null;
  const { title, url } = extractTitleAndUrl(tile);
  if (!url || !url.includes('/product/')) return null;

  const { priceCard, priceRegular } = extractPricesFromTile(tile);
  if (priceCard <= 0) return null;

  const { rating, reviewsCount } = extractRatingAndReviews(tile);
  const skuMatch = url.match(/-(\d+)\/?$/);
  const id = skuMatch ? skuMatch.at(1) : `ozon-${index}-${priceCard}`;

  return {
    id, title, url, image: extractImageUrl(tile),
    priceCard, priceRegular, rating, reviewsCount,
    delivery: extractDelivery(tile),
    rawSpecsText: collectTextTokens(tile.mainState || tile).join(' | ')
  };
}

function collectTilesFromWidgets(widgetStates) {
  const items = [];
  if (!widgetStates || typeof widgetStates !== 'object') return items;

  for (const [widgetKey, rawJson] of Object.entries(widgetStates)) {
    if (!/searchResults|tileGrid|catalog/i.test(widgetKey)) continue;
    let parsed = rawJson;
    if (typeof rawJson === 'string') {
      try { parsed = JSON.parse(rawJson); } catch { continue; }
    }
    const rawItems = parsed?.items || parsed?.tiles || [];
    if (!Array.isArray(rawItems)) continue;
    rawItems.forEach((tile, idx) => {
      const product = parseTileItem(tile, idx);
      if (product) items.push(product);
    });
  }
  return items;
}

async function fetchSearchPage({ query, sort, priceMin, priceMax, page = 1 }) {
  const params = new URLSearchParams();
  params.set('text', String(query || '').trim());
  params.set('from_global', 'true');
  if (page > 1) params.set('page', String(page));
  if (sort && sort !== 'score') params.set('sorting', sort);
  if (Number(priceMin) > 0 || Number(priceMax) > 0) {
    params.set('currency_price', `${Number(priceMin) || 0}.000;${Number(priceMax) || 9999999}.000`);
  }
  const response = await extApi.runtime.sendMessage({
    type: 'FETCH_OZON_PAGE_JSON',
    relativeUrl: `/search/?${params.toString()}`
  });
  if (!response || !response.ok) throw new Error(response?.error || 'Не удалось получить ответ от Ozon');
  return collectTilesFromWidgets(response.data?.widgetStates);
}

export async function searchOzonProducts({ startPage = 1, pageCount = 6, onProgress, ...options }) {
  const uniqueMap = new Map();
  const endPage = startPage + pageCount - 1;
  for (let page = startPage; page <= endPage; page += 1) {
    if (typeof onProgress === 'function') {
      onProgress({ page: page - startPage + 1, totalPages: pageCount, count: uniqueMap.size });
    }
    try {
      const pageItems = await fetchSearchPage({ ...options, page });
      if (pageItems.length === 0) break;
      for (const item of pageItems) {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      }
    } catch (err) {
      if (page === startPage) throw err;
      break;
    }
  }
  return [...uniqueMap.values()];
}

export async function fetchProductFullCharacteristics(productUrl) {
  const path = String(productUrl || '').replace(/^https?:\/\/[^/]+/i, '').split('?').at(0);
  if (!path) return [];
  const featuresPath = `${path.replace(/\/$/, '')}/features/`;
  const response = await extApi.runtime.sendMessage({
    type: 'FETCH_OZON_PAGE_JSON',
    relativeUrl: featuresPath
  });
  if (!response || !response.ok) return [];

  const pairs = [];
  const seen = new Set();
  for (const [key, rawVal] of Object.entries(response.data?.widgetStates || {})) {
    if (!/characteristics/i.test(key)) continue;
    let parsed = rawVal;
    if (typeof rawVal === 'string') {
      try { parsed = JSON.parse(rawVal); } catch { continue; }
    }
    const groups = parsed?.characteristics || parsed?.groups || [];
    for (const grp of groups) {
      for (const item of (grp.short || grp.items || [])) {
        const name = (item.name || item.key || '').trim();
        const vals = Array.isArray(item.values) ? item.values.map((v) => v.text || v).join(', ') : (item.value || '');
        const value = String(vals).trim();
        if (name && value && !seen.has(name)) {
          seen.add(name);
          pairs.push({ name, value });
        }
      }
    }
  }
  return pairs;
}
