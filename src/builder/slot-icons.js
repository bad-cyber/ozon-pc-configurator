import { cleanUrl } from '../shared/constants.js';

const SVG_NS = cleanUrl('http: / / www.w3.org / 2000 / svg');

const ICON_PATHS = {
  cpu: [
    { tag: 'rect', attrs: { x: '6', y: '6', width: '12', height: '12', rx: '2' } },
    { tag: 'rect', attrs: { x: '9', y: '9', width: '6', height: '6', rx: '1' } },
    { tag: 'path', attrs: { d: 'M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4' } }
  ],
  motherboard: [
    { tag: 'rect', attrs: { x: '4', y: '3', width: '16', height: '18', rx: '2' } },
    { tag: 'rect', attrs: { x: '7', y: '6', width: '6', height: '6', rx: '1' } },
    { tag: 'path', attrs: { d: 'M16 6v6M7 16h10M7 18.5h6' } }
  ],
  gpu: [
    { tag: 'rect', attrs: { x: '2', y: '6', width: '20', height: '11', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8.5', cy: '11.5', r: '3' } },
    { tag: 'circle', attrs: { cx: '16.5', cy: '11.5', r: '3' } },
    { tag: 'path', attrs: { d: 'M4 17v2h4v-2' } }
  ],
  ram: [
    { tag: 'rect', attrs: { x: '2', y: '7', width: '20', height: '9', rx: '1.5' } },
    { tag: 'path', attrs: { d: 'M6 10v3M10 10v3M14 10v3M18 10v3M5 16v2M9 16v2M15 16v2M19 16v2' } }
  ],
  cooler: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '2.5' } },
    { tag: 'path', attrs: { d: 'M12 5.5c2 0 3.5 1.5 2.5 3.5M18.5 12c0 2-1.5 3.5-3.5 2.5M12 18.5c-2 0-3.5-1.5-2.5-3.5M5.5 12c0-2 1.5-3.5 3.5-2.5' } }
  ],
  storage: [
    { tag: 'rect', attrs: { x: '4', y: '3', width: '16', height: '18', rx: '2' } },
    { tag: 'path', attrs: { d: 'M8 7h8M8 11h8M8 17h2' } }
  ],
  psu: [
    { tag: 'rect', attrs: { x: '3', y: '5', width: '18', height: '14', rx: '2' } },
    { tag: 'path', attrs: { d: 'M13 8l-3 4h4l-3 4' } }
  ],
  case: [
    { tag: 'rect', attrs: { x: '5', y: '2', width: '14', height: '20', rx: '2' } },
    { tag: 'circle', attrs: { cx: '12', cy: '6', r: '1' } },
    { tag: 'path', attrs: { d: 'M8 10h8M8 18h8' } }
  ]
};
const EXTRA_ICON_PATHS = {
  case_fans: [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '3' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '6' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '2' } }
  ],
  sound_card: [
    { tag: 'path', attrs: { d: 'M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2' } }
  ],
  monitor: [
    { tag: 'rect', attrs: { x: '2', y: '3', width: '20', height: '14', rx: '2' } },
    { tag: 'path', attrs: { d: 'M8 21h8M12 17v4' } }
  ],
  keyboard: [
    { tag: 'rect', attrs: { x: '2', y: '6', width: '20', height: '12', rx: '2' } },
    { tag: 'path', attrs: { d: 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10' } }
  ],
  mouse: [
    { tag: 'rect', attrs: { x: '6', y: '3', width: '12', height: '18', rx: '6' } },
    { tag: 'path', attrs: { d: 'M12 7v4' } }
  ],
  audio: [
    { tag: 'path', attrs: { d: 'M4 14v-2a8 8 0 0 1 16 0v2' } },
    { tag: 'rect', attrs: { x: '3', y: '13', width: '4', height: '6', rx: '1.5' } },
    { tag: 'rect', attrs: { x: '17', y: '13', width: '4', height: '6', rx: '1.5' } }
  ],
  software: [
    { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '16', rx: '2' } },
    { tag: 'path', attrs: { d: 'M3 9h18M8 4v5' } }
  ]
};

const ALL_ICONS = { ...ICON_PATHS, ...EXTRA_ICON_PATHS };

export function createCategorySvgIcon(categoryId) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const shapes = ALL_ICONS[categoryId] || ALL_ICONS.cpu;
  for (const shape of shapes) {
    const el = document.createElementNS(SVG_NS, shape.tag);
    for (const [k, v] of Object.entries(shape.attrs)) {
      el.setAttribute(k, v);
    }
    svg.appendChild(el);
  }
  return svg;
}
