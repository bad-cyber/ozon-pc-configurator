export const cleanUrl = (raw) => String(raw).replace(/\s+/g, '');

export const OZON_URLS = {
  BASE: cleanUrl('https: / / www.ozon.ru'),
  SEARCH: cleanUrl('https: / / www.ozon.ru / search /'),
  API_ENTRYPOINT: cleanUrl('https: / / www.ozon.ru / api / entrypoint-api.bx / page / json / v2'),
  CART: cleanUrl('https: / / www.ozon.ru / cart'),
  CDN_FALLBACK_IMG: cleanUrl('https: / / ir.ozone.ru / s3 / multimedia-1-z / wc250 / 7000000000.jpg')
};

export const STORAGE_KEYS = {
  CURRENT_BUILD: 'ozon_pc_current_build_v1',
  SAVED_BUILDS: 'ozon_pc_saved_builds_v1',
  SETTINGS: 'ozon_pc_settings_v1'
};

export const COMPONENT_CATEGORIES = [
  { id: 'cpu', title: 'Процессор', group: 'required', required: true, multiple: false, defaultQuery: 'процессор для пк', badge: 'CPU', description: 'Вычислительное ядро системы' },
  { id: 'motherboard', title: 'Материнская плата', group: 'required', required: true, multiple: false, defaultQuery: 'материнская плата', badge: 'MB', description: 'Основа для подключения всех компонентов' },
  { id: 'gpu', title: 'Видеокарта', group: 'required', required: true, multiple: false, defaultQuery: 'видеокарта игровая', badge: 'GPU', description: 'Графический ускоритель для игр и работы' },
  { id: 'ram', title: 'Оперативная память', group: 'required', required: true, multiple: true, defaultQuery: 'оперативная память ddr4 ddr5', badge: 'RAM', description: 'Модули и комплекты ОЗУ (с учётом слотов на плате)' },
  { id: 'cooler', title: 'Охлаждение процессора', group: 'required', required: true, multiple: false, defaultQuery: 'кулер для процессора сжо', badge: 'COOL', description: 'Башенный кулер или система жидкостного охлаждения' },
  { id: 'storage', title: 'Накопители (SSD / HDD)', group: 'required', required: true, multiple: true, defaultQuery: 'ssd накопитель m2 nvme', badge: 'SSD', description: 'Скоростной SSD под систему и диски под файлы' },
  { id: 'psu', title: 'Блок питания', group: 'required', required: true, multiple: false, defaultQuery: 'блок питания для пк 80 plus', badge: 'PSU', description: 'Стабильное питание с запасом по мощности' },
  { id: 'case', title: 'Корпус', group: 'required', required: true, multiple: false, defaultQuery: 'корпус для пк atx matx', badge: 'CASE', description: 'Вместимость, продуваемость и формат платы' }
];

export const EXTRA_COMPONENT_CATEGORIES = [
  { id: 'case_fans', title: 'Вентиляторы и термопаста', group: 'optional', required: false, multiple: true, defaultQuery: 'корпусный вентилятор 120 мм', badge: 'FAN', description: 'Дополнительный обдув и термоинтерфейс' },
  { id: 'sound_card', title: 'Звуковая карта', group: 'optional', required: false, multiple: false, defaultQuery: 'звуковая карта внутренняя внешняя', badge: 'SND', description: 'Дискретный звук для акустики и наушников' },
  { id: 'monitor', title: 'Монитор', group: 'optional', required: false, multiple: true, defaultQuery: 'игровой монитор ips 144 гц', badge: 'MON', description: 'Основной или второй дисплей для ПК' },
  { id: 'keyboard', title: 'Клавиатура', group: 'optional', required: false, multiple: false, defaultQuery: 'механическая игровая клавиатура', badge: 'KEY', description: 'Проводная или беспроводная клавиатура' },
  { id: 'mouse', title: 'Мышь', group: 'optional', required: false, multiple: false, defaultQuery: 'игровая компьютерная мышь', badge: 'MSE', description: 'Игровая или эргономичная мышь' },
  { id: 'audio', title: 'Гарнитура и акустика', group: 'optional', required: false, multiple: true, defaultQuery: 'игровые наушники гарнитура колонки', badge: 'AUD', description: 'Наушники с микрофоном или настольные колонки' },
  { id: 'software', title: 'Программное обеспечение', group: 'optional', required: false, multiple: true, defaultQuery: 'windows 11 oem ключ', badge: 'OS', description: 'Операционная система и офисные пакеты' }
];

export const ALL_CATEGORIES = [
  ...COMPONENT_CATEGORIES,
  ...EXTRA_COMPONENT_CATEGORIES
];

export const SORT_OPTIONS = [
  { id: 'score', label: 'Сначала популярные' },
  { id: 'price_asc', label: 'Сначала дешёвые' },
  { id: 'price_desc', label: 'Сначала дорогие' },
  { id: 'rating', label: 'По рейтингу' },
  { id: 'reviews', label: 'По отзывам' }
];
