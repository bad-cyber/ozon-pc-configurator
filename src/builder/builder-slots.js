import { COMPONENT_CATEGORIES, EXTRA_COMPONENT_CATEGORIES } from '../shared/constants.js';
import { fetchProductFullCharacteristics } from '../shared/ozon-api.js';
import { extractComponentSpecs, evaluateBuildCompatibility } from '../shared/compatibility.js';
import { saveCurrentBuild } from '../shared/storage.js';
import { state, dom, formatRub, attachSafeImage } from './builder-state.js';
import { createCategorySvgIcon } from './slot-icons.js';

export function getAllSelectedItems() {
  return Object.values(state.selected).flat();
}

export function updateSummaryPanel() {
  const reqFilled = COMPONENT_CATEGORIES.filter((c) => (state.selected[c.id] || []).length > 0).length;
  const optFilled = EXTRA_COMPONENT_CATEGORIES.reduce((acc, c) => acc + (state.selected[c.id]?.length || 0), 0);

  dom.requiredProgressBadge.textContent = `${reqFilled} / ${COMPONENT_CATEGORIES.length}`;
  dom.optionalProgressBadge.textContent = `${optFilled} выбрано`;

  const allItems = getAllSelectedItems();
  const totalQty = allItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalCard = allItems.reduce((sum, item) => sum + ((item.priceCard || 0) * (item.quantity || 1)), 0);
  const totalReg = allItems.reduce((sum, item) => sum + ((item.priceRegular || item.priceCard || 0) * (item.quantity || 1)), 0);

  dom.totalPriceCard.textContent = formatRub(totalCard);
  dom.totalPriceRegular.textContent = formatRub(totalReg);

  if (dom.btnAddAllCart) {
    dom.btnAddAllCart.disabled = allItems.length === 0;
    dom.btnAddAllCart.textContent = `Добавить всё в корзину Ozon (${totalQty})`;
  }
  dom.btnOpenAllOzon.disabled = allItems.length === 0;
  dom.btnOpenAllOzon.textContent = `Открыть все товары на Ozon (${allItems.length})`;

  const { issues, totalTdp, recommendedPsu } = evaluateBuildCompatibility(state.selected);
  dom.metricTdp.textContent = `${totalTdp} Вт`;
  dom.metricPsuRec.textContent = recommendedPsu > 0 ? `от ${recommendedPsu} Вт` : '—';

  dom.compatIssuesList.replaceChildren();
  if (allItems.length === 0) {
    dom.compatStatusBox.className = 'compat-box compat-neutral';
    dom.compatTitle.textContent = 'Сборка не начата';
    return;
  }

  const hasErrors = issues.some((i) => i.level === 'error');
  const hasWarns = issues.some((i) => i.level === 'warn');
  dom.compatStatusBox.className = hasErrors ? 'compat-box compat-err' : hasWarns ? 'compat-box compat-warn' : 'compat-box compat-ok';
  dom.compatTitle.textContent = hasErrors ? 'Обнаружены проблемы совместимости' : hasWarns ? 'Есть замечания по сборке' : 'Компоненты совместимы';

  for (const issue of issues) {
    const li = document.createElement('li');
    li.textContent = issue.text;
    dom.compatIssuesList.appendChild(li);
  }
}

async function changeItemQuantity(categoryId, index, delta, onOpenPicker) {
  const list = state.selected[categoryId] || [];
  const target = list.at(index);
  if (!target) return;

  const nextQty = (target.quantity || 1) + delta;
  if (nextQty <= 0) {
    await removeComponentFromSlot(categoryId, index, onOpenPicker);
    return;
  }
  target.quantity = Math.min(16, nextQty);
  await saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
  renderAllSlots(onOpenPicker);
}

async function removeComponentFromSlot(categoryId, index, onOpenPicker) {
  const list = state.selected[categoryId] || [];
  state.selected[categoryId] = list.filter((_, idx) => idx !== index);
  if (state.selected[categoryId].length === 0) delete state.selected[categoryId];
  await saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
  renderAllSlots(onOpenPicker);
}
function fillSpecsTableBox(box, pairs) {
  if (!pairs || pairs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'specs-full-key';
    empty.textContent = 'Подробные характеристики не найдены на странице товара.';
    box.replaceChildren(empty);
    return;
  }
  const rows = pairs.map((p) => {
    const r = document.createElement('div');
    r.className = 'specs-full-row';
    const k = document.createElement('span');
    k.className = 'specs-full-key';
    k.textContent = p.name;
    const v = document.createElement('span');
    v.className = 'specs-full-val';
    v.textContent = p.value;
    r.append(k, v);
    return r;
  });
  box.replaceChildren(...rows);
}

function createQuantityStepper(categoryId, index, qty, onOpenPicker) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#f2f4f7;border-radius:8px;padding:2px 6px';
  const minusBtn = document.createElement('button');
  minusBtn.type = 'button';
  minusBtn.className = 'btn btn-ghost';
  minusBtn.style.padding = '4px 8px';
  minusBtn.textContent = '−';
  minusBtn.addEventListener('click', () => changeItemQuantity(categoryId, index, -1, onOpenPicker));

  const countLabel = document.createElement('strong');
  countLabel.style.fontSize = '13px';
  countLabel.textContent = `${qty} шт.`;

  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.className = 'btn btn-ghost';
  plusBtn.style.padding = '4px 8px';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', () => changeItemQuantity(categoryId, index, 1, onOpenPicker));

  wrap.append(minusBtn, countLabel, plusBtn);
  return wrap;
}

