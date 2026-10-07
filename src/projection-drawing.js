// An L-shaped prism: 120 wide × 120 high × 60 deep. Its front has an
// upper-left step; every other outline is a projection of that same prism.
export const PROJECTION_VIEWS = Object.freeze({
  front: Object.freeze({ name: 'Tampak depan', description: 'Bentuk L menjadi acuan untuk menyusun tampak lainnya.', dimensions: Object.freeze({ width: 120, height: 120 }), color: '#d7f1fc' }),
  top: Object.freeze({ name: 'Tampak atas', description: 'Undakan terlihat dari atas sebagai garis nyata di tengah lebar benda.', dimensions: Object.freeze({ width: 120, height: 60 }), color: '#dcf5ea' }),
  right: Object.freeze({ name: 'Tampak kanan', description: 'Undakan terlihat langsung dari sisi kanan; garis tengah digambar kontinu.', dimensions: Object.freeze({ width: 60, height: 120 }), color: '#ffeadc' }),
  left: Object.freeze({ name: 'Tampak kiri', description: 'Dinding tinggi menutup undakan; garis tersembunyinya digambar putus-putus.', dimensions: Object.freeze({ width: 60, height: 120 }), color: '#eee6fd' }),
  bottom: Object.freeze({ name: 'Tampak bawah', description: 'Undakan tertutup alas benda; garis di tengah digambar putus-putus.', dimensions: Object.freeze({ width: 120, height: 60 }), color: '#fcebdc' }),
  back: Object.freeze({ name: 'Tampak belakang', description: 'Bentuk L terbalik secara horizontal terhadap tampak depan.', dimensions: Object.freeze({ width: 120, height: 120 }), color: '#e1effa' })
});

const MODEL = Object.freeze({ width: 120, height: 120, depth: 60, step: 60 });
const round = value => Number(value.toFixed(3));
const points = coordinates => coordinates.map(point => point.map(round).join(' ')).join('L');
const path = (d, attributes = '') => `<path d="${d}" ${attributes}/>`;
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let sequence = 0;
const systemId = system => system === 'us' ? 'us' : 'eu';
const resolvedView = id => Object.hasOwn(PROJECTION_VIEWS, id) ? id : 'front';

export function viewPosition(id, system = 'eu') {
  const positions = {
    front: [1, 1], back: [3, 1],
    top: [1, systemId(system) === 'eu' ? 2 : 0],
    bottom: [1, systemId(system) === 'eu' ? 0 : 2],
    right: [systemId(system) === 'eu' ? 0 : 2, 1],
    left: [systemId(system) === 'eu' ? 2 : 0, 1]
  };
  const [col, row] = positions[resolvedView(id)];
  return { col, row };
}

function text(value, x, y, size = 13, attributes = '') {
  return `<text x="${round(x)}" y="${round(y)}" font-family="Inter, Arial, ui-sans-serif, sans-serif" font-size="${size}" ${/\bfill=/.test(attributes) ? '' : 'fill="currentColor"'} stroke="none" ${attributes}>${escape(value)}</text>`;
}

function outline(id) {
  if (id === 'front') return 'M0 0H60V60H120V120H0Z';
  if (id === 'back') return 'M60 0H120V120H0V60H60Z';
  const { width, height } = PROJECTION_VIEWS[id].dimensions;
  return `M0 0H${width}V${height}H0Z`;
}

function projectedShape(id, { x = 0, y = 0, scale = 1, colored = true } = {}) {
  const info = PROJECTION_VIEWS[id];
  const detail = id === 'top' || id === 'bottom' ? 'M60 0V60' : id === 'right' || id === 'left' ? 'M0 60H60' : '';
  const hidden = id === 'left' || id === 'bottom';
  return `<g class="projection-view-shape" data-shape-view="${id}" transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})" fill="${colored ? info.color : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${path(outline(id), 'class="projection-visible-outline"')}${detail ? path(detail, `class="${hidden ? 'projection-hidden-edge' : 'projection-visible-edge'}" fill="none" ${hidden ? 'stroke-dasharray="6 4" stroke-width="1.2"' : ''}`) : ''}</g>`;
}

function tile(id, x, y, { selected = false, interactive = true, dimensions = false, width = 225, height = 190 } = {}) {
  const info = PROJECTION_VIEWS[id];
  // Every view uses the same model scale, so a 120 mm edge has identical
  // screen length in front, back, top, and bottom views.
  const scale = Math.min((width - 50) / MODEL.width, (height - 64) / MODEL.height, 1.2);
  const shapeWidth = info.dimensions.width * scale, shapeHeight = info.dimensions.height * scale;
  const shapeX = x + (width - shapeWidth) / 2, shapeY = y + 38 + (height - 64 - shapeHeight) / 2;
  const label = dimensions ? `${info.dimensions.width} × ${info.dimensions.height} mm` : (id === 'left' || id === 'bottom') ? 'Undakan tersembunyi' : id === 'front' ? 'Tampak acuan' : '';
  return `<g class="projection-layout-view${selected ? ' is-selected' : ''}" data-projection-view="${id}" data-view-width="${info.dimensions.width}" data-view-height="${info.dimensions.height}" ${interactive ? `role="button" tabindex="0" aria-label="Pilih ${info.name.toLowerCase()}" aria-pressed="${selected}"` : `aria-label="${info.name}"`}><rect class="projection-view-tile" x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${selected ? '#e9f8fe' : '#ffffff'}" stroke="${selected ? '#22a5c1' : '#dcebf2'}" stroke-width="${selected ? 2 : 1}"/>${text(info.name, x + width / 2, y + 24, 14, 'text-anchor="middle" font-weight="700"')}${projectedShape(id, { x: shapeX, y: shapeY, scale })}${label ? text(label, x + width / 2, y + height - 8, 10, 'text-anchor="middle" fill="#557489"') : ''}</g>`;
}

