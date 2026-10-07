// Teaching geometry adapted from the supplied bearing-cap reference. The flat
// shoulders and simple through holes deliberately omit its counterbores and
// shallow channels; this is a line-reading illustration, not a production plan.
export const CAP_GEOMETRY = Object.freeze({
  width: 98, depth: 56, height: 41, openingRadius: 30.5,
  openingCentre: Object.freeze([49, 0]), plateau: Object.freeze([40, 58]),
  shoulder: Object.freeze([16, 82]), shoulderHeight: 25, footHeight: 7,
  holeDiameter: 9, sectionY: 28, sectionDirection: '+Y',
  holes: Object.freeze([8, 90].flatMap(x => [13, 43].map(y => Object.freeze({ x, y, radius: 4.5 }))))
});

export const DRAWING_VIEWS = Object.freeze({
  all: Object.freeze({ label: 'Semua tampilan', box: Object.freeze([0, 0, 1000, 710]) }),
  front: Object.freeze({ label: 'Tampak depan', box: Object.freeze([35, 35, 465, 325]) }),
  top: Object.freeze({ label: 'Tampak atas', box: Object.freeze([35, 380, 465, 305]) }),
  section: Object.freeze({ label: 'Potongan A–A', box: Object.freeze([520, 35, 445, 325]) }),
  iso: Object.freeze({ label: 'Bentuk benda', box: Object.freeze([520, 380, 445, 305]) })
});

const SCALE = 3.35;
const FRONT = [120, 265];
const TOP = [120, 475];
const SECTION = [590, 265];
const number = value => Number(value.toFixed(3));
const coordinate = point => point.map(number).join(' ');
const front = (x, z, origin = FRONT, scale = SCALE) => [origin[0] + x * scale, origin[1] - z * scale];
const top = (x, y) => [TOP[0] + x * SCALE, TOP[1] + y * SCALE];
const textEscape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const safeId = text => String(text).replace(/[^a-zA-Z0-9_-]/g, '-');
const path = (d, attributes = '') => `<path d="${d}" ${attributes}/>`;
const polyline = points => `M${points.map(coordinate).join('L')}`;
const annotation = (text, x, y, attributes = '') => `<text class="line-drawing-annotation" x="${number(x)}" y="${number(y)}" ${/\bfill=/.test(attributes) ? '' : 'fill="currentColor"'} stroke="none" font-family="Inter, ui-sans-serif, system-ui, sans-serif" ${/\bfont-size=/.test(attributes) ? '' : 'font-size="15"'} ${attributes}>${textEscape(text)}</text>`;
const layerNames = {
  visible: 'Garis benda yang terlihat', dimension: 'Garis ukuran dan garis bantu',
  hidden: 'Garis tersembunyi', center: 'Garis sumbu', cutting: 'Garis bidang potong A–A',
  hatch: 'Garis arsir pada material yang terpotong'
};

function layer(type, contents, attributes = '') {
  const width = type === 'visible' || type === 'cutting' ? 2.8 : 1.4;
  const dash = type === 'hidden' ? 'stroke-dasharray="7 4"' : type === 'cutting' ? 'stroke-dasharray="18 4 1 4"' : '';
  return `<g class="line-drawing-layer" data-line-layer="${type}" data-line-type="${type}" data-layer-label="${layerNames[type]}" role="button" tabindex="0" aria-label="${layerNames[type]}" stroke="currentColor" color="#26425b" stroke-width="${width}" stroke-linecap="butt" stroke-linejoin="round" fill="none" ${dash} ${attributes}>${contents}</g>`;
}

export function outerTopAt(x) {
  if (x < 0 || x > CAP_GEOMETRY.width) return NaN;
  if (x <= 16 || x >= 82) return 25;
  if (x < 40) return 25 + (x - 16) * 16 / 24;
  if (x <= 58) return 41;
  return 41 - (x - 58) * 16 / 24;
}

