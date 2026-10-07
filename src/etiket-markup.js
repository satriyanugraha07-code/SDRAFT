import { etiketFieldInfo, etiketPaper } from './etiket-data.js';
import { ETIKET_TEMPLATES, createEtiketHero, createEtiketThumbnail } from './etiket-drawing.js';

const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
let sheetSequence = 0;

function heroDrawing() {
  // Give the nested title block an explicit view-space size, independent of its
  // standalone millimetre dimensions and the full-preview CSS class.
  const titleBlock = createEtiketHero().replace(/^<svg\b([^>]*)>/, (_, attributes) => {
    const cleaned = attributes.replace(/\s(?:class|width|height)="[^"]*"/g, '');
    return `<svg${cleaned} x="73" y="168" width="185" height="68">`;
  });
  return `<svg viewBox="0 0 360 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="181" cy="255" rx="133" ry="13" fill="#4a91af" opacity=".12"/>
    <g transform="rotate(-6 173 140)">
      <path d="M47 25H265L290 50V250H47Z" fill="#fff" stroke="#95c9db" stroke-width="1.5"/>
      <path d="M265 25V50H290" fill="#e3f4fb" stroke="#95c9db" stroke-width="1.5"/>
      <rect x="61" y="43" width="215" height="194" rx="1" fill="none" stroke="#c0dce7" stroke-width="1"/>
      <text x="75" y="69" fill="#247b99" font-family="Arial, sans-serif" font-size="13" font-weight="700">SMK · GAMBAR TEKNIK</text>
      <g fill="none" stroke="#7cabbc" stroke-width="1.4">
        <path d="M98 97H220V144H98ZM119 97V144M197 97V144"/>
        <circle cx="159" cy="121" r="14"/>
        <path d="M159 101V141M139 121H179" stroke-dasharray="7 3 1 3"/>
      </g>
      ${titleBlock}
    </g>
    <g transform="translate(290 94) rotate(24)">
      <rect x="-8" y="0" width="16" height="104" rx="4" fill="#efbb53" stroke="#cb9235" stroke-width="1.2"/>
      <path d="M-3 8V103" stroke="#f8d88b" stroke-width="4"/>
      <rect x="-8" y="-13" width="16" height="16" rx="5" fill="#eb9b90"/>
      <path d="M-8 0H8" stroke="#95a6ac" stroke-width="6"/>
      <path d="M-8 104L0 124L8 104Z" fill="#e8c6a0" stroke="#bb976e" stroke-width="1"/>
      <path d="M-2.5 117L0 124L2.5 117Z" fill="#38505c"/>
    </g>
    <path d="M297 221l4 7 8 1-6 5 1 8-7-4-7 4 1-8-6-5 8-1Z" fill="#f4c66a"/>
  </svg>`;
}

