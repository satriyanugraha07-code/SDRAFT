// A pencil demonstration on a loose sheet of paper. The point is the local
// origin of the pencil, so every revealed graphite stroke ends at that point.
export async function createPencilScene(canvas, container, onContextLost = () => {}) {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xffffff, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc2dce5, 2.1));
  const light = new THREE.DirectionalLight(0xffffff, 3.1);
  light.position.set(-3, 5, 10);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: .5, far: 25 });
  light.shadow.normalBias = .025;
  light.shadow.bias = -.0002;
  light.shadow.radius = 4;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xdff8ff, 1.0);
  fill.position.set(5, -3, 7);
  scene.add(fill);

  const camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, .1, 80);
  const axis = new THREE.Vector3(.60, .40, .67).normalize();
  const vertical = new THREE.Vector3(0, 1, 0);
  const resources = new Set();
  let root;
  let activeConfig;
  let update;
  let tilted = true;
  let lastProgress = 0;
  let disposed = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (p, start, end) => smooth((p - start) / (end - start));
  const keep = resource => { resources.add(resource); return resource; };
  const material = (color, options = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: .4, ...options }));
  const point = coordinates => new THREE.Vector3(...coordinates);

  function textureCanvas(width, height) {
    const result = document.createElement('canvas');
    result.width = width;
    result.height = height;
    return result;
  }

  function texture(image) {
    const result = keep(new THREE.CanvasTexture(image));
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }

  function label(text, x, y, z = .18, size = .34) {
    const image = textureCanvas(768, 144);
    const context = image.getContext('2d');
    context.fillStyle = 'rgba(236, 249, 253, .98)';
    context.beginPath();
    context.roundRect(8, 8, 752, 128, 52);
    context.fill();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#176582';
    context.font = '650 58px sans-serif';
    context.fillText(text, 384, 72, 690);
    const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: texture(image), depthTest: false })));
    sprite.position.set(x, y, z);
    sprite.scale.set(size * 5.33, size, 1);
    sprite.renderOrder = 8;
    return sprite;
  }

  function leader(points, color = 0x4fa7bf) {
    const geometry = keep(new THREE.BufferGeometry().setFromPoints(points.map(point)));
    const object = new THREE.Line(geometry, keep(new THREE.LineDashedMaterial({ color, dashSize: .10, gapSize: .07, depthTest: false })));
    object.computeLineDistances();
    object.renderOrder = 7;
    return object;
  }

  function roundedPaper() {
    const shape = new THREE.Shape();
    const left = -3.7, right = 3.7, bottom = -2.5, top = 1.75, radius = .22;
    shape.moveTo(left + radius, bottom);
    shape.lineTo(right - radius, bottom);
    shape.quadraticCurveTo(right, bottom, right, bottom + radius);
    shape.lineTo(right, top - radius);
    shape.quadraticCurveTo(right, top, right - radius, top);
    shape.lineTo(left + radius, top);
    shape.quadraticCurveTo(left, top, left, top - radius);
    shape.lineTo(left, bottom + radius);
    shape.quadraticCurveTo(left, bottom, left + radius, bottom);
    const geometry = keep(new THREE.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: true, bevelSize: .025, bevelThickness: .01, bevelSegments: 3, steps: 1, curveSegments: 12 }));
    const paper = new THREE.Mesh(geometry, material(0xffffff, { roughness: .98 }));
    paper.receiveShadow = true;
    paper.name = 'pencil-paper';
    root.add(paper);
    // A soft, thin paper edge provides depth without adding a board or desk.
    const back = new THREE.Mesh(geometry, material(0xd9edf3, { roughness: .9 }));
    back.position.set(.045, -.055, -.055);
    root.add(back);
  }

  function woodTexture() {
    const image = textureCanvas(128, 256);
    const context = image.getContext('2d');
    context.fillStyle = '#e6bf89';
    context.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 42; i++) {
      const x = (i * 37.17) % 128;
      context.strokeStyle = i % 3 ? 'rgba(145, 99, 54, .12)' : 'rgba(255, 234, 197, .48)';
      context.lineWidth = i % 3 ? 1 : 2;
      context.beginPath();
      context.moveTo(x, 0);
      context.bezierCurveTo(x + 3, 85, x - 4, 170, x + 1, 256);
      context.stroke();
    }
    return texture(image);
  }

  function buildPencil(config) {
    const pencil = new THREE.Group();
    pencil.name = `pencil-${config.grade}`;
    pencil.quaternion.setFromUnitVectors(vertical, axis);
    const graphite = material(0x26313b, { metalness: .06, roughness: .76 });
    const wood = material(0xffffff, { map: woodTexture(), roughness: .75 });
    const paint = material(config.barrel, { roughness: .32, metalness: .035 });
    const metal = material(0xc9d5dc, { metalness: .65, roughness: .28 });
    const eraser = material(0xf3cabf, { roughness: .85 });

    function segment(name, start, end, bottom, top, surface, sides = 24) {
      const geometry = keep(new THREE.CylinderGeometry(top, bottom, end - start, sides));
      geometry.rotateY(Math.PI / 6);
      const mesh = new THREE.Mesh(geometry, surface);
      mesh.name = name;
      mesh.position.y = (start + end) / 2;
      mesh.castShadow = true;
      pencil.add(mesh);
      return mesh;
    }

    if (config.tip === 'blunt') {
      // Cut the blunt contact face against the sheet's plane. Its centre is
      // still the pencil origin, which is also the stroke's current endpoint.
      const geometry = keep(new THREE.CylinderGeometry(.076, .066, .25, 24));
      geometry.translate(0, .125, 0);
      geometry.applyQuaternion(pencil.quaternion);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.max(0, positions.getZ(i)));
      geometry.applyQuaternion(pencil.quaternion.clone().invert());
      geometry.computeVertexNormals();
      const pointMesh = new THREE.Mesh(geometry, graphite);
      pointMesh.name = 'graphite-point';
      pointMesh.castShadow = true;
      pencil.add(pointMesh);
    } else segment('graphite-point', 0, .25, 0, .058, graphite);
    segment('sharpened-wood', .25, .67, config.tip === 'blunt' ? .076 : .058, .18, wood, 6);
    segment('hexagonal-barrel', .67, 3.35, .18, .18, paint, 6);
    segment('ferrule', 3.35, 3.54, .184, .184, metal);
    segment('eraser', 3.54, 3.82, .176, .176, eraser);
    const cap = new THREE.Mesh(keep(new THREE.SphereGeometry(.176, 20, 12)), eraser);
    cap.scale.y = .23;
    cap.position.y = 3.82;
    cap.castShadow = true;
    pencil.add(cap);
    for (const y of [3.39, 3.48]) {
      const rib = new THREE.Mesh(keep(new THREE.TorusGeometry(.185, .011, 8, 32)), metal);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = y;
      pencil.add(rib);
    }

    const image = textureCanvas(1024, 128);
    const context = image.getContext('2d');
    context.fillStyle = '#20445b';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '750 96px sans-serif';
    context.fillText(`${config.grade.toUpperCase()}  ·  SDRAFT`, 512, 64, 970);
    const print = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.75, .14)), keep(new THREE.MeshBasicMaterial({ map: texture(image), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));
    print.position.set(0, 2.13, .159);
    print.rotation.z = Math.PI / 2;
    print.name = 'printed-pencil-grade';
    pencil.add(print);
    root.add(pencil);
    return pencil;
  }

  function graphiteTexture() {
    const image = textureCanvas(256, 48);
    const context = image.getContext('2d');
    context.fillStyle = 'rgba(255, 255, 255, .96)';
    context.fillRect(0, 4, 256, 40);
    for (let i = 0; i < 380; i++) {
      const x = (i * 43.713) % 256;
      const y = (i * 17.319) % 40 + 4;
      context.clearRect(x, y, .55, .55);
    }
    return texture(image);
  }

  function graphiteStroke(start, end, config, map) {
    const a = point(start), b = point(end);
    const delta = b.clone().sub(a);
    const halfWidth = Math.max(.008, config.strokeWidth / 2);
    const endHalfWidth = Math.max(.008, (config.endWidth ?? config.strokeWidth) / 2);
    const normal = new THREE.Vector3(-delta.y, delta.x, 0).normalize();
    const geometry = keep(new THREE.BufferGeometry());
    const positions = new Float32Array(12);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0, 1, 1], 2));
    geometry.setIndex([0, 2, 1, 1, 2, 3]);
    const eraseImage = config.mode === 'erase' ? textureCanvas(640, 8) : null;
    const eraseContext = eraseImage?.getContext('2d');
    const eraseMap = eraseImage ? keep(new THREE.CanvasTexture(eraseImage)) : null;
    if (eraseContext) { eraseContext.fillStyle = '#ffffff'; eraseContext.fillRect(0, 0, 640, 8); }
    const surface = keep(new THREE.MeshBasicMaterial({ color: config.graphite, map, alphaMap: eraseMap, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = config.name || 'graphite-stroke';
    mesh.renderOrder = 2;
    root.add(mesh);
    const capGeometry = keep(new THREE.CircleGeometry(halfWidth, 16));
    const startMaterial = keep(new THREE.MeshBasicMaterial({ color: config.graphite, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    const endMaterial = keep(startMaterial.clone());
    const startCap = new THREE.Mesh(capGeometry, startMaterial);
    const endCap = new THREE.Mesh(capGeometry, endMaterial);
    startCap.name = `${mesh.name}-start`;
    endCap.name = `${mesh.name}-end`;
    startCap.renderOrder = endCap.renderOrder = 2;
    root.add(startCap, endCap);
    const endpoint = a.clone();
    let baseOpacity = 1;
    let lastWipe;
    return {
      start: a, end: b, endpoint, mesh,
      setOpacity(value) {
        baseOpacity = clamp(value);
        surface.opacity = startMaterial.opacity = endMaterial.opacity = baseOpacity;
      },
      erase(fraction, residue) {
        if (!eraseContext || Math.abs(fraction - lastWipe) < .0001) return;
        lastWipe = fraction;
        const remaining = clamp(residue);
        const edge = fraction * 640;
        const level = Math.round(remaining * 255);
        eraseContext.fillStyle = '#ffffff';
        eraseContext.fillRect(0, 0, 640, 8);
        eraseContext.fillStyle = `rgb(${level}, ${level}, ${level})`;
        eraseContext.fillRect(0, 0, Math.max(0, edge - 10), 8);
        const transition = eraseContext.createLinearGradient(edge - 10, 0, edge + 10, 0);
        transition.addColorStop(0, `rgb(${level}, ${level}, ${level})`);
        transition.addColorStop(1, '#ffffff');
        eraseContext.fillStyle = transition;
        eraseContext.fillRect(edge - 10, 0, 20, 8);
        eraseMap.needsUpdate = true;
        startMaterial.opacity = baseOpacity * (1 - (1 - remaining) * phase(fraction, -.02, .02));
        endMaterial.opacity = baseOpacity * (1 - (1 - remaining) * phase(fraction, .98, 1.02));
      },
      reveal(value) {
        const progress = clamp(value);
        endpoint.copy(a).lerp(b, progress);
        const startNormal = normal.clone().multiplyScalar(halfWidth);
        const endNormal = normal.clone().multiplyScalar(THREE.MathUtils.lerp(halfWidth, endHalfWidth, progress));
        const vertices = [a.clone().sub(startNormal), a.clone().add(startNormal), endpoint.clone().sub(endNormal), endpoint.clone().add(endNormal)];
        vertices.forEach((vertex, index) => vertex.toArray(positions, index * 3));
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();
        mesh.visible = startCap.visible = endCap.visible = progress > 0;
        startCap.position.copy(a);
        endCap.position.copy(endpoint);
        endCap.scale.setScalar(THREE.MathUtils.lerp(halfWidth, endHalfWidth, progress) / halfWidth);
      }
    };
  }

  function buildEraser() {
    const group = new THREE.Group();
    group.name = 'block-eraser';
    const shape = new THREE.Shape();
    const x = -.57, y = -.29, width = 1.14, height = .58, radius = .085;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const rubber = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(shape, { depth: .30, bevelEnabled: true, bevelSize: .03, bevelThickness: .015, bevelSegments: 3, steps: 1, curveSegments: 8 })), material(0xf2bdb9, { roughness: .86 }));
    rubber.castShadow = true;
    group.add(rubber);
    const holder = new THREE.Mesh(keep(new THREE.BoxGeometry(.57, .605, .33)), material(0xd6f3ef, { roughness: .8 }));
    holder.position.set(.24, 0, .15);
    holder.castShadow = true;
    group.add(holder);
    const stripe = new THREE.Mesh(keep(new THREE.BoxGeometry(.055, .609, .336)), material(0x6dc7c9, { roughness: .8 }));
    stripe.position.set(-.012, 0, .151);
    group.add(stripe);
    const image = textureCanvas(256, 96);
    const context = image.getContext('2d');
    context.font = '700 52px sans-serif';
    context.fillStyle = '#286b73';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('HAPUS', 128, 48);
    const print = new THREE.Mesh(keep(new THREE.PlaneGeometry(.42, .16)), keep(new THREE.MeshBasicMaterial({ map: texture(image), transparent: true, depthWrite: false })));
    print.position.set(.24, 0, .318);
    group.add(print);
    root.add(group);
    return group;
  }

  function build(configuration) {
    const config = { grade: 'hb', barrel: '#76c8da', graphite: '#526273', strokeWidth: .07, mode: 'line', tip: 'sharp', eraseResidue: 0, indentation: 0, ...configuration };
    roundedPaper();
    const pencil = buildPencil(config);
    const map = graphiteTexture();
    const z = .068;
    const strokes = config.mode === 'hatch'
      ? Array.from({ length: 10 }, (_, index) => {
        const x = -2.8 + index * .45;
        const wornWidth = config.endWidth ?? config.strokeWidth;
        const widths = { strokeWidth: THREE.MathUtils.lerp(config.strokeWidth, wornWidth, index / 10), endWidth: THREE.MathUtils.lerp(config.strokeWidth, wornWidth, (index + 1) / 10) };
        return graphiteStroke([x, -1.02, z], [x + .95, .85, z], { ...config, ...widths }, map);
      })
      : [graphiteStroke([-2.8, -.65, z], [2.35, -.65, z], config, map)];
    const first = strokes[0].start;
    const last = strokes.at(-1).end;
    const startGuide = new THREE.Group();
    startGuide.add(label(`Pensil ${config.grade.toUpperCase()}`, first.x + .05, -1.93, .18, .33));
    startGuide.add(leader([[first.x, -1.69, .16], [first.x, -1.4, .17], [first.x, first.y - .16, z + .025]]));
    root.add(startGuide);
    const resultGuide = new THREE.Group();
    const focus = config.mode === 'hatch' ? new THREE.Vector3(-.2, -.25, z) : first.clone().lerp(last, .59);
    const eraseText = config.indentation > .35 ? 'Bekas tekanan' : config.eraseResidue > .12 ? 'Sisa grafit' : 'Koreksi relatif bersih';
    const resultText = config.mode === 'erase' ? eraseText : config.resultLabel || (config.mode === 'hatch' ? 'Hasil arsir' : 'Hasil goresan');
    resultGuide.add(label(resultText, focus.x, -1.96, .18, .35));
    resultGuide.add(leader([[focus.x, -1.72, .17], [focus.x, -1.39, .15], [focus.x, focus.y - .15, z + .035]]));
    const focusRing = new THREE.Mesh(keep(new THREE.TorusGeometry(.15, .013, 8, 40)), keep(new THREE.MeshBasicMaterial({ color: 0x50a5bd, transparent: true, opacity: .8, depthTest: false })));
    focusRing.position.copy(focus).add(new THREE.Vector3(0, 0, .04));
    resultGuide.add(focusRing);
    root.add(resultGuide);
    const eraser = config.mode === 'erase' ? buildEraser() : null;
    const eraserGuide = new THREE.Group();
    if (eraser) {
      eraserGuide.add(label('Gosok perlahan', 0, .71, .45, .31));
      eraserGuide.add(leader([[0, .50, .43], [0, .27, .37], [0, .04, .34]]));
      root.add(eraserGuide);
    }
    // Relief is deliberately enlarged for teaching: the paired light and dark
    // edge remains when graphite fades, rather than claiming physical depth.
    const creases = config.mode === 'erase' && config.indentation > .35 ? [
      graphiteStroke(first.toArray(), last.toArray(), { name: 'paper-crease-dark', mode: 'line', graphite: '#8e9fa9', strokeWidth: .016 + .035 * clamp(config.indentation) }, null),
      graphiteStroke(first.clone().add(new THREE.Vector3(0, .034, -.004)).toArray(), last.clone().add(new THREE.Vector3(0, .034, -.004)).toArray(), { name: 'paper-crease-light', mode: 'line', graphite: '#ffffff', strokeWidth: .019 + .025 * clamp(config.indentation) }, null)
    ] : [];
    creases.forEach((crease, index) => {
      crease.mesh.renderOrder = 1;
      crease.setOpacity(index ? .9 * clamp(config.indentation) : .17 + .42 * clamp(config.indentation));
    });
    const pencilMaterials = new Set();
    if (eraser) pencil.traverse(object => {
      if (!object.material) return;
      const surfaces = Array.isArray(object.material) ? object.material : [object.material];
      surfaces.forEach(surface => { surface.transparent = true; pencilMaterials.add(surface); });
    });
    const landing = new THREE.Vector3();
    const initialOffset = new THREE.Vector3(-.25, -.18, .95);
    const parked = last.clone().add(new THREE.Vector3(.12, config.mode === 'hatch' ? -1.12 : .12, .92));
    const baseQuaternion = pencil.quaternion.clone();
    const twistQuaternion = new THREE.Quaternion();
    const turnAxis = new THREE.Vector3(0, 0, 1);

    return progress => {
      const p = clamp(progress);
      const erasing = config.mode === 'erase';
      const drawStart = erasing ? .12 : .15;
      const drawEnd = erasing ? .45 : .85;
      const drawProgress = clamp((p - drawStart) / (drawEnd - drawStart));
      const cycle = drawProgress * strokes.length;
      const index = Math.min(strokes.length - 1, Math.floor(cycle));
      const fraction = cycle - index;
      const drawing = config.mode === 'hatch' ? Math.min(1, fraction / .74) : drawProgress;
      strokes.forEach((stroke, strokeIndex) => stroke.reveal(strokeIndex < index ? 1 : strokeIndex === index ? drawing : 0));
      landing.copy(strokes[index].endpoint);
      if (config.mode === 'hatch' && fraction > .74 && index < strokes.length - 1) {
        const transfer = smooth((fraction - .74) / .26);
        landing.copy(strokes[index].end).lerp(strokes[index + 1].start, transfer);
        landing.z += Math.sin(transfer * Math.PI) * .6;
      }
      if (p < drawStart) landing.copy(first).addScaledVector(initialOffset, 1 - phase(p, 0, drawStart));
      if (p > drawEnd) landing.copy(last).lerp(parked, phase(p, drawEnd, erasing ? .55 : 1));
      pencil.position.copy(landing);
      const turn = p < drawStart ? .10 * (1 - phase(p, 0, drawStart)) : p > drawEnd ? -.09 * phase(p, drawEnd, erasing ? .55 : 1) : .012 * Math.sin(drawProgress * Math.PI * 2);
      twistQuaternion.setFromAxisAngle(turnAxis, turn);
      pencil.quaternion.copy(twistQuaternion).multiply(baseQuaternion);
      startGuide.visible = p > .055 && p < (erasing ? .27 : .33);
      resultGuide.visible = p > (erasing ? .91 : .84);
      resultGuide.scale.setScalar(.96 + .04 * phase(p, erasing ? .91 : .84, erasing ? 1 : .96));
      if (eraser) {
        pencil.visible = p < .63;
        const pencilOpacity = 1 - phase(p, .55, .63);
        pencilMaterials.forEach(surface => { surface.opacity = pencilOpacity; });
        const sweep = phase(p, .62, .89);
        const startX = first.x - .72, endX = last.x + .65;
        const lift = phase(p, .89, .97);
        eraser.position.set(THREE.MathUtils.lerp(startX, endX, sweep) - .16 * lift, first.y + Math.sin(sweep * Math.PI * 10) * .045 + .72 * lift, z + .8 * (1 - phase(p, .55, .62)) + .65 * lift);
        eraser.rotation.z = -.12 + Math.sin(sweep * Math.PI * 10) * .038;
        eraser.visible = p >= .55;
        eraserGuide.position.set(eraser.position.x, first.y, 0);
        eraserGuide.visible = p >= .605 && p < .89;
        const erased = p < .62 ? -1 : (eraser.position.x + .56 - first.x) / (last.x - first.x);
        strokes[0].erase(erased, config.eraseResidue);
        creases.forEach(crease => crease.reveal(drawProgress));
      }
    };
  }

  function positionCamera() {
    camera.position.set(0, tilted ? -10 : .25, tilted ? 19 : 22);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, .25, .55);
    camera.updateMatrixWorld();
  }

  function releaseContent() {
    if (root) scene.remove(root);
    resources.forEach(resource => resource.dispose());
    resources.clear();
  }

  function resize() {
    if (disposed || container.clientWidth < 1 || container.clientHeight < 1) return;
    const width = container.clientWidth, height = container.clientHeight, aspect = width / height;
    const viewWidth = Math.max(10.7, 7 * aspect);
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewWidth / aspect / 2;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (update) { update(lastProgress); renderer.render(scene, camera); }
  }

  function configure(configuration) {
    if (disposed || JSON.stringify(activeConfig) === JSON.stringify(configuration)) return;
    releaseContent();
    activeConfig = { ...configuration };
    root = new THREE.Group();
    scene.add(root);
    update = build(configuration);
    positionCamera();
    resize();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const lost = event => { event.preventDefault(); onContextLost(); };
  canvas.addEventListener('webglcontextlost', lost);

  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    canvas.removeEventListener('webglcontextlost', lost);
    releaseContent();
    light.shadow.dispose();
    renderer.dispose();
  }

  return {
    configure, resize, dispose,
    setView(value) { tilted = Boolean(value); positionCamera(); if (update) { update(lastProgress); renderer.render(scene, camera); } },
    render(progress) { if (!disposed && update) { lastProgress = clamp(progress); update(lastProgress); renderer.render(scene, camera); } }
  };
}
