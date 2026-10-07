import { pencilGrades, pencilById, pressures, strokeAppearance, paperEffects, pencilDrawing, pencilIllustration, strokeSample } from './pencils-data.js';

let initialized = false;

export function initPencilLab() {
  const section = document.getElementById('pencils');
  if (!section || initialized) return;
  initialized = true;
  const byId = id => document.getElementById(id);
  const canvas = byId('pencil-demo-canvas');
  const stage = byId('pencil-demo-stage');
  const timeline = byId('pencil-demo-timeline');
  const play = byId('pencil-demo-play');
  const view = byId('pencil-demo-view');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let selected = '2h', mode = 'line', pressure = 'medium';
  let progress = 0, playing = false, tilted = true, lastTime = 0, frame = 0;
  let scene, loading, failed = false, disposed = false, intersecting = false, previousCaption = '';
  const explored = new Set();
  const grade = () => pencilById[selected];
  const configuration = () => ({ grade: selected, barrel: grade().barrel, mode, resultLabel: grade().lineTrait, ...strokeAppearance(grade(), pressure), ...paperEffects(grade(), pressure) });
  const visible = () => section.classList.contains('active') && intersecting && !document.hidden;
  const autoMotion = () => !reduceMotion.matches && document.documentElement.dataset.motion !== 'off';
  const pressureText = () => pressures[pressure].name.toLowerCase();
  const modeText = () => ({ line: 'Garis', hatch: 'Arsiran', erase: 'Gores & hapus' })[mode];
  const eraseResult = current => {
    const effects = paperEffects(current, pressure);
    if (effects.indentation > .35) return { name: 'Bekas tekanan', text: 'Grafit berkurang, tetapi bekas tekanan atau lekukan pada kertas masih terlihat. Penghapus tidak menghilangkan lekukan yang sudah terbentuk.' };
    if (effects.eraseResidue > .12) return { name: 'Sisa grafit', text: 'Sebagian grafit masih tampak setelah digosok. Gunakan penghapus bersih dan koreksi perlahan agar grafit tidak menyebar menjadi noda.' };
    return { name: 'Koreksi relatif bersih', text: 'Goresan ini dapat dikoreksi relatif bersih. Goresan ringan membantu menjaga permukaan kertas; hasil nyata juga bergantung pada kertas dan penghapus.' };
  };

  byId('pencil-grade-catalog').innerHTML = pencilGrades.map(item => {
    const { strokeWidth, endWidth } = strokeAppearance(item);
    return `<button type="button" class="pencil-card" data-pencil-grade="${item.id}" aria-label="Pilih pensil ${item.name}: ${item.character.toLowerCase()}, ${item.lineTrait.toLowerCase()}" aria-pressed="${item.id === selected}" style="--grade-accent:${item.accent};--grade-soft:${item.soft}"><span class="pencil-card-art">${pencilIllustration(item, `card-${item.id}`)}</span><span class="pencil-card-title"><strong>${item.name}</strong><span>${item.character}</span></span><svg class="pencil-card-stroke" viewBox="0 0 150 20" aria-hidden="true"><path d="M6 ${10-strokeWidth*24}L144 ${10-endWidth*24}V${10+endWidth*24}L6 ${10+strokeWidth*24}Z" fill="${item.graphite}"/></svg><small>${item.lineTrait}</small></button>`;
  }).join('');
  byId('pencil-practice-grades').innerHTML = pencilGrades.map(item => `<button type="button" data-practice-grade="${item.id}" aria-label="Gunakan pensil ${item.name} untuk latihan" aria-pressed="${item.id === selected}">${item.name}</button>`).join('');
  byId('pencil-hero-illustration').innerHTML = `<svg viewBox="0 0 280 250" aria-hidden="true">${pencilGrades.map((item, index) => `<g transform="translate(${83 + index * 24} 223) rotate(${-113 + index * 12}) scale(.88)">${pencilDrawing(item, `hero-${item.id}`)}</g>`).join('')}</svg>`;

  function comparison() {
    byId('pencil-compare-condition').textContent = `${modeText()} · tekanan ${pressureText()}`;
    byId('pencil-comparison-intro').textContent = mode === 'erase'
      ? 'Bandingkan sebelum dan sesudah dihapus. Seri H yang ditekan kuat dapat meninggalkan bekas tekanan pada kertas; grafit yang lunak dapat menyisakan noda.'
      : 'Lihat contoh hasil setiap pensil: 2H sangat tipis, H tipis, HB sedang, B tebal, dan 2B lebih tebal. Perbedaan ketebalannya ditunjukkan langsung pada garis di bawah.';
    byId('pencil-comparison-rows').innerHTML = pencilGrades.map(item => `<button type="button" class="pencil-compare-row" data-compare-grade="${item.id}" aria-label="Bandingkan pensil ${item.name}: ${mode === 'erase' ? eraseResult(item).name.toLowerCase() : item.lineTrait.toLowerCase()}" aria-pressed="${item.id === selected}" style="--grade-accent:${item.accent};--grade-soft:${item.soft}"><span class="pencil-compare-object"><strong>${item.name}</strong>${pencilIllustration(item, `compare-${item.id}`)}</span><span class="pencil-compare-stroke">${strokeSample(item, `compare-stroke-${item.id}`, mode, pressure)}</span><span class="pencil-compare-use"><strong>${mode === 'erase' ? eraseResult(item).name : item.lineTrait}</strong><small>${mode === 'erase' ? item.erase : item.use}</small></span></button>`).join('');
  }

  function updatePlayback() {
    const name = playing ? 'Jeda animasi' : progress >= 1 ? 'Putar lagi' : 'Putar animasi';
    byId('pencil-play-text').textContent = name;
    byId('pencil-play-icon').textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', `${name} pensil`);
    view.textContent = tilted ? 'Lihat dari atas' : 'Lihat miring';
    view.setAttribute('aria-pressed', String(tilted));
  }

  function render() {
    const current = grade();
    const phase = mode === 'erase' ? progress < .55 ? 0 : progress < .97 ? 1 : 2 : progress < .15 ? 0 : progress < .85 ? 1 : 2;
    byId('pencil-stage-step').textContent = (mode === 'erase' ? ['1 · TARIK GARIS', '2 · HAPUS PERLAHAN', '3 · PERIKSA KERTAS'] : ['1 · PILIH PENSIL', '2 · TARIK GARIS', '3 · LIHAT KETEBALANNYA'])[phase];
    let caption;
    if (mode === 'erase') {
      caption = phase === 0 ? `Tarik garis ${current.name} dengan tekanan ${pressureText()}. Setelah itu, angkat pensil sebelum menghapus.`
        : phase === 1 ? 'Gosok penghapus perlahan di sepanjang goresan. Perhatikan grafit yang berkurang dan kondisi kertas di bawahnya.'
          : `${eraseResult(current).name}. ${eraseResult(current).text}`;
    } else {
      caption = phase === 0 ? `Pensil ${current.name}: ${current.lineTrait.toLowerCase()} dalam contoh ini. Perhatikan hasilnya saat pensil menyentuh kertas.`
        : phase === 1 ? `${mode === 'line' ? 'Tarik garis dari kiri ke kanan' : 'Buat arsiran teratur'} dengan tekanan ${pressureText()}. Lihat ketebalan goresan ${current.name} yang muncul di belakang pensil.`
          : `${current.name} · ${current.lineTrait}. ${pressure === 'firm' && current.hardness > .7 ? 'Grafit seri H yang keras dapat meninggalkan bekas tekanan pada kertas bila ditekan terlalu kuat. Coba Gores & hapus.' : current.use}`;
    }
    if (caption !== previousCaption) { byId('pencil-demo-caption').textContent = caption; previousCaption = caption; }
    timeline.value = String(progress * 100);
    timeline.style.setProperty('--pencil-progress', `${progress * 100}%`);
    byId('pencil-demo-progress').textContent = `${Math.round(progress * 100)}%`;
    scene?.render(progress);
  }

  function updateInformation() {
    const current = grade();
    section.style.setProperty('--pencil-accent', current.accent);
    section.style.setProperty('--pencil-soft', current.soft);
    section.dataset.activePencilGrade = selected;
    section.querySelectorAll('[data-pencil-grade], [data-practice-grade], [data-compare-grade]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.pencilGrade || button.dataset.practiceGrade || button.dataset.compareGrade) === selected)));
    section.querySelectorAll('[data-pencil-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pencilMode === mode)));
    section.querySelectorAll('[data-pencil-pressure]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pencilPressure === pressure)));
    byId('pencil-focus-name').textContent = `Pensil ${current.name}`;
    byId('pencil-focus-art').innerHTML = pencilIllustration(current, 'focus');
    byId('pencil-fallback-art').innerHTML = pencilIllustration(current, 'fallback') + strokeSample(current, 'fallback-stroke', mode, pressure);
    byId('pencil-focus-hardness').textContent = current.character;
    byId('pencil-focus-line').textContent = current.lineTrait;
    byId('pencil-focus-description').textContent = current.description;
    byId('pencil-focus-use').textContent = current.use;
    byId('pencil-focus-erase').textContent = current.erase;
    byId('pencil-focus-tip').textContent = current.tip;
    byId('pencil-focus-sample').innerHTML = strokeSample(current, 'focus-stroke', mode, pressure, false);
    byId('pencil-paper-profile').hidden = mode !== 'erase' || paperEffects(current, pressure).indentation <= .35;
    byId('pencil-sample-note').textContent = `${modeText()} ${current.name} · tekanan ${pressureText()}.`;
    byId('pencil-demo-title').textContent = `${current.name} ${mode === 'erase' ? 'digores & dihapus' : mode === 'line' ? 'membuat garis' : 'membuat arsiran'}`;
    byId('pencil-stage-grade').textContent = `${current.name} · tekanan ${pressureText()}`;
    byId('pencil-practice-selection').textContent = `${current.name} · ${current.lineTrait.toLowerCase()}`;
    byId('pencil-pressure-note').textContent = pressure === 'light' ? 'Goresan ringan lebih mudah dikoreksi dan membantu menjaga kertas tetap bersih.' : pressure === 'firm' ? 'Seri H yang keras dapat meninggalkan bekas tekanan pada kertas bila ditekan kuat. Lihat dampaknya pada Gores & hapus.' : 'Bandingkan hasil setiap grade, lalu coba Gores & hapus untuk melihat kondisi kertas.';
    canvas.setAttribute('aria-label', `Animasi ${modeText().toLowerCase()} pensil ${current.name}, ${current.lineTrait.toLowerCase()}, dengan tekanan ${pressureText()}. ${mode === 'erase' ? 'Menunjukkan kondisi kertas setelah dihapus.' : 'Ketebalan garis tetap sepanjang goresan.'}`);
    scene?.configure(configuration());
    scene?.setView(tilted);
    render();
    updatePlayback();
  }

  function stopFrame() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function schedule() { if (playing && scene && visible() && !frame && !disposed) frame = requestAnimationFrame(tick); }
  function tick(time) {
    frame = 0;
    if (!playing || !visible() || disposed) { lastTime = 0; return; }
    if (lastTime) progress = Math.min(1, progress + Math.min(time - lastTime, 80) / (mode === 'line' ? 10000 : mode === 'erase' ? 13000 : 15000));
    lastTime = time;
    render();
    if (progress >= 1) {
      explored.add(selected);
      if (explored.size >= 2) window.completeModule?.('pencils');
      playing = false; lastTime = 0; updatePlayback();
    }
    schedule();
  }

  function fallback() {
    failed = true; playing = false; stopFrame(); scene?.dispose(); scene = null;
    canvas.hidden = true; byId('pencil-scene-fallback').hidden = false;
    play.disabled = true; view.disabled = true; updatePlayback();
  }

  async function ensureScene() {
    if (scene || loading || failed || disposed || !section.classList.contains('active')) return;
    loading = (async () => {
      try {
        const { createPencilScene } = await import('./pencils-scene.js');
        if (disposed) return;
        scene = await createPencilScene(canvas, stage, fallback);
        if (disposed || failed) { scene?.dispose(); return; }
        scene.configure(configuration()); scene.setView(tilted); render();
        play.disabled = false; view.disabled = false; schedule();
      } catch (error) { console.warn('Animasi pensil tidak dapat dimuat.', error); fallback(); }
    })();
  }

  function selectGrade(id, animate = true) {
    if (!pencilById[id]) return;
    selected = id; progress = 0; previousCaption = ''; stopFrame();
    playing = animate && autoMotion() && !failed;
    updateInformation(); ensureScene(); schedule();
  }

  section.addEventListener('click', event => {
    const gradeButton = event.target.closest('button[data-pencil-grade], button[data-compare-grade], button[data-practice-grade]');
    if (gradeButton) selectGrade(gradeButton.dataset.pencilGrade || gradeButton.dataset.compareGrade || gradeButton.dataset.practiceGrade, !gradeButton.dataset.practiceGrade);
    const modeButton = event.target.closest('[data-pencil-mode]');
    if (modeButton) { mode = modeButton.dataset.pencilMode; comparison(); selectGrade(selected); }
    const pressureButton = event.target.closest('[data-pencil-pressure]');
    if (pressureButton) { pressure = pressureButton.dataset.pencilPressure; comparison(); updateInformation(); }
  }, options);
  byId('pencil-hero-start').addEventListener('click', () => {
    progress = 0; playing = !failed; stopFrame(); render(); updatePlayback(); ensureScene(); schedule();
    stage.scrollIntoView({ behavior: autoMotion() ? 'smooth' : 'auto', block: 'center' });
  }, options);
  play.addEventListener('click', () => { if (progress >= 1) progress = 0; playing = !playing; stopFrame(); render(); updatePlayback(); schedule(); }, options);
  byId('pencil-demo-restart').addEventListener('click', () => { progress = 0; playing = !failed; stopFrame(); render(); updatePlayback(); schedule(); }, options);
  view.addEventListener('click', () => { tilted = !tilted; scene?.setView(tilted); render(); updatePlayback(); }, options);
  timeline.addEventListener('input', () => { playing = false; stopFrame(); progress = Number(timeline.value) / 100; render(); updatePlayback(); }, options);

  const practiceCanvas = byId('pencil-lab-canvas-element');
  const paper = byId('pencil-canvas-wrapper');
  const context = practiceCanvas.getContext('2d');
  let drawing = false, activePointerId = null, lastPoint, practiceMode = 'draw', practiceCount = 0, hasPractice = false, practiceWidth = 0, practiceHeight = 0, pixelRatio = 1;

  function resizePractice() {
    if (!context || paper.clientWidth < 1 || paper.clientHeight < 1 || disposed) return;
    const width = paper.clientWidth, height = paper.clientHeight, ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (practiceWidth === width && practiceHeight === height && pixelRatio === ratio) return;
    const copy = document.createElement('canvas');
    copy.width = practiceCanvas.width; copy.height = practiceCanvas.height;
    if (copy.width && copy.height) copy.getContext('2d').drawImage(practiceCanvas, 0, 0);
    practiceCanvas.width = Math.round(width * ratio); practiceCanvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (copy.width && copy.height) context.drawImage(copy, 0, 0, copy.width, copy.height, 0, 0, width, height);
    practiceWidth = width; practiceHeight = height; pixelRatio = ratio;
    byId('pencil-practice-tag').hidden = true;
  }
  const coordinates = event => {
    const rect = practiceCanvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * paper.clientWidth / rect.width, y: (event.clientY - rect.top) * paper.clientHeight / rect.height };
  };
  function applyPracticeStyle() {
    const appearance = strokeAppearance(grade(), pressure);
    context.globalCompositeOperation = practiceMode === 'erase' ? 'destination-out' : 'source-over';
    context.strokeStyle = appearance.graphite; context.fillStyle = appearance.graphite;
    context.lineWidth = practiceMode === 'erase' ? 24 : appearance.strokeWidth * 48;
    context.lineCap = 'round'; context.lineJoin = 'round';
  }
  practiceCanvas.addEventListener('pointerdown', event => {
    if (!context || drawing || (event.pointerType === 'mouse' && event.button !== 0)) return;
    resizePractice(); drawing = true; activePointerId = event.pointerId; lastPoint = coordinates(event); practiceCanvas.setPointerCapture(event.pointerId); applyPracticeStyle();
    context.beginPath(); context.arc(lastPoint.x, lastPoint.y, context.lineWidth / 2, 0, Math.PI * 2); context.fill();
    hasPractice = true; byId('pencil-practice-placeholder').hidden = true; byId('pencil-practice-tag').hidden = true;
  }, options);
  practiceCanvas.addEventListener('pointermove', event => {
    if (!drawing || !context || event.pointerId !== activePointerId) return;
    const point = coordinates(event); applyPracticeStyle();
    context.beginPath(); context.moveTo(lastPoint.x, lastPoint.y); context.lineTo(point.x, point.y); context.stroke(); lastPoint = point;
  }, options);
  const endPractice = event => {
    if (!drawing || event.pointerId !== activePointerId) return;
    drawing = false; activePointerId = null;
    if (practiceCanvas.hasPointerCapture(event.pointerId)) practiceCanvas.releasePointerCapture(event.pointerId);
    if (practiceMode === 'draw' && lastPoint) {
      const tag = byId('pencil-practice-tag'); tag.textContent = `${grade().name} · tekanan ${pressureText()}`; tag.hidden = false;
      tag.style.left = `${Math.max(8, Math.min(lastPoint.x + 12, paper.clientWidth - tag.offsetWidth - 8))}px`;
      tag.style.top = `${Math.max(8, Math.min(lastPoint.y + 12, paper.clientHeight - tag.offsetHeight - 8))}px`;
      practiceCount++; if (practiceCount >= 2) window.completeModule?.('pencils');
    }
  };
  practiceCanvas.addEventListener('pointerup', endPractice, options);
  practiceCanvas.addEventListener('pointercancel', event => {
    if (event.pointerId !== activePointerId) return;
    drawing = false; activePointerId = null;
    if (practiceCanvas.hasPointerCapture(event.pointerId)) practiceCanvas.releasePointerCapture(event.pointerId);
  }, options);
  function choosePracticeMode(value) {
    practiceMode = value;
    byId('pencil-practice-draw').setAttribute('aria-pressed', String(value === 'draw'));
    byId('pencil-practice-erase').setAttribute('aria-pressed', String(value === 'erase'));
    practiceCanvas.style.cursor = value === 'draw' ? 'crosshair' : 'cell';
  }
  byId('pencil-practice-draw').addEventListener('click', () => choosePracticeMode('draw'), options);
  byId('pencil-practice-erase').addEventListener('click', () => choosePracticeMode('erase'), options);
  byId('pencil-practice-clear').addEventListener('click', () => {
    context?.clearRect(0, 0, paper.clientWidth, paper.clientHeight); hasPractice = false;
    byId('pencil-practice-placeholder').hidden = false; byId('pencil-practice-tag').hidden = true;
  }, options);
  byId('pencil-practice-save').addEventListener('click', () => {
    if (!context || !hasPractice) { paper.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = practiceCanvas.width; exportCanvas.height = practiceCanvas.height + Math.round(48 * pixelRatio);
    const exportContext = exportCanvas.getContext('2d');
    exportContext.fillStyle = '#fff'; exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportContext.drawImage(practiceCanvas, 0, 0);
    exportContext.fillStyle = '#476580'; exportContext.font = `${12 * pixelRatio}px sans-serif`;
    exportContext.fillText('SDRAFT · Latihan goresan pensil', 20 * pixelRatio, exportCanvas.height - 19 * pixelRatio);
    const link = document.createElement('a'); link.download = `sdraft-latihan-pensil-${Date.now()}.png`; link.href = exportCanvas.toDataURL('image/png'); link.click();
  }, options);

  const syncVisibility = () => {
    stopFrame();
    if (section.classList.contains('active')) { ensureScene(); scene?.resize(); render(); resizePractice(); schedule(); }
  };
  const sectionObserver = new MutationObserver(syncVisibility);
  sectionObserver.observe(section, { attributes: true, attributeFilter: ['class'] });
  const stageObserver = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; stopFrame(); schedule(); }); stageObserver.observe(stage);
  const paperObserver = new ResizeObserver(resizePractice); paperObserver.observe(paper);
  const motionObserver = new MutationObserver(() => { if (!autoMotion()) { playing = false; stopFrame(); updatePlayback(); } });
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', syncVisibility, options);
  reduceMotion.addEventListener('change', () => { if (!autoMotion()) { playing = false; stopFrame(); updatePlayback(); } }, options);
  window.addEventListener('pagehide', event => {
    stopFrame();
    if (!event.persisted) { disposed = true; abort.abort(); sectionObserver.disconnect(); stageObserver.disconnect(); paperObserver.disconnect(); motionObserver.disconnect(); scene?.dispose(); }
  }, options);
  window.addEventListener('pageshow', syncVisibility, options);
  window.resizePencilCanvas = () => { scene?.resize(); resizePractice(); };
  play.disabled = true; view.disabled = true;
  comparison(); updateInformation(); ensureScene();
}
