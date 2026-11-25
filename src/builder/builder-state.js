import { FALLBACK_SVG_DATA_URI } from '../shared/ozon-api.js';
import { extractComponentSpecs } from '../shared/compatibility.js';

export const extApi = typeof browser !== 'undefined' ? browser : chrome;

export const state = {
  buildName: 'Моя сборка ПК',
  selected: {},
  activeCategoryId: null,
  rawProducts: [],
  loadedPages: 0,
  activeFacets: {},
  savedBuilds: [],
  expandedSpecs: new Set()
};

export const dom = {
  buildNameInput: document.getElementById('build-name-input'),
  savedBuildsCount: document.getElementById('saved-builds-count'),
  requiredSlotsList: document.getElementById('required-slots-list'),
  optionalSlotsList: document.getElementById('optional-slots-list'),
  requiredProgressBadge: document.getElementById('required-progress-badge'),
  optionalProgressBadge: document.getElementById('optional-progress-badge'),
  compatStatusBox: document.getElementById('compat-status-box'),
  compatTitle: document.getElementById('compat-title'),
  compatIssuesList: document.getElementById('compat-issues-list'),
  metricTdp: document.getElementById('metric-tdp'),
  metricPsuRec: document.getElementById('metric-psu-rec'),
  totalPriceCard: document.getElementById('total-price-card'),
  totalPriceRegular: document.getElementById('total-price-regular'),
  btnAddAllCart: document.getElementById('btn-add-all-cart'),
  btnOpenAllOzon: document.getElementById('btn-open-all-ozon'),
  pickerModal: document.getElementById('picker-modal'),
  pickerModalTitle: document.getElementById('picker-modal-title'),
  pickerCountBadge: document.getElementById('picker-count-badge'),
  filterCompatibleOnly: document.getElementById('filter-compatible-only'),
  filterHighRating: document.getElementById('filter-high-rating'),
  filterPriceMin: document.getElementById('filter-price-min'),
  filterPriceMax: document.getElementById('filter-price-max'),
  dynamicSpecFilters: document.getElementById('dynamic-spec-filters'),
  pickerSearchForm: document.getElementById('picker-search-form'),
  pickerSearchInput: document.getElementById('picker-search-input'),
  pickerSortSelect: document.getElementById('picker-sort-select'),
  pickerActiveChips: document.getElementById('picker-active-chips'),
  pickerStatusBar: document.getElementById('picker-status-bar'),
  pickerProductsList: document.getElementById('picker-products-list'),
  savedModal: document.getElementById('saved-modal'),
  savedBuildsList: document.getElementById('saved-builds-list'),
  toastContainer: document.getElementById('toast-container')
};

export const formatRub = (num) => `${Math.round(Number(num) || 0).toLocaleString('ru-RU')} ₽`;

export function attachSafeImage(imgEl, src, altText) {
  imgEl.src = src || FALLBACK_SVG_DATA_URI;
  imgEl.alt = altText || '';
  imgEl.addEventListener('error', () => {
    if (imgEl.src !== FALLBACK_SVG_DATA_URI) {
      imgEl.src = FALLBACK_SVG_DATA_URI;
    }
  }, { once: true });
}

export function showToast(text) {
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = text;
  dom.toastContainer.appendChild(item);
  setTimeout(() => item.remove(), 3000);
}

export function normalizeSelectedSpecs(selectedMap) {
  const result = {};
  for (const [catId, items] of Object.entries(selectedMap || {})) {
    if (!Array.isArray(items)) continue;
    result[catId] = items.map((item) => ({
      ...item,
      quantity: Math.max(1, Number(item.quantity) || 1),
      specs: extractComponentSpecs(item, catId)
    }));
  }
  return result;
}