export function lessonMarkup() {
  const cards = ['detail', 'ringkas'].map(id => {
    const template = ETIKET_TEMPLATES[id];
    const description = id === 'detail'
      ? 'Ruang lebih lengkap untuk identitas gambar, tabel bagian, dan pemeriksaan.'
      : 'Identitas utama dalam susunan pendek, termasuk kelas dan simbol proyeksi.';
    return `<button type="button" class="etiket-template-card" data-etiket-template="${id}" aria-label="Pilih ${template.name.toLowerCase()}" aria-pressed="${id === 'detail'}">
      <span class="etiket-template-art" aria-hidden="true">${createEtiketThumbnail(id)}</span>
      <span class="etiket-template-card-title">${template.name}<span aria-hidden="true">↗</span></span>
      <span class="etiket-template-description">${description}</span>
      <span class="etiket-template-dimensions">${template.width} × ${template.height} mm</span>
    </button>`;
  }).join('');
  return `<div class="etiket-lesson" aria-labelledby="etiket-lesson-title">
    <header class="etiket-hero">
      <div class="etiket-hero-copy">
        <p class="etiket-eyebrow"><span aria-hidden="true">✦</span> KENALI ETIKET GAMBAR</p>
        <h2 id="etiket-lesson-title">Gambarmu punya<br><span>identitas sendiri.</span></h2>
        <p>Kenali isi setiap kolom, pilih contoh etiket, lalu isi dengan identitas gambarmu.</p>
        <svg class="etiket-hero-swoosh" viewBox="0 0 120 18" aria-hidden="true"><path d="M3 12Q44 2 114 7" fill="none" stroke="#f5be43" stroke-width="4" stroke-linecap="round"/></svg>
        <button type="button" class="etiket-primary" id="etiket-start">Mulai isi etiket <span aria-hidden="true">→</span></button>
      </div>
      <div class="etiket-hero-art" aria-hidden="true"><span class="etiket-hero-note">Nama jelas,<br>gambar mudah dibaca.</span><div id="etiket-hero-art">${heroDrawing()}</div></div>
    </header>
    <div class="etiket-heading-row"><div><p class="etiket-kicker">DUA CONTOH ETIKET</p><h3>Pilih susunan yang ingin dipelajari.</h3></div><p>Keduanya memakai identitas SMK.</p></div>
    <div class="etiket-template-grid" role="group" aria-label="Pilih contoh etiket">${cards}</div>
    <div class="etiket-workspace">
      <article class="etiket-preview" aria-labelledby="etiket-template-title">
        <div class="etiket-panel-heading"><div><p class="etiket-kicker">BACA & ISI SETIAP KOLOM</p><h3 id="etiket-template-title">Etiket lengkap</h3></div><span class="etiket-badge">Contoh untuk SMK</span></div>
        <div class="etiket-toolbar">
          <div><button type="button" id="etiket-dimensions" aria-pressed="true">Sembunyikan ukuran</button></div>
          <div role="group" aria-label="Perbesaran pratinjau etiket"><button type="button" id="etiket-zoom-out" aria-label="Perkecil etiket">−</button><button type="button" id="etiket-zoom-reset" aria-label="Kembalikan ukuran pratinjau">100%</button><button type="button" id="etiket-zoom-in" aria-label="Perbesar etiket">+</button></div>
          <div><button type="button" id="etiket-download">Unduh SVG</button><button type="button" class="etiket-primary" id="etiket-print">Cetak / PDF</button></div>
        </div>
        <div class="etiket-field-picker" id="etiket-field-picker" role="group" aria-label="Pilih kolom etiket"></div>
        <p class="etiket-preview-hint">Klik kolom untuk mengenalinya. Gunakan + lalu geser untuk membaca lebih dekat.</p>
        <div class="etiket-stage" id="etiket-stage" tabindex="0" aria-label="Pratinjau etiket. Pilih kolom pada gambar atau tombol kolom di atas. Setelah diperbesar, geser untuk melihat bagian lain."><div id="etiket-drawing-host"></div></div>
        <p class="etiket-caption"><span aria-hidden="true">↗</span><span id="etiket-status" role="status" aria-live="polite">Pilih kolom untuk mengenali fungsinya. Perbesar pratinjau jika tulisannya kecil.</span></p>
      </article>
      <aside class="etiket-detail" aria-labelledby="etiket-field-title">
        <p class="etiket-kicker">KOLOM YANG KAMU PILIH</p><h3 id="etiket-field-title">Judul gambar</h3>
        <span class="etiket-field-tag" id="etiket-field-tag">Identitas gambar</span>
        <p id="etiket-field-description">Nama benda atau pekerjaan yang digambar.</p>
        <h4>Contoh penulisan</h4><p id="etiket-field-example">TUTUP BANTALAN</p>
        <h4>Isi pada etiketmu</h4><p class="etiket-live-value" id="etiket-live-value">TUTUP BANTALAN</p>
        <p class="etiket-warning">Isi setiap kolom dengan singkat dan jelas. Angka ukuran di luar etiket menunjukkan contoh ukuran tabel dalam milimeter.</p>
        <button type="button" class="etiket-primary" id="etiket-edit-field">Ubah isi kolom ini ↓</button>
      </aside>
    </div>
    <section class="etiket-form-panel" aria-labelledby="etiket-form-title">
      <div class="etiket-form-heading"><div><p class="etiket-kicker">SEKARANG GILIRANMU</p><h3 id="etiket-form-title">Isi identitas gambarmu.</h3></div><p id="etiket-save-status" role="status" aria-live="polite">Isi formulir untuk memperbarui pratinjau.</p></div>
      <p class="etiket-form-intro">Pilih kolom pada pratinjau untuk membaca penjelasannya. Isian yang sesuai dengan contoh etiketmu tersedia di bawah ini.</p>
      <form id="etiket-form"></form>
      <div class="etiket-form-actions"><div><button type="button" class="etiket-primary" id="etiket-show-preview">Lihat hasil etiket ↑</button><button type="button" id="etiket-reset">Kembalikan contoh</button></div><p>Periksa judul, nomor gambar, nama pembuat, dan skala sebelum mencetak.</p></div>
    </section>
    <section class="etiket-sheet-reference" aria-labelledby="etiket-sheet-title">
      <div><p class="etiket-kicker">LETAKNYA PADA LEMBAR GAMBAR</p><h3 id="etiket-sheet-title">Etiket pada A4 lanskap.</h3><p>Etiket diletakkan di kanan bawah, menempel pada batas ruang gambar. Sisakan ruang di atasnya untuk gambar benda.</p><p>Pada contoh lembar ini, margin kiri 20 mm, sedangkan margin atas, kanan, dan bawah masing-masing 10 mm.</p></div>
      <div id="etiket-sheet-preview">${sheetDrawing('detail', 'A4')}</div>
    </section>
    <div class="etiket-quick-rules" aria-label="Tiga hal yang perlu diperhatikan">
      <article><span aria-hidden="true">01</span><h3>Identitas harus jelas.</h3><p>Judul, nomor gambar, nama pembuat, dan SMK membantu pembaca mengenali dokumen dan penanggung jawabnya.</p></article>
      <article><span aria-hidden="true">02</span><h3>Skala milik gambarnya.</h3><p>Skala menjelaskan perbandingan gambar benda dengan ukuran sesungguhnya. Perbesaran pratinjau tidak mengubah skala itu.</p></article>
      <article><span aria-hidden="true">03</span><h3>Cetak pada ukuran asli.</h3><p>Gunakan pengaturan 100% atau ukuran sebenarnya saat mencetak agar lebar contoh etiket tetap 185 mm.</p></article>
    </div>
    <details class="etiket-source-note"><summary>Tentang contoh, ukuran & standar</summary>
      <p>Kedua etiket diadaptasi dari gambar rujukan untuk latihan siswa SMK. Contoh ini memakai lebar 185 mm. ISO 7200 menetapkan lebar blok identitas 180 mm; ukuran 185 mm di sini mengikuti rujukan, sehingga bukan klaim ukuran baku ISO 7200.</p>
      <p>Etiket selebar 185 mm muat pada ruang gambar A4 dalam posisi lanskap. Contoh lembar memakai margin kiri 20 mm dan margin sisi lainnya 10 mm. Susunan kolom sekolah dapat mengikuti ketentuan guru atau tugas.</p>
      <p>Bacaan: <a href="https://cdn.standards.iteh.ai/samples/35446/d3b0887cb4fa47f49f8718807d3b8903/ISO-7200-2004.pdf" target="_blank" rel="noopener noreferrer">ISO 7200:2004 — data identitas dokumen</a>, <a href="https://cdn.standards.iteh.ai/samples/29017/e46c0ec5d98f470aab82dae76889f229/ISO-5457-1999.pdf" target="_blank" rel="noopener noreferrer">ISO 5457:1999 — lembar gambar dan margin</a>, <a href="https://www.dinmedia.de/en/standard/din-en-iso-5457/278410251" target="_blank" rel="noopener noreferrer">ISO 5457 dengan perubahan format A4</a>, dan <a href="https://cdn.standards.iteh.ai/samples/11502/b576be294da54eaab2b3b3fa748b8d1d/ISO-5456-2-1996.pdf" target="_blank" rel="noopener noreferrer">ISO 5456-2 — simbol sistem proyeksi</a>.</p>
    </details>
  </div>`;
}

