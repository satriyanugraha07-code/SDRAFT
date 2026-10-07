// Two teaching title blocks redrawn from the supplied references. Their layout
// is an example for school drawings, rather than a mandatory standard layout.
const field = (label, x, y, width, height) => Object.freeze({ label, x, y, width, height });
export const ETIKET_TEMPLATES = Object.freeze({
  detail: Object.freeze({
    id: 'detail', name: 'Etiket lengkap', width: 185, height: 68,
    columns: Object.freeze([21, 64, 16, 30, 30, 24]), rows: Object.freeze([7, 7, 14, 26, 14]),
    fields: Object.freeze({
      quantity: field('Jumlah bagian', 0, 0, 21, 7), partName: field('Nama bagian', 21, 0, 64, 7),
      registerNumber: field('Nomor register', 85, 0, 16, 7), material: field('Bahan', 101, 0, 30, 7),
      size: field('Ukuran bagian', 131, 0, 30, 7), notes: field('Keterangan', 161, 0, 24, 7),
      revision: field('Perubahan atau revisi', 21, 14, 99, 14),
      replaces: field('Pengganti dari', 120, 14, 65, 7), replacedBy: field('Diganti dengan', 120, 21, 65, 7),
      title: field('Judul gambar', 21, 28, 99, 26), scale: field('Skala gambar', 120, 28, 15, 26),
      drawnBy: field('Nama penggambar', 155, 28, 15, 6.5), checkedBy: field('Nama pemeriksa', 155, 34.5, 15, 6.5),
      approvedBy: field('Nama penyetuju', 155, 41, 15, 6.5), date: field('Tanggal gambar', 170, 47.5, 15, 6.5),
      school: field('Nama SMK', 21, 54, 99, 14), drawingNumber: field('Nomor gambar', 120, 54, 65, 14)
    })
  }),
  ringkas: Object.freeze({
    id: 'ringkas', name: 'Etiket ringkas', width: 185, height: 30,
    columns: Object.freeze([30, 40, 64, 35, 16]), rows: Object.freeze([5, 15, 10]),
    fields: Object.freeze({
      scale: field('Skala gambar', 30, 5, 40, 5), unit: field('Satuan ukuran', 30, 10, 40, 5),
      date: field('Tanggal gambar', 30, 15, 40, 5), drawnBy: field('Nama penggambar', 70, 5, 64, 5),
      className: field('Kelas', 70, 10, 64, 5), checkedBy: field('Nama pemeriksa', 70, 15, 64, 5),
      notes: field('Keterangan', 134, 5, 35, 15), paper: field('Format kertas', 169, 20, 16, 10),
      projection: field('Simbol proyeksi', 0, 5, 30, 15),
      school: field('Nama SMK', 0, 20, 70, 10), title: field('Judul gambar', 70, 20, 64, 10),
      drawingNumber: field('Nomor gambar', 134, 20, 35, 10)
    })
  })
});

const DEFAULT_VALUES = Object.freeze({
  school: 'SMK NAMA SEKOLAH', title: 'MACAM ETIKET', drawingNumber: 'GT-001', scale: '1 : 1', unit: 'mm',
  drawnBy: 'Siswa', checkedBy: 'Guru', approvedBy: 'Guru', date: '07-10-2026', className: 'X',
  notes: 'Gambar latihan', material: 'Baja', partName: 'Tutup bantalan', quantity: '1', registerNumber: '01',
  size: '—', paper: 'A4', projection: 'first', revision: '—', replaces: '—', replacedBy: '—'
});
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const round = value => Number(value.toFixed(3));
const line = (x1, y1, x2, y2, extra = '') => `<path d="M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}" ${extra}/>`;
let drawingSequence = 0;

const textAdvance = value => [...String(value ?? '')].reduce((count, character) => count + (/\s/.test(character) ? .35 : /[MW@]/.test(character) ? .88 : /[ilI1.,:]/.test(character) ? .29 : .57), 0);

export function fitEtiketFont(text, width, height, preferred = 3.1) {
  const characters = textAdvance(text);
  return Math.max(.9, Math.min(preferred, height * .54, width / Math.max(1, characters)));
}