export function solidFloorAt(x) {
  if (x < 0 || x > CAP_GEOMETRY.width) return NaN;
  if (x < 7 || x > 91) return 7;
  if (x < 18.5 || x > 79.5) return 0;
  return Math.sqrt(Math.max(0, 30.5 ** 2 - (x - 49) ** 2));
}

export function isCapMaterial(x, z) {
  return Number.isFinite(outerTopAt(x)) && z >= solidFloorAt(x) - 1e-7 && z <= outerTopAt(x) + 1e-7;
}

// An underside ledge does not exist inside a through hole. Clip its projected
// hidden edge at the circular openings instead of drawing across empty space.
export function topHiddenSpans(x) {
  const excluded = CAP_GEOMETRY.holes.flatMap(hole => {
    const offset = Math.abs(x - hole.x);
    if (offset >= hole.radius) return [];
    const halfSpan = Math.sqrt(hole.radius ** 2 - offset ** 2);
    return [[Math.max(0, hole.y - halfSpan), Math.min(CAP_GEOMETRY.depth, hole.y + halfSpan)]];
  }).sort((a, b) => a[0] - b[0]);
  const spans = [];
  let cursor = 0;
  for (const [start, end] of excluded) {
    if (start > cursor) spans.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < CAP_GEOMETRY.depth) spans.push([cursor, CAP_GEOMETRY.depth]);
  return spans;
}

export function capProfilePoints(arcSegments = 64) {
  const points = [[0, 7], [0, 25], [16, 25], [40, 41], [58, 41], [82, 25], [98, 25], [98, 7], [91, 7], [91, 0], [79.5, 0]];
  for (let i = 1; i <= arcSegments; i++) {
    const angle = i / arcSegments * Math.PI;
    points.push([49 + 30.5 * Math.cos(angle), 30.5 * Math.sin(angle)]);
  }
  points.push([7, 0], [7, 7]);
  return points;
}

export function capProfilePath(origin = FRONT, scale = SCALE) {
  const outside = [[0, 7], [0, 25], [16, 25], [40, 41], [58, 41], [82, 25], [98, 25], [98, 7], [91, 7], [91, 0], [79.5, 0]];
  const arcEnd = front(18.5, 0, origin, scale);
  const tail = [[7, 0], [7, 7]].map(([x, z]) => front(x, z, origin, scale));
  return `${polyline(outside.map(([x, z]) => front(x, z, origin, scale)))}A${number(30.5 * scale)} ${number(30.5 * scale)} 0 0 0 ${coordinate(arcEnd)}L${tail.map(coordinate).join('L')}Z`;
}

// Position the dashed–dotted pattern so an axis intersection falls in a long
// dash, rather than in a gap or a dot. Its period is 12 + 3 + 1 + 3 = 19.
function axisPath(start, end, intersection = .5) {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const offset = ((6 - length * intersection) % 19 + 19) % 19;
  return path(polyline([start, end]), `stroke-dasharray="12 3 1 3" stroke-dashoffset="${number(offset)}"`);
}

function horizontalDimension(a, b, y, value, prefix) {
  const extension = point => {
    const direction = Math.sign(y - point[1]);
    return path(polyline([[point[0], point[1] + direction * 5], [point[0], y + direction * 7]]));
  };
  return `${extension(a)}${extension(b)}${path(polyline([[a[0], y], [b[0], y]]), `marker-start="url(#${prefix}-arrow)" marker-end="url(#${prefix}-arrow)"`)}${annotation(value, (a[0] + b[0]) / 2, y - 8, 'text-anchor="middle"')}`;
}

