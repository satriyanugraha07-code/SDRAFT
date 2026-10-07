import { ETIKET_TEMPLATES, createEtiketDrawing } from './etiket-drawing.js';
import { etiketPaper, etiketDrawingValues } from './etiket-data.js';

const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
let printSequence = 0;

function paperPreview(template, paper, drawing, paperId) {
  const prefix = `etiket-print-paper-${++printSequence}`;
  const x = paper.width - 10 - template.width;
  const y = paper.height - 10 - template.height;
  // This title block is measured in the outer paper's millimetre view-space.
  const nested = drawing.replace(/^<svg\b([^>]*)>/, (_, attributes) => {
    const cleaned = attributes.replace(/\s(?:class|width|height)="[^"]*"/g, '');
    return `<svg${cleaned} x="${x}" y="${y}" width="${template.width}" height="${template.height}">`;
  });
  return `<svg class="etiket-print-paper-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${paper.width} ${paper.height}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc">
    <title id="${prefix}-title">${paperId} lanskap dengan ${template.name.toLowerCase()}</title>
    <desc id="${prefix}-desc">Lembar berukuran ${paper.width} kali ${paper.height} milimeter. Etiket selebar ${template.width} milimeter dan tinggi ${template.height} milimeter berada di kanan bawah. Margin kiri 20 milimeter; margin lainnya 10 milimeter.</desc>
    <rect width="${paper.width}" height="${paper.height}" fill="#fff"/>
    <rect class="etiket-print-frame" x="20" y="10" width="${paper.width - 30}" height="${paper.height - 20}" fill="none" stroke="#203f54" stroke-width=".35"/>
    ${nested}
  </svg>`;
}

function printDocument(template, paper, drawing, paperId, drawingNumber) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Etiket ${escape(drawingNumber || 'gambar teknik')}</title><style>
    @page { size: ${paperId} landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .paper { position: relative; width: ${paper.width}mm; height: ${paper.height}mm; margin: 0; padding: 0; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .frame { position: absolute; left: 20mm; top: 10mm; right: 10mm; bottom: 10mm; border: .35mm solid #203f54; }
    .title-block { position: absolute; right: 10mm; bottom: 10mm; width: ${template.width}mm; height: ${template.height}mm; }
    .title-block > svg { display: block; width: ${template.width}mm; height: ${template.height}mm; margin: 0; padding: 0; }
    @media print { html, body { width: ${paper.width}mm; height: ${paper.height}mm; } }
  </style></head><body><div class="paper"><div class="frame"></div><div class="title-block">${drawing}</div></div></body></html>`;
}

export function openEtiketPrintPreview(section, templateId, values = {}) {
  const template = ETIKET_TEMPLATES[templateId] || ETIKET_TEMPLATES.detail;
  const paperId = Object.hasOwn(etiketPaper, values.paper) ? values.paper : 'A4';
  const paper = etiketPaper[paperId];
  const drawing = createEtiketDrawing(template.id, etiketDrawingValues(values), { dimensions: false, interactive: false });
  let dialog = section.querySelector('#etiket-print-preview');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'etiket-print-preview';
    dialog.className = 'etiket-print-preview';
    dialog.setAttribute('aria-labelledby', 'etiket-print-title');
    dialog.setAttribute('aria-describedby', 'etiket-print-description');
    section.append(dialog);
  }
  dialog.innerHTML = `<div class="etiket-print-heading"><div><p class="etiket-print-kicker">${paperId} lanskap · ${paper.width} × ${paper.height} mm</p><h2 id="etiket-print-title">Pratinjau cetak</h2></div><button type="button" class="etiket-print-close" aria-label="Tutup pratinjau cetak">Tutup <span aria-hidden="true">×</span></button></div>
    <p class="etiket-print-description" id="etiket-print-description">${template.name} · ${template.width} × ${template.height} mm. Gunakan ukuran sebenarnya atau 100% saat mencetak.</p>
    <div class="etiket-print-paper-viewport">${paperPreview(template, paper, drawing, paperId)}</div>
    <div class="etiket-print-actions"><p class="etiket-print-status" role="status" aria-live="polite">Menyiapkan lembar cetak.</p><button type="button" class="etiket-print-primary" disabled>Cetak / Simpan PDF</button></div>`;
  const closeButton = dialog.querySelector('.etiket-print-close');
  const printButton = dialog.querySelector('.etiket-print-primary');
  const status = dialog.querySelector('.etiket-print-status');
  const iframe = document.createElement('iframe');
  iframe.className = 'etiket-print-frame-host';
  iframe.title = 'Dokumen etiket untuk cetak';
  iframe.tabIndex = -1;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.addEventListener('load', () => {
    if (!iframe.isConnected) return;
    printButton.disabled = false;
    status.textContent = 'Lembar siap. Pilih Cetak / Simpan PDF untuk membuka pilihan printer.';
  });
  iframe.srcdoc = printDocument(template, paper, drawing, paperId, values.drawingNumber);
  dialog.append(iframe);
  closeButton.addEventListener('click', () => dialog.close());
  printButton.addEventListener('click', () => {
    if (printButton.disabled || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      status.textContent = 'Pilihan cetak belum terbuka. Coba tombol Cetak / Simpan PDF sekali lagi.';
    }
  });
  if (!dialog.open) dialog.showModal();
  return true;
}
