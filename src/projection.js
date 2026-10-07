import { projectionMarkup } from './projection-markup.js';
import { PROJECTION_VIEWS, createViewDrawing, createProjectionSymbol, createProjectionLayout } from './projection-drawing.js';

const cameraAngles = { front: [0, 0], top: [-90, 0], right: [0, -90], left: [0, 90], bottom: [90, 0], back: [0, 180] };
const initialPose = { box: true, rotX: -24, rotY: -32 };
const placement = {
  eu: { front: 'Menjadi acuan di tengah susunan tampak.', top: 'Di bawah tampak depan.', bottom: 'Di atas tampak depan.', left: 'Di sebelah kanan tampak depan.', right: 'Di sebelah kiri tampak depan.', back: 'Di ujung kanan rangkaian, setelah tampak kiri.' },
  us: { front: 'Menjadi acuan di tengah susunan tampak.', top: 'Di atas tampak depan.', bottom: 'Di bawah tampak depan.', left: 'Di sebelah kiri tampak depan.', right: 'Di sebelah kanan tampak depan.', back: 'Di ujung kanan rangkaian, setelah tampak kanan.' }
};

export function initProjectionLesson() {
  const section = document.getElementById('projection');
  if (!section || section.dataset.projectionReady) return;
  section.dataset.projectionReady = 'true';
  section.innerHTML = projectionMarkup();
  const find = id => section.querySelector(`#${id}`);
  const lesson = section.querySelector('.projection-lesson');
  const viewport = find('projection-viewport');
  const glassBox = find('projection-glass-box');
  const flatStage = find('projection-flat-stage');
  const flatHost = find('projection-flat-host');
  const state = { mode: '3d', system: 'eu', view: 'front', ...initialPose, zoom: 1, auto: false };
  let dragging = null;
  let animationFrame = 0;
  let lastFrame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function renderTransform() {
    const available = Math.min(viewport.clientWidth || 500, viewport.clientHeight || 440);
    const scale = state.box ? Math.min(1.08, (available - 52) / 440) : Math.min(2.1, (available - 60) / 190);
    glassBox.style.transform = `rotateX(${state.rotX}deg) rotateY(${state.rotY}deg) scale(${Math.max(.45, scale)})`;
  }

  function renderDetails() {
    const view = PROJECTION_VIEWS[state.view];
    find('projection-view-title').textContent = view.name;
    find('projection-view-preview').innerHTML = createViewDrawing(state.view, { dimensions: true });
    find('projection-view-desc').textContent = view.description;
    find('projection-view-dimensions').textContent = `${view.dimensions.width} × ${view.dimensions.height} mm`;
    find('projection-view-position').textContent = placement[state.system][state.view];
    section.querySelectorAll('[data-projection-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectionPick === state.view)));
  }

  function renderFlatScale() {
    if (flatStage.hidden) return;
    const style = getComputedStyle(flatStage);
    const width = flatStage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = flatStage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const svgBox = flatHost.querySelector('svg')?.viewBox.baseVal;
    if (!svgBox || !width || !height) return;
    const fitWidth = Math.min(width, height * svgBox.width / svgBox.height);
    flatHost.style.width = `${fitWidth * state.zoom}px`;
  }

  function renderLayout() {
    flatHost.innerHTML = createProjectionLayout(state.system, state.view);
    renderFlatScale();
    find('btn-proj-fit').textContent = `${Math.round(state.zoom * 100)}%`;
    find('btn-proj-zoom-out').disabled = state.zoom <= 1;
    find('btn-proj-zoom-in').disabled = state.zoom >= 3;
  }

  function renderSystem() {
    const first = state.system === 'eu';
    lesson.dataset.system = state.system;
    find('btn-proj-eu').setAttribute('aria-pressed', String(first));
    find('btn-proj-us').setAttribute('aria-pressed', String(!first));
    find('projection-info-title').textContent = `Proyeksi ${first ? 'Eropa · Sudut pertama' : 'Amerika · Sudut ketiga'}`;
    find('projection-iso-symbol').innerHTML = createProjectionSymbol(state.system);
    find('projection-info-desc').textContent = first
      ? 'Benda berada di antara pengamat dan bidang proyeksi. Hasil pandangannya ditempatkan di sisi berlawanan terhadap tampak depan.'
      : 'Bidang proyeksi berada di antara pengamat dan benda. Hasil pandangannya ditempatkan pada sisi yang sama terhadap tampak depan.';
    const order = first ? ['Pengamat', 'Benda', 'Bidang proyeksi'] : ['Pengamat', 'Bidang proyeksi', 'Benda'];
    find('projection-order').innerHTML = order.map((name, index) => `${index ? '<span aria-hidden="true">→</span>' : ''}<span class="projection-order-item">${name}</span>`).join('');
    renderDetails();
    renderLayout();
  }

  function stopAuto() {
    state.auto = false;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastFrame = 0;
    find('btn-proj-autorotate').setAttribute('aria-pressed', 'false');
    find('btn-proj-autorotate').textContent = 'Putar otomatis';
  }

  function tick(now) {
    if (!state.auto || state.mode !== '3d' || !section.classList.contains('active') || document.hidden) {
      stopAuto();
      return;
    }
    if (lastFrame) state.rotY = (state.rotY + Math.min(now - lastFrame, 50) * .018) % 360;
    lastFrame = now;
    renderTransform();
    animationFrame = requestAnimationFrame(tick);
  }

  function setMode(mode) {
    stopAuto();
    state.mode = mode;
    lesson.dataset.mode = mode;
    viewport.hidden = mode !== '3d';
    flatStage.hidden = mode !== 'flat';
    find('projection-zoom').hidden = mode !== 'flat';
    find('btn-proj-box').hidden = mode !== '3d';
    find('btn-proj-autorotate').hidden = mode !== '3d';
    find('btn-proj-3d').setAttribute('aria-pressed', String(mode === '3d'));
    find('btn-proj-unfold').setAttribute('aria-pressed', String(mode === 'flat'));
    find('projection-stage-status').textContent = mode === '3d'
      ? 'Geser model atau gunakan tombol panah. Kotak bantu menampilkan keenam pandangan; perbedaan metode terlihat pada Susunan 2D.'
      : `Keenam tampak ditampilkan bersama. Proyeksi ${state.system === 'eu' ? 'Eropa: tampak atas di bawah depan.' : 'Amerika: tampak atas di atas depan.'} Klik tampak untuk mengenalinya.`;
    if (mode === '3d') requestAnimationFrame(renderTransform);
    else {
      renderFlatScale();
      window.completeModule?.('projection');
    }
  }

  function selectView(id) {
    if (!PROJECTION_VIEWS[id]) return;
    state.view = id;
    if (state.mode === '3d') {
      stopAuto();
      [state.rotX, state.rotY] = cameraAngles[id];
      renderTransform();
    }
    renderDetails();
    // Preserve the focused SVG button while changing its selection.
    flatHost.querySelectorAll('g[data-projection-view][role="button"]').forEach(group => {
      const active = group.dataset.projectionView === id;
      group.setAttribute('aria-pressed', String(active));
      group.classList.toggle('is-selected', active);
    });
    find('projection-stage-status').textContent = `${PROJECTION_VIEWS[id].name}. ${placement[state.system][id]}`;
  }

  find('projection-start').addEventListener('click', () => {
    find('projection-workspace').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    (state.mode === '3d' ? viewport : flatStage).focus({ preventScroll: true });
  });
  find('btn-proj-3d').addEventListener('click', () => setMode('3d'));
  find('btn-proj-unfold').addEventListener('click', () => setMode('flat'));
  ['eu', 'us'].forEach(system => find(`btn-proj-${system}`).addEventListener('click', () => {
    state.system = system;
    renderSystem();
    if (state.mode === 'flat') find('projection-stage-status').textContent = `Susunan berubah ke proyeksi ${system === 'eu' ? 'Eropa' : 'Amerika'}. ${placement[system][state.view]}`;
  }));
  find('btn-proj-box').addEventListener('click', () => {
    state.box = !state.box;
    lesson.dataset.box = String(state.box);
    find('btn-proj-box').setAttribute('aria-pressed', String(state.box));
    renderTransform();
  });
  find('btn-proj-autorotate').addEventListener('click', () => {
    if (state.auto) { stopAuto(); return; }
    state.auto = true;
    find('btn-proj-autorotate').setAttribute('aria-pressed', 'true');
    find('btn-proj-autorotate').textContent = 'Hentikan putaran';
    animationFrame = requestAnimationFrame(tick);
  });
  find('btn-proj-reset').addEventListener('click', () => {
    Object.assign(state, { view: 'front', ...initialPose, zoom: 1 });
    lesson.dataset.box = String(state.box);
    find('btn-proj-box').setAttribute('aria-pressed', String(state.box));
    setMode('3d');
    renderDetails();
    renderLayout();
    flatStage.scrollTo(0, 0);
  });
  section.querySelectorAll('[data-projection-pick]').forEach(button => button.addEventListener('click', () => selectView(button.dataset.projectionPick)));
  flatHost.addEventListener('click', event => selectView(event.target.closest('g[data-projection-view][role="button"]')?.dataset.projectionView));
  flatHost.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const group = event.target.closest('g[data-projection-view][role="button"]');
    if (!group) return;
    event.preventDefault();
    selectView(group.dataset.projectionView);
  });
  function setZoom(value) {
    state.zoom = Math.min(3, Math.max(1, value));
    renderFlatScale();
    find('btn-proj-fit').textContent = `${Math.round(state.zoom * 100)}%`;
    find('btn-proj-zoom-out').disabled = state.zoom <= 1;
    find('btn-proj-zoom-in').disabled = state.zoom >= 3;
    if (state.zoom === 1) flatStage.scrollTo(0, 0);
  }
  find('btn-proj-zoom-in').addEventListener('click', () => setZoom(state.zoom + .5));
  find('btn-proj-zoom-out').addEventListener('click', () => setZoom(state.zoom - .5));
  find('btn-proj-fit').addEventListener('click', () => setZoom(1));

  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || dragging || state.mode !== '3d') return;
    stopAuto();
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    state.rotY = (state.rotY + (event.clientX - dragging.x) * .45) % 360;
    state.rotX = Math.min(90, Math.max(-90, state.rotX - (event.clientY - dragging.y) * .45));
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    renderTransform();
  });
  const releaseDrag = event => {
    if (dragging?.id !== event.pointerId) return;
    dragging = null;
    viewport.classList.remove('is-dragging');
  };
  viewport.addEventListener('pointerup', releaseDrag);
  viewport.addEventListener('pointercancel', releaseDrag);
  viewport.addEventListener('lostpointercapture', releaseDrag);
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    stopAuto();
    state.rotY += event.key === 'ArrowLeft' ? -10 : event.key === 'ArrowRight' ? 10 : 0;
    state.rotX = Math.min(90, Math.max(-90, state.rotX + (event.key === 'ArrowUp' ? -10 : event.key === 'ArrowDown' ? 10 : 0)));
    renderTransform();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); });
  new MutationObserver(() => {
    if (!section.classList.contains('active')) stopAuto();
    else requestAnimationFrame(() => { renderTransform(); renderFlatScale(); });
  }).observe(section, { attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(renderTransform).observe(viewport);
  new ResizeObserver(renderFlatScale).observe(flatStage);
  renderSystem();
  renderTransform();
}