function verticalDimension(a, b, x, value, prefix) {
  const extension = point => {
    const direction = Math.sign(x - point[0]);
    return path(polyline([[point[0] + direction * 5, point[1]], [x + direction * 7, point[1]]]));
  };
  const centreY = (a[1] + b[1]) / 2;
  return `${extension(a)}${extension(b)}${path(polyline([[x, a[1]], [x, b[1]]]), `marker-start="url(#${prefix}-arrow)" marker-end="url(#${prefix}-arrow)"`)}${annotation(value, x - 8, centreY, `text-anchor="middle" transform="rotate(-90 ${number(x - 8)} ${number(centreY)})"`)}`;
}

function viewHeader(title, note, x, y) {
  return `${annotation(title, x, y, 'font-weight="750" font-size="18"')}${annotation(note, x, y + 23, 'font-size="12" fill="#668294"')}`;
}

function viewGroup(name, content) {
  const view = DRAWING_VIEWS[name];
  const [x, y, width, height] = view.box;
  return `<g data-drawing-view="${name}" data-view-box="${view.box.join(' ')}" aria-label="${view.label}"><rect class="line-drawing-panel" x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="#ffffff" stroke="#e1edf3" stroke-width="1"/>${content}</g>`;
}

function frontView(prefix) {
  const profile = capProfilePath();
  const hidden = [3.5, 12.5, 85.5, 94.5].map(x => path(polyline([front(x, solidFloorAt(x)), front(x, outerTopAt(x))]))).join('');
  const axes = axisPath(front(49, 44), front(49, -5), 44 / 49) + [8, 90].map(x => axisPath(front(x, 29), front(x, -4), 29 / 33)).join('');
  const arcEnd = front(49 + 30.5 * Math.cos(3 * Math.PI / 4), 30.5 * Math.sin(3 * Math.PI / 4));
  const centre = front(49, 0);
  const radius = path(polyline([centre, arcEnd]), `marker-end="url(#${prefix}-arrow)"`) + annotation('R30.5', 254, 222, 'text-anchor="middle" transform="rotate(45 254 222)"');
  const dimensions = horizontalDimension(front(0, 7), front(98, 7), 310, '98', prefix)
    + horizontalDimension(front(40, 41), front(58, 41), 105, '18', prefix)
    + verticalDimension(front(7, 0), front(40, 41), 70, '41', prefix) + radius;
  return viewGroup('front', viewHeader('Tampak depan', '', 60, 70)
    + layer('hidden', hidden) + layer('center', axes) + layer('visible', path(profile)) + layer('dimension', dimensions)
    + annotation('Lubang di balik permukaan ditunjukkan putus-putus.', 60, 341, 'font-size="12" fill="#668294"'));
}

function topView(prefix) {
  const corners = [[0, 0], [98, 0], [98, 56], [0, 56]].map(([x, y]) => top(x, y));
  const visible = path(`${polyline(corners)}Z`) + [16, 40, 58, 82].map(x => path(polyline([top(x, 0), top(x, 56)]))).join('')
    + CAP_GEOMETRY.holes.map(hole => { const p = top(hole.x, hole.y); return `<circle cx="${number(p[0])}" cy="${number(p[1])}" r="${number(hole.radius * SCALE)}"/>`; }).join('');
  const hidden = [7, 18.5, 79.5, 91].flatMap(x => topHiddenSpans(x).map(([start, end]) => path(polyline([top(x, start), top(x, end)])))).join('');
  const axes = axisPath(top(49, -3), top(49, 59)) + CAP_GEOMETRY.holes.map(hole => axisPath(top(hole.x - 6.5, hole.y), top(hole.x + 6.5, hole.y)) + axisPath(top(hole.x, hole.y - 6.5), top(hole.x, hole.y + 6.5))).join('');
  const plane = top(0, 28)[1];
  const cut = path(`M110 ${number(plane)}H460`, 'stroke-dashoffset="-4"') + [110, 460].map(x => path(`M${x} ${number(plane - 26)}V${number(plane + 10)}`, `stroke-dasharray="none" marker-end="url(#${prefix}-cut-arrow)"`) + annotation('A', x, plane - 33, 'text-anchor="middle" font-weight="700"')).join('');
  const contact = top(90 + 4.5 / Math.sqrt(2), 13 - 4.5 / Math.sqrt(2));
  const holeCallout = path(polyline([[388, 470], [409, 487], contact]), `marker-end="url(#${prefix}-arrow)"`) + annotation('4 × Ø9', 358, 463, 'text-anchor="middle"');
  const dimensions = verticalDimension(top(0, 0), top(0, 56), 72, '56', prefix)
    + verticalDimension(top(98, 0), top(98, 13), 492, '13', prefix)
    + verticalDimension(top(98, 13), top(98, 43), 492, '30', prefix) + holeCallout;
  return viewGroup('top', viewHeader('Tampak atas', 'Bidang A–A berada di tengah kedalaman, y = 28 mm.', 60, 410)
    + layer('hidden', hidden) + layer('center', axes) + layer('visible', visible)
    + layer('cutting', cut, 'data-section-direction="positive-y"') + layer('dimension', dimensions));
}

