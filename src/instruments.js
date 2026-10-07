import { publicAssetUrl } from './asset-url.js';
import { triangleMeasurement } from './instruments-geometry.js';

const lessons = {
  ruler: {
    name: 'Mistar lurus', photo: 'ruler', value: 8, min: 4, max: 10, step: 1,
    setting: 'Panjang garis', unit: 'cm', title: 'Menarik garis dengan mistar',
    description: 'Mengukur panjang dan memandu pensil agar menghasilkan garis lurus. Skala sentimeter dibagi lagi menjadi milimeter.',
    caption: 'Tepi lurus sebagai pemandu · skala sebagai pengukur',
    tip: 'Mulai dari angka 0 pada skala, bukan dari ujung fisik mistar. Tahan mistar agar tidak bergeser.',
    steps: ['Sejajarkan tepi mistar dengan arah garis yang akan dibuat.', 'Letakkan ujung pensil pada angka 0 dan tandai panjang yang dibutuhkan.', 'Tarik pensil sepanjang tepi mistar dengan tekanan yang ringan dan merata.'],
    result: value => `Garis lurus sepanjang ${value} cm selesai dibuat.`
  },
  triangles: {
    name: 'Sepasang mistar segitiga', photo: 'triangles', value: 45, unit: '°', title: 'Membuat garis bersudut dan sejajar',
    description: 'Segitiga 45°–45°–90° digunakan untuk garis 45° dan 90°. Segitiga 30°–60°–90° digunakan untuk garis 30°, 60°, dan 90°. Keduanya dapat dipasangkan untuk membuat garis sejajar.',
    caption: 'Dua mistar segitiga · 45°–45° dan 30°–60°',
    tip: 'Tahan penyangga tetap diam dan kedua sisi tetap rapat saat menggeser. Jarak antar garis diukur tegak lurus; pada garis miring, jarak ini berbeda dari jarak geser pada skala penyangga.',
    steps: ['Letakkan segitiga penyangga dengan sisi berskala menghadap ke atas. Tahan agar tidak bergeser.', 'Rapatkan segitiga gambar pada penyangga, mulai di tanda 1 cm, lalu tarik garis pertama.', 'Geser segitiga sepanjang sisi penyangga. Baca tanda awal dan akhir pada skala tanpa mengubah sudut.', 'Tahan pada posisi baru, lalu tarik garis kedua di sepanjang sisi yang sama.', 'Letakkan mistar tegak lurus terhadap kedua garis. Baca jarak dari angka 0 sampai perpotongan garis kedua.'],
    thresholds: [.22, .57, .75, .91],
    result: (value, mode, spacing) => `Dua garis ${value}° sejajar. Jarak tegak lurusnya ${Math.round(spacing * 10)} mm, diukur dari 0 pada mistar.`
  },
  compass: {
    name: 'Jangka', photo: 'compass', value: 3, min: 1, max: 4, step: 0.5,
    setting: 'Jari-jari', unit: 'cm', title: 'Membuat lingkaran dengan jangka',
    description: 'Membuat lingkaran atau busur dengan jari-jari tertentu. Kaki jarum menjadi pusat putaran, sedangkan kaki pensil membuat garis lengkung.',
    caption: 'Kaki jarum = pusat · kaki pensil = pembuat garis',
    tip: 'Jepit knop di atas kepala jangka dengan ibu jari dan telunjuk, lalu putar perlahan. Jaga jarum di titik pusat dan bukaan kaki tetap sama.',
    steps: ['Ukur bukaan jarum dan pensil dengan mistar sesuai jari-jari yang dibutuhkan.', 'Tempatkan jarum pada O. Sentuhkan ujung pensil, lalu jepit knop atas dengan ibu jari dan telunjuk.', 'Putar melalui knop atas. Jarum tetap di O, sementara kaki pensil bergerak mengelilingi pusat.'],
    result: (value, mode) => `${mode === 'arc' ? 'Busur 180°' : 'Lingkaran'} berjari-jari ${value} cm selesai. Tangan memutar knop atas dan jarum tetap di O.`
  },
  protractor: {
    name: 'Busur derajat', photo: 'protractor', value: 60, min: 15, max: 165, step: 5,
    setting: 'Besar sudut', unit: '°', title: 'Membentuk sudut dengan busur derajat',
    description: 'Mengukur sudut 0°–180° dan menandai besar sudut yang ingin dibuat. Titik pusat busur harus tepat pada titik pertemuan kedua kaki sudut.',
    caption: 'Pusat busur pada titik sudut · garis dasar pada 0°',
    tip: 'Baca skala yang dimulai dari 0° pada sisi garis dasar. Untuk mengukur, baca angka tempat kaki sudut kedua memotong skala.',
    steps: ['Tepatkan pusat busur pada titik sudut. Sejajarkan garis 0° dengan garis dasar.', 'Baca skala dari 0° pada sisi garis dasar, lalu tandai besar sudut yang diinginkan.', 'Angkat busur dan hubungkan titik pusat ke tanda menggunakan mistar lurus.'],
    result: value => `Sudut ${value}° terbentuk di antara garis dasar dan garis baru.`
  }
};

