import { publicAssetUrl } from './asset-url.js';

export const modelViews = {
  isometric: { label: 'Isometrik', title: 'Lihat bentuk utuhnya.', description: 'Pandangan awal memperlihatkan dudukan, lubang, dan rusuk penguat dari sudut isometrik. Model berputar otomatis agar kamu bisa mengamati setiap sisinya.', tip: 'Klik Jeda putaran untuk mengamati. Klik Isometrik untuk kembali ke sudut awal yang tetap.' },
  front: { label: 'Depan', title: 'Lihat dari depan.', description: 'Pandangan ini memperlihatkan lebar dan tinggi benda. Bandingkan garis luarnya dengan pandangan atas dan samping.', tip: 'Pada pandangan ortogonal, garis yang sejajar tetap sejajar.' },
  top: { label: 'Atas', title: 'Lihat dari atas.', description: 'Amati susunan pelat dan posisi lubang dari atas. Pandangan ini memperlihatkan lebar dan kedalaman benda.', tip: 'Lebar pada tampak atas sama dengan lebar pada tampak depan.' },
  right: { label: 'Kanan', title: 'Lihat dari kanan.', description: 'Amati ketebalan pelat dan bentuk penguat dari sisi kanan. Pandangan ini memperlihatkan kedalaman dan tinggi benda.', tip: 'Tinggi pada tampak samping sama dengan tinggi pada tampak depan.' },
  left: { label: 'Kiri', title: 'Lihat dari kiri.', description: 'Bandingkan sisi ini dengan sisi kanan. Bagian yang tertutup pada satu sisi dapat terlihat dari sisi lainnya.', tip: 'Arah melihat menentukan bagian yang tampak dan yang tertutup.' },
  back: { label: 'Belakang', title: 'Lihat dari belakang.', description: 'Lihat sisi yang berlawanan dengan tampak depan. Gunakan pandangan ini untuk memahami bagian yang sebelumnya tertutup.', tip: 'Posisi kiri dan kanan tampak berubah ketika arah melihat dibalik.' },
  bottom: { label: 'Bawah', title: 'Lihat dari bawah.', description: 'Amati permukaan bawah pelat dan jalur lubangnya. Bandingkan dengan tampak atas untuk memahami bagian yang menembus benda.', tip: 'Benda tetap sama; arah melihatnya yang berubah.' }
};

function heroArt() {
  return `<svg viewBox="0 0 360 240" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="190" cy="213" rx="142" ry="15" fill="#77b6ca" opacity=".15"/>
    <g transform="rotate(-9 90 116)"><rect x="24" y="28" width="151" height="184" rx="17" fill="#fff" stroke="#bddde7" stroke-width="2"/>
      <path d="M45 69h108M45 170h108" stroke="#d7e8ef" stroke-width="2"/><path d="M63 142V91h62v51zM94 84v65M55 117h80" fill="#eaf8fd" stroke="#58a4ba" stroke-width="2"/>
      <circle cx="94" cy="117" r="15" fill="#fff" stroke="#58a4ba" stroke-width="2"/><path d="M61 155h66M63 152v7m62-7v7" stroke="#8ebbc8" stroke-width="1.4"/>
      <text x="102" y="193" text-anchor="middle" fill="#6895a6" font-size="14" font-family="sans-serif">GAMBAR 2D</text></g>
    <path d="M158 107q30-26 52-2m-12-12 14 12-16 7" fill="none" stroke="#e4af44" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <g stroke="#497b70" stroke-width="2" stroke-linejoin="round"><path d="m217 80 53-27 65 30-52 28z" fill="#c9e8d8"/><path d="m217 80 66 31v74l-66-30z" fill="#89bba1"/><path d="m283 111 52-28v74l-52 28z" fill="#649e85"/>
      <ellipse cx="276" cy="82" rx="22" ry="11" fill="#72a78c"/><path d="m239 90 23 11v56l-23-11z" fill="#b7d8c5"/></g>
    <rect x="231" y="197" width="112" height="28" rx="14" fill="#fff"/><text x="287" y="215" text-anchor="middle" fill="#498a77" font-size="12" font-family="sans-serif">BENDA 3D</text>
    <path d="m20 11 3 7 7 3-7 3-3 7-3-7-7-3 7-3zM336 37l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#e1b448"/>
  </svg>`;
}