function sectionView(prefix) {
  const profile = capProfilePath(SECTION);
  const sectionCentre = axisPath(front(49, 44, SECTION), front(49, -5, SECTION), 44 / 49);
  return viewGroup('section', viewHeader('Potongan A–A', 'Arsir hanya material padat; ruang lengkung tetap kosong.', 545, 70)
    + layer('hatch', path(profile, `fill="url(#${prefix}-hatch)" stroke="none"`))
    + layer('center', sectionCentre) + layer('visible', path(profile))
    + annotation('Pandangan mengikuti panah +Y.', 755, 309, 'text-anchor="middle" font-size="12" fill="#668294"'));
}

export function projectIsometric(x, y, z, origin = [560, 540], scale = 2.15) {
  return [origin[0] + (x + y) * Math.sqrt(3) / 2 * scale, origin[1] + ((x - y) / 2 - z) * scale];
}

function isometricCap(prefix, origin, scale, interactive = false) {
  const p = (x, y, z) => projectIsometric(x, y, z, origin, scale);
  const curve = (depth, start = 0, end = Math.PI, count = 48) => Array.from({ length: count + 1 }, (_, i) => { const a = start + (end - start) * i / count; return p(49 + 30.5 * Math.cos(a), depth, 30.5 * Math.sin(a)); });
  const profile = `${polyline(capProfilePoints().map(([x, z]) => p(x, 0, z)))}Z`;
  const aperture = `${polyline(curve(0))}Z`;
  const roof = [[0, 25], [16, 25], [40, 41], [58, 41], [82, 25], [98, 25]];
  const shades = ['#b6e2d6', '#8dcfbe', '#d1ede4', '#a5ddcb', '#c1e8db'];
  const faces = roof.slice(0, -1).map((a, i) => { const b = roof[i + 1]; return path(`${polyline([p(a[0], 0, a[1]), p(b[0], 0, b[1]), p(b[0], 56, b[1]), p(a[0], 56, a[1])])}Z`, `fill="${shades[i]}"`); }).join('');
  const side = path(`${polyline([p(98, 0, 25), p(98, 56, 25), p(98, 56, 7), p(98, 0, 7)])}Z`, 'fill="#75bdaa"');
  const inner = path(`${polyline([...curve(0, 3 * Math.PI / 4, Math.PI, 20), ...curve(56, Math.PI, 3 * Math.PI / 4, 20)])}Z`, `fill="#7aab9e" clip-path="url(#${prefix}-aperture)"`);
  const holes = CAP_GEOMETRY.holes.map(hole => {
    const points = Array.from({ length: 36 }, (_, i) => { const a = i / 36 * Math.PI * 2; return p(hole.x + hole.radius * Math.cos(a), hole.y + hole.radius * Math.sin(a), 25); });
    return path(`${polyline(points)}Z`, 'fill="#386958"');
  }).join('');
  const defs = `<defs><clipPath id="${prefix}-aperture">${path(aperture)}</clipPath></defs>`;
  const contents = `${side}${faces}${inner}${holes}${path(profile, 'fill="#66ad96"')}`;
  return defs + (interactive ? layer('visible', contents) : `<g stroke="#285e53" stroke-width="1.8" stroke-linejoin="round">${contents}</g>`);
}