function schoolName(value) {
  const cleaned = String(value ?? '').replace(/\buniversitas\b/ig, 'SMK').trim();
  return /^SMK\b/i.test(cleaned) ? cleaned : `SMK ${cleaned || 'NAMA SEKOLAH'}`;
}

function text(value, x, y, width, height, preferred = 3.1, attributes = '') {
  const fitted = round(fitEtiketFont(value, width, height, preferred));
  const widthFit = textAdvance(value) * fitted > width ? `textLength="${round(width)}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="${round(x)}" y="${round(y)}" font-size="${fitted}" ${widthFit} dominant-baseline="middle" fill="currentColor" stroke="none" ${attributes}>${escape(value)}</text>`;
}

function centered(value, box, size = 3.1, attributes = '') {
  return text(value, box.x + box.width / 2, box.y + box.height / 2, box.width - 3, box.height - 1, size, `text-anchor="middle" ${attributes}`);
}

function entry(id, value, template, interactive, contents) {
  const box = template.fields[id];
  const hitArea = interactive ? `<rect class="etiket-field-hit" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="transparent" stroke="none"/>` : '';
  return `<g class="etiket-field" data-etiket-field="${id}" data-field-box="${box.x} ${box.y} ${box.width} ${box.height}" ${interactive ? `role="button" tabindex="0" aria-label="${escape(box.label)}: ${escape(value)}"` : `aria-label="${escape(box.label)}: ${escape(value)}"`}>${hitArea}${contents || centered(value, box)}</g>`;
}

function detailGrid() {
  let output = '<rect x="0" y="0" width="185" height="68"/>';
  output += [7, 14].map(y => line(0, y, 185, y)).join('');
  output += [21, 85, 101, 131, 161].map(x => line(x, 0, x, 14)).join('');
  output += [7, 14].map(x => line(x, 14, x, 68)).join('');
  output += line(21, 14, 21, 68) + line(120, 14, 120, 68);
  output += [28, 54].map(y => line(21, y, 185, y)).join('');
  output += [135, 155, 170].map(x => line(x, 28, x, 54)).join('');
  output += [34.5, 41, 47.5].map(y => line(135, y, 185, y)).join('');
  return output;
}

function ringkasGrid() {
  let output = '<rect x="0" y="0" width="185" height="30"/>';
  output += line(0, 5, 185, 5) + line(0, 20, 185, 20);
  output += [30, 70, 134, 169].map(x => line(x, 5, x, x === 30 ? 20 : 30)).join('');
  output += [10, 15].map(y => line(30, y, 134, y)).join('');
  return output;
}

function detailContents(template, values, interactive) {
  const fields = template.fields;
  let output = Object.entries({ quantity: values.quantity, partName: values.partName, registerNumber: values.registerNumber, material: values.material, size: values.size, notes: values.notes }).map(([id, value]) => entry(id, value, template, interactive)).join('');
  const captions = [['Jumlah', 0, 21], ['Nama bagian', 21, 64], ['No. Reg', 85, 16], ['Bahan', 101, 30], ['Ukuran', 131, 30], ['Keterangan', 161, 24]];
  output += captions.map(([caption, x, width]) => centered(caption, { x, y: 7, width, height: 7 }, 2.9, 'font-style="italic"')).join('');
  output += entry('revision', values.revision, template, interactive, text('Perubahan', 23, 16.5, 95, 4, 2.9, 'font-style="italic"') + text(values.revision, 23, 23, 95, 7, 3.1));
  output += entry('replaces', values.replaces, template, interactive, text(`Pengganti dari: ${values.replaces}`, 122, 17.5, 61, 6, 2.8, 'font-style="italic"'));
  output += entry('replacedBy', values.replacedBy, template, interactive, text(`Diganti dengan: ${values.replacedBy}`, 122, 24.5, 61, 6, 2.8, 'font-style="italic"'));
  output += entry('title', values.title, template, interactive, centered(values.title, fields.title, 9, 'font-style="italic" font-weight="500"'));
  output += entry('scale', values.scale, template, interactive, text('Skala', 122, 31.2, 11, 5, 2.9, 'font-style="italic"') + text(values.scale, 127.5, 39.5, 12, 12, 3.5, 'text-anchor="middle"'));
  for (const [id, caption, y] of [['drawnBy', 'Digambar', 28], ['checkedBy', 'Diperiksa', 34.5], ['approvedBy', 'Disetujui', 41], ['date', 'Waktu', 47.5]]) {
    output += text(caption, 136.5, y + 3.25, 17, 6, 2.5, 'font-style="italic"');
    const box = fields[id];
    output += entry(id, values[id], template, interactive, centered(values[id], box, 2.6));
  }
  output += entry('school', values.school, template, interactive, centered(values.school, fields.school, 5.5, 'font-style="italic"'));
  output += entry('drawingNumber', values.drawingNumber, template, interactive, centered(`No. ${values.drawingNumber}`, fields.drawingNumber, 5.1, 'font-style="italic"'));
  return output;
}

