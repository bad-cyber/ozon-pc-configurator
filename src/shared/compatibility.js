const SOCKET_PATTERNS = [
  { key: 'AM5', regex: /\bAM5\b/i },
  { key: 'AM4', regex: /\bAM4\b/i },
  { key: 'LGA1851', regex: /\bLGA\s*1851\b/i },
  { key: 'LGA1700', regex: /\bLGA\s*1700\b/i },
  { key: 'LGA1200', regex: /\bLGA\s*1200\b/i },
  { key: 'LGA1151', regex: /\bLGA\s*1151\b/i },
  { key: 'LGA2011-3', regex: /\bLGA\s*2011(?:-3|v3)?\b/i }
];

function detectSocketsList(text) {
  const found = [];
  for (const item of SOCKET_PATTERNS) {
    if (item.regex.test(text)) found.push(item.key);
  }
  if (found.length === 0) {
    if (/ryzen\s*\d{3}/i.test(text) || /\b(?:B650|X670|A620|X870|B850)\b/i.test(text)) found.push('AM5');
    else if (/ryzen\s*[1-5]\d{3}/i.test(text) || /\b(?:A320|B450|B550|X570|A520)\b/i.test(text)) found.push('AM4');
    else if (/core\s*ultra\s*\s*2\d{2}/i.test(text) || /\b(?:Z890|B860)\b/i.test(text)) found.push('LGA1851');
    else if (/core\s*i-1\d{2,3}/i.test(text) || /\b(?:H610|B660|Z690|B760|Z790)\b/i.test(text)) found.push('LGA1700');
    else if (/core\s*i-1\d{2,3}/i.test(text) || /\b(?:H410|B460|Z490|H510|B560|Z590)\b/i.test(text)) found.push('LGA1200');
  }
  return found;
}

function detectMemoryType(text) {
  const hasDdr5 = /\bDDR5\b/i.test(text);
  const hasDdr4 = /\bDDR4\b/i.test(text);
  if (hasDdr5 && !hasDdr4) return 'DDR5';
  if (hasDdr4 && !hasDdr5) return 'DDR4';
  if (hasDdr5 && hasDdr4) return 'DDR4/DDR5';
  return null;
}

function detectFormFactor(text) {
  if (/\bE-?ATX\b/i.test(text)) return 'E-ATX';
  if (/\b(?:Micro-?ATX|mATX|M-ATX)\b/i.test(text)) return 'Micro-ATX';
  if (/\b(?:Mini-?ITX|mITX)\b/i.test(text)) return 'Mini-ITX';
  if (/\bSFX\b/i.test(text)) return 'SFX';
  if (/\bATX\b/i.test(text)) return 'ATX';
  return null;
}

function detectRamSlotsAndModules(text, categoryId) {
  if (categoryId === 'motherboard') {
    const slotMatch = text.match(/\b(2|4|8)\s*[xх*]\s*DDR/i)
      || text.match(/(?:слот(?:ов|а)?\s*(?:памяти|озу|ddr|ram)?)\s*:?\s*(2|4|8)\b/i);
    return { maxRamSlots: slotMatch ? Number.parseInt(slotMatch.at(1), 10) : null, modulesCount: null };
  }
  if (categoryId === 'ram') {
    const kitMatch = text.match(/\b(1|2|4)\s*[xх*]\s*(?:4|8|16|32|48|64)\s*(?:ГБ|GB)\b/i)
      || text.match(/количество\s*модулей(?:\s*в\s*комплекте)?\s*:?\s*(1|2|4)\b/i);
    return { maxRamSlots: null, modulesCount: kitMatch ? Number.parseInt(kitMatch.at(1), 10) : 1 };
  }
  return { maxRamSlots: null, modulesCount: null };
}

