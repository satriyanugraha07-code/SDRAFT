import { lineTypes, lineById, learningOrder, lineSymbol } from './lines-data.js';
import { createLineDrawing, createCapIllustration, DRAWING_VIEWS, lineTargets } from './lines-drawing.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const shuffled = items => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export function initLinesLesson() {
  const section = document.getElementById('lines');
  const lesson = section?.querySelector('.line-lesson');
  if (!lesson || lesson.dataset.initialized) return;
  lesson.dataset.initialized = 'true';
  const el = id => lesson.querySelector(`#${id}`);
  const stage = el('line-drawing-stage');
  const catalog = el('line-type-catalog');
  catalog.innerHTML = lineTypes.map((type, index) => `<button class="line-card" data-line-choice="${type.id}" aria-pressed="false" style="--line-color:${type.color};--line-soft:${type.soft}"><span class="line-card-swatch">${lineSymbol(type)}</span><span class="line-card-number">0${index + 1}</span><span class="line-card-title">${type.title}</span><span class="line-card-pattern">${type.pattern}</span></button>`).join('');
  el('line-hero-illustration').innerHTML = createCapIllustration();
  stage.innerHTML = createLineDrawing();
  stage.setAttribute('tabindex', '0');
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', 'Gambar teknik interaktif. Saat diperbesar, geser dengan jari atau tombol panah.');
  const svg = el('line-technical-drawing');
  const layers = [...svg.querySelectorAll('[data-line-layer]')];
  const defs = svg.querySelector('defs');
  const state = { selected: null, progress: 1, playing: false, tour: false, focus: false, zoom: 1, offset: [0, 0] };
  stage.dataset.view = 'all';
  const explored = new Set();
  let frame = 0;
  let lastTime = 0;
  let dwell = 0;
  let stageVisible = true;
  let drag = null;
  let suppressClick = false;
  const masks = new Map();
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  const isActive = () => section.classList.contains('active') && !document.hidden && stageVisible;

  // Reveal with a mask: the actual hidden and centre-line dash patterns never change.
  layers.forEach((group, index) => {
    const mask = document.createElementNS(SVG_NS, 'mask');
    const rect = document.createElementNS(SVG_NS, 'rect');
    mask.id = `line-reveal-${index}`;
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
    rect.setAttribute('fill', '#fff');
    mask.append(rect);
    defs.append(mask);
    masks.set(group, { mask, rect });
    // Wider transparent targets make thin lines reachable by mouse and touch.
    [...group.children].forEach(shape => {
      if (!['path', 'circle', 'line', 'polyline'].includes(shape.tagName)) return;
      const hit = shape.cloneNode(false);
      hit.removeAttribute('id');
      hit.removeAttribute('marker-start');
      hit.removeAttribute('marker-end');
      hit.removeAttribute('clip-path');
      hit.setAttribute('class', 'line-layer-hit');
      hit.setAttribute('aria-hidden', 'true');
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '12');
      hit.setAttribute('stroke-dasharray', 'none');
      hit.setAttribute('fill', group.dataset.lineLayer === 'hatch' ? 'transparent' : 'none');
      if (group.dataset.lineLayer === 'hatch') hit.style.pointerEvents = 'all';
      group.prepend(hit);
    });
  });
  const pointer = document.createElementNS(SVG_NS, 'g');
  pointer.setAttribute('class', 'line-target-pointer');
  pointer.setAttribute('aria-hidden', 'true');
  pointer.style.pointerEvents = 'none';
  pointer.innerHTML = '<circle r="7" fill="white" stroke-width="2.5"/><circle r="2.5" stroke="none"/>';
  svg.append(pointer);

  function updateViewBox() {
    const [x, y, width, height] = DRAWING_VIEWS.all.box;
    const w = width / state.zoom;
    const h = height / state.zoom;
    state.offset[0] = Math.max(-(width - w) / 2, Math.min((width - w) / 2, state.offset[0]));
    state.offset[1] = Math.max(-(height - h) / 2, Math.min((height - h) / 2, state.offset[1]));
    svg.setAttribute('viewBox', `${x + (width - w) / 2 + state.offset[0]} ${y + (height - h) / 2 + state.offset[1]} ${w} ${h}`);
    stage.style.touchAction = state.zoom > 1 ? 'none' : 'pan-y';
    stage.classList.toggle('is-zoomed', state.zoom > 1);
    el('line-zoom-out').disabled = state.zoom <= 1;
    el('line-zoom-in').disabled = state.zoom >= 2.5;
    el('line-zoom-reset').textContent = state.zoom === 1 ? 'Pas gambar' : `${Math.round(state.zoom * 100)}% · reset`;
  }

  function resetViewport() {
    state.zoom = 1;
    state.offset = [0, 0];
    updateViewBox();
  }

  function updateReveal() {
    layers.forEach(group => {
      if (group.dataset.lineLayer !== state.selected || state.progress >= 1) {
        group.removeAttribute('mask');
        return;
      }
      const bbox = group.getBBox();
      if (!bbox.width && !bbox.height) return;
      const { mask, rect } = masks.get(group);
      mask.setAttribute('x', bbox.x - 15);
      mask.setAttribute('y', bbox.y - 15);
      mask.setAttribute('width', bbox.width + 30);
      mask.setAttribute('height', bbox.height + 30);
      rect.setAttribute('x', bbox.x - 15);
      rect.setAttribute('y', bbox.y - 15);
      rect.setAttribute('width', (bbox.width + 30) * state.progress);
      rect.setAttribute('height', bbox.height + 30);
      group.setAttribute('mask', `url(#${mask.id})`);
    });
    const percent = Math.round(state.progress * 100);
    el('line-animation-timeline').value = percent;
    el('line-animation-progress').textContent = `${percent}%`;
    el('line-animation-timeline').style.setProperty('--line-progress', `${percent}%`);
    pointer.style.display = state.selected && state.progress >= .95 ? '' : 'none';
  }

  function updateSelection() {
    const type = lineById[state.selected];
    const color = type?.color || '#153451';
    lesson.style.setProperty('--line-highlight', color);
    lesson.style.setProperty('--line-soft', type?.soft || '#eef7fc');
    catalog.querySelectorAll('[data-line-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.lineChoice === state.selected));
      button.classList.toggle('is-active', button.dataset.lineChoice === state.selected);
    });
    layers.forEach(group => {
      const selected = group.dataset.lineLayer === state.selected;
      group.classList.toggle('is-selected', selected);
      group.classList.toggle('is-muted', Boolean(type) && !selected);
      group.classList.toggle('is-hidden', Boolean(type) && state.focus && !selected);
      group.setAttribute('tabindex', state.focus && type && !selected ? '-1' : '0');
      group.setAttribute('aria-pressed', String(selected));
    });
    svg.querySelector('.line-drawing-hatch-stroke').setAttribute('stroke', state.selected === 'hatch' ? color : '#153451');
    svg.querySelector('#line-sheet-arrow path').setAttribute('fill', state.selected === 'dimension' ? color : '#153451');
    svg.querySelector('#line-sheet-cut-arrow path').setAttribute('fill', state.selected === 'cutting' ? color : '#153451');
    el('line-focus-toggle').setAttribute('aria-pressed', String(state.focus));
    el('line-focus-toggle').disabled = !type;
    el('line-show-all').setAttribute('aria-pressed', String(!type));
    el('line-detail-title').textContent = type?.title || 'Semua garis bekerja bersama';
    el('line-detail-swatch').innerHTML = type ? lineSymbol(type, true) : lineSymbol(lineById.visible) + lineSymbol(lineById.hidden);
    el('line-detail-pattern').textContent = type?.pattern || 'Pola berbeda, fungsi berbeda';
    el('line-detail-thickness').textContent = type?.thickness || 'Contoh tebal : tipis = 2 : 1';
    el('line-detail-function').textContent = type?.function || 'Baca kontur, bagian tersembunyi, pusat, ukuran, dan potongan sebagai satu kesatuan.';
    el('line-detail-location').textContent = type?.location || 'Semua tampak ditampilkan bersama. Sentuh garis pada gambar atau pilih salah satu kartu di atas.';
    el('line-detail-rule').textContent = type?.rule || 'Bentuk benda tetap sama. Jenis garis menjelaskan bagian mana yang terlihat, tertutup, diukur, atau dipotong.';
    el('line-detail-mistake').textContent = type?.mistake || 'Tiap tampak disajikan terpisah untuk belajar. Susunan panel ini bukan tata letak proyeksi pada lembar kerja.';
    el('line-drawing-caption').textContent = type ? `${type.caption} Titik penunjuk menandai salah satu contohnya.` : 'Semua tampak dan jenis garis ditampilkan bersama. Sentuh garis pada gambar untuk mengenalinya.';
    if (type) {
      const target = lineTargets[type.id];
      pointer.setAttribute('transform', `translate(${target.x} ${target.y})`);
      pointer.setAttribute('stroke', color);
      pointer.lastElementChild.setAttribute('fill', color);
    }
    updateReveal();
    updatePlayer();
  }

  function updatePlayer() {
    const button = el('line-animation-play');
    button.textContent = state.playing ? 'Ⅱ Jeda animasi' : '▶ Putar animasi';
    button.setAttribute('aria-label', state.playing ? 'Jeda animasi jenis garis' : 'Putar animasi jenis garis');
    button.setAttribute('aria-pressed', String(state.playing));
    el('line-animation-tour').setAttribute('aria-pressed', String(state.tour && state.playing));
  }

  function stopAnimation() {
    state.playing = false;
    state.tour = false;
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    dwell = 0;
    updatePlayer();
  }

  function choose(id, { animate = false } = {}) {
    if (!lineById[id]) return;
    stopAnimation();
    state.selected = id;
    state.progress = animate && !reducedMotion() ? 0 : 1;
    explored.add(id);
    if (explored.size === lineTypes.length) window.completeModule?.('lines');
    updateSelection();
    if (state.progress === 0) startAnimation(false);
  }

  function tick(now) {
    frame = 0;
    if (!state.playing || !isActive()) { lastTime = 0; return; }
    const delta = lastTime ? Math.min(now - lastTime, 100) : 0;
    lastTime = now;
    if (state.progress < 1) {
      state.progress = Math.min(1, state.progress + delta / 2400);
      updateReveal();
    } else if (state.tour) {
      dwell += delta;
      if (dwell >= 1300) {
        const next = learningOrder.indexOf(state.selected) + 1;
        if (next >= learningOrder.length) { stopAnimation(); return; }
        state.selected = learningOrder[next];
        explored.add(state.selected);
        state.progress = 0;
        dwell = 0;
        updateSelection();
        if (explored.size === lineTypes.length) window.completeModule?.('lines');
      }
    } else { stopAnimation(); return; }
    frame = requestAnimationFrame(tick);
  }

  function resumeFrame() {
    if (state.playing && isActive() && !frame) frame = requestAnimationFrame(tick);
  }

  function startAnimation(tour = false) {
    if (tour) resetViewport();
    if (!state.selected || tour) choose(learningOrder[0]);
    if (state.progress >= 1 || tour) state.progress = 0;
    state.tour = tour;
    state.playing = true;
    lastTime = 0;
    dwell = 0;
    updateReveal();
    updatePlayer();
    resumeFrame();
  }

  catalog.addEventListener('click', event => {
    const button = event.target.closest('button[data-line-choice]');
    if (!button) return;
    choose(button.dataset.lineChoice, { animate: true });
    if (matchMedia('(max-width: 980px)').matches) stage.closest('.line-demo').scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' });
  });
  const selectDrawingLine = event => {
    if (suppressClick) { suppressClick = false; return; }
    const group = event.target.closest('[data-line-layer]');
    if (group) choose(group.dataset.lineLayer);
  };
  stage.addEventListener('click', selectDrawingLine);
  svg.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.matches('[data-line-layer]')) { event.preventDefault(); selectDrawingLine(event); }
  });
  el('line-show-all').addEventListener('click', () => {
    stopAnimation(); state.selected = null; state.progress = 1; state.focus = false; updateSelection();
  });
  el('line-focus-toggle').addEventListener('click', () => { state.focus = !state.focus; updateSelection(); });
  el('line-animation-play').addEventListener('click', () => state.playing ? stopAnimation() : startAnimation());
  el('line-animation-tour').addEventListener('click', () => state.tour && state.playing ? stopAnimation() : startAnimation(true));
  el('line-animation-restart').addEventListener('click', () => { stopAnimation(); state.progress = 0; startAnimation(); });
  const step = direction => {
    const index = Math.max(0, learningOrder.indexOf(state.selected));
    choose(learningOrder[(index + direction + learningOrder.length) % learningOrder.length]);
  };
  el('line-animation-prev').addEventListener('click', () => step(-1));
  el('line-animation-next').addEventListener('click', () => step(1));
  el('line-animation-timeline').addEventListener('input', event => {
    const progress = Number(event.target.value) / 100;
    stopAnimation();
    state.progress = progress;
    if (!state.selected) { state.selected = 'visible'; updateSelection(); }
    else updateReveal();
  });
  el('line-hero-start').addEventListener('click', () => {
    choose('visible');
    stage.closest('.line-demo').scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' });
    if (!reducedMotion()) startAnimation(true);
  });
  el('line-zoom-in').addEventListener('click', () => { state.zoom = Math.min(2.5, state.zoom + .5); updateViewBox(); });
  el('line-zoom-out').addEventListener('click', () => { state.zoom = Math.max(1, state.zoom - .5); updateViewBox(); });
  el('line-zoom-reset').addEventListener('click', resetViewport);
  stage.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (state.zoom <= 1 || !event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: [...state.offset], moved: false };
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) {
      drag.moved = true;
      stage.setPointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    const rect = svg.getBoundingClientRect();
    const box = svg.viewBox.baseVal;
    const pixelScale = Math.min(rect.width / box.width, rect.height / box.height);
    state.offset = [drag.offset[0] - dx / pixelScale, drag.offset[1] - dy / pixelScale];
    updateViewBox();
  });
  const releaseDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = event.type === 'pointerup' && drag.moved;
    drag = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  };
  stage.addEventListener('pointerup', releaseDrag);
  stage.addEventListener('pointercancel', releaseDrag);
  stage.addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction || state.zoom <= 1) return;
    event.preventDefault();
    const box = svg.viewBox.baseVal;
    state.offset[0] += direction[0] * box.width * .12;
    state.offset[1] += direction[1] * box.height * .12;
    updateViewBox();
  });

  const quiz = { questions: [], index: 0, score: 0, answered: false };
  const answers = el('line-answer-options');
  function showQuestion() {
    const type = lineById[quiz.questions[quiz.index]];
    quiz.answered = false;
    el('line-challenge-prompt').textContent = `Soal ${quiz.index + 1} dari 4 · ${type.prompt}`;
    el('line-challenge-feedback').textContent = '';
    el('line-challenge-feedback').className = 'line-challenge-feedback';
    el('line-challenge-next').hidden = true;
    const choices = shuffled([type.id, ...shuffled(lineTypes.filter(item => item.id !== type.id).map(item => item.id)).slice(0, 3)]);
    answers.innerHTML = choices.map(id => `<button data-line-answer="${id}">${lineSymbol(lineById[id])}<span>${lineById[id].title}</span></button>`).join('');
    answers.hidden = false;
    answers.querySelector('button').focus({ preventScroll: true });
  }
  el('line-challenge-start').addEventListener('click', () => {
    quiz.questions = shuffled(learningOrder).slice(0, 4);
    quiz.index = 0; quiz.score = 0;
    el('line-challenge-start').hidden = true;
    el('line-challenge-score').textContent = '0 / 4';
    el('line-challenge-progress').style.width = '0%';
    showQuestion();
  });
  answers.addEventListener('click', event => {
    const button = event.target.closest('button[data-line-answer]');
    if (!button || quiz.answered) return;
    const correct = quiz.questions[quiz.index];
    if (button.dataset.lineAnswer !== correct) {
      button.classList.add('is-wrong');
      el('line-challenge-feedback').textContent = 'Belum tepat. Baca fungsi pada soal dan coba lagi.';
      el('line-challenge-feedback').classList.add('is-wrong');
      return;
    }
    quiz.answered = true;
    quiz.score++;
    button.classList.remove('is-wrong');
    button.classList.add('is-correct');
    answers.querySelectorAll('button').forEach(item => { item.disabled = true; });
    el('line-challenge-score').textContent = `${quiz.score} / 4`;
    el('line-challenge-progress').style.width = `${quiz.score * 25}%`;
    el('line-challenge-feedback').className = 'line-challenge-feedback is-correct';
    el('line-challenge-feedback').textContent = `Tepat! ${lineById[correct].function}`;
    choose(correct);
    el('line-challenge-next').hidden = false;
    el('line-challenge-next').textContent = quiz.index === 3 ? 'Lihat hasil →' : 'Soal berikutnya →';
    el('line-challenge-next').focus({ preventScroll: true });
  });
  el('line-challenge-next').addEventListener('click', () => {
    if (!quiz.answered) return;
    quiz.index++;
    if (quiz.index < 4) { showQuestion(); return; }
    answers.hidden = true;
    el('line-challenge-next').hidden = true;
    el('line-challenge-start').hidden = false;
    el('line-challenge-start').textContent = 'Ulangi latihan';
    el('line-challenge-start').focus({ preventScroll: true });
    el('line-challenge-prompt').textContent = 'Keempat fungsi garis sudah kamu kenali. Coba cari contohnya lagi pada gambar.';
    el('line-challenge-feedback').textContent = 'Selesai · 4 dari 4. Kamu bisa mengulang dengan urutan soal berbeda.';
    window.completeModule?.('lines');
  });

  const sectionObserver = new MutationObserver(() => {
    if (section.classList.contains('active')) { updateReveal(); resumeFrame(); }
    else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  });
  sectionObserver.observe(section, { attributes: true, attributeFilter: ['class'] });
  const visibilityObserver = new IntersectionObserver(entries => {
    stageVisible = entries[0].isIntersecting;
    if (stageVisible) resumeFrame();
    else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  }, { threshold: .08 });
  visibilityObserver.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else resumeFrame();
  });
  new ResizeObserver(() => updateReveal()).observe(stage);
  resetViewport();
  updateSelection();
}
