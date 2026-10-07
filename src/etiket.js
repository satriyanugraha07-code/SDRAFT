import { ETIKET_TEMPLATES, createEtiketDrawing } from './etiket-drawing.js';
import { etiketFieldInfo, etiketDefaults, normaliseEtiketValues, etiketDrawingValues } from './etiket-data.js';
import { lessonMarkup, fieldControl, sheetDrawing } from './etiket-markup.js';
import { openEtiketPrintPreview } from './etiket-print.js';

const STORAGE_KEY = 'sdraft-etiket-v2';
const primaryFields = ['school', 'title', 'drawingNumber', 'scale', 'unit', 'drawnBy', 'className', 'checkedBy', 'approvedBy', 'date', 'paper', 'projection', 'notes'];
const extraFields = ['partName', 'quantity', 'registerNumber', 'material', 'size', 'revision', 'replaces', 'replacedBy'];

export function initEtiketLesson() {
  const section = document.getElementById('etiket');
  if (!section || section.dataset.initialized) return;
  section.innerHTML = lessonMarkup();
  section.dataset.initialized = 'true';
  const get = id => section.querySelector(`#${id}`);
  const root = section.querySelector('.etiket-lesson');
  let values = etiketDefaults();
  let templateId = 'detail';
  let storageAvailable = true;
  let drawerEdited = false;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored?.version === 2) {
      values = normaliseEtiketValues(stored.values);
      templateId = ETIKET_TEMPLATES[stored.template] ? stored.template : templateId;
      drawerEdited = typeof stored.drawerEdited === 'boolean' ? stored.drawerEdited : true;
    }
  } catch { storageAvailable = false; }
  if (!drawerEdited) {
    try {
      const student = JSON.parse(localStorage.getItem('draftlab_student_session') || 'null');
      values = normaliseEtiketValues({ ...values, drawnBy: student?.nama || 'NAMA SISWA' });
    } catch { /* Invalid saved student data does not prevent the lesson from opening. */ }
  }
  let selected = 'school';
  let dimensionsVisible = true;
  let zoom = 1;
  const edited = new Set();

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, template: templateId, values, drawerEdited }));
      storageAvailable = true;
    } catch { storageAvailable = false; }
    get('etiket-save-status').textContent = storageAvailable ? 'Tersimpan di perangkat ini.' : 'Isian tetap bisa digunakan; penyimpanan perangkat tidak tersedia.';
  };

  const selectField = id => {
    if (!ETIKET_TEMPLATES[templateId].fields[id]) return;
    selected = id;
    const info = etiketFieldInfo[id];
    get('etiket-field-title').textContent = info.label;
    get('etiket-field-description').textContent = info.description;
    get('etiket-field-example').textContent = info.example || info.options?.[0]?.[1] || 'Isi sesuai tugas gambarmu.';
    get('etiket-field-tag').textContent = extraFields.includes(id) ? 'Bagian & perubahan' : 'Identitas gambar';
    get('etiket-live-value').textContent = info.options?.find(([value]) => value === values[id])?.[1] || etiketDrawingValues(values)[id] || 'Belum diisi.';
    get('etiket-status').textContent = `${info.label}: ${info.description}`;
    section.querySelectorAll('#etiket-drawing-host [data-etiket-field]').forEach(field => field.setAttribute('aria-pressed', String(field.dataset.etiketField === selected)));
    section.querySelectorAll('[data-etiket-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.etiketPick === selected)));
    section.querySelectorAll('[data-etiket-label]').forEach(label => label.classList.toggle('is-selected', label.dataset.etiketLabel === selected));
  };

  const renderDrawing = () => {
    const focusedField = get('etiket-drawing-host').contains(document.activeElement) ? document.activeElement.dataset.etiketField : null;
    get('etiket-drawing-host').innerHTML = createEtiketDrawing(templateId, etiketDrawingValues(values), { dimensions: dimensionsVisible });
    get('etiket-sheet-preview').innerHTML = sheetDrawing(templateId, values.paper);
    get('etiket-sheet-title').textContent = `${values.paper} lanskap, sudut kanan bawah.`;
    selectField(selected);
    if (focusedField) get('etiket-drawing-host').querySelector(`[data-etiket-field="${focusedField}"]`)?.focus({ preventScroll: true });
  };

  const setZoom = value => {
    zoom = Math.max(1, Math.min(4, value));
    get('etiket-drawing-host').style.setProperty('--etiket-zoom', zoom);
    get('etiket-zoom-reset').textContent = `${Math.round(zoom * 100)}%`;
    get('etiket-zoom-out').disabled = zoom <= 1;
    get('etiket-zoom-in').disabled = zoom >= 4;
    if (zoom === 1) { get('etiket-stage').scrollLeft = 0; get('etiket-stage').scrollTop = 0; }
  };

  const renderForm = () => {
    const fields = ETIKET_TEMPLATES[templateId].fields;
    const controls = primaryFields.filter(id => fields[id]).map(id => fieldControl(id, values)).join('');
    const extras = extraFields.filter(id => fields[id]).map(id => fieldControl(id, values)).join('');
    get('etiket-form').innerHTML = `<fieldset><legend>Identitas & informasi gambar</legend><div class="etiket-fields-grid">${controls}</div></fieldset>${extras ? `<details class="etiket-extra-fields"><summary>Tabel bagian & perubahan</summary><div class="etiket-fields-grid">${extras}</div></details>` : ''}`;
  };

  const renderTemplate = () => {
    root.dataset.template = templateId;
    get('etiket-stage').dataset.template = templateId;
    get('etiket-template-title').textContent = ETIKET_TEMPLATES[templateId].name;
    section.querySelectorAll('button[data-etiket-template]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.etiketTemplate === templateId)));
    const pickers = ['school', 'title', 'drawingNumber', 'scale', 'drawnBy', 'projection'].filter(id => ETIKET_TEMPLATES[templateId].fields[id]);
    get('etiket-field-picker').innerHTML = pickers.map(id => `<button type="button" data-etiket-pick="${id}" aria-pressed="false">${etiketFieldInfo[id].label}</button>`).join('');
    if (!ETIKET_TEMPLATES[templateId].fields[selected]) selected = 'school';
    renderForm();
    renderDrawing();
    setZoom(1);
  };

  const focusInput = () => {
    const input = get(`etiket-input-${selected}`);
    if (!input) return;
    const disclosure = input.closest('details');
    if (disclosure) disclosure.open = true;
    input.scrollIntoView({ block: 'center', behavior: 'instant' });
    input.focus({ preventScroll: true });
  };

  const formValid = () => {
    const invalid = get('etiket-form').querySelector('input:invalid, select:invalid, textarea:invalid');
    if (!invalid) return true;
    selectField(invalid.dataset.etiketInput);
    focusInput();
    invalid.reportValidity();
    get('etiket-status').textContent = invalid.dataset.etiketInput === 'quantity'
      ? 'Periksa isian yang ditandai sebelum menyimpan hasil. Jumlah bagian harus 1 sampai 999.'
      : 'Periksa isian yang ditandai sebelum menyimpan hasil.';
    return false;
  };

  section.addEventListener('click', event => {
    const template = event.target.closest('button[data-etiket-template]');
    if (template && templateId !== template.dataset.etiketTemplate) { templateId = template.dataset.etiketTemplate; renderTemplate(); save(); }
    const field = event.target.closest('#etiket-drawing-host [data-etiket-field]');
    if (field) selectField(field.dataset.etiketField);
    const picker = event.target.closest('[data-etiket-pick]');
    if (picker) selectField(picker.dataset.etiketPick);
  });
  get('etiket-drawing-host').addEventListener('keydown', event => {
    const field = event.target.closest('[data-etiket-field]');
    if (field && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectField(field.dataset.etiketField); }
  });
  get('etiket-form').addEventListener('submit', event => event.preventDefault());
  get('etiket-form').addEventListener('focusin', event => {
    if (event.target.dataset.etiketInput) selectField(event.target.dataset.etiketInput);
  });
  get('etiket-form').addEventListener('input', event => {
    const id = event.target.dataset.etiketInput;
    if (!id) return;
    if (!event.target.validity.valid) {
      get('etiket-save-status').textContent = id === 'quantity'
        ? 'Jumlah bagian harus 1 sampai 999. Perbaiki isian agar hasilnya diperbarui.'
        : `${etiketFieldInfo[id].label} belum valid. Perbaiki isian agar hasilnya diperbarui.`;
      return;
    }
    values = normaliseEtiketValues({ ...values, [id]: event.target.value });
    selected = id;
    if (id === 'drawnBy') drawerEdited = true;
    edited.add(id);
    renderDrawing();
    save();
    if (edited.size >= 3 && values.title && values.drawingNumber && values.drawnBy && values.school !== 'SMK') window.completeModule?.('etiket');
  });
  get('etiket-edit-field').addEventListener('click', focusInput);
  get('etiket-start').addEventListener('click', () => { selectField('school'); focusInput(); });
  get('etiket-show-preview').addEventListener('click', () => { get('etiket-stage').scrollIntoView({ block: 'center', behavior: 'instant' }); get('etiket-stage').focus({ preventScroll: true }); });
  get('etiket-dimensions').addEventListener('click', () => {
    dimensionsVisible = !dimensionsVisible;
    get('etiket-dimensions').setAttribute('aria-pressed', String(dimensionsVisible));
    get('etiket-dimensions').textContent = dimensionsVisible ? 'Sembunyikan ukuran' : 'Tampilkan ukuran';
    renderDrawing();
  });
  get('etiket-zoom-in').addEventListener('click', () => setZoom(zoom + .5));
  get('etiket-zoom-out').addEventListener('click', () => setZoom(zoom - .5));
  get('etiket-zoom-reset').addEventListener('click', () => setZoom(1));
  get('etiket-reset').addEventListener('click', () => {
    values = etiketDefaults(); drawerEdited = false; edited.clear();
    try { const student = JSON.parse(localStorage.getItem('draftlab_student_session') || 'null'); if (student?.nama) values = normaliseEtiketValues({ ...values, drawnBy: student.nama }); } catch { /* Keep the example name. */ }
    renderForm(); renderDrawing(); save();
    get('etiket-status').textContent = 'Isian kembali ke contoh latihan.';
  });

  get('etiket-download').addEventListener('click', () => {
    if (!formValid()) return;
    const svg = createEtiketDrawing(templateId, etiketDrawingValues(values), { dimensions: false, interactive: false });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `etiket-${templateId}-${values.drawingNumber.replace(/[^\w-]/g, '_') || 'gambar'}.svg`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    get('etiket-status').textContent = `SVG ${ETIKET_TEMPLATES[templateId].width} × ${ETIKET_TEMPLATES[templateId].height} mm sudah diunduh.`;
  });
  get('etiket-print').addEventListener('click', () => {
    if (!formValid()) return;
    openEtiketPrintPreview(section, templateId, values);
    get('etiket-status').textContent = 'Pratinjau cetak siap. Pilih Cetak / Simpan PDF untuk melanjutkan.';
  });
  window.addEventListener('draftlab:student-login', event => {
    if (drawerEdited || !event.detail?.nama) return;
    values = normaliseEtiketValues({ ...values, drawnBy: event.detail.nama });
    renderForm(); renderDrawing(); save();
  });
  window.addEventListener('draftlab:student-logout', () => {
    if (drawerEdited) return;
    values.drawnBy = 'NAMA SISWA';
    renderForm(); renderDrawing(); save();
  });
  renderTemplate();
  if (!storageAvailable) get('etiket-save-status').textContent = 'Isian tetap bisa digunakan; penyimpanan perangkat tidak tersedia.';
}
