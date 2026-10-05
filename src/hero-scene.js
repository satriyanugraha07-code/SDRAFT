// A small, self-contained scene: no textures, controls package, or external assets.
let initialized = false;

export async function initHeroScene() {
  const container = document.getElementById('learning-scene');
  const canvas = document.getElementById('learning-scene-canvas');
  if (initialized || !container || !canvas) return;
  initialized = true;

  const section = container.closest('.app-section');
  const fallback = document.getElementById('learning-scene-fallback');
  const motionButton = document.getElementById('scene-motion-toggle');
  const explodeButton = document.getElementById('scene-explode-toggle');
  const status = document.getElementById('scene-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const resources = new Set();
  let renderer;
  let resizeObserver;
  let intersectionObserver;
  let sectionObserver;
  let frame = 0;
  let disposed = false;
  let failed = false;
  let intersecting = true;
  let suspended = false;
  let paused = reducedMotion.matches;
  let manuallyPaused = false;
  let exploded = false;
  let firstRender = true;
  let lastTime = 0;
  let elapsed = 0;
  let separation = 0;
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };

  const setStatus = (message) => { if (status) status.textContent = message; };
  const updateButtons = () => {
    if (motionButton) {
      motionButton.textContent = paused ? 'Putar animasi' : 'Jeda animasi';
      motionButton.setAttribute('aria-pressed', String(paused));
    }
    if (explodeButton) {
      explodeButton.textContent = exploded ? 'Satukan bagian' : 'Pisahkan bagian';
      explodeButton.setAttribute('aria-pressed', String(exploded));
    }
  };
  const disableButtons = (disabled) => {
    [motionButton, explodeButton].forEach((button) => {
      if (button) button.disabled = disabled;
    });
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  };
  const releaseResources = () => {
    resources.forEach((resource) => resource.dispose());
    resources.clear();
    renderer?.dispose();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    listeners.abort();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    sectionObserver?.disconnect();
    releaseResources();
  };
  const showFallback = () => {
    failed = true;
    container.classList.remove('scene-ready');
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    disableButtons(true);
    setStatus('Ilustrasi gambar teknik.');
    dispose();
  };

  canvas.hidden = true;
  disableButtons(true);
  updateButtons();
  // Keep a still image available if the browser cannot create a WebGL context.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallback();
  }, { signal: listeners.signal });
  window.addEventListener('pagehide', (event) => {
    suspended = true;
    stop();
    if (!event.persisted) dispose();
  }, { signal: listeners.signal });

  try {
    const THREE = await import('three');
    if (disposed) return;
    const keep = (resource) => { resources.add(resource); return resource; };
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true, powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    camera.position.set(5.2, 3.6, 7.4);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8391c5, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb2cfff, 2.5);
    rim.position.set(5, 1, -4);
    scene.add(rim);

    const material = (color, roughness = 0.42, metalness = 0.06) => keep(
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
    const blue = material(0x4966e9);
    const blueDark = material(0x2846b5);
    const orange = material(0xffa14b, 0.34, 0.12);
    const cream = material(0xffe7bd);
    const pale = material(0xa8bcff);
    const assembly = new THREE.Group();
    const bracket = new THREE.Group();
    const bushing = new THREE.Group();
    const accents = new THREE.Group();
    scene.add(assembly);
    assembly.add(bracket, bushing, accents);

    const mesh = (geometry, surface, parent, x = 0, y = 0, z = 0) => {
      const item = new THREE.Mesh(keep(geometry), surface);
      item.position.set(x, y, z);
      parent.add(item);
      return item;
    };
    const extrude = (shape, depth, bevel = 0.055) => new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelSegments: 2,
      steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 32,
    });
    const roundedRect = (width, height, radius) => {
      const shape = new THREE.Shape();
      const left = -width / 2;
      const bottom = -height / 2;
      shape.moveTo(left + radius, bottom);
      shape.lineTo(left + width - radius, bottom);
      shape.quadraticCurveTo(left + width, bottom, left + width, bottom + radius);
      shape.lineTo(left + width, bottom + height - radius);
      shape.quadraticCurveTo(left + width, bottom + height, left + width - radius, bottom + height);
      shape.lineTo(left + radius, bottom + height);
      shape.quadraticCurveTo(left, bottom + height, left, bottom + height - radius);
      shape.lineTo(left, bottom + radius);
      shape.quadraticCurveTo(left, bottom, left + radius, bottom);
      return shape;
    };
    const ring = (outside, inside, depth) => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outside, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inside, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      return extrude(shape, depth, 0.025);
    };

    // The central hole is real geometry, and remains visible when parts separate.
    const body = roundedRect(2.12, 2.38, 0.42);
    const opening = new THREE.Path();
    opening.absarc(0, 0.28, 0.56, 0, Math.PI * 2, true);
    body.holes.push(opening);
    mesh(extrude(body, 0.62), blue, bracket, 0, 0.03, -0.34);
    const foot = mesh(extrude(roundedRect(2.7, 1.7, 0.18), 0.22), blue, bracket, 0, -1.2, 0.2);
    foot.rotation.x = -Math.PI / 2;
    [-0.94, 0.94].forEach((x) => {
      const screw = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 6), blueDark, bracket, x, -0.91, 0.73);
      screw.rotation.y = Math.PI / 6;
    });
    mesh(ring(0.525, 0.31, 0.71), orange, bushing, 0, 0.31, -0.36);
    mesh(ring(0.7, 0.31, 0.13), orange, bushing, 0, 0.31, 0.36);

    const nut = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 6), cream, accents, -1.95, 1.05, 0.2);
    nut.rotation.set(0.5, 0.4, 0.5);
    const block = mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), pale, accents, 1.75, 1.42, -0.25);
    block.rotation.set(0.2, 0.3, 0.4);
    const washer = mesh(ring(0.3, 0.16, 0.11), cream, accents, 1.9, -0.7, 0.1);
    washer.rotation.set(0.1, 0.2, -0.2);

    // Thin drafting marks connect the playful object to the technical drawing lesson.
    const guideMaterial = keep(new THREE.LineBasicMaterial({ color: 0x94a4df, transparent: true, opacity: 0.5 }));
    const guideGeometry = keep(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.65, -1.2, -0.4), new THREE.Vector3(-1.65, 1.2, -0.4),
      new THREE.Vector3(-1.8, -1.2, -0.4), new THREE.Vector3(-1.5, -1.2, -0.4),
      new THREE.Vector3(-1.8, 1.2, -0.4), new THREE.Vector3(-1.5, 1.2, -0.4),
    ]));
    assembly.add(new THREE.LineSegments(guideGeometry, guideMaterial));

    const visible = () => !disposed && !failed && !suspended && !document.hidden && intersecting
      && (!section || section.classList.contains('active'));
    const pose = () => {
      assembly.rotation.set(-0.05 + tilt.y, -0.12 + Math.sin(elapsed * 0.28) * 0.14 + tilt.x, -0.035);
      assembly.position.y = Math.sin(elapsed * 0.65) * 0.065;
      bracket.position.x = -separation * 0.26;
      bushing.position.set(separation * 0.27, separation * 0.08, separation * 1.38);
      nut.position.y = 1.05 + Math.sin(elapsed * 0.7 + 1) * 0.07;
      block.position.y = 1.42 + Math.sin(elapsed * 0.6 + 2) * 0.08;
      block.rotation.y = 0.3 + elapsed * 0.13;
      washer.position.y = -0.7 + Math.sin(elapsed * 0.8 + 3) * 0.06;
    };
    const render = () => {
      if (!visible()) return;
      try {
        pose();
        renderer.render(scene, camera);
        if (firstRender) {
          firstRender = false;
          canvas.hidden = false;
          if (fallback) fallback.hidden = true;
          container.classList.add('scene-ready');
          disableButtons(false);
          setStatus('Model dudukan dan bushing 3D. Pisahkan bagian untuk melihat susunannya.');
        }
      } catch {
        showFallback();
      }
    };
    const tick = (time) => {
      frame = 0;
      if (!visible() || paused) { lastTime = 0; return; }
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      elapsed += delta;
      const ease = 1 - Math.exp(-delta * 7);
      separation += ((exploded ? 1 : 0) - separation) * ease;
      tilt.x += (pointer.x - tilt.x) * ease;
      tilt.y += (pointer.y - tilt.y) * ease;
      render();
      if (visible() && !paused) frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      stop();
      if (!visible()) return;
      render();
      if (!paused && !failed) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      if (disposed) return;
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 400 ? 1 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep the exploded assembly in frame on narrow phones as well as desktop.
      camera.position.set(5.2, 3.6, 7.4).multiplyScalar(camera.aspect < 1.15 ? 1.02 : 0.9);
      camera.updateProjectionMatrix();
      render();
    };

    motionButton?.addEventListener('click', () => {
      paused = !paused;
      manuallyPaused = paused;
      updateButtons();
      setStatus(paused ? 'Animasi dijeda.' : 'Animasi diputar.');
      resume();
    }, { signal: listeners.signal });
    explodeButton?.addEventListener('click', () => {
      exploded = !exploded;
      if (paused) separation = exploded ? 1 : 0;
      updateButtons();
      setStatus(exploded ? 'Bagian model dipisahkan.' : 'Bagian model disatukan.');
      resume();
    }, { signal: listeners.signal });
    container.addEventListener('pointermove', (event) => {
      // Touch remains available for natural page scrolling.
      if (event.pointerType !== 'mouse' || paused) return;
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.12;
    }, { passive: true, signal: listeners.signal });
    container.addEventListener('pointerleave', () => {
      pointer.x = 0;
      pointer.y = 0;
    }, { signal: listeners.signal });
    reducedMotion.addEventListener('change', (event) => {
      paused = manuallyPaused || event.matches;
      if (paused) {
        separation = exploded ? 1 : 0;
        tilt.x = 0;
        tilt.y = 0;
      }
      updateButtons();
      resume();
    }, { signal: listeners.signal });
    document.addEventListener('visibilitychange', resume, { signal: listeners.signal });
    window.addEventListener('pageshow', () => {
      suspended = false;
      resize();
      resume();
    }, { signal: listeners.signal });
    window.addEventListener('resize', resize, { passive: true, signal: listeners.signal });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    intersectionObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      resume();
    }, { threshold: 0 });
    intersectionObserver.observe(container);
    if (section) {
      sectionObserver = new MutationObserver(() => { resize(); resume(); });
      sectionObserver.observe(section, { attributes: true, attributeFilter: ['class'] });
    }
    resize();
    resume();
  } catch {
    showFallback();
  }
}
