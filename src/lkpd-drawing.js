import { createHexPattern } from './lkpd-hex-pattern.js';
import { createArcPattern } from './lkpd-arc-pattern.js';

let drawingId = 0;

const PATTERN_NAMES = ['Garis mendatar', 'Garis tegak', 'Pola anyaman', 'Garis miring 45°', 'Segitiga dan segi enam', 'Garis lengkung'];
const SIZE = 200;
const MM_PER_UNIT = 70 / SIZE;
const DIAGONAL_PITCH = 20 * Math.sqrt(2);
const diagonalStart = [46, 46 + 4 * DIAGONAL_PITCH - 100];
const diagonalEnd = [diagonalStart[0] - 20 / Math.sqrt(2), diagonalStart[1] + 20 / Math.sqrt(2)];

export const LKPD_PATTERN_GEOMETRY = Object.freeze({
  squareSize: SIZE, squareMillimetres: 70, millimetresPerUnit: MM_PER_UNIT,
  straightPitch: 10, ribbonWidth: 20, diagonalNormalPitch: 20,
  diagonalInterceptPitch: DIAGONAL_PITCH,
  dimensions: Object.freeze({
    1: Object.freeze({ start: [-8, 0], end: [-8, 10], value: 3.5, label: '3,5', outward: true }),
    2: Object.freeze({ start: [90, 98], end: [100, 98], value: 3.5, label: '3,5', outward: true }),
    3: Object.freeze({ start: [100, 90], end: [120, 90], value: 7, label: '7' }),
    4: Object.freeze({ start: diagonalStart, end: diagonalEnd, value: 7, label: '7', angle: -45 })
  })
});

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

const number = value => Number(value.toFixed(6));
const point = p => p.map(number).join(' ');

function dimension({ start, end, value, label, outward = false, angle = 0 }) {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const direction = [(end[0] - start[0]) / length, (end[1] - start[1]) / length];
  const normal = [-direction[1], direction[0]];
  const arrow = (tip, sign) => {
    const base = tip.map((v, axis) => v + direction[axis] * sign * 3);
    const a = base.map((v, axis) => v + normal[axis] * 1);
    const b = base.map((v, axis) => v - normal[axis] * 1);
    return `<path d="M${point(tip)}L${point(a)}L${point(b)}Z" fill="#142b38" stroke="none"/>`;
  };
  const extra = outward ? 9 : 0;
  const a = start.map((v, axis) => v - direction[axis] * extra);
  const b = end.map((v, axis) => v + direction[axis] * extra);
  const text = angle === -45
    ? [(start[0] + end[0]) / 2 - 2.5, (start[1] + end[1]) / 2 - 2.5]
    : [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - 3];
  return `<g class="lkpd-pattern-dimension" data-dimension-mm="${value}" stroke-width=".55">
    <path d="M${point(a)}L${point(b)}"/>
    ${arrow(start, outward ? -1 : 1)}${arrow(end, outward ? 1 : -1)}
    <text transform="translate(${point(text)}) rotate(${angle})" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" fill="#142b38" stroke="#fff" stroke-width="2" paint-order="stroke fill">${label}</text>
  </g>`;
}

function horizontalSpacingDimension() {
  const dim = dimension(LKPD_PATTERN_GEOMETRY.dimensions[1])
    .replace(/<text[\s\S]*?<\/text>/, '<text transform="translate(-11 -13) rotate(-90)" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" fill="#142b38" stroke="none">3,5</text>');
  return `<g fill="none" stroke="#142b38" stroke-width=".55"><path d="M-1 0H-13M-1 10H-13"/>${dim}</g>`;
}

function straightLines(vertical = false) {
  return Array.from({ length: 19 }, (_, index) => {
    const at = (index + 1) * 10;
    const type = index % 4;
    const widths = [.55, .55, .55, vertical ? 1 : 1.6];
    const dash = type === 0 ? ' stroke-dasharray="10 2"' : type === 2 ? ' stroke-dasharray="46 5 1 5 1 5" stroke-dashoffset="12"' : '';
    return `<line x1="${vertical ? at : 0}" y1="${vertical ? 0 : at}" x2="${vertical ? at : 200}" y2="${vertical ? 200 : at}" stroke-width="${widths[type]}"${dash}/>`;
  }).join('') + (vertical ? dimension(LKPD_PATTERN_GEOMETRY.dimensions[2]) : '');
}

function basketWeave() {
  let lines = '';
  // Alternating runs of three ribbon widths reproduce the interlocking bands.
  // Lines terminate on ribbon boundaries rather than filling square tiles.
  for (let row = 1; row < 10; row++) {
    const y = row * 20;
    const origin = row % 4 <= 1 ? -40 : 0;
    for (let x = origin; x < 200; x += 80) {
      lines += `<path d="M${Math.max(0, x)} ${y}H${Math.min(200, x + 60)}"/>`;
    }
  }
  for (let column = 1; column < 10; column++) {
    const x = column * 20;
    const origin = column % 4 === 1 || column % 4 === 2 ? -20 : 20;
    for (let y = origin; y < 200; y += 80) {
      lines += `<path d="M${x} ${Math.max(0, y)}V${Math.min(200, y + 60)}"/>`;
    }
  }
  return `<g stroke-width=".85">${lines}</g>${dimension(LKPD_PATTERN_GEOMETRY.dimensions[3])}`;
}