function createSelectedItemNode(category, product, index, onOpenPicker) {
  const specKey = `${category.id}:${product.id}:${index}`;
  const isExpanded = state.expandedSpecs.has(specKey);

  const row = document.createElement('div');
  row.className = 'selected-item-row';

  const img = document.createElement('img');
  img.className = 'selected-thumb';
  attachSafeImage(img, product.image, product.title);

  const info = document.createElement('div');
  const link = document.createElement('a');
  link.className = 'selected-title';
  link.href = product.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = product.title;

  const specsLine = document.createElement('div');
  specsLine.className = 'selected-specs';
  const lines = product.specs?.displayLines || [];
  specsLine.textContent = lines.length > 0 ? lines.join(' • ') : `Доставка: ${product.delivery}`;

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'specs-spoiler-toggle';
  toggleBtn.textContent = isExpanded ? 'Характеристики ▾' : 'Характеристики ▸';
  info.append(link, specsLine, toggleBtn);

  const right = document.createElement('div');
  right.className = 'selected-right';

  const qty = product.quantity || 1;
  const priceCard = document.createElement('div');
  priceCard.className = 'selected-price-card';
  priceCard.textContent = formatRub(product.priceCard * qty);

  const priceReg = document.createElement('div');
  priceReg.className = 'selected-price-reg';
  priceReg.textContent = `Без карты: ${formatRub((product.priceRegular || product.priceCard) * qty)}`;

  const actions = document.createElement('div');
  actions.className = 'selected-actions';
  if (category.multiple) actions.appendChild(createQuantityStepper(category.id, index, qty, onOpenPicker));

  const replaceBtn = document.createElement('button');
  replaceBtn.type = 'button';
  replaceBtn.className = 'btn btn-secondary';
  replaceBtn.textContent = 'Заменить';
  replaceBtn.addEventListener('click', () => onOpenPicker(category.id));

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-danger-ghost';
  removeBtn.textContent = 'Удалить';
  removeBtn.addEventListener('click', () => removeComponentFromSlot(category.id, index, onOpenPicker));

  actions.append(replaceBtn, removeBtn);
  right.append(priceCard, priceReg, actions);

  const fullBox = document.createElement('div');
  fullBox.className = isExpanded ? 'specs-full-box' : 'specs-full-box hidden';
  if (isExpanded && Array.isArray(product.fullSpecs)) {
    fillSpecsTableBox(fullBox, product.fullSpecs);
  }

  toggleBtn.addEventListener('click', async () => {
    if (state.expandedSpecs.has(specKey)) {
      state.expandedSpecs.delete(specKey);
      fullBox.classList.add('hidden');
      toggleBtn.textContent = 'Характеристики ▸';
      return;
    }
    state.expandedSpecs.add(specKey);
    fullBox.classList.remove('hidden');
    toggleBtn.textContent = 'Характеристики ▾';

    if (Array.isArray(product.fullSpecs) && product.fullSpecs.length > 0) {
      fillSpecsTableBox(fullBox, product.fullSpecs);
      return;
    }
    fullBox.textContent = 'Загрузка характеристик с Ozon...';
    const loaded = await fetchProductFullCharacteristics(product.url);
    product.fullSpecs = loaded;
    if (loaded.length > 0) {
      product.rawSpecsText = `${product.title} | ${loaded.map((p) => `${p.name}: ${p.value}`).join(' | ')}`;
      product.specs = extractComponentSpecs(product, category.id);
      const updatedLines = product.specs?.displayLines || [];
      if (updatedLines.length > 0) specsLine.textContent = updatedLines.join(' • ');
      await saveCurrentBuild({ buildName: state.buildName, selected: state.selected });
      updateSummaryPanel();
    }
    fillSpecsTableBox(fullBox, loaded);
  });

  row.append(img, info, right, fullBox);
  return row;
}

function createSlotCard(category, onOpenPicker) {
  const card = document.createElement('div');
  card.className = 'slot-card';
  const row = document.createElement('div');
  row.className = 'slot-row-main';
  const info = document.createElement('div');
  info.className = 'slot-info';

  const badge = document.createElement('div');
  badge.className = 'slot-badge';
  badge.appendChild(createCategorySvgIcon(category.id));

  const textWrap = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = category.title;
  const desc = document.createElement('div');
  desc.style.cssText = 'font-size:12px;color:#5a6c7d';
  const items = state.selected[category.id] || [];

  if (category.id === 'ram' && items.length > 0) {
    const usedSlots = items.reduce((s, r) => s + ((r.specs?.modulesCount || 1) * (r.quantity || 1)), 0);
    const maxSlots = state.selected.motherboard?.at(0)?.specs?.maxRamSlots;
    desc.textContent = maxSlots ? `Занято слотов ОЗУ: ${usedSlots} из ${maxSlots}` : `Выбрано модулей ОЗУ: ${usedSlots} шт.`;
  } else {
    desc.textContent = category.description;
  }

  textWrap.append(title, desc);
  info.append(badge, textWrap);
  row.appendChild(info);

  if (items.length === 0 || category.multiple) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = items.length > 0 ? 'btn btn-ghost' : 'btn btn-secondary';
    addBtn.textContent = items.length > 0 ? '+ Добавить ещё' : '+ Добавить';
    addBtn.addEventListener('click', () => onOpenPicker(category.id));
    row.appendChild(addBtn);
  }

  card.appendChild(row);
  items.forEach((product, idx) => card.appendChild(createSelectedItemNode(category, product, idx, onOpenPicker)));
  return card;
}

export function renderAllSlots(onOpenPicker) {
  dom.requiredSlotsList.replaceChildren(...COMPONENT_CATEGORIES.map((c) => createSlotCard(c, onOpenPicker)));
  dom.optionalSlotsList.replaceChildren(...EXTRA_COMPONENT_CATEGORIES.map((c) => createSlotCard(c, onOpenPicker)));
  updateSummaryPanel();
}
