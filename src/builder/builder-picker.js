import { ALL_CATEGORIES } from '../shared/constants.js';
import { searchOzonProducts } from '../shared/ozon-api.js';
import {
  extractComponentSpecs,
  buildCategoryFacetOptions,
  buildSmartSearchQuery,
  isProductCompatibleWithBuild
} from '../shared/compatibility.js';
import { saveCurrentBuild } from '../shared/storage.js';
import { state, dom, formatRub, attachSafeImage, showToast } from './builder-state.js';
import { renderAllSlots } from './builder-slots.js';

function sortProductsList(items, sortId) {
  const copy = [...items];
  if (sortId === 'price_asc') return copy.sort((a, b) => a.priceCard - b.priceCard);
  if (sortId === 'price_desc') return copy.sort((a, b) => b.priceCard - a.priceCard);
  if (sortId === 'rating') return copy.sort((a, b) => (b.rating - a.rating) || (b.reviewsCount - a.reviewsCount));
  if (sortId === 'reviews') return copy.sort((a, b) => (b.reviewsCount - a.reviewsCount) || (b.rating - a.rating));
  return copy;
}

export function renderFacetSidebar() {
  const groups = buildCategoryFacetOptions(state.rawProducts, state.activeCategoryId);
  const nodes = groups.map((group) => {
    const box = document.createElement('div');
    box.className = 'facet-group';
    const title = document.createElement('span');
    title.className = 'filter-group-title';
    title.textContent = group.title;
    box.appendChild(title);

    for (const opt of group.options) {
      const label = document.createElement('label');
      label.className = 'toggle-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = Boolean(state.activeFacets[group.key]?.has(opt));
      cb.addEventListener('change', () => {
        if (!state.activeFacets[group.key]) state.activeFacets[group.key] = new Set();
        if (cb.checked) state.activeFacets[group.key].add(opt);
        else state.activeFacets[group.key].delete(opt);
        renderPickerProducts();
      });
      const span = document.createElement('span');
      span.textContent = opt;
      label.append(cb, span);
      box.appendChild(label);
    }
    return box;
  });
  dom.dynamicSpecFilters.replaceChildren(...nodes);
}

function renderActiveFilterChips() {
  const chips = [];
  const addChip = (label, onRemove) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip';
    btn.textContent = `${label} ✕`;
    btn.addEventListener('click', onRemove);
    chips.push(btn);
  };

  if (dom.filterCompatibleOnly.checked) {
    addChip('Только совместимые', () => { dom.filterCompatibleOnly.checked = false; renderPickerProducts(); });
  }
  if (dom.filterHighRating.checked) {
    addChip('Рейтинг 4.5+', () => { dom.filterHighRating.checked = false; renderPickerProducts(); });
  }
  for (const [key, set] of Object.entries(state.activeFacets)) {
    for (const val of set) {
      addChip(val, () => { state.activeFacets[key].delete(val); renderFacetSidebar(); renderPickerProducts(); });
    }
  }
  dom.pickerActiveChips.replaceChildren(...chips);
}
function matchesActiveFacets(product) {
  for (const [key, allowedSet] of Object.entries(state.activeFacets)) {
    if (!allowedSet || allowedSet.size === 0) continue;
    if (key === 'socket') {
      const sockets = product.specs?.sockets || [];
      if (!sockets.some((s) => allowedSet.has(s))) return false;
    } else if (!allowedSet.has(product.specs?.[key])) {
      return false;
    }
  }
  return true;
}

async function selectComponentForSlot(categoryId, product) {
  const category = ALL_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return;

  const existing = state.selected[categoryId] || [];
  state.selected[categoryId] = category.multiple ? [...existing, product] : [product];
  await saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
  renderAllSlots(openPickerModal);
  closePickerModal();
  showToast(`Добавлено: ${product.title.slice(0, 42)}...`);
}

function createPickerProductRow(product) {
  const isCompat = isProductCompatibleWithBuild(product, state.activeCategoryId, state.selected);
  const row = document.createElement('div');
  row.className = 'product-row';

  const img = document.createElement('img');
  img.className = 'product-thumb';
  attachSafeImage(img, product.image, product.title);

  const mid = document.createElement('div');
  const titleLink = document.createElement('a');
  titleLink.className = 'product-title-link';
  titleLink.href = product.url;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.textContent = product.title;
  mid.appendChild(titleLink);

  if (!isCompat) {
    const warnTag = document.createElement('div');
    warnTag.className = 'incompat-badge';
    warnTag.textContent = 'Несовместимо с текущей сборкой';
    mid.appendChild(warnTag);
  }

  const meta = document.createElement('div');
  meta.className = 'product-meta-row';
  meta.textContent = product.rating > 0 ? `★ ${product.rating} (${product.reviewsCount} отзывов)` : 'Нет оценок';

  const specsList = document.createElement('ul');
  specsList.className = 'product-specs-col';
  const specLines = product.specs?.displayLines?.length ? product.specs.displayLines : [`Артикул Ozon: ${product.id}`];
  for (const line of specLines) {
    const li = document.createElement('li');
    li.textContent = line;
    specsList.appendChild(li);
  }
  mid.append(meta, specsList);

  const right = document.createElement('div');
  right.className = 'product-buy-col';
  const pCard = document.createElement('div');
  pCard.className = 'product-price-card';
  pCard.textContent = formatRub(product.priceCard);
  const pReg = document.createElement('div');
  pReg.className = 'product-price-reg';
  pReg.textContent = `Обычная: ${formatRub(product.priceRegular)}`;
  const deliv = document.createElement('div');
  deliv.className = 'product-delivery';
  deliv.textContent = product.delivery;

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = 'Добавить';
  addBtn.addEventListener('click', () => selectComponentForSlot(state.activeCategoryId, product));

  right.append(pCard, pReg, deliv, addBtn);
  row.append(img, mid, right);
  return row;
}
function renderLoaderProgress({ page, totalPages, count }) {
  const box = document.createElement('div');
  box.className = 'loader-box';

  const text = document.createElement('div');
  text.className = 'loader-text';
  text.textContent = `Загрузка каталога Ozon: страница ${page} из ${totalPages} (найдено ${count} товаров)...`;

  const track = document.createElement('div');
  track.className = 'loader-track';
  const fill = document.createElement('div');
  fill.className = 'loader-fill';
  fill.style.width = `${Math.min(100, Math.round((page / Math.max(1, totalPages)) * 100))}%`;

  track.appendChild(fill);
  box.append(text, track);
  dom.pickerStatusBar.replaceChildren();
  dom.pickerProductsList.replaceChildren(box);
}