export function fieldControl(id, values = {}) {
  const info = etiketFieldInfo[id];
  if (!info) return '';
  const inputId = `etiket-input-${id}`;
  let value = String(values[id] ?? '');
  if (id === 'school') value = value.replace(/^SMK\b\s*/i, '').trim();
  const attributes = `class="etiket-control" data-etiket-input="${id}" id="${inputId}" name="${id}"`;
  let control;
  if (info.options) {
    control = `<select ${attributes}>${info.options.map(([option, label]) => `<option value="${escape(option)}"${option === value ? ' selected' : ''}>${escape(label)}</option>`).join('')}</select>`;
  } else if (id === 'notes' || id === 'revision') {
    control = `<textarea ${attributes} rows="2" maxlength="${info.maxLength}" placeholder="${escape(info.example)}">${escape(value)}</textarea>`;
  } else {
    const type = info.type || 'text';
    const limits = info.maxLength ? ` maxlength="${info.maxLength}"` : '';
    const bounds = info.type === 'number' ? ` min="${info.min}" max="${info.max}" step="1" inputmode="numeric" required` : '';
    const help = id === 'school' ? ` aria-describedby="${inputId}-hint"` : '';
    control = `<input ${attributes} type="${type}" value="${escape(value)}"${limits}${bounds}${help} placeholder="${escape(id === 'school' ? 'NAMA SEKOLAH' : info.example)}">`;
  }
  return `<label data-etiket-label="${id}" for="${inputId}"><span>${escape(info.label)}</span>${control}${id === 'school' ? `<small id="${inputId}-hint">SMK otomatis ditambahkan.</small>` : ''}</label>`;
}

