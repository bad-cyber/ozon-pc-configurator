import { ALL_CATEGORIES, SORT_OPTIONS, STORAGE_KEYS } from '../shared/constants.js';
import {
  loadCurrentBuild,
  saveCurrentBuild,
  loadSavedBuildsList,
  saveBuildToLibrary,
  deleteBuildFromLibrary
} from '../shared/storage.js';
import { encodeBuildCode, decodeBuildCode } from '../shared/share-codec.js';
import { extApi, state, dom, formatRub, showToast, normalizeSelectedSpecs } from './builder-state.js';
import { renderAllSlots, getAllSelectedItems } from './builder-slots.js';
import {
  openPickerModal,
  closePickerModal,
  runOzonSearch,
  renderPickerProducts,
  renderFacetSidebar
} from './builder-picker.js';
import { renderCompareView } from './builder-compare.js';

function renderSavedBuildsModal() {
  const modalBox = dom.savedModal?.querySelector('.saved-window');
  if (modalBox) modalBox.style.maxWidth = '680px';

  if (state.savedBuilds.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'У вас пока нет сохранённых сборок.';
    dom.savedBuildsList.replaceChildren(empty);
    return;
  }

  const nodes = state.savedBuilds.map((entry) => {
    const row = document.createElement('div');
    row.className = 'saved-build-item';
    const title = document.createElement('strong');
    title.textContent = `${entry.buildName} (${new Date(entry.savedAt).toLocaleDateString('ru-RU')})`;
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '8px';

    const cmpBtn = document.createElement('button');
    cmpBtn.type = 'button';
    cmpBtn.className = 'btn btn-ghost';
    cmpBtn.textContent = 'Сравнить';
    cmpBtn.addEventListener('click', () => {
      if (modalBox) modalBox.style.maxWidth = '1040px';
      renderCompareView(
        dom.savedBuildsList,
        { buildName: state.buildName, selected: state.selected },
        entry,
        renderSavedBuildsModal
      );
    });

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'btn btn-secondary';
    loadBtn.textContent = 'Загрузить';
    loadBtn.addEventListener('click', async () => {
      state.buildName = entry.buildName;
      state.selected = normalizeSelectedSpecs(structuredClone(entry.selected || {}));
      dom.buildNameInput.value = state.buildName;
      await saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
      renderAllSlots(openPickerModal);
      dom.savedModal.classList.add('hidden');
      showToast('Сборка загружена');
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger-ghost';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', async () => {
      state.savedBuilds = await deleteBuildFromLibrary(entry.id);
      dom.savedBuildsCount.textContent = String(state.savedBuilds.length);
      renderSavedBuildsModal();
    });

    btns.append(cmpBtn, loadBtn, delBtn);
    row.append(title, btns);
    return row;
  });

  dom.savedBuildsList.replaceChildren(...nodes);
}
async function applyImportedRawBuild(rawText, shareModal) {
  try {
    const imported = decodeBuildCode(rawText);
    state.buildName = imported.buildName;
    state.selected = normalizeSelectedSpecs(imported.selected);
    dom.buildNameInput.value = state.buildName;
    await saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
    renderAllSlots(openPickerModal);
    shareModal.classList.add('hidden');
    showToast(`Сборка «${state.buildName}» успешно импортирована!`);
  } catch (err) {
    showToast(`Ошибка импорта: ${err.message}`);
  }
}

function bindShareModalEvents() {
  const shareModal = document.getElementById('share-modal');
  const exportArea = document.getElementById('share-export-code');
  const importArea = document.getElementById('share-import-input');

  document.getElementById('btn-share-build')?.addEventListener('click', () => {
    exportArea.value = encodeBuildCode({ buildName: state.buildName, selected: state.selected });
    importArea.value = '';
    shareModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-share')?.addEventListener('click', () => shareModal.classList.add('hidden'));
  shareModal?.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.add('hidden'); });

  document.getElementById('btn-copy-share-code')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(exportArea.value);
    showToast('Код сборки скопирован в буфер обмена');
  });

  document.getElementById('btn-download-build-json')?.addEventListener('click', () => {
    const jsonStr = JSON.stringify({ buildName: state.buildName, selected: state.selected }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.buildName.replace(/[^\wа-яА-ЯёЁ-]+/g, '_') || 'ozon-pc-build'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-apply-import-code')?.addEventListener('click', () => {
    applyImportedRawBuild(importArea.value, shareModal);
  });

  document.getElementById('share-import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.at(0);
    if (!file) return;
    const text = await file.text();
    await applyImportedRawBuild(text, shareModal);
    e.target.value = '';
  });
}

