import { ALL_CATEGORIES } from '../shared/constants.js';
import { evaluateBuildCompatibility } from '../shared/compatibility.js';
import { formatRub, normalizeSelectedSpecs } from './builder-state.js';

function calcBuildTotals(selectedMap) {
  const items = Object.values(selectedMap || {}).flat();
  const totalCard = items.reduce((s, i) => s + ((i.priceCard || 0) * (i.quantity || 1)), 0);
  const totalReg = items.reduce((s, i) => s + ((i.priceRegular || i.priceCard || 0) * (i.quantity || 1)), 0);
  const { issues, totalTdp, recommendedPsu } = evaluateBuildCompatibility(selectedMap || {});
  const hasErr = issues.some((i) => i.level === 'error');
  const hasWarn = issues.some((i) => i.level === 'warn');
  const statusText = items.length === 0 ? 'Пусто' : (hasErr ? 'Есть ошибки' : (hasWarn ? 'Есть замечания' : 'Совместимы'));
  return { totalCard, totalReg, totalTdp, recommendedPsu, statusText };
}

function createCompareRow(label, leftContent, rightContent, isHeader = false) {
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:160px 1fr 1fr;gap:12px;padding:10px 12px;border-bottom:1px solid #dce2ea;font-size:13px;align-items:start;';
  if (isHeader) row.style.background = '#f7f9fc';

  const col0 = document.createElement('div');
  col0.style.cssText = 'font-weight:700;color:#5a6c7d;';
  col0.textContent = label;

  const col1 = document.createElement('div');
  if (typeof leftContent === 'string') col1.textContent = leftContent;
  else col1.appendChild(leftContent);

  const col2 = document.createElement('div');
  if (typeof rightContent === 'string') col2.textContent = rightContent;
  else col2.appendChild(rightContent);

  row.append(col0, col1, col2);
  return row;
}

function renderSlotCell(items) {
  const wrap = document.createElement('div');
  if (!items || items.length === 0) {
    wrap.style.color = '#8a99ad';
    wrap.textContent = '— Не выбрано —';
    return wrap;
  }
  for (const item of items) {
    const line = document.createElement('div');
    line.style.marginBottom = '4px';
    const qty = item.quantity || 1;
    const title = document.createElement('strong');
    title.style.display = 'block';
    title.textContent = `${item.title}${qty > 1 ? ` (${qty} шт.)` : ''}`;
    const price = document.createElement('span');
    price.style.cssText = 'color:#009951;font-weight:700;font-size:12px;';
    price.textContent = formatRub(item.priceCard * qty);
    line.append(title, price);
    wrap.appendChild(line);
  }
  return wrap;
}
export function renderCompareView(container, currentBuild, savedEntry, onBack) {
  const leftSel = normalizeSelectedSpecs(currentBuild.selected || {});
  const rightSel = normalizeSelectedSpecs(savedEntry.selected || {});
  const leftStats = calcBuildTotals(leftSel);
  const rightStats = calcBuildTotals(rightSel);

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = '← Назад к списку сборок';
  backBtn.addEventListener('click', onBack);

  const diff = leftStats.totalCard - rightStats.totalCard;
  const diffBadge = document.createElement('strong');
  diffBadge.style.fontSize = '13px';
  diffBadge.style.color = diff === 0 ? '#5a6c7d' : (diff < 0 ? '#009951' : '#b25e00');
  diffBadge.textContent = diff === 0
    ? 'Одинаковая стоимость'
    : (diff < 0 ? `Текущая дешевле на ${formatRub(Math.abs(diff))}` : `Текущая дороже на ${formatRub(diff)}`);

  topBar.append(backBtn, diffBadge);

  const table = document.createElement('div');
  table.style.cssText = 'border:1px solid #dce2ea;border-radius:8px;overflow:hidden;';
  table.appendChild(createCompareRow('Параметр', `Текущая: ${currentBuild.buildName}`, `Сохранённая: ${savedEntry.buildName}`, true));
  table.appendChild(createCompareRow('Цена с Ozon Картой', formatRub(leftStats.totalCard), formatRub(rightStats.totalCard), true));
  table.appendChild(createCompareRow('Обычная цена', formatRub(leftStats.totalReg), formatRub(rightStats.totalReg)));
  table.appendChild(createCompareRow('TDP / БП', `${leftStats.totalTdp} Вт (БП от ${leftStats.recommendedPsu || '—'} Вт)`, `${rightStats.totalTdp} Вт (БП от ${rightStats.recommendedPsu || '—'} Вт)`));
  table.appendChild(createCompareRow('Совместимость', leftStats.statusText, rightStats.statusText));

  for (const cat of ALL_CATEGORIES) {
    const lItems = leftSel[cat.id] || [];
    const rItems = rightSel[cat.id] || [];
    if (lItems.length === 0 && rItems.length === 0) continue;
    table.appendChild(createCompareRow(cat.title, renderSlotCell(lItems), renderSlotCell(rItems)));
  }

  container.replaceChildren(topBar, table);
}