let initialized = false;

export function initInstrumentsLesson() {
  const section = document.getElementById('tools');
  if (!section || initialized) return;
  initialized = true;
  const byId = id => document.getElementById(id);
  const cards = [...section.querySelectorAll('[data-instrument]')];
  const angles = [...section.querySelectorAll('[data-instrument-angle]')];
  const canvas = byId('instrument-canvas');
  const stage = byId('instrument-stage');
  const range = byId('instrument-setting');
  const spacingRange = byId('instrument-spacing');
  const timeline = byId('instrument-timeline');
  const play = byId('instrument-play');
  const view = byId('instrument-view');
  const values = Object.fromEntries(Object.entries(lessons).map(([key, lesson]) => [key, lesson.value]));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 'ruler';
  let mode = 'circle';
  let spacing = 1;
  let progress = 0;
  let playing = false;
  let tilted = false;
  let scene;
  let loading;
  let failed = false;
  let frame = 0;
  let lastTime = 0;
  let currentStep = -1;
  let disposed = false;
  let intersecting = true;
  let steps = [];
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const configuration = () => ({ tool: selected, value: values[selected], mode, spacing });
  const formatValue = () => `${values[selected].toLocaleString('id-ID')}${lessons[selected].unit === '°' ? '°' : ' cm'}`;
  const centimetres = value => `${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm`;
  const fillRange = input => input.style.setProperty('--range-progress', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
  const visible = () => section.classList.contains('active') && !document.hidden && intersecting;

  function updatePlayback() {
    const playLabel = playing ? 'Jeda animasi' : progress >= 1 ? 'Putar lagi' : 'Putar animasi';
    byId('instrument-play-label').textContent = playLabel;
    play.querySelector('.instrument-play-symbol').textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playLabel);
    view.textContent = tilted ? 'Lihat dari atas' : 'Lihat miring';
    view.setAttribute('aria-pressed', String(tilted));
  }

  function render() {
    const lesson = lessons[selected];
    const thresholds = lesson.thresholds || [.28, .5];
    const step = thresholds.filter(threshold => progress >= threshold).length;
    if (step !== currentStep || progress === 1 || progress === 0) {
      currentStep = step;
      steps.forEach((item, index) => {
        item.classList.toggle('is-current', index === step);
        if (index === step) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      byId('instrument-stage-step').textContent = progress >= 1 ? `SELESAI · ${steps.length} LANGKAH` : `LANGKAH ${step + 1} / ${steps.length}`;
      let caption = progress >= 1 ? lesson.result(values[selected], mode, spacing) : lesson.steps[step];
      if (selected === 'triangles' && step === 2 && progress < 1) {
        const measure = triangleMeasurement(values.triangles, spacing);
        caption = `Geser ${centimetres(measure.slide)}: tanda 1,00 cm → ${centimetres(measure.endReading)}. Penyangga tetap diam dan sisi tetap rapat.`;
      }
      byId('instrument-stage-caption').textContent = caption;
    }
    timeline.value = String(progress * 100);
    fillRange(timeline);
    byId('instrument-progress').textContent = `${Math.round(progress * 100)}%`;
    scene?.render(progress);
  }

  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function schedule() {
    if (playing && scene && visible() && !frame && !disposed) frame = requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    if (!playing || !visible() || disposed) { lastTime = 0; return; }
    if (lastTime) progress = Math.min(1, progress + Math.min(time - lastTime, 80) / (selected === 'triangles' ? 18000 : 14000));
    lastTime = time;
    render();
    if (progress === 1) { playing = false; lastTime = 0; updatePlayback(); }
    schedule();
  }

  function fallback() {
    failed = true;
    playing = false;
    stopFrame();
    scene?.dispose();
    scene = null;
    canvas.hidden = true;
    byId('instrument-fallback').hidden = false;
    byId('instrument-fallback-message').textContent = 'Animasi 3D tidak tersedia di browser ini. Gambar dan langkah penggunaan tetap bisa dipelajari; geser urutan gerakan untuk melihat setiap langkah.';
    play.disabled = true;
    view.disabled = true;
    updatePlayback();
  }

  async function ensureScene() {
    if (scene || loading || failed || disposed || !section.classList.contains('active')) return;
    loading = (async () => {
      try {
        const { createInstrumentScene } = await import('./instruments-scene.js');
        if (disposed) return;
        scene = await createInstrumentScene(canvas, stage, fallback);
        if (disposed || failed) { scene?.dispose(); return; }
        scene.configure(configuration());
        scene.setView(tilted);
        play.disabled = false;
        view.disabled = false;
        render();
        schedule();
      } catch (error) {
        console.warn('Animasi alat gambar tidak dapat dimuat.', error);
        fallback();
      }
    })();
  }

  function selectTool(key, animate = true) {
    if (!lessons[key]) return;
    stopFrame();
    selected = key;
    progress = 0;
    currentStep = -1;
    tilted = key === 'compass';
    playing = animate && !reducedMotion.matches && !failed;
    const lesson = lessons[key];
    const photo = publicAssetUrl(`images/tools/${lesson.photo}-soft.png`);
    section.dataset.activeInstrument = key;
    cards.forEach(card => {
      const active = card.dataset.instrument === key;
      card.classList.toggle('is-selected', active);
      card.setAttribute('aria-pressed', String(active));
    });
    byId('instrument-name').textContent = lesson.name;
    byId('instrument-function').textContent = lesson.description;
    byId('instrument-photo-caption').textContent = lesson.caption;
    byId('instrument-tip').textContent = lesson.tip;
    byId('instrument-demo-title').textContent = key === 'compass' && mode === 'arc' ? 'Membuat busur dengan jangka' : lesson.title;
    [byId('instrument-photo'), byId('instrument-fallback-photo')].forEach(image => { image.src = photo; image.alt = lesson.name; });
    canvas.setAttribute('aria-label', `Animasi tiga dimensi: ${byId('instrument-demo-title').textContent}${key === 'compass' ? '. Tangan menjepit dan memutar knop atas; jarum tetap di titik pusat O.' : ''}`);
    const list = byId('instrument-steps');
    list.replaceChildren(...lesson.steps.map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
    steps = [...list.children];
    byId('instrument-range-control').hidden = key === 'triangles';
    byId('instrument-angle-control').hidden = key !== 'triangles';
    byId('instrument-spacing-control').hidden = key !== 'triangles';
    byId('instrument-measurements').hidden = key !== 'triangles';
    byId('instrument-compass-control').hidden = key !== 'compass';
    if (key !== 'triangles') {
      range.min = String(lesson.min); range.max = String(lesson.max); range.step = String(lesson.step); range.value = String(values[key]);
      byId('instrument-setting-label').firstChild.textContent = `${lesson.setting} `;
    }
    angles.forEach(button => {
      const active = Number(button.dataset.instrumentAngle) === values.triangles;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    byId('instrument-setting-value').textContent = formatValue();
    byId('instrument-stage-value').textContent = key === 'triangles' ? `${formatValue()} · ${Math.round(spacing * 10)} mm` : formatValue();
    if (key === 'triangles') {
      const measure = triangleMeasurement(values.triangles, spacing);
      spacingRange.value = String(Math.round(spacing * 10));
      byId('instrument-spacing-value').textContent = `${Math.round(spacing * 10)} mm`;
      byId('instrument-slide-value').textContent = centimetres(measure.slide);
      byId('instrument-scale-reading').textContent = `1,00 → ${measure.endReading.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm`;
      byId('instrument-normal-value').textContent = `${Math.round(spacing * 10)} mm`;
      byId('instrument-spacing-note').textContent = `Untuk jarak ${Math.round(spacing * 10)} mm pada sudut ${values.triangles}°, geser ${centimetres(measure.slide)} pada skala penyangga. Angka dibulatkan untuk tampilan.`;
    }
    fillRange(range);
    fillRange(spacingRange);
    scene?.configure(configuration());
    scene?.setView(tilted);
    render();
    updatePlayback();
    ensureScene();
    schedule();
  }

  cards.forEach(card => card.addEventListener('click', () => selectTool(card.dataset.instrument), options));
  byId('instrument-hero-start').addEventListener('click', () => {
    selectTool(selected);
    byId('instrument-stage').scrollIntoView({ behavior: reducedMotion.matches || document.documentElement.dataset.motion === 'off' ? 'auto' : 'smooth', block: 'center' });
  }, options);
  angles.forEach(button => button.addEventListener('click', () => { values.triangles = Number(button.dataset.instrumentAngle); selectTool('triangles'); }, options));
  range.addEventListener('input', () => { values[selected] = Number(range.value); selectTool(selected, false); }, options);
  spacingRange.addEventListener('input', () => { spacing = Number(spacingRange.value) / 10; selectTool('triangles', false); }, options);
  byId('instrument-compass-mode').addEventListener('change', event => { mode = event.target.value; selectTool('compass'); }, options);
  play.addEventListener('click', () => {
    if (progress >= 1) { progress = 0; currentStep = -1; }
    playing = !playing;
    stopFrame();
    render();
    updatePlayback();
    schedule();
  }, options);
  byId('instrument-restart').addEventListener('click', () => { progress = 0; currentStep = -1; playing = !failed; stopFrame(); render(); updatePlayback(); schedule(); }, options);
  timeline.addEventListener('input', () => { playing = false; stopFrame(); progress = Number(timeline.value) / 100; currentStep = -1; render(); updatePlayback(); }, options);
  view.addEventListener('click', () => { tilted = !tilted; scene?.setView(tilted); render(); updatePlayback(); }, options);
  const syncVisibility = () => {
    stopFrame();
    if (visible()) { ensureScene(); scene?.resize(); render(); schedule(); }
  };
  const sectionObserver = new MutationObserver(syncVisibility);
  sectionObserver.observe(section, { attributes: true, attributeFilter: ['class'] });
  const intersectionObserver = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; syncVisibility(); });
  intersectionObserver.observe(stage);
  document.addEventListener('visibilitychange', syncVisibility, options);
  window.addEventListener('sdraft:open-tools', syncVisibility, options);
  window.addEventListener('pagehide', event => {
    stopFrame();
    if (!event.persisted) { disposed = true; controller.abort(); sectionObserver.disconnect(); intersectionObserver.disconnect(); scene?.dispose(); }
  }, options);
  window.addEventListener('pageshow', syncVisibility, options);
  reducedMotion.addEventListener('change', event => { if (event.matches) { playing = false; stopFrame(); updatePlayback(); } }, options);
  play.disabled = true;
  view.disabled = true;
  selectTool('ruler');
}