function ringkasProjection(prefix, projection = 'first') {
  // ISO 5456-2: the frustum keeps its small end at the left in both symbols.
  // First-angle places the circle right; third-angle places the circle left.
  const ringX = projection === 'third' ? 9 : 20.5;
  const cone = projection === 'third' ? 'M15 8.5L26 7L26 18L15 16.5Z' : 'M4 8.5L15 7L15 18L4 16.5Z';
  return `<g class="etiket-projection-symbol" data-projection="${projection}" data-symbol-id="${prefix}"><path d="${cone}"/><circle cx="${ringX}" cy="12.5" r="4.7"/><circle cx="${ringX}" cy="12.5" r="2.7"/><path d="M2 12.5H28M${ringX} 6V19" stroke-width=".18" stroke-dasharray="4 1 .3 1"/></g>`;
}

function ringkasContents(template, values, interactive, prefix, projection) {
  const fields = template.fields;
  let output = entry('projection', projection === 'third' ? 'Sudut III' : 'Sudut I', template, interactive, ringkasProjection(prefix, projection));
  for (const [id, caption] of [['scale', 'Skala'], ['unit', 'Satuan ukuran'], ['date', 'Tanggal'], ['drawnBy', 'Digambar'], ['className', 'Kelas'], ['checkedBy', 'Diperiksa']]) {
    const box = fields[id];
    output += entry(id, values[id], template, interactive, text(`${caption}: ${values[id]}`, box.x + 1.3, box.y + box.height / 2, box.width - 2.6, box.height - .5, 2.7, 'font-style="italic"'));
  }
  output += entry('notes', values.notes, template, interactive, text('Keterangan:', 135.5, 7.8, 32, 5, 2.6, 'font-style="italic"') + text(values.notes, 135.5, 13.6, 32, 8, 2.8));
  output += entry('paper', values.paper, template, interactive, text(values.paper, 177, 25, 13, 9, 3.3, 'text-anchor="middle" font-style="italic"'));
  output += entry('school', values.school, template, interactive, centered(values.school, fields.school, 3.8, 'font-style="italic"'));
  output += entry('title', values.title, template, interactive, centered(values.title, fields.title, 4.5, 'font-style="italic"'));
  output += entry('drawingNumber', values.drawingNumber, template, interactive, centered(`No. ${values.drawingNumber}`, fields.drawingNumber, 3.7, 'font-style="italic"'));
  return output;
}