export function createViewDrawing(id = 'front', options = {}) {
  const view = resolvedView(id);
  const { dimensions = false, interactive = false, selected = false } = options;
  const prefix = `projection-view-${view}-${++sequence}`;
  const info = PROJECTION_VIEWS[view];
  if (options.plane) {
    return `<svg class="projection-plane-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" aria-hidden="true"><g color="#398fa7">${projectedShape(view, { x: (300 - info.dimensions.width) / 2, y: (300 - info.dimensions.height) / 2, colored: false })}</g></svg>`;
  }
  return `<svg class="projection-view-svg" data-projection-view="${view}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 225 190" role="group" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">${info.name}</title><desc id="${prefix}-desc">${info.description} Ukuran ${info.dimensions.width} × ${info.dimensions.height} mm.</desc><g color="#214860">${tile(view, 0, 0, { dimensions, interactive, selected })}</g></svg>`;
}

function symbolContents(system) {
  const european = systemId(system) === 'eu';
  const coneX = european ? 12 : 59;
  const ringX = european ? 93 : 32;
  const cone = `M${coneX} 29L${coneX + 39} 21V65L${coneX} 57Z`;
  // The frustum's small end stays left for both projection systems.
  return `<g class="projection-symbol-geometry" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">${path(cone, 'class="projection-symbol-frustum"')}<circle class="projection-symbol-circle" cx="${ringX}" cy="43" r="22"/><circle cx="${ringX}" cy="43" r="13"/>${path(`M5 43H119M${ringX} 15V71`, 'class="projection-symbol-axis" stroke-width="1" stroke-dasharray="12 3 1 3"')}</g>`;
}

export function createProjectionSymbol(system = 'eu') {
  const value = systemId(system);
  const label = value === 'eu' ? 'Simbol proyeksi sudut I: kerucut terpancung kiri, lingkaran kanan' : 'Simbol proyeksi sudut III: lingkaran kiri, kerucut terpancung kanan';
  return `<svg class="projection-symbol-svg" data-system="${value}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 86" role="img" aria-label="${label}" color="#214860">${symbolContents(value)}</svg>`;
}

export function createProjectionLayout(system = 'eu', selected = 'front') {
  const value = systemId(system), active = resolvedView(selected), prefix = `projection-layout-${++sequence}`;
  const groups = Object.keys(PROJECTION_VIEWS).map(id => {
    const { col, row } = viewPosition(id, value);
    return tile(id, 20 + col * 245, 20 + row * 210, { selected: id === active, interactive: true });
  }).join('');
  return `<svg class="projection-layout-svg" data-system="${value}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" role="group" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">Susunan enam tampak proyeksi ${value === 'eu' ? 'sudut I' : 'sudut III'}</title><desc id="${prefix}-desc">Satu benda L berukuran 120 × 120 × 60 mm. Tampak depan berada di tengah dan menjadi acuan. ${value === 'eu' ? 'Tampak atas diletakkan di bawah; tampak kanan di kiri.' : 'Tampak atas diletakkan di atas; tampak kanan di kanan.'} Tampak belakang berada di ujung kanan.</desc><g color="#214860">${groups}</g></svg>`;
}

function isometricL() {
  const p = (x, depth, screenY) => [62 + (x + depth) * .866 * 1.5, 142 + ((x - depth) * .5 + screenY) * .9];
  const face = vertices => `M${points(vertices.map(([x, d, y]) => p(x, d, y)))}Z`;
  const front = [[0, 0, 0], [60, 0, 0], [60, 0, 60], [120, 0, 60], [120, 0, 120], [0, 0, 120]];
  return `<g class="projection-hero-solid" stroke="#347286" stroke-width="2" stroke-linejoin="round"><path d="${face([[0, 0, 0], [60, 0, 0], [60, 60, 0], [0, 60, 0]])}" fill="#c8edf7"/><path d="${face([[60, 0, 0], [60, 60, 0], [60, 60, 60], [60, 0, 60]])}" fill="#8ecedc"/><path d="${face([[60, 0, 60], [120, 0, 60], [120, 60, 60], [60, 60, 60]])}" fill="#c1e9dc"/><path d="${face([[120, 0, 60], [120, 60, 60], [120, 60, 120], [120, 0, 120]])}" fill="#84c9b8"/><path d="${face(front)}" fill="#97d9e7"/></g>`;
}

export function createProjectionHero() {
  const prefix = `projection-hero-${++sequence}`;
  return `<svg class="projection-hero-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 350" role="img" aria-label="Benda L dan contoh tampak depan, atas, serta samping"><defs><filter id="${prefix}-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#478cab" flood-opacity=".17"/></filter></defs><ellipse cx="217" cy="293" rx="157" ry="23" fill="#8ec6cf" opacity=".18"/><g filter="url(#${prefix}-shadow)">${isometricL()}</g><g transform="translate(258 21) rotate(8 62 43)"><rect width="126" height="82" rx="12" fill="#fff" stroke="#cde7ef"/><g color="#3e788d">${projectedShape('front', { x: 11, y: 14, scale: .39 })}${projectedShape('right', { x: 70, y: 14, scale: .39 })}</g></g><g transform="translate(25 35) rotate(-9 63 40)"><rect width="119" height="71" rx="12" fill="#fff" stroke="#cde7ef"/><g color="#3e788d">${projectedShape('top', { x: 15, y: 18, scale: .7 })}</g></g><path d="M152 93Q187 69 239 80" fill="none" stroke="#58aec4" stroke-width="2" stroke-dasharray="5 5"/><circle cx="155" cy="92" r="4" fill="#ffd277"/></svg>`;
}

export const PROJECTION_MODEL = MODEL;
