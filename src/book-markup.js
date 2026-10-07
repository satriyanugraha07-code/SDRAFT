import { publicAssetUrl } from './asset-url.js';

export const BOOK_LIBRARY = Object.freeze([
  {
    id: 'gamtek-dasar', number: '01', title: 'Fungsi dan Sifat Gambar',
    description: 'Mulai dari bahasa gambar, fungsi, hingga pentingnya standardisasi dalam gambar teknik.',
    totalPages: 17, folder: 'gambar-teknik-mesin',
    pdf: 'modul-ajar-gambar-teknik-mesin.pdf',
    topics: ['Bahasa teknik', 'Fungsi gambar', 'Standardisasi'], color: 'sky'
  },
  {
    id: 'garis-huruf', number: '02', title: 'Garis dan Huruf dalam Gambar',
    description: 'Kenali jenis dan penggunaan garis, serta bentuk huruf dan angka melalui contoh gambar.',
    totalPages: 20, folder: 'gambar-teknik-mesin-garis-huruf',
    pdf: 'gambar-teknik-mesin-garis-huruf-draft.pdf',
    topics: ['Jenis garis', 'Huruf & angka', 'Contoh gambar'], color: 'mint'
  }
]);

const icon = (name) => {
  const paths = {
    book: '<path d="M12 5v15M3 4.5c3-1 6-1 9 .5 3-1.5 6-1.5 9-.5V19c-3-1-6-1-9 .5-3-1.5-6-1.5-9-.5z"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    pdf: '<path d="M14 3H5v18h14V8zm0 0v5h5M8 12h8M8 16h6"/>',
    fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    pages: '<path d="M8 7h13v14H8zM3 16V3h13M11 11h7M11 15h7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
  };
  return `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
};

const heroArt = () => `<svg viewBox="0 0 430 280" fill="none" aria-hidden="true">
  <ellipse cx="225" cy="248" rx="153" ry="14" fill="#5dabc2" opacity=".12"/>
  <ellipse cx="215" cy="138" rx="157" ry="119" fill="#eefbff" opacity=".58"/>
  <g transform="rotate(-7 214 154)">
    <path d="M60 70c53-12 105-3 149 19 41-25 94-34 149-24v169c-53-9-103 0-149 21-42-23-96-32-149-23z" fill="#8fc8d4" stroke="#5b98ac" stroke-width="2"/>
    <path d="M69 62c50-9 97-3 140 20 40-24 87-34 141-27v172c-52-7-98 0-141 23-42-24-91-31-140-21z" fill="#e1edf2" stroke="#9ebfcd" stroke-width="1.5"/>
    <path d="M76 52c49-7 94 1 133 24v164c-40-24-85-32-133-24z" fill="#fffefb" stroke="#b9d5df" stroke-width="1.5"/>
    <path d="M209 76c40-25 82-35 134-29v168c-50-5-96 5-134 25z" fill="#ffffff" stroke="#b9d5df" stroke-width="1.5"/>
    <path d="M209 76v164" stroke="#9fbfc9" stroke-width="2"/>
    <path d="M196 77v153M223 75v155" stroke="#bfdbe2" opacity=".4"/>
    <path d="M96 83c32-2 57 4 82 15M96 94c28 0 55 6 77 16" stroke="#7fb1c3" stroke-width="3" stroke-linecap="round"/>
    <path d="M96 124v58l69 18v-60z" fill="#ebf7f5" stroke="#5b9e9c" stroke-width="1.5"/>
    <path d="m96 124 24-10 69 16-24 10m0 0 24-10v58l-24 12m-45-86v57l69 17" stroke="#5b9e9c" stroke-width="1.5"/>
    <path d="m104 191 54 14" stroke="#a8c9d5" stroke-width="1.5"/>
    <path d="M239 86c25-9 49-12 78-12M239 97c25-9 49-12 78-12" stroke="#7fb1c3" stroke-width="3" stroke-linecap="round"/>
    <path d="M239 124c25-9 49-12 78-12M239 138c25-9 49-12 78-12" stroke="#396d85" stroke-width="2.5"/>
    <path d="M239 152c25-9 49-12 78-12" stroke="#608ba0" stroke-width="1.2"/>
    <path d="M239 166c25-9 49-12 78-12" stroke="#608ba0" stroke-width="1.2" stroke-dasharray="7 4"/>
    <path d="M239 180c25-9 49-12 78-12" stroke="#608ba0" stroke-width="1.2" stroke-dasharray="12 4 2 4"/>
    <path d="m275 53 10 74 10-5-9-72" fill="#f3c568" stroke="#d9ac54" stroke-width="1.5"/>
  </g>
  <g transform="rotate(24 364 165)">
    <rect x="355" y="93" width="16" height="116" rx="4" fill="#74bfa8" stroke="#4b9987" stroke-width="1.5"/>
    <path d="M359 104v92m8-92v92" stroke="#bce7d5" stroke-width="2"/>
    <path d="m355 209 8 24 8-24" fill="#eed3aa" stroke="#bbac92" stroke-width="1.5"/>
    <path d="m360 224 3 9 3-9" fill="#304d5a"/>
  </g>
  <path d="m66 38 4 9 10 3-10 4-4 10-4-10-10-4 10-3z" fill="#eebf5c"/>
  <path d="m363 42 3 7 8 3-8 3-3 8-3-8-7-3 7-3z" fill="#eebf5c"/>
  <path d="M41 168h16m-8-8v16M388 220h16m-8-8v16" stroke="#62a8b5" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const bookCard = (book) => {
  const pdf = publicAssetUrl(`books/${book.folder}/${book.pdf}`);
  return `<article class="book-card book-card-${book.color}" aria-labelledby="book-card-${book.id}">
    <div class="book-card-cover">
      <span class="book-volume">BUKU ${book.number}</span>
      <img src="${publicAssetUrl(`books/${book.folder}/pages/page-01.webp`)}" alt="Sampul Gambar Teknik Mesin: ${book.title}" width="993" height="1404" loading="lazy">
      <span class="book-cover-caption">Buku ajar SMK · ${book.totalPages} halaman</span>
    </div>
    <div class="book-card-copy">
      <p class="book-kicker">GAMBAR TEKNIK MESIN</p>
      <h3 id="book-card-${book.id}">${book.title}</h3>
      <p>${book.description}</p>
      <div class="book-topics" aria-label="Topik Buku ${book.number}">${book.topics.map(topic => `<span>${topic}</span>`).join('')}</div>
      <button type="button" class="book-primary" data-read-book="${book.id}" aria-label="Baca Buku ${book.number}: ${book.title}">${icon('book')} Baca buku <span aria-hidden="true">→</span></button>
      <div class="book-file-links">
        <a href="${pdf}" target="_blank" rel="noopener" aria-label="Buka PDF Buku ${book.number}">${icon('pdf')} Buka PDF</a>
        <a href="${pdf}" download aria-label="Unduh PDF Buku ${book.number}">${icon('download')} Unduh</a>
      </div>
    </div>
  </article>`;
};

export function renderBookMarkup() {
  const first = BOOK_LIBRARY[0];
  const firstPage = publicAssetUrl(`books/${first.folder}/pages/page-01.webp`);
  const firstPdf = publicAssetUrl(`books/${first.folder}/${first.pdf}`);
  return `<div class="book-lesson">
    <header class="book-hero">
      <div class="book-hero-copy">
        <p class="book-eyebrow"><span aria-hidden="true">✦</span> RUANG BACA · GAMBAR TEKNIK</p>
        <h2>Buka bukunya,<br><span>pahami gambarnya.</span></h2>
        <svg class="book-hero-swoosh" viewBox="0 0 255 14" fill="none" aria-hidden="true"><path d="M3 9c79-10 154-8 247-2" stroke="#e2b746" stroke-width="3" stroke-linecap="round"/></svg>
        <p>Pelajari dasar gambar teknik lewat dua buku ajar. Baca pelan-pelan, amati contohnya, lalu coba di latihanmu.</p>
        <button type="button" id="book-start-reading" class="book-primary">Mulai membaca ${icon('arrow')}</button>
      </div>
      <div class="book-hero-art">${heroArt()}<span>Satu halaman, satu hal baru.</span></div>
    </header>

    <section class="book-shelf" aria-labelledby="book-shelf-title">
      <div class="book-section-heading"><div><p class="book-kicker">PILIH BACAANMU</p><h3 id="book-shelf-title">Dari dasar, sampai detail.</h3></div><span class="book-count">${icon('book')} 2 buku ajar</span></div>
      <div class="book-card-grid">${BOOK_LIBRARY.map(bookCard).join('')}</div>
    </section>

    <section class="book-reader-panel" id="book-reader" aria-labelledby="book-reader-title">
      <div class="book-reader-heading"><div><p class="book-kicker">BACA & AMATI</p><h3 id="book-reader-title">${first.title}</h3></div><span class="book-reader-format">Gambar Teknik Mesin · A4</span></div>
      <div class="book-selector-bar" role="group" aria-label="Pilih buku yang dibaca">${BOOK_LIBRARY.map((book, index) => `<button type="button" class="book-select-tab${index === 0 ? ' active' : ''}" data-book-id="${book.id}" aria-pressed="${index === 0}"><span class="book-tab-num">${book.number}</span><span class="book-tab-text"><strong>${book.title}</strong><small>${book.totalPages} halaman</small></span></button>`).join('')}</div>
      <div class="book-toolbar" role="group" aria-label="Kontrol pembaca buku">
        <div class="book-nav-controls">
          <button class="book-control-btn" type="button" id="book-prev-page" aria-label="Halaman sebelumnya">←</button>
          <div class="book-page-counter" aria-live="polite"><span>Halaman</span><strong id="book-current-page">1</strong><span> / <span id="book-total-pages">${first.totalPages}</span></span></div>
          <button class="book-control-btn" type="button" id="book-next-page" aria-label="Halaman berikutnya">→</button>
        </div>
        <div class="book-zoom-controls">
          <button class="book-control-btn" type="button" id="book-zoom-out" aria-label="Perkecil halaman">−</button>
          <label for="book-zoom-range"><span id="book-zoom-value">100%</span></label>
          <input id="book-zoom-range" type="range" min="75" max="160" step="5" value="100" aria-label="Perbesaran halaman">
          <button class="book-control-btn" type="button" id="book-zoom-in" aria-label="Perbesar halaman">+</button>
          <button class="book-control-btn book-fullscreen-btn" type="button" id="book-fullscreen" aria-label="Buka layar penuh">${icon('fullscreen')}<span>Layar penuh</span></button>
        </div>
      </div>
      <p class="book-reading-hint" id="book-reading-hint">Balik halaman dengan tombol panah. Di HP, usap halaman ke kiri atau kanan.</p>
      <div class="book-stage" id="book-stage" tabindex="0" aria-label="Pratinjau buku, halaman 1 dari ${first.totalPages}" aria-keyshortcuts="ArrowLeft ArrowRight PageDown PageUp Home End">
        <button class="book-page-edge book-page-edge-prev" type="button" id="book-edge-prev" aria-label="Balik ke halaman sebelumnya">‹</button>
        <div class="book-page-frame" id="book-page-frame">
          <div class="book-page-loading" id="book-page-loading" aria-hidden="true"><span></span>Memuat halaman…</div>
          <img id="book-page-image" src="${firstPage}" alt="Halaman 1 dari ${first.title}" width="993" height="1404" draggable="false">
          <div class="book-flip-sheet" id="book-flip-sheet" aria-hidden="true">
            <div class="book-flip-strips" id="book-flip-strips"></div>
            <div class="book-flip-face book-flip-front"><img id="book-flip-front-image" src="${firstPage}" alt="" width="993" height="1404" draggable="false"></div>
            <div class="book-flip-face book-flip-back"><img id="book-flip-back-image" src="${firstPage}" alt="" width="993" height="1404" draggable="false"></div>
            <span class="book-flip-fold" aria-hidden="true"></span>
          </div><span class="book-page-sheen" aria-hidden="true"></span>
        </div>
        <button class="book-page-edge book-page-edge-next" type="button" id="book-edge-next" aria-label="Balik ke halaman berikutnya">›</button>
      </div>
      <div class="book-reader-message"><p id="book-reader-status" role="status">Menyiapkan halaman buku…</p><button type="button" id="book-retry-page" class="book-secondary" hidden>Coba muat lagi</button></div>
      <div class="book-page-progress"><input id="book-page-range" type="range" min="1" max="${first.totalPages}" value="1" aria-label="Pilih halaman buku"><span id="book-progress-label">Halaman 1 dari ${first.totalPages}</span></div>
      <details class="book-page-list"><summary>${icon('pages')}<span>Daftar halaman</span><span class="book-page-list-note">Pilih halaman langsung</span></summary><div class="book-thumbnail-strip" id="book-thumbnail-strip" aria-label="Daftar halaman buku"></div></details>
      <div class="book-reader-footer"><p>Posisi halaman disimpan di browser ini.<br><span>Lanjutkan dari halaman terakhirmu saat kembali.</span></p><div class="book-file-links"><a id="book-reader-pdf" href="${firstPdf}" target="_blank" rel="noopener">${icon('pdf')} Buka PDF</a><a id="book-reader-download" href="${firstPdf}" download>${icon('download')} Unduh PDF</a></div></div>
    </section>

    <aside class="book-learning-note" aria-label="Tips membaca buku gambar teknik"><span class="book-note-icon" aria-hidden="true">${icon('book')}</span><div><h3>Baca, amati, lalu coba.</h3><p>Berhenti sebentar pada contoh gambar. Cocokkan garis dan simbolnya dengan materi yang sudah kamu pelajari.</p></div></aside>
  </div>`;
}