function diagonalQuarters(prefix) {
  const sectors = [[0, 0], [100, 0], [0, 100], [100, 100]];
  let defs = '';
  let lines = '';
  sectors.forEach(([x, y], index) => {
    defs += `<clipPath id="${prefix}-sector-${index}"><rect x="${x}" y="${y}" width="100" height="100"/></clipPath>`;
    let family = '';
    for (let level = 0; level <= 11; level++) {
      const c = level * DIAGONAL_PITCH;
      const ends = [
        [[0, c - 100], [200, c + 100]],
        [[0, c + 100], [200, c - 100]],
        [[0, 300 - c], [200, 100 - c]],
        [[0, 100 - c], [200, 300 - c]]
      ][index];
      family += `<path d="M${point(ends[0])}L${point(ends[1])}"/>`;
    }
    lines += `<g clip-path="url(#${prefix}-sector-${index})" stroke-width="1.6">${family}</g>`;
  });
  return `<defs>${defs}</defs>${lines}<path d="M100 0V200M0 100H200" stroke-width=".4"/>${dimension(LKPD_PATTERN_GEOMETRY.dimensions[4])}`;
}

/** The 200-unit square represents a 70 mm exercise; display/print can scale it. */
export function createLkpdPattern(patternId, { decorative = false, paper = false } = {}) {
  const index = Math.max(0, Math.min(5, Number(patternId) - 1 || 0));
  const prefix = `lkpd-pattern-${++drawingId}`;
  const contents = [
    () => straightLines(), () => straightLines(true), basketWeave,
    () => diagonalQuarters(prefix), () => createHexPattern(prefix), () => createArcPattern(prefix)
  ][index]();
  const accessibility = decorative ? 'aria-hidden="true"' : `role="img" aria-labelledby="${prefix}-title"`;
  return `<svg class="lkpd-pattern-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${paper ? '0 0 200 200' : index === 0 ? '-20 -28 226 234' : '-6 -6 212 212'}" data-pattern-id="${index + 1}" data-square-mm="70" ${accessibility}>
    <title id="${prefix}-title">Contoh ${escape(PATTERN_NAMES[index].toLowerCase())}</title>
    <defs><clipPath id="${prefix}-square"><rect width="200" height="200"/></clipPath></defs>
    <rect width="200" height="200" fill="#fff"/>
    <g clip-path="url(#${prefix}-square)" fill="none" stroke="#142b38" stroke-width=".55" stroke-linecap="butt">${contents}</g>
    <rect width="200" height="200" fill="none" stroke="#142b38" stroke-width="1.6"/>
    ${index === 0 ? horizontalSpacingDimension() : ''}
  </svg>`;
}

export function createLkpdHero() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 370 265" aria-hidden="true">
    <ellipse cx="188" cy="235" rx="136" ry="12" fill="#8fc5d7" opacity=".18"/>
    <path d="M66 47Q170-5 301 51" fill="none" stroke="#9dcfdf" stroke-width="1.5" stroke-dasharray="3 7"/>
    <g transform="translate(64 13) rotate(-7 120 110)">
      <rect x="8" y="11" width="235" height="214" rx="17" fill="#a9d3e6" opacity=".35"/>
      <rect width="235" height="214" rx="17" fill="#fff" stroke="#b7dcec" stroke-width="1.6"/>
      <rect x="17" y="17" width="77" height="21" rx="10" fill="#dff5fc"/>
      <text x="55" y="31" text-anchor="middle" fill="#1384a2" font-family="sans-serif" font-size="9" font-weight="700">JOB 01 · GARIS</text>
      <path d="M111 26h103M17 49h197" stroke="#d9e8ef" stroke-width="3" stroke-linecap="round"/>
      ${Array.from({ length: 6 }, (_, index) => `<svg x="${17 + (index % 3) * 70}" y="${66 + Math.floor(index / 3) * 69}" width="61" height="61" viewBox="-6 -6 212 212">${createLkpdPattern(index + 1, { decorative: true }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`).join('')}
    </g>
    <g transform="translate(301 45) rotate(23)">
      <path d="M-8 0Q0-7 8 0V151H-8Z" fill="#79c9b1" stroke="#3aa38d" stroke-width="1.4"/>
      <path d="M-2 0V151" stroke="#b2e4d3" stroke-width="3"/>
      <path d="M-8 151L0 175L8 151Z" fill="#f5d9b6" stroke="#b99a78" stroke-width="1"/>
      <path d="M-3 166L0 175L3 166Z" fill="#234357"/>
      <path d="M-8 14H8" stroke="#3aa38d" stroke-width="1.4"/>
    </g>
    <g transform="translate(40 195) rotate(-9)"><rect width="86" height="32" rx="9" fill="#fff0ca" stroke="#e2cf9b"/><path d="M27 0v32" stroke="#e2cf9b"/><text x="56" y="21" text-anchor="middle" fill="#a48b43" font-family="sans-serif" font-size="10">pelan, rapi.</text></g>
    <path d="M32 72v16m-8-8h16M332 209v14m-7-7h14" stroke="#5caac0" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