function bindEvents() {
  document.getElementById('btn-close-picker').addEventListener('click', closePickerModal);
  dom.pickerSearchForm.addEventListener('submit', (e) => { e.preventDefault(); runOzonSearch(); });
  dom.pickerSortSelect.addEventListener('change', renderPickerProducts);
  dom.filterCompatibleOnly.addEventListener('change', renderPickerProducts);
  dom.filterHighRating.addEventListener('change', renderPickerProducts);
  dom.filterPriceMin.addEventListener('change', runOzonSearch);
  dom.filterPriceMax.addEventListener('change', runOzonSearch);

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    dom.filterCompatibleOnly.checked = false;
    dom.filterHighRating.checked = false;
    dom.filterPriceMin.value = '';
    dom.filterPriceMax.value = '';
    state.activeFacets = {};
    renderFacetSidebar();
    runOzonSearch();
  });

  dom.buildNameInput.addEventListener('input', () => {
    state.buildName = dom.buildNameInput.value;
    saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
  });

  document.getElementById('btn-save-build').addEventListener('click', async () => {
    state.savedBuilds = await saveBuildToLibrary({ buildName: state.buildName, selected: state.selected });
    dom.savedBuildsCount.textContent = String(state.savedBuilds.length);
    showToast('Сборка сохранена в библиотеку');
  });

  document.getElementById('btn-saved-builds').addEventListener('click', () => {
    renderSavedBuildsModal();
    dom.savedModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-saved').addEventListener('click', () => dom.savedModal.classList.add('hidden'));

  dom.pickerModal.addEventListener('click', (e) => { if (e.target === dom.pickerModal) closePickerModal(); });
  dom.savedModal.addEventListener('click', (e) => { if (e.target === dom.savedModal) dom.savedModal.classList.add('hidden'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePickerModal();
      dom.savedModal.classList.add('hidden');
      document.getElementById('share-modal')?.classList.add('hidden');
    }
  });

  document.getElementById('btn-clear-build').addEventListener('click', async () => {
    state.selected = {};
    await saveCurrentBuild({ buildName: state.buildName, selected: {} });
    renderAllSlots(openPickerModal);
    showToast('Сборка очищена');
  });

  dom.btnAddAllCart?.addEventListener('click', async () => {
    const items = getAllSelectedItems();
    if (items.length === 0) return;
    dom.btnAddAllCart.disabled = true;
    dom.btnAddAllCart.textContent = 'Добавляем в корзину Ozon...';
    try {
      const res = await extApi.runtime.sendMessage({ type: 'ADD_ITEMS_TO_OZON_CART', items });
      if (!res || !res.ok) throw new Error(res?.error || 'Ошибка добавления в корзину');
      showToast(`Добавлено позиций в корзину Ozon: ${res.addedCount}`);
    } catch (err) {
      showToast(`Ошибка: ${err.message}`);
    } finally {
      renderAllSlots(openPickerModal);
    }
  });

  document.getElementById('btn-open-all-ozon').addEventListener('click', () => {
    for (const item of getAllSelectedItems()) {
      extApi.tabs.create({ url: item.url, active: false });
    }
  });

  document.getElementById('btn-export-text').addEventListener('click', async () => {
    const lines = [`Сборка: ${state.buildName}`, ''];
    for (const cat of ALL_CATEGORIES) {
      for (const item of (state.selected[cat.id] || [])) {
        const qty = item.quantity || 1;
        lines.push(`${cat.title}: ${item.title} (${qty} шт.) — ${formatRub(item.priceCard * qty)} (${item.url})`);
      }
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Список сборки скопирован в буфер обмена');
  });

  bindShareModalEvents();

  extApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.CURRENT_BUILD]) return;
    const nextVal = changes[STORAGE_KEYS.CURRENT_BUILD].newValue;
    if (!nextVal) return;
    state.buildName = nextVal.buildName || state.buildName;
    state.selected = normalizeSelectedSpecs(nextVal.selected || {});
    dom.buildNameInput.value = state.buildName;
    renderAllSlots(openPickerModal);
  });
}

async function init() {
  dom.pickerSortSelect.replaceChildren(...SORT_OPTIONS.map((o) => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.label;
    return opt;
  }));

  const current = await loadCurrentBuild();
  state.buildName = current.buildName || 'Моя сборка ПК';
  state.selected = normalizeSelectedSpecs(current.selected || {});
  dom.buildNameInput.value = state.buildName;

  state.savedBuilds = await loadSavedBuildsList();
  dom.savedBuildsCount.textContent = String(state.savedBuilds.length);

  renderAllSlots(openPickerModal);
  bindEvents();
}

init();