export function sheetDrawing(templateId = 'detail', paperId = 'A4') {
  const template = ETIKET_TEMPLATES[templateId] || ETIKET_TEMPLATES.detail;
  const paper = etiketPaper[paperId] || etiketPaper.A4;
  const name = etiketPaper[paperId] ? paperId : 'A4';
  const x = 24;
  const y = 26;
  const blockX = x + paper.width - 10 - template.width;
  const blockY = y + paper.height - 10 - template.height;
  const width = paper.width + 48;
  const height = paper.height + 52;
  const prefix = `etiket-sheet-${++sheetSequence}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc">
    <title id="${prefix}-title">${name} lanskap dengan ${template.name.toLowerCase()} di kanan bawah</title>
    <desc id="${prefix}-desc">Kertas ${paper.width} kali ${paper.height} milimeter. Margin kiri 20 milimeter; atas, kanan, dan bawah 10 milimeter. Etiket berukuran ${template.width} kali ${template.height} milimeter.</desc>
    <defs><marker id="${prefix}-arrow" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L4 2L0 4Z" fill="#5b8198"/></marker></defs>
    <rect x="${x}" y="${y}" width="${paper.width}" height="${paper.height}" rx="2" fill="#fff" stroke="#9dc5d5" stroke-width="1.2"/>
    <rect x="${x + 20}" y="${y + 10}" width="${paper.width - 30}" height="${paper.height - 20}" fill="none" stroke="#719eb2" stroke-width=".7"/>
    <g fill="none" stroke="#b4ceda" stroke-width=".7"><path d="M${x + 70} ${y + 52}H${x + paper.width - 55}V${blockY - 20}H${x + 70}Z"/><circle cx="${x + paper.width / 2 + 8}" cy="${y + 77}" r="17"/></g>
    <rect x="${blockX}" y="${blockY}" width="${template.width}" height="${template.height}" fill="#dcf3fb" stroke="#178baa" stroke-width="1.2"/>
    <path d="M${blockX} ${blockY + template.height * .67}H${blockX + template.width}M${blockX + template.width * .58} ${blockY}V${blockY + template.height}" fill="none" stroke="#74b7cc" stroke-width=".7"/>
    <g font-family="Arial, sans-serif" text-anchor="middle" fill="#376c85">
      <text x="${blockX + template.width / 2}" y="${blockY + template.height / 2}" dominant-baseline="middle" font-size="9">Etiket ${template.width} × ${template.height} mm</text>
      <text x="${x + paper.width / 2}" y="17" font-size="9">${paper.width} mm</text>
      <text x="${x + paper.width + 15}" y="${y + paper.height / 2}" font-size="9" transform="rotate(90 ${x + paper.width + 15} ${y + paper.height / 2})">${paper.height} mm</text>
      <text x="${x + 10}" y="${y + paper.height / 2}" font-size="7" transform="rotate(-90 ${x + 10} ${y + paper.height / 2})">20 mm</text>
      <text x="${x + paper.width / 2}" y="${y + paper.height + 16}" font-size="9">${name} lanskap · margin lainnya 10 mm</text>
    </g>
    <g stroke="#5b8198" stroke-width=".6" fill="none" marker-start="url(#${prefix}-arrow)" marker-end="url(#${prefix}-arrow)"><path d="M${x} 21H${x + paper.width}"/><path d="M${x + paper.width + 8} ${y}V${y + paper.height}"/></g>
  </svg>`;
}