function isoView(prefix) {
  return viewGroup('iso', viewHeader('Kenali bentuk bendanya', 'Tutup bantalan · empat lubang tembus sederhana.', 545, 410)
    + isometricCap(`${prefix}-iso`, [605, 565], 2, true)
    + annotation('Bentuk disederhanakan dari gambar rujukan.', 742, 674, 'text-anchor="middle" font-size="12" fill="#668294"'));
}

export const lineTargets = Object.freeze({
  visible: Object.freeze({ view: 'front', x: 213.8, y: 154.45, label: 'Tepi benda yang terlihat' }),
  dimension: Object.freeze({ view: 'front', x: 284.15, y: 310, label: 'Garis ukuran 98 mm' }),
  hidden: Object.freeze({ view: 'front', x: 161.875, y: 224.8, label: 'Dinding lubang di balik permukaan' }),
  center: Object.freeze({ view: 'top', x: 146.8, y: 518.55, label: 'Sumbu lubang baut' }),
  cutting: Object.freeze({ view: 'top', x: 438, y: 568.8, label: 'Bidang potong A–A; panah ke +Y' }),
  hatch: Object.freeze({ view: 'section', x: 724, y: 151.1, label: 'Material yang terpotong' })
});

export function createLineDrawing() {
  const prefix = 'line-sheet';
  const defs = `<defs><marker id="${prefix}-arrow" markerWidth="10" markerHeight="4" refX="9" refY="0" viewBox="0 -2 10 4" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 -1.5L9 0L0 1.5Z" fill="#26425b"/></marker><marker id="${prefix}-cut-arrow" markerWidth="19" markerHeight="7" refX="18" refY="0" viewBox="0 -3.5 19 7" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 -3L18 0L0 3Z" fill="#26425b"/></marker><pattern id="${prefix}-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="line-drawing-hatch-stroke" d="M0 0V8" stroke="#26425b" stroke-width="1.4"/></pattern></defs>`;
  return `<svg id="line-technical-drawing" class="line-technical-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 710" role="group" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">Jenis garis pada tutup bantalan</title><desc id="${prefix}-desc">Tampak depan, tampak atas, potongan A–A pada kedalaman y = 28, dan bentuk tiga dimensi ditampilkan bersama dalam panel terpisah untuk belajar. Benda contoh berukuran 98 × 56 × 41 mm, dengan bukaan R30.5 dan empat lubang Ø9. Bahu dan lubang disederhanakan; arsir hanya mengenai material padat. Panah bidang potong menunjuk arah pandang +Y.</desc>${defs}${frontView(prefix)}${sectionView(prefix)}${topView(prefix)}${isoView(prefix)}${annotation('Ukuran dalam mm · tampilan dipisah untuk belajar · contoh disederhanakan', 60, 704, 'font-size="11" fill="#668294"')}</svg>`;
}

let illustrationCount = 0;
export function createCapIllustration(idPrefix = `line-cap-hero-${++illustrationCount}`) {
  const prefix = safeId(idPrefix);
  return `<svg class="line-cap-illustration" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 280" role="img" aria-label="Tutup bantalan dengan bukaan lengkung dan empat lubang baut"><defs><filter id="${prefix}-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#438782" flood-opacity=".18"/></filter></defs><ellipse cx="183" cy="251" rx="142" ry="15" fill="#8dbfb7" opacity=".15"/><g filter="url(#${prefix}-shadow)">${isometricCap(prefix, [40, 160], 2.05)}</g></svg>`;
}