export function renderModel3dMarkup() {
  const modelAsset = name => publicAssetUrl(`models/solidworks-library/job-kelas-extrim.${name}`);
  return `<div class="model3d-lesson" aria-label="Belajar bentuk 2D ke 3D">
    <header class="model3d-hero">
      <div><p class="model3d-eyebrow"><span aria-hidden="true">✦</span> DARI GAMBAR KE BENDA</p><h2>Kenali garisnya,<br><span>bayangkan bentuknya.</span></h2><svg class="model3d-swoosh" viewBox="0 0 125 16" aria-hidden="true"><path d="M3 11Q63 1 121 8" fill="none" stroke="#eab642" stroke-width="4" stroke-linecap="round"/></svg><p>Jelajahi Job Kelas Extrim. Putar bendanya, pilih pandangannya, dan temukan hubungan antarbagian.</p><button type="button" class="model3d-primary" id="model3d-start">Jelajahi model <span aria-hidden="true">→</span></button></div>
      <div class="model3d-hero-art">${heroArt()}<span>Garis di kertas,<br>bentuk di pikiran.</span></div>
    </header>
    <div class="model3d-heading"><div><p class="model3d-kicker">SATU BENDA, BANYAK PANDANGAN</p><h3>Job Kelas Extrim</h3></div><span class="model3d-tag">Model latihan</span></div>
    <div class="model3d-workspace" id="model3d-workspace">
      <article class="model3d-viewer" aria-labelledby="model3d-title">
        <div class="model3d-panel-heading"><div><p class="model3d-kicker" id="model3d-eyebrow">AMATI & BANDINGKAN</p><h3 id="model3d-title">Putar, lalu lihat tiap sisinya.</h3></div><span id="model3d-status" class="model3d-status" role="status" aria-live="polite">Menyiapkan model…</span></div>
        <div class="model3d-view-picker" role="group" aria-label="Pilih pandangan model">${Object.entries(modelViews).map(([key, view]) => `<button type="button" data-model-view="${key}" aria-pressed="${key === 'isometric'}" class="${key === 'isometric' ? 'active' : ''}">${view.label}</button>`).join('')}</div>
        <div class="model3d-stage" id="model3d-shell"><span class="model3d-stage-note" id="model3d-stage-note">Seret untuk memutar · gulir untuk zoom</span><canvas id="model3d-canvas" tabindex="0" aria-label="Model Job Kelas Extrim. Seret atau gunakan tombol panah untuk memutar. Gunakan tombol plus dan minus untuk zoom.">Model 3D interaktif Job Kelas Extrim.</canvas><img id="model3d-fallback" class="model3d-fallback" src="${publicAssetUrl('models/solidworks-library/job-kelas-extrim-preview.png')}" alt="Pratinjau Job Kelas Extrim" width="640" height="640" hidden/><span class="model3d-stage-caption" id="model3d-view-label">Isometrik</span></div>
        <div class="model3d-toolbar"><div class="model3d-render-picker" role="group" aria-label="Gaya tampilan model"><button type="button" data-render-mode="shaded-edges" aria-pressed="true" class="active">Bentuk utuh</button><button type="button" data-render-mode="wireframe" aria-pressed="false">Rangka garis</button></div><div class="model3d-actions"><button type="button" id="model3d-autorotate" aria-pressed="true">Jeda putaran</button><button type="button" id="model3d-reset" aria-label="Kembalikan model ke posisi awal">↺ Awal</button></div></div>
        <div class="model3d-zoom" role="group" aria-label="Perbesaran model"><p id="model3d-view-help">Gunakan tombol pandangan untuk melihat bentuk tanpa perspektif.</p><button type="button" id="model3d-zoom-out" aria-label="Perkecil model">−</button><span id="model3d-zoom-level">100%</span><button type="button" id="model3d-zoom-in" aria-label="Perbesar model">+</button></div>
      </article>
      <aside class="model3d-detail" aria-labelledby="model3d-detail-title"><p class="model3d-kicker">PANDANGAN YANG KAMU PILIH</p><h3 id="model3d-detail-title">Lihat bentuk utuhnya.</h3><p id="model3d-detail-desc">${modelViews.isometric.description}</p><div class="model3d-detail-tip"><span aria-hidden="true">↗</span><p id="model3d-detail-tip">${modelViews.isometric.tip}</p></div>
        <div class="model3d-features"><span>KENALI BAGIANNYA</span><div><i aria-hidden="true">01</i><p><strong>Pelat dudukan</strong>Bagian dasar tempat komponen ditopang.</p></div><div><i aria-hidden="true">02</i><p><strong>Lubang</strong>Perhatikan posisi dan arah lubangnya.</p></div><div><i aria-hidden="true">03</i><p><strong>Rusuk penguat</strong>Penghubung yang memperkuat pelat.</p></div></div>
        <dl class="model3d-dimensions"><div><dt>Ukuran luar model</dt><dd>230 × 225 × 80 mm</dd></div></dl><details class="model3d-downloads"><summary>Berkas model latihan</summary><a href="${modelAsset('stl')}" download>Unduh STL <span aria-hidden="true">↓</span></a><a href="${modelAsset('SLDPRT')}" download>Unduh SolidWorks <span aria-hidden="true">↓</span></a></details>
      </aside>
    </div>
    <div class="model3d-learning"><article><span>01</span><h4>Mulai dari bentuk utuh.</h4><p>Gunakan Isometrik untuk memahami bentuk benda secara keseluruhan.</p></article><article><span>02</span><h4>Bandingkan tiap tampak.</h4><p>Pilih Depan, Atas, dan Kanan. Perhatikan ukuran dan bagian yang tampak.</p></article><article><span>03</span><h4>Bayangkan bagian dalam.</h4><p>Putar model untuk memeriksa arah lubang dan hubungan antarbagian.</p></article></div>
    <details class="model3d-footnote"><summary>Memahami tampilan model</summary><p>Semua pandangan memakai proyeksi ortogonal sehingga garis sejajar tetap sejajar. Isometrik dimulai dari sudut 45° dengan kemiringan sekitar 35,26°. Saat model berputar, arah pandangnya berubah. Rangka garis memperlihatkan rusuk model dari berbagai sisi; garisnya belum dibedakan menjadi garis tampak dan tersembunyi pada gambar kerja.</p></details>
  </div>`;
}
