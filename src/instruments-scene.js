import { triangleMeasurement } from './instruments-geometry.js';

// Instrument demonstrations in open space. No drawing surface or board mesh.
export async function createInstrumentScene(canvas, container, onContextLost) {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xffffff, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9baebd, 2.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3);
  keyLight.position.set(-4, 6, 10);
  scene.add(keyLight);
  const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 80);
  let root;
  let resources = new Set();
  let activeConfig;
  let lesson;
  let tilted = false;
  let lastProgress = 0;
  let disposed = false;
  const up = new THREE.Vector3(0, 1, 0);
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (p, start, end) => smooth((p - start) / (end - start));
  const vector = point => new THREE.Vector3(...point);
  const keep = resource => { resources.add(resource); return resource; };
  const material = (color, properties = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: .32, ...properties }));
  const glass = (color = 0xc1d7df) => material(color, { transparent: true, opacity: .66, metalness: .08, roughness: .3, depthWrite: false, side: THREE.DoubleSide });

  function label(text, x, y, z = .25, size = .34, color = '#526b7d') {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 512; textureCanvas.height = 128;
    const context = textureCanvas.getContext('2d');
    let fontSize = 64;
    context.font = `500 ${fontSize}px sans-serif`;
    while (context.measureText(text).width > 480 && fontSize > 28) context.font = `500 ${fontSize -= 2}px sans-serif`;
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color;
    context.fillText(text, 256, 64);
    const texture = keep(new THREE.CanvasTexture(textureCanvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })));
    sprite.position.set(x, y, z); sprite.scale.set(size * 4, size, 1);
    return sprite;
  }

  function line(points, color = 0x759396, dashed = false) {
    const geometry = keep(new THREE.BufferGeometry().setFromPoints(points.map(vector)));
    const lineMaterial = keep(dashed ? new THREE.LineDashedMaterial({ color, dashSize: .13, gapSize: .09 }) : new THREE.LineBasicMaterial({ color }));
    const object = new THREE.Line(geometry, lineMaterial);
    if (dashed) object.computeLineDistances();
    return object;
  }

  function stroke(points, color = 0x284b69, radius = .04) {
    const segments = points.length > 2 ? 192 : 80;
    const curve = new THREE.CatmullRomCurve3(points.map(vector));
    const geometry = keep(new THREE.TubeGeometry(curve, segments, radius, 6, false));
    const object = new THREE.Mesh(geometry, keep(new THREE.MeshBasicMaterial({ color })));
    const reveal = progress => geometry.setDrawRange(0, Math.floor(clamp(progress) * segments) * 36);
    reveal(0);
    return { object, reveal };
  }

  function dot(x, y, color = 0x3f8b72, radius = .065, z = .16) {
    const mesh = new THREE.Mesh(keep(new THREE.SphereGeometry(radius, 16, 12)), material(color));
    mesh.position.set(x, y, z);
    return mesh;
  }

  function rod(parent, radius, surface) {
    const mesh = new THREE.Mesh(keep(new THREE.CylinderGeometry(radius, radius, 1, 16)), surface);
    const update = (start, end) => {
      const a = vector(start), b = vector(end), direction = b.clone().sub(a);
      mesh.position.copy(a.clone().add(b).multiplyScalar(.5));
      mesh.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      mesh.scale.y = direction.length();
    };
    parent.add(mesh);
    return { mesh, update };
  }

  function pencil() {
    const group = new THREE.Group();
    const axis = new THREE.Vector3(.34, .46, .82).normalize();
    const segment = (bottom, top, start, end, surface, sides = 16) => {
      const mesh = new THREE.Mesh(keep(new THREE.CylinderGeometry(top, bottom, end - start, sides)), surface);
      mesh.quaternion.setFromUnitVectors(up, axis);
      mesh.position.copy(axis.clone().multiplyScalar((start + end) / 2));
      group.add(mesh);
    };
    segment(0, .045, 0, .18, material(0x17252e));
    segment(.045, .105, .18, .5, material(0xdcb98a));
    segment(.105, .105, .5, 2.1, material(0x397e68), 6);
    segment(.108, .108, 2.1, 2.28, material(0xbcc7cc, { metalness: .65 }));
    segment(.108, .108, 2.28, 2.5, material(0xe9b1aa));
    return group;
  }

  function plate(points, holes = [], color) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    holes.forEach(vertices => {
      const path = new THREE.Path();
      [...vertices].reverse().forEach(([x, y], index) => index ? path.lineTo(x, y) : path.moveTo(x, y));
      path.closePath(); shape.holes.push(path);
    });
    const geometry = keep(new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .018 }));
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry, glass(color)));
    group.add(line([...points, points[0]].map(([x, y]) => [x, y, .11]), 0x77929e));
    holes.forEach(vertices => group.add(line([...vertices, vertices[0]].map(([x, y]) => [x, y, .11]), 0x94a8b1)));
    return group;
  }

  function ruler(length = 11) {
    const group = plate([[0, 0], [length, 0], [length, -1.03], [0, -1.03]]);
    const zero = .3;
    const ticks = [];
    for (let i = 0; i <= Math.floor((length - .6) * 10 + 1e-8); i++) {
      const x = zero + i / 10;
      const depth = i % 10 === 0 ? .32 : i % 5 === 0 ? .23 : .13;
      ticks.push(x, -.02, .13, x, -depth, .13);
      if (i % 10 === 0) group.add(label(String(i / 10), x, -.54, .14, .22));
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    group.add(new THREE.LineSegments(geometry, keep(new THREE.LineBasicMaterial({ color: 0x526977 }))));
    group.add(label('cm', length - .38, -.84, .14, .17));
    return group;
  }

  function triangle(points, color) {
    const center = points.reduce((sum, point) => [sum[0] + point[0] / 3, sum[1] + point[1] / 3], [0, 0]);
    const inner = points.map(([x, y]) => [center[0] + (x - center[0]) * .57, center[1] + (y - center[1]) * .57]);
    const group = plate(points, [inner], color);
    const ticks = [];
    for (let edge = 0; edge < 3; edge++) {
      let a = vector([...points[edge], .12]);
      let b = vector([...points[(edge + 1) % 3], .12]);
      // A horizontal contact edge reads left to right, including the guide's top edge.
      if (Math.abs(a.y - b.y) < .001 && a.x > b.x) [a, b] = [b, a];
      const delta = b.clone().sub(a), distance = delta.length();
      const normal = new THREE.Vector3(-delta.y, delta.x, 0).normalize();
      const towardCenter = new THREE.Vector3(center[0], center[1], .12).sub(a);
      if (normal.dot(towardCenter) < 0) normal.negate();
      for (let i = 1; i < distance * 10; i++) {
        const start = a.clone().lerp(b, i / (distance * 10));
        const end = start.clone().addScaledVector(normal, i % 10 === 0 ? .24 : i % 5 === 0 ? .17 : .095);
        ticks.push(...start.toArray(), ...end.toArray());
        if (i % 10 === 0 && distance - i / 10 > .25) {
          const position = start.clone().addScaledVector(normal, .37);
          group.add(label(String(i / 10), position.x, position.y, .14, .25));
        }
      }
      if (Math.abs(delta.y) < .001) {
        const zero = a.clone().addScaledVector(delta.clone().normalize(), .15).addScaledVector(normal, .37);
        group.add(label('0', zero.x, zero.y, .14, .25));
      }
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    group.add(new THREE.LineSegments(geometry, keep(new THREE.LineBasicMaterial({ color: 0x6c808e }))));
    return group;
  }

  function buildRuler({ value }) {
    const instrument = ruler();
    const x = -5.2, y = .12;
    root.add(instrument); instrument.position.set(-5.5, 0, 0);
    const draw = stroke([[x, y, .14], [x + value, y, .14]]);
    root.add(draw.object);
    const stylus = pencil(); root.add(stylus);
    const start = dot(x, y), end = dot(x + value, y);
    root.add(start, end);
    const dimension = new THREE.Group();
    dimension.add(line([[x, -.6, -.02], [x + value, -.6, -.02]], 0x78a08e, true));
    dimension.add(label(`${value} cm`, x + value / 2, -.92, .15, .3, '#397a61'));
    root.add(dimension);
    return progress => {
      instrument.position.y = -1.2 * (1 - phase(progress, 0, .28));
      const drawn = phase(progress, .5, .96);
      draw.reveal(drawn);
      stylus.visible = progress >= .28 && progress < .99;
      stylus.position.set(x + value * drawn, y, .16 + .95 * (1 - phase(progress, .28, .5)));
      end.visible = progress >= .5;
      dimension.visible = progress >= .28;
    };
  }

  function dimension(start, end, color) {
    const group = new THREE.Group();
    const direction = end.clone().sub(start).normalize();
    const normal = new THREE.Vector3(-direction.y, direction.x, 0);
    group.add(line([start.toArray(), end.toArray()], color));
    for (const [point, sign] of [[start, 1], [end, -1]]) {
      const behind = point.clone().addScaledVector(direction, sign * .14);
      group.add(line([behind.clone().addScaledVector(normal, .065).toArray(), point.toArray(), behind.clone().addScaledVector(normal, -.065).toArray()], color));
    }
    return group;
  }

  function buildTriangles({ value, spacing }) {
    const measurement = triangleMeasurement(value, spacing);
    const direction = new THREE.Vector3(...measurement.direction, 0);
    const normal = new THREE.Vector3(...measurement.normal, 0);
    const length = 4.1;
    const run = length * direction.x, rise = length * direction.y;
    const points = value === 90 ? [[0, 0], [4.1, 0], [0, 4.1]] : [[0, 0], [run, 0], [run, rise]];
    const moving = triangle(points, 0x9ac8e6);
    const supportWidth = 3.8;
    const supportHeight = value === 45 || value === 90 ? supportWidth / Math.sqrt(3) : supportWidth;
    const support = triangle([[-1, 0], [-1, -supportHeight], [supportWidth - 1, 0]], 0xa4d8be);
    const origin = new THREE.Vector3(-2.5, -.15, .02);
    support.position.copy(origin); root.add(support, moving);
    support.add(line([[-1, 0, .15], [supportWidth - 1, 0, .15]], 0x39856e));
    const supportName = label(value === 45 || value === 90 ? '30°–60°' : '45°–45°', -.55, -supportHeight + .6, .18, .27);
    support.add(supportName);
    const shift = measurement.slide;
    const endpoint = origin.clone().add(new THREE.Vector3(run, rise, .13));
    const draw1 = stroke([[origin.x, origin.y, .18], [endpoint.x, endpoint.y, .18]]);
    const draw2 = stroke([[origin.x + shift, origin.y, .18], [endpoint.x + shift, endpoint.y, .18]]);
    root.add(draw1.object, draw2.object);
    const stylus = pencil(); root.add(stylus);
    root.add(line([[-3.8, origin.y, -.05], [4.4, origin.y, -.05]], 0xbacbd1, true));
    const angleLabel = label(`${value}°`, origin.x - .5, origin.y + .65, .22, .36, '#397a61');
    root.add(angleLabel);
    const guideReading = new THREE.Group();
    guideReading.add(dot(origin.x, origin.y, 0x39856e), dot(origin.x + shift, origin.y, 0x39856e));
    const startMeasure = new THREE.Vector3(origin.x, origin.y - .7, .32);
    const endMeasure = startMeasure.clone().add(new THREE.Vector3(shift, 0, 0));
    guideReading.add(dimension(startMeasure, endMeasure, 0x39856e));
    guideReading.add(line([[origin.x, origin.y, .32], startMeasure.toArray()], 0x39856e, true));
    guideReading.add(line([[origin.x + shift, origin.y, .32], endMeasure.toArray()], 0x39856e, true));
    const slideText = shift.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    guideReading.add(label(`Geser ${slideText} cm`, origin.x + supportWidth + .6, origin.y - .75, .35, .4, '#337b66'));
    root.add(guideReading);

    // The short measuring ruler is normal to the lines. Its zero lies on line 1.
    const measuredStart = origin.clone().addScaledVector(direction, 2.45); measuredStart.z = .38;
    const measuredEnd = measuredStart.clone().addScaledVector(normal, spacing);
    const measuringRuler = ruler(spacing + .6);
    measuringRuler.rotation.z = Math.atan2(normal.y, normal.x);
    measuringRuler.position.copy(measuredStart.clone().addScaledVector(normal, -.3));
    const normalReading = new THREE.Group();
    normalReading.add(measuringRuler, dimension(measuredStart, measuredEnd, 0xc58049));
    normalReading.add(dot(measuredStart.x, measuredStart.y, 0xc58049, .065, .52), dot(measuredEnd.x, measuredEnd.y, 0xc58049, .065, .52));
    const squareCorner = measuredStart.clone().addScaledVector(direction, -.2);
    normalReading.add(line([squareCorner.toArray(), squareCorner.clone().addScaledVector(normal, .2).toArray(), measuredStart.clone().addScaledVector(normal, .2).toArray()], 0xc58049));
    const labelPosition = measuredStart.clone().addScaledVector(direction, .55).addScaledVector(normal, -.75);
    normalReading.add(label(`${Math.round(spacing * 10)} mm`, labelPosition.x, labelPosition.y, .55, .43, '#b87540'));
    root.add(normalReading);
    return progress => {
      support.position.y = origin.y - .6 * (1 - phase(progress, 0, .22));
      const slide = phase(progress, .57, .75);
      moving.position.set(origin.x + shift * slide, origin.y + 1.1 * (1 - phase(progress, .22, .35)), .07);
      const first = phase(progress, .35, .57), second = phase(progress, .75, .91);
      draw1.reveal(first); draw2.reveal(second);
      stylus.visible = progress >= .35 && progress < .91;
      if (progress < .57) stylus.position.set(origin.x + run * first, origin.y + rise * first, .22);
      else if (progress < .75) stylus.position.set(THREE.MathUtils.lerp(endpoint.x, origin.x + shift, slide), THREE.MathUtils.lerp(endpoint.y, origin.y, slide), .22 + Math.sin(slide * Math.PI) * 1.1);
      else stylus.position.set(origin.x + shift + run * second, origin.y + rise * second, .22);
      angleLabel.visible = progress >= .35;
      guideReading.visible = progress >= .57;
      normalReading.visible = progress >= .91;
    };
  }

  function buildCompass({ value, mode }) {
    const instrument = new THREE.Group(); root.add(instrument);
    const silver = material(0xbdc9d1, { metalness: .7, roughness: .24 });
    const dark = material(0x303a42, { metalness: .2 });
    const legs = [rod(instrument, .09, silver), rod(instrument, .1, silver)];
    const tips = [rod(instrument, .032, dark), rod(instrument, .054, dark)];
    tips[0].mesh.name = 'compass-needle'; tips[1].mesh.name = 'compass-graphite';
    const holders = [rod(instrument, .13, silver), rod(instrument, .13, silver)];
    const head = new THREE.Mesh(keep(new THREE.SphereGeometry(.24, 20, 16)), dark); instrument.add(head);
    head.scale.set(1, .55, 1.4);
    const knob = rod(instrument, .125, dark);
    const knobRibMaterial = material(0x65747b, { roughness: .5 });
    const knobRibs = Array.from({ length: 10 }, () => rod(instrument, .01, knobRibMaterial));
    const screw = new THREE.Mesh(keep(new THREE.SphereGeometry(.1, 16, 12)), silver); instrument.add(screw);
    // The connected palm, wrist and five fingers make the grip legible from both
    // views. Only the thumb and index finger meet the top knob; the other three
    // fingers curl beside the palm, leaving both compass legs unobstructed.
    const hand = new THREE.Group(); hand.name = 'compass-hand'; instrument.add(hand);
    const skin = material(0xe9b495, { roughness: .65 });
    const nail = material(0xf7d8c5, { roughness: .52 });
    const sleeve = material(0x4b948a, { roughness: .82 });
    const sphere = keep(new THREE.SphereGeometry(1, 20, 16));
    const rounded = (parent, position, scale, surface) => {
      const mesh = new THREE.Mesh(sphere, surface);
      mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh);
      return mesh;
    };
    rounded(hand, [.22, .96, .13], [.52, .65, .235], skin);
    rounded(hand, [-.19, .83, .1], [.24, .38, .215], skin);
    rounded(hand, [.25, 1.56, .12], [.265, .42, .19], skin);
    const forearm = rod(hand, .285, skin); forearm.update([.25, 1.57, .12], [.28, 2.02, .12]);
    const cuff = new THREE.Mesh(keep(new THREE.CylinderGeometry(.315, .315, .3, 24)), sleeve);
    cuff.position.set(.28, 1.94, .12); hand.add(cuff);
    const sleeveArm = new THREE.Mesh(keep(new THREE.CylinderGeometry(.36, .315, .75, 24)), sleeve);
    sleeveArm.position.set(.28, 2.45, .12); hand.add(sleeveArm);
    rounded(hand, [.28, 2.825, .12], [.36, .08, .36], sleeve);

    const fingerPaths = [
      { radius: .15, points: [[-.24, .87, .09], [-.48, .5, .13], [-.34, .13, .07], [-.235, -.025, 0]] },
      { radius: .12, points: [[.035, .57, .18], [.19, .26, .38], [.36, .075, .21], [.222, .015, .015]] },
      { radius: .117, points: [[.28, .63, .17], [.49, .3, .34], [.56, .17, .13], [.5, .45, .065]] },
      { radius: .105, points: [[.5, .69, .14], [.71, .37, .29], [.74, .24, .08], [.67, .49, .045]] },
      { radius: .09, points: [[.65, .8, .1], [.86, .51, .2], [.87, .37, .035], [.79, .59, .025]] }
    ];
    const fingers = fingerPaths.map(({ radius, points }, index) => {
      const joints = points.map(() => rounded(hand, [0, 0, 0], [radius, radius, radius], skin));
      const segments = points.slice(1).map((_, segment) => {
        const taper = 1 - segment * .12;
        const mesh = new THREE.Mesh(keep(new THREE.CylinderGeometry(radius * (taper - .1), radius * taper, 1, 16)), skin);
        hand.add(mesh); return mesh;
      });
      const tipNail = rounded(hand, [0, 0, 0], [radius * .55, radius * .78, .021], nail);
      tipNail.name = ['hand-thumb', 'hand-index', 'hand-middle', 'hand-ring', 'hand-pinky'][index];
      return (grip, roll = 0) => {
        const positions = points.map(point => vector(point));
        if (index === 0) {
          positions[2].x -= .13 * (1 - grip);
          positions[3].x -= .35 * (1 - grip); positions[3].y -= .16 * (1 - grip);
        } else if (index === 1) {
          positions[2].x += .08 * (1 - grip);
          positions[3].x += .3 * (1 - grip); positions[3].y -= .24 * (1 - grip);
        }
        if (index < 2) {
          // Opposing pads roll gently in the same angular direction around the
          // round knob, maintaining their contact radius instead of opening.
          positions[2].applyAxisAngle(new THREE.Vector3(0, 0, 1), roll * .35);
          positions[3].applyAxisAngle(new THREE.Vector3(0, 0, 1), roll);
        }
        positions.forEach((position, i) => {
          joints[i].position.copy(position);
          joints[i].scale.setScalar(radius * (1 - i * .075));
        });
        segments.forEach((mesh, i) => {
          const direction = positions[i + 1].clone().sub(positions[i]);
          mesh.position.copy(positions[i].clone().add(positions[i + 1]).multiplyScalar(.5));
          mesh.quaternion.setFromUnitVectors(up, direction.clone().normalize());
          mesh.scale.y = direction.length();
        });
        tipNail.position.copy(positions.at(-1)).add(new THREE.Vector3(0, .015, radius * .78));
        tipNail.rotation.z = index === 0 ? -.6 : .22;
      };
    });
    const gripRing = new THREE.Mesh(keep(new THREE.TorusGeometry(.18, .025, 8, 40)), material(0x76b2a5, { roughness: .6 }));
    instrument.add(gripRing);
    const turnArrow = new THREE.Group(); instrument.add(turnArrow);
    const arrowRadius = .67;
    const arrowPoints = Array.from({ length: 33 }, (_, i) => {
      const angle = Math.PI * (1.05 + i / 32 * .82);
      return [arrowRadius * Math.cos(angle), arrowRadius * Math.sin(angle), 0];
    });
    turnArrow.add(line(arrowPoints, 0x438d80));
    const arrowEnd = vector(arrowPoints.at(-1));
    const tangent = new THREE.Vector3(-arrowEnd.y, arrowEnd.x, 0).normalize();
    const arrowBack = arrowEnd.clone().addScaledVector(tangent, -.18);
    const arrowNormal = arrowEnd.clone().normalize().multiplyScalar(.095);
    turnArrow.add(line([arrowBack.clone().add(arrowNormal).toArray(), arrowEnd.toArray(), arrowBack.clone().sub(arrowNormal).toArray()], 0x438d80));
    // At the widest openings, place both captions above the circumference so
    // the growing circle cannot run through their text in the top view.
    const captionY = value >= 3.5 ? 4.2 : 2.8;
    const leaderY = value >= 3.5 ? 3.85 : 2.45;
    const gripCaption = label('Jepit knop atas', -3.35, captionY, 2.9, .47, '#397b70'); root.add(gripCaption);
    const turnCaption = label('Putar knop perlahan', -3.35, captionY, 2.9, .47, '#397b70'); root.add(turnCaption);
    const needleCaption = new THREE.Group();
    needleCaption.add(label('Jarum tetap di O', -3.15, -3.5, .18, .42, '#527489'));
    needleCaption.add(line([[-2.65, -3.15, .18], [-.3, -.3, .18], [0, 0, .18]], 0x829fb2, true));
    const centerRing = new THREE.Mesh(keep(new THREE.TorusGeometry(.19, .022, 8, 40)), material(0x64978b));
    centerRing.position.z = .12; needleCaption.add(centerRing);
    root.add(needleCaption);
    const gripLeader = line([[-2.65, leaderY, 2.8], [0, 0, 0]], 0x78aa9f, true); root.add(gripLeader);
    const sweep = mode === 'arc' ? Math.PI : Math.PI * 2;
    const points = Array.from({ length: 193 }, (_, i) => [value * Math.cos(i / 192 * sweep), value * Math.sin(i / 192 * sweep), .035]);
    const draw = stroke(points, 0x284b69, .04); root.add(draw.object);
    root.add(dot(0, 0), label('O', -.25, -.3, .1, .25));
    const radiusGuide = line([[0, 0, .04], [value, 0, .04]], 0x90b4a0, true); root.add(radiusGuide);
    const radiusLabel = label(`r = ${value} cm`, value / 2, -.35, .15, .27, '#397a61'); root.add(radiusLabel);
    return progress => {
      const radius = THREE.MathUtils.lerp(.4, value, phase(progress, 0, .28));
      const height = Math.sqrt(3.4 ** 2 - (radius / 2) ** 2);
      const hinge = [radius / 2, 0, height];
      const needle = [0, 0, .04], graphite = [radius, 0, .04];
      const a = [radius * .08, 0, height * .16], b = [radius * .92, 0, height * .16];
      legs[0].update(a, hinge); legs[1].update(b, hinge);
      tips[0].update(needle, a); tips[1].update(graphite, b);
      holders[0].update([radius * .045, 0, height * .09], [radius * .125, 0, height * .25]);
      holders[1].update([radius * .955, 0, height * .09], [radius * .875, 0, height * .25]);
      head.position.set(radius / 2, 0, height);
      screw.position.set(radius / 2, -.14, height);
      knob.update([radius / 2, 0, height + .26], [radius / 2, 0, height + .8]);
      knobRibs.forEach((rib, index) => {
        const angle = index / knobRibs.length * Math.PI * 2;
        const x = radius / 2 + .126 * Math.cos(angle), y = .126 * Math.sin(angle);
        rib.update([x, y, height + .29], [x, y, height + .77]);
      });
      instrument.position.z = .8 * (1 - phase(progress, .28, .5));
      const drawn = phase(progress, .5, .97);
      instrument.rotation.z = sweep * drawn;
      const approach = phase(progress, .2, .44), grip = phase(progress, .36, .5);
      hand.visible = progress >= .2;
      hand.position.set(radius / 2 + .7 * (1 - approach), .3 * (1 - approach), height + .53 + .4 * (1 - approach));
      // Track the orbiting knob without asking the wrist to make a full turn.
      // The cylindrical knob allows the pinch to stay at the same world angle;
      // a small wrist motion suggests the turning action while the arm stays calm.
      const wristTwist = .12 * Math.sin(sweep * drawn);
      hand.rotation.set(.13 * (1 - approach), 0, -instrument.rotation.z - .18 * (1 - grip) + wristTwist);
      const fingerRoll = .085 * Math.sin(drawn * Math.PI * 8) * grip;
      fingers.forEach(update => update(grip, fingerRoll));
      gripRing.position.set(radius / 2, 0, height + .53);
      gripRing.visible = progress >= .32 && progress < .97;
      turnArrow.position.set(radius / 2, 0, height + .94);
      turnArrow.visible = progress >= .5 && progress < .97;
      gripCaption.visible = progress >= .2 && progress < .5;
      turnCaption.visible = progress >= .5 && progress < .97;
      needleCaption.visible = progress >= .38;
      centerRing.scale.setScalar(1 + .07 * Math.sin(progress * Math.PI * 10));
      gripLeader.visible = progress >= .26 && progress < .5;
      const gripPosition = instrument.localToWorld(new THREE.Vector3(radius / 2, 0, height + .53));
      const leaderPositions = gripLeader.geometry.getAttribute('position');
      leaderPositions.setXYZ(1, gripPosition.x, gripPosition.y, gripPosition.z); leaderPositions.needsUpdate = true;
      gripLeader.computeLineDistances();
      draw.reveal(drawn);
      radiusGuide.rotation.z = sweep * drawn;
      radiusGuide.visible = progress >= .28;
      radiusLabel.visible = progress >= .28 && (progress < .5 || progress >= .97);
      radiusLabel.position.set(value / 2 * Math.cos(sweep * drawn), value / 2 * Math.sin(sweep * drawn) - .36, .15);
    };
  }

  function protractor() {
    const radius = 4.7, innerRadius = 3.25;
    const outer = [[-radius, -.5], [radius, -.5], [radius, 0]];
    for (let i = 1; i <= 90; i++) { const a = i / 90 * Math.PI; outer.push([radius * Math.cos(a), radius * Math.sin(a)]); }
    const inner = [[-innerRadius, .03], [innerRadius, .03]];
    for (let i = 1; i <= 90; i++) { const a = i / 90 * Math.PI; inner.push([innerRadius * Math.cos(a), innerRadius * Math.sin(a)]); }
    const group = plate(outer, [inner]);
    const ticks = [];
    for (let degree = 0; degree <= 180; degree++) {
      const a = THREE.MathUtils.degToRad(degree), r = degree % 10 === 0 ? 4.05 : degree % 5 === 0 ? 4.25 : 4.39;
      ticks.push(4.62 * Math.cos(a), 4.62 * Math.sin(a), .13, r * Math.cos(a), r * Math.sin(a), .13);
      if (degree % 10 === 0) group.add(label(String(degree), 3.73 * Math.cos(a), 3.73 * Math.sin(a), .14, .22));
    }
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    group.add(new THREE.LineSegments(geometry, keep(new THREE.LineBasicMaterial({ color: 0x536976 }))));
    group.add(line([[-4.5, 0, .13], [4.5, 0, .13]], 0x8a9ba8));
    group.add(line([[0, -.4, .14], [0, .3, .14]], 0x536976));
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(.14, .018, 8, 32)), material(0x6d8797)); ring.position.z = .13; group.add(ring);
    return group;
  }

  function buildProtractor({ value }) {
    const instrument = protractor(); root.add(instrument);
    const origin = new THREE.Vector3(0, -1.4, .02);
    const angle = THREE.MathUtils.degToRad(value);
    const end = new THREE.Vector3(4.9 * Math.cos(angle), origin.y + 4.9 * Math.sin(angle), .16);
    root.add(line([[0, origin.y, .03], [5.25, origin.y, .03]], 0x657a8b), dot(0, origin.y));
    root.add(label('0°', 5.35, origin.y - .28, .1, .25));
    const mark = dot(end.x, end.y); root.add(mark);
    const draw = stroke([[0, origin.y, .17], [end.x, end.y, .17]]); root.add(draw.object);
    const stylus = pencil(); root.add(stylus);
    const guide = ruler(5.6); root.add(guide);
    guide.rotation.z = angle;
    guide.position.set(-.3 * Math.cos(angle), origin.y - .3 * Math.sin(angle), .05);
    const arcPoints = Array.from({ length: 65 }, (_, i) => { const a = i / 64 * angle; return [1.1 * Math.cos(a), origin.y + 1.1 * Math.sin(a), .2]; });
    const arc = line(arcPoints, 0x41876b);
    const angleLabel = label(`${value}°`, 1.62 * Math.cos(angle / 2), origin.y + 1.62 * Math.sin(angle / 2), .25, .3, '#397a61');
    root.add(arc, angleLabel);
    const surfaces = [];
    instrument.traverse(object => { if (object.isMesh && object.material.transparent) surfaces.push(object.material); });
    return progress => {
      const lifted = phase(progress, .5, .65);
      instrument.position.set(-1.2 * lifted, origin.y + .8 * (1 - phase(progress, 0, .28)), 1.5 * lifted);
      surfaces.forEach(surface => { surface.opacity = .58 - .45 * lifted; });
      instrument.visible = progress < .72;
      guide.visible = progress >= .62;
      const drawn = phase(progress, .66, .97);
      draw.reveal(drawn);
      mark.visible = progress >= .46;
      stylus.visible = progress >= .28 && progress < .99;
      if (progress < .5) stylus.position.set(end.x, end.y, .17 + 1.1 * (1 - phase(progress, .28, .46)));
      else if (progress < .66) {
        const transit = phase(progress, .5, .66);
        stylus.position.set(end.x * (1 - transit), THREE.MathUtils.lerp(end.y, origin.y, transit), .17 + Math.sin(transit * Math.PI) * 1.4);
      } else stylus.position.set(end.x * drawn, origin.y + (end.y - origin.y) * drawn, .2);
      arc.visible = progress >= .97;
      angleLabel.visible = progress >= .97;
    };
  }

  function releaseContent() {
    if (root) scene.remove(root);
    resources.forEach(resource => resource.dispose()); resources.clear();
  }

  function positionCamera() {
    if (tilted) camera.position.set(0, activeConfig?.tool === 'compass' ? -12 : -11, 18);
    else camera.position.set(0, 0, 20);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, activeConfig?.tool === 'compass' && tilted ? 1.05 : 0);
  }

  function resize() {
    if (disposed || container.clientWidth < 1 || container.clientHeight < 1) return;
    const width = container.clientWidth, height = container.clientHeight, aspect = width / height;
    const triangleHeight = activeConfig?.value === 60 ? 10 : activeConfig?.value === 90 ? 9.2 : 8.4;
    const compassHeight = 10.8 + Math.max(0, (activeConfig?.value || 0) - 3) * .4;
    const fitHeight = activeConfig?.tool === 'triangles' ? triangleHeight : activeConfig?.tool === 'compass' ? compassHeight : 8.4;
    const fitWidth = activeConfig?.tool === 'triangles' ? 9.2 : activeConfig?.tool === 'compass' ? 11.6 : 13;
    const viewWidth = Math.max(fitWidth, fitHeight * aspect);
    camera.left = -viewWidth / 2; camera.right = viewWidth / 2;
    camera.top = viewWidth / aspect / 2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
    if (lesson) { lesson(lastProgress); renderer.render(scene, camera); }
  }

  function configure(configuration) {
    if (disposed) return;
    if (JSON.stringify(activeConfig) === JSON.stringify(configuration)) return;
    releaseContent();
    activeConfig = { ...configuration };
    root = new THREE.Group(); scene.add(root);
    const builders = { ruler: buildRuler, triangles: buildTriangles, compass: buildCompass, protractor: buildProtractor };
    lesson = builders[configuration.tool](configuration);
    positionCamera(); resize();
  }

  const observer = new ResizeObserver(resize); observer.observe(container);
  const lost = event => { event.preventDefault(); onContextLost(); };
  canvas.addEventListener('webglcontextlost', lost);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
    releaseContent(); renderer.dispose();
  };
  return {
    configure, resize, dispose,
    setView(value) { tilted = value; positionCamera(); },
    render(progress) { if (!disposed && lesson) { lastProgress = progress; lesson(progress); renderer.render(scene, camera); } }
  };
}