export function renderPickerProducts() {
  renderActiveFilterChips();
  const onlyCompat = dom.filterCompatibleOnly.checked;
  const highRating = dom.filterHighRating.checked;
  const minPrice = Number(dom.filterPriceMin.value) || 0;
  const maxPrice = Number(dom.filterPriceMax.value) || 0;

  const filtered = state.rawProducts.filter((item) => {
    const isCompat = isProductCompatibleWithBuild(item, state.activeCategoryId, state.selected);
    if (onlyCompat && !isCompat) return false;
    if (highRating && item.rating < 4.5) return false;
    if (minPrice > 0 && item.priceCard < minPrice) return false;
    if (maxPrice > 0 && item.priceCard > maxPrice) return false;
    return matchesActiveFacets(item);
  });

  const sorted = sortProductsList(filtered, dom.pickerSortSelect.value);
  dom.pickerCountBadge.textContent = `${sorted.length} из ${state.rawProducts.length} товаров`;
  dom.pickerStatusBar.textContent = sorted.length === 0
    ? 'По заданным фильтрам товаров не найдено. Попробуйте снять часть фильтров или нажать «Загрузить ещё».'
    : '';

  const nodes = sorted.map((product) => createPickerProductRow(product));

  if (state.rawProducts.length > 0 && state.loadedPages < 15) {
    const moreWrap = document.createElement('div');
    moreWrap.className = 'load-more-wrap';
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'btn btn-secondary';
    moreBtn.textContent = 'Загрузить ещё товары с Ozon (+3 страницы)';
    moreBtn.addEventListener('click', () => loadMoreOzonPages(moreBtn));
    moreWrap.appendChild(moreBtn);
    nodes.push(moreWrap);
  }

  dom.pickerProductsList.replaceChildren(...nodes);
}

async function loadMoreOzonPages(btn) {
  const category = ALL_CATEGORIES.find((c) => c.id === state.activeCategoryId);
  if (!category) return;
  btn.disabled = true;
  btn.textContent = 'Подгружаем ещё страницы...';

  try {
    const extra = await searchOzonProducts({
      query: dom.pickerSearchInput.value,
      sort: dom.pickerSortSelect.value,
      priceMin: dom.filterPriceMin.value,
      priceMax: dom.filterPriceMax.value,
      startPage: state.loadedPages + 1,
      pageCount: 3
    });
    state.loadedPages += 3;
    const existingIds = new Set(state.rawProducts.map((p) => p.id));
    const enriched = extra
      .filter((item) => !existingIds.has(item.id))
      .map((item) => ({ ...item, specs: extractComponentSpecs(item, category.id) }));
    state.rawProducts = [...state.rawProducts, ...enriched];
    renderFacetSidebar();
    renderPickerProducts();
  } catch (err) {
    showToast(`Ошибка догрузки: ${err.message}`);
    btn.disabled = false;
    btn.textContent = 'Загрузить ещё товары с Ozon (+3 страницы)';
  }
}

export async function runOzonSearch() {
  const category = ALL_CATEGORIES.find((c) => c.id === state.activeCategoryId);
  if (!category) return;

  state.loadedPages = 6;
  renderLoaderProgress({ page: 1, totalPages: 6, count: 0 });

  try {
    const items = await searchOzonProducts({
      query: dom.pickerSearchInput.value,
      sort: dom.pickerSortSelect.value,
      priceMin: dom.filterPriceMin.value,
      priceMax: dom.filterPriceMax.value,
      startPage: 1,
      pageCount: 6,
      onProgress: renderLoaderProgress
    });
    state.rawProducts = items.map((item) => ({
      ...item,
      specs: extractComponentSpecs(item, category.id)
    }));
    renderFacetSidebar();
    renderPickerProducts();
  } catch (err) {
    dom.pickerProductsList.replaceChildren();
    dom.pickerStatusBar.textContent = `Ошибка загрузки: ${err.message}`;
  }
}

export function openPickerModal(categoryId) {
  const category = ALL_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return;
  state.activeCategoryId = categoryId;
  state.activeFacets = {};
  state.rawProducts = [];
  dom.dynamicSpecFilters.replaceChildren();
  dom.pickerCountBadge.textContent = 'Загрузка...';
  dom.pickerModalTitle.textContent = `Выбор: ${category.title}`;
  dom.pickerSearchInput.value = buildSmartSearchQuery(category, state.selected);
  dom.pickerModal.classList.remove('hidden');
  runOzonSearch();
}

export function closePickerModal() {
  dom.pickerModal.classList.add('hidden');
  state.activeCategoryId = null;
}