function detectWattage(text, categoryId) {
  const wattMatch = text.match(/\b(\d{2,4})\s*(?:Вт|W)\b/i);
  if (wattMatch) {
    const val = Number.parseInt(wattMatch.at(1), 10);
    if (categoryId === 'psu' && val >= 300 && val <= 2000) return val;
    if ((categoryId === 'cpu' || categoryId === 'cooler') && val >= 35 && val <= 450) return val;
  }
  if (categoryId === 'cpu') {
    if (/i9-|ryzen\s*9/i.test(text)) return 170;
    if (/i7-|ryzen\s*7/i.test(text)) return 125;
    return 65;
  }
  if (categoryId === 'gpu') {
    if (/rtx\s*5090|rtx\s*4090/i.test(text)) return 450;
    if (/rtx\s*5080|rtx\s*4080|rx\s*7900/i.test(text)) return 320;
    if (/rtx\s*5070|rtx\s*4070|rx\s*7800|rx\s*7700/i.test(text)) return 220;
    if (/rtx\s*5060|rtx\s*4060|rtx\s*3060|rx\s*7600|rx\s*6600/i.test(text)) return 150;
    return 180;
  }
  return null;
}
export function extractComponentSpecs(product, categoryId) {
  const fullText = `${product?.title || ''} ${product?.rawSpecsText || ''}`;
  const sockets = detectSocketsList(fullText);
  const socket = sockets.at(0) || null;
  const memoryType = detectMemoryType(fullText);
  const formFactor = detectFormFactor(fullText);
  const watts = detectWattage(fullText, categoryId);
  const { maxRamSlots, modulesCount } = detectRamSlotsAndModules(fullText, categoryId);

  const coresMatch = fullText.match(/(\d{1,2})\s*(?:ядер|ядра|cores)/i);
  const freqMatch = fullText.match(/(\d(?:[.,]\d{1,2})?)\s*(?:ГГц|GHz)/i);
  const ramCapMatch = fullText.match(/\b(6|8|12|16|24|32|48|64|96|128)\s*(?:ГБ|GB)\b/i);
  const storageCapMatch = fullText.match(/\b(120|128|240|250|256|480|500|512|960|1000|1024|2000|2048|4000)\s*(?:ГБ|GB)\b|\b(1|2|4|8)\s*(?:ТБ|TB)\b/i);
  const certMatch = fullText.match(/80\s*PLUS\s*(Titanium|Platinum|Gold|Silver|Bronze|Standard|White)?/i);
  const towerMatch = fullText.match(/\b(Full-?Tower|Midi-?Tower|Mid-?Tower|Mini-?Tower|Midi\s*Tower)\b/i);

  const storageCap = storageCapMatch
    ? (storageCapMatch.at(1) ? `${storageCapMatch.at(1)} ГБ` : `${storageCapMatch.at(2)} ТБ`)
    : null;
  const storageInterface = /nvme|pcie/i.test(fullText) ? 'NVMe PCIe' : (/sata/i.test(fullText) ? 'SATA III' : null);
  const gpuVendor = /geforce|rtx|gtx|nvidia/i.test(fullText) ? 'NVIDIA' : (/radeon|\brx\s*\d|amd/i.test(fullText) ? 'AMD' : null);
  const fanType = /термопаст/i.test(fullText) ? 'Термопаста' : (/140\s*мм|140mm/i.test(fullText) ? '140 мм' : (/120\s*мм|120mm/i.test(fullText) ? '120 мм' : null));
  const rgbType = /argb|rgb|подсветк/i.test(fullText) ? 'ARGB / RGB' : 'Без подсветки';

  const specs = {
    socket, sockets, memoryType, formFactor, watts, maxRamSlots, modulesCount,
    storageInterface, gpuVendor, fanType, rgbType,
    cores: coresMatch ? `${coresMatch.at(1)} ядер` : null,
    freq: freqMatch ? `${freqMatch.at(1)} ГГц` : null,
    capacity: ramCapMatch ? `${ramCapMatch.at(1)} ГБ` : storageCap,
    psuCert: certMatch ? `80 PLUS ${certMatch.at(1) || 'Standard'}`.trim() : null,
    displayLines: []
  };

  if (categoryId === 'cpu') {
    if (socket) specs.displayLines.push(`Сокет: ${socket}`);
    if (specs.cores) specs.displayLines.push(`Ядра: ${specs.cores}`);
    if (specs.freq) specs.displayLines.push(`Частота: ${specs.freq}`);
    if (watts) specs.displayLines.push(`Расчётный TDP: ${watts} Вт`);
  } else if (categoryId === 'motherboard') {
    if (socket) specs.displayLines.push(`Сокет: ${socket}`);
    if (memoryType) specs.displayLines.push(`Память: ${memoryType}${maxRamSlots ? ` (${maxRamSlots} слота)` : ''}`);
    if (formFactor) specs.displayLines.push(`Форм-фактор: ${formFactor}`);
  } else if (categoryId === 'ram') {
    if (memoryType) specs.displayLines.push(`Тип: ${memoryType}`);
    if (specs.capacity) specs.displayLines.push(`Объём: ${specs.capacity}`);
    if (modulesCount) specs.displayLines.push(`Модулей в комплекте: ${modulesCount} шт.`);
  } else if (categoryId === 'gpu') {
    if (gpuVendor) specs.displayLines.push(`Чип: ${gpuVendor}`);
    if (specs.capacity) specs.displayLines.push(`Видеопамять: ${specs.capacity}`);
    if (watts) specs.displayLines.push(`Энергопотребление: ~${watts} Вт`);
  } else if (categoryId === 'psu') {
    if (watts) specs.displayLines.push(`Мощность: ${watts} Вт`);
    if (specs.psuCert) specs.displayLines.push(`Сертификат: ${specs.psuCert}`);
    if (formFactor) specs.displayLines.push(`Форм-фактор: ${formFactor}`);
  } else if (categoryId === 'case') {
    if (towerMatch) specs.displayLines.push(`Типоразмер: ${towerMatch.at(1)}`);
    if (formFactor) specs.displayLines.push(`Формат платы: до ${formFactor}`);
  } else if (categoryId === 'cooler') {
    if (sockets.length > 0) specs.displayLines.push(`Поддержка: ${sockets.join(', ')}`);
    if (watts) specs.displayLines.push(`Рассеиваемая мощность: ${watts} Вт`);
  } else if (categoryId === 'storage') {
    if (specs.capacity) specs.displayLines.push(`Объём: ${specs.capacity}`);
    if (storageInterface) specs.displayLines.push(`Интерфейс: ${storageInterface}`);
    if (/m\.?2|2280/i.test(fullText)) specs.displayLines.push('Форм-фактор: M.2 2280');
  } else if (categoryId === 'case_fans') {
    if (fanType) specs.displayLines.push(`Тип / размер: ${fanType}`);
    specs.displayLines.push(`Подсветка: ${rgbType}`);
  } else if (categoryId === 'monitor') {
    const diag = fullText.match(/(\d{2}(?:[.,]\d)?)\s*(?:"|дюйм)/i);
    const hz = fullText.match(/(\d{2,3})\s*(?:Гц|Hz)/i);
    const matrix = fullText.match(/\b(IPS|VA|OLED|TN|Fast\s*IPS)\b/i);
    if (diag) specs.displayLines.push(`Диагональ: ${diag.at(1)}"`);
    if (matrix) specs.displayLines.push(`Матрица: ${matrix.at(1).toUpperCase()}`);
    if (hz) specs.displayLines.push(`Частота: ${hz.at(1)} Гц`);
  } else if (categoryId === 'mouse') {
    const dpi = fullText.match(/(\d{3,5})\s*dpi/i);
    const conn = /беспроводн|wireless|bluetooth|radio/i.test(fullText) ? 'Беспроводная' : 'Проводная';
    specs.displayLines.push(`Подключение: ${conn}`);
    if (dpi) specs.displayLines.push(`Сенсор: до ${dpi.at(1)} DPI`);
  }

  return specs;
}
const CASE_FIT_ORDER = { 'Mini-ITX': 1, 'Micro-ATX': 2, 'ATX': 3, 'E-ATX': 4 };

export function buildCategoryFacetOptions(products, categoryId) {
  const groups = [];
  const collectUnique = (mapper) => [...new Set(products.map(mapper).filter(Boolean))];

  if (['cpu', 'motherboard', 'cooler'].includes(categoryId)) {
    const sockets = [...new Set(products.flatMap((p) => p.specs?.sockets || []))];
    if (sockets.length > 0) groups.push({ key: 'socket', title: 'Сокет', options: sockets });
  }
  if (['motherboard', 'ram'].includes(categoryId)) {
    const mems = collectUnique((p) => p.specs?.memoryType).filter((m) => m !== 'DDR4/DDR5');
    if (mems.length > 0) groups.push({ key: 'memoryType', title: 'Тип памяти', options: mems });
  }
  if (['motherboard', 'case', 'psu'].includes(categoryId)) {
    const forms = collectUnique((p) => p.specs?.formFactor);
    if (forms.length > 0) groups.push({ key: 'formFactor', title: 'Форм-фактор', options: forms });
  }
  if (['ram', 'gpu', 'storage'].includes(categoryId)) {
    const caps = collectUnique((p) => p.specs?.capacity);
    if (caps.length > 0) groups.push({ key: 'capacity', title: 'Объём памяти', options: caps });
  }
  if (categoryId === 'gpu') {
    const vendors = collectUnique((p) => p.specs?.gpuVendor);
    if (vendors.length > 0) groups.push({ key: 'gpuVendor', title: 'Производитель GPU', options: vendors });
  }
  if (categoryId === 'storage') {
    const ifaces = collectUnique((p) => p.specs?.storageInterface);
    if (ifaces.length > 0) groups.push({ key: 'storageInterface', title: 'Интерфейс', options: ifaces });
  }
  if (categoryId === 'case_fans') {
    const fanTypes = collectUnique((p) => p.specs?.fanType);
    if (fanTypes.length > 0) groups.push({ key: 'fanType', title: 'Размер / тип', options: fanTypes });
    const rgbs = collectUnique((p) => p.specs?.rgbType);
    if (rgbs.length > 0) groups.push({ key: 'rgbType', title: 'Подсветка', options: rgbs });
  }
  return groups;
}

export function buildSmartSearchQuery(category, selected) {
  const baseQuery = category.defaultQuery;
  const cpu = selected.cpu?.at(0);
  const mb = selected.motherboard?.at(0);
  const ram = selected.ram?.at(0);

  if (category.id === 'motherboard' && cpu?.specs?.socket) return `материнская плата ${cpu.specs.socket}`;
  if (category.id === 'cpu' && mb?.specs?.socket) return `процессор ${mb.specs.socket}`;
  if (category.id === 'ram') {
    const mem = mb?.specs?.memoryType || (cpu?.specs?.socket === 'AM5' ? 'DDR5' : null);
    if (mem && mem !== 'DDR4/DDR5') return `оперативная память ${mem}`;
  }
  if (category.id === 'motherboard' && ram?.specs?.memoryType) return `материнская плата ${ram.specs.memoryType}`;
  if (category.id === 'cooler') {
    const sock = cpu?.specs?.socket || mb?.specs?.socket;
    if (sock) return `кулер для процессора ${sock}`;
  }
  if (category.id === 'case' && mb?.specs?.formFactor) return `корпус для пк ${mb.specs.formFactor}`;
  return baseQuery;
}

export function isProductCompatibleWithBuild(product, categoryId, selected) {
  const specs = product.specs || extractComponentSpecs(product, categoryId);
  const cpu = selected.cpu?.at(0);
  const mb = selected.motherboard?.at(0);
  const ram = selected.ram?.at(0);
  const pcCase = selected.case?.at(0);
  const targetSocket = cpu?.specs?.socket || mb?.specs?.socket;

  if (categoryId === 'motherboard' && cpu?.specs?.socket && specs.socket && cpu.specs.socket !== specs.socket) return false;
  if (categoryId === 'cpu' && mb?.specs?.socket && specs.socket && mb.specs.socket !== specs.socket) return false;
  if (categoryId === 'cooler' && targetSocket && specs.sockets?.length > 0 && !specs.sockets.includes(targetSocket)) return false;
  if (categoryId === 'ram' && mb?.specs?.memoryType && specs.memoryType && mb.specs.memoryType !== 'DDR4/DDR5' && mb.specs.memoryType !== specs.memoryType) return false;
  if (categoryId === 'motherboard' && ram?.specs?.memoryType && specs.memoryType && specs.memoryType !== 'DDR4/DDR5' && specs.memoryType !== ram.specs.memoryType) return false;
  if (categoryId === 'case' && mb?.specs?.formFactor && specs.formFactor && (CASE_FIT_ORDER[specs.formFactor] || 3) < (CASE_FIT_ORDER[mb.specs.formFactor] || 3)) return false;
  return true;
}

export function evaluateBuildCompatibility(selected) {
  const issues = [];
  const cpu = selected.cpu?.at(0);
  const mb = selected.motherboard?.at(0);
  const ramItems = selected.ram || [];
  const gpu = selected.gpu?.at(0);
  const psu = selected.psu?.at(0);
  const cooler = selected.cooler?.at(0);
  const pcCase = selected.case?.at(0);

  if (cpu?.specs?.socket && mb?.specs?.socket && cpu.specs.socket !== mb.specs.socket) {
    issues.push({ level: 'error', text: `Несовместимый сокет: процессор (${cpu.specs.socket}) и плата (${mb.specs.socket}).` });
  }
  const activeSocket = cpu?.specs?.socket || mb?.specs?.socket;
  if (activeSocket && cooler?.specs?.sockets?.length > 0 && !cooler.specs.sockets.includes(activeSocket)) {
    issues.push({ level: 'error', text: `Кулер (${cooler.specs.sockets.join(', ')}) не поддерживает сокет ${activeSocket}.` });
  }
  for (const ram of ramItems) {
    if (mb?.specs?.memoryType && ram?.specs?.memoryType && mb.specs.memoryType !== 'DDR4/DDR5' && mb.specs.memoryType !== ram.specs.memoryType) {
      issues.push({ level: 'error', text: `Разный тип памяти: плата (${mb.specs.memoryType}) и ОЗУ (${ram.specs.memoryType}).` });
      break;
    }
  }
  const totalRamModules = ramItems.reduce((sum, r) => sum + ((r.specs?.modulesCount || 1) * (r.quantity || 1)), 0);
  const maxSlots = mb?.specs?.maxRamSlots;
  if (maxSlots && totalRamModules > maxSlots) {
    issues.push({ level: 'error', text: `Выбрано модулей ОЗУ (${totalRamModules} шт.), но на материнской плате всего ${maxSlots} слота.` });
  } else if (maxSlots && maxSlots >= 2 && totalRamModules === 1) {
    issues.push({ level: 'warn', text: `Установлен 1 модуль ОЗУ из ${maxSlots} слотов — добавьте 2-й модуль для двухканального режима.` });
  }
  if (mb?.specs?.formFactor && pcCase?.specs?.formFactor && (CASE_FIT_ORDER[pcCase.specs.formFactor] || 3) < (CASE_FIT_ORDER[mb.specs.formFactor] || 3)) {
    issues.push({ level: 'error', text: `Плата ${mb.specs.formFactor} не поместится в корпус ${pcCase.specs.formFactor}.` });
  }

  const totalTdp = (cpu?.specs?.watts || 0) + (gpu?.specs?.watts || 0) + (Object.keys(selected).length > 0 ? 55 : 0);
  const recommendedPsu = totalTdp > 0 ? Math.ceil((totalTdp * 1.35) / 50) * 50 : 0;

  if (psu?.specs?.watts && recommendedPsu > 0 && psu.specs.watts < totalTdp + 50) {
    issues.push({ level: 'error', text: `Недостаточная мощность БП (${psu.specs.watts} Вт) при расчётном TDP ${totalTdp} Вт.` });
  } else if (psu?.specs?.watts && recommendedPsu > 0 && psu.specs.watts < recommendedPsu) {
    issues.push({ level: 'warn', text: `БП ${psu.specs.watts} Вт впритык; рекомендуется от ${recommendedPsu} Вт.` });
  }
  if (cpu?.specs?.watts && cooler?.specs?.watts && cooler.specs.watts < cpu.specs.watts) {
    issues.push({ level: 'warn', text: `TDP кулера (${cooler.specs.watts} Вт) ниже TDP процессора (${cpu.specs.watts} Вт).` });
  }

  return { issues, totalTdp, recommendedPsu };
}