function dimensions(template, prefix) {
  const arrows = `marker-start="url(#${prefix}-arrow)" marker-end="url(#${prefix}-arrow)"`;
  const label = (value, x, y) => text(value, x, y, 32, 7, 3.4, 'text-anchor="middle"');
  let output = '';
  let cursor = 0;
  for (const width of template.columns) {
    output += line(cursor, -1.5, cursor, -9) + line(cursor, -7, cursor + width, -7, arrows) + label(width, cursor + width / 2, -11);
    cursor += width;
  }
  output += line(185, -1.5, 185, -9);
  const bottom = template.height + 10;
  output += line(0, template.height + 1.5, 0, bottom + 2) + line(185, template.height + 1.5, 185, bottom + 2) + line(0, bottom, 185, bottom, arrows) + label('185', 92.5, bottom + 4.8);
  if (template.id === 'detail') {
    output += line(120, 69.5, 120, 76) + line(120, 74, 185, 74, arrows) + label('65', 152.5, 72.2);
    let y = 0;
    for (const height of template.rows) {
      output += line(186.5, y, 195, y) + line(193, y, 193, y + height, arrows) + text(height, 198, y + height / 2, 8, height, 3.2, 'text-anchor="middle"');
      y += height;
    }
    output += line(186.5, 68, 195, 68);
  } else {
    output += line(70, 31.5, 70, 38) + line(0, 36, 70, 36, arrows) + label('70', 35, 34.2);
    let y = 0;
    for (const height of [5, 15, 10]) {
      output += line(-1.5, y, -10, y) + line(-8, y, -8, y + height, arrows) + text(height, -12, y + height / 2, 8, height, 3.1, 'text-anchor="middle"');
      y += height;
    }
    output += line(-1.5, 30, -10, 30);
  }
  return `<g class="etiket-dimensions" fill="none" stroke="#526b7d" stroke-width=".2" color="#526b7d">${output}</g>`;
}

export function createEtiketDrawing(templateId = 'detail', values = {}, options = {}) {
  const template = ETIKET_TEMPLATES[templateId] || ETIKET_TEMPLATES.detail;
  const configuration = { dimensions: true, interactive: true, projection: values.projection || 'first', ...options };
  const input = { ...DEFAULT_VALUES, ...values };
  input.school = schoolName(input.school);
  const prefix = `etiket-${template.id}-${++drawingSequence}`;
  const box = configuration.dimensions ? [-19, -17, 230, template.height + 34] : [0, 0, 185, template.height];
  const contents = template.id === 'detail' ? detailContents(template, input, configuration.interactive) : ringkasContents(template, input, configuration.interactive, prefix, configuration.projection);
  const grid = template.id === 'detail' ? detailGrid() : ringkasGrid();
  return `<svg class="etiket-drawing-svg" data-template="${template.id}" data-table-width="185" data-table-height="${template.height}" ${!configuration.dimensions && !configuration.interactive ? `width="185mm" height="${template.height}mm"` : ''} xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="group" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">${template.name} untuk gambar teknik SMK</title><desc id="${prefix}-desc">Contoh etiket sekolah dengan lebar 185 mm dan tinggi ${template.height} mm. Susunan mengikuti gambar rujukan; nama sekolah menggunakan SMK. ${configuration.interactive ? 'Pilih kolom untuk melihat atau mengubah isinya.' : ''}</desc><defs><marker id="${prefix}-arrow" markerWidth="2.6" markerHeight="1" refX="2.3" refY="0" viewBox="0 -.5 2.6 1" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 -.4L2.3 0L0 .4Z" fill="#526b7d"/></marker></defs><g class="etiket-table" font-family="Inter, Arial, ui-sans-serif, sans-serif" color="#203f54" stroke-width=".35" stroke="#203f54" fill="none"><rect class="etiket-paper" x="0" y="0" width="185" height="${template.height}" fill="#fff" stroke="none"/>${contents}<g class="etiket-grid" pointer-events="none">${grid}</g></g>${configuration.dimensions ? dimensions(template, prefix) : ''}</svg>`;
}

export function createEtiketThumbnail(templateId = 'detail') {
  return createEtiketDrawing(templateId, { title: 'GAMBAR TEKNIK', school: 'SMK', drawnBy: 'Siswa', date: '—' }, { dimensions: false, interactive: false });
}

export function createEtiketHero() {
  return createEtiketDrawing('detail', { title: 'GAMBAR TEKNIK', school: 'SMK', partName: 'Nama bagian', material: 'Bahan', registerNumber: 'No.', quantity: '1', size: 'A4' }, { dimensions: false, interactive: false });
}
