import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAP_GEOMETRY as model, DRAWING_VIEWS, outerTopAt, solidFloorAt, isCapMaterial,
  capProfilePoints, capProfilePath, projectIsometric, createLineDrawing,
  createCapIllustration, lineTargets
} from '../src/lines-drawing.js';

const close = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

// Inspect the generated SVG structure without adding a browser/DOM dependency.
function svgTree(svg) {
  const document = { name: 'document', attrs: {}, children: [] };
  const stack = [document];
  const tags = /<(\/?)([\w:-]+)([^>]*)>/g;
  let previousEnd = 0;
  for (const tag of svg.matchAll(tags)) {
    stack.at(-1).text = (stack.at(-1).text || '') + svg.slice(previousEnd, tag.index);
    previousEnd = tag.index + tag[0].length;
    if (tag[1]) {
      assert.equal(stack.pop().name, tag[2], 'SVG elements must be balanced');
      continue;
    }
    const node = { name: tag[2], attrs: Object.fromEntries(
      [...tag[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]])
    ), children: [] };
    stack.at(-1).children.push(node);
    if (!tag[3].trimEnd().endsWith('/')) stack.push(node);
  }
  assert.equal(stack.length, 1);
  return document;
}

function findAll(node, predicate) {
  return [node, ...node.children.flatMap(child => findAll(child, () => true))].filter(predicate);
}
const sheet = svgTree(createLineDrawing());
const view = name => findAll(sheet, node => node.attrs['data-drawing-view'] === name)[0];
const layers = (node, type) => findAll(node, element => element.attrs['data-line-layer'] === type);
const elements = (node, name) => findAll(node, element => element.name === name);
const pointsOfLine = d => {
  const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
  assert.match(d, /^M[-\d.]+ [-\d.]+L[-\d.]+ [-\d.]+$/);
  return [numbers.slice(0, 2), numbers.slice(2, 4)];
};

function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

test('the material profile keeps the arched opening empty and has a positive roof', () => {
  const [centreX, centreZ] = model.openingCentre;
  close(centreX, model.width / 2);
  close(centreZ, 0);
  close(solidFloorAt(centreX), model.openingRadius);
  close(outerTopAt(centreX), model.height);
  assert.equal(isCapMaterial(centreX, model.openingRadius - .1), false);
  assert.equal(isCapMaterial(centreX, model.openingRadius + .1), true);
  assert.equal(isCapMaterial(-.1, 20), false);
  assert.equal(isCapMaterial(model.width + .1, 20), false);
  assert.equal(isCapMaterial(centreX, model.height + .1), false);
  for (let x = 0; x <= model.width; x += .25) {
    assert.ok(outerTopAt(x) > solidFloorAt(x), `roof intersects opening at x=${x}`);
    close(outerTopAt(x), outerTopAt(model.width - x));
    close(solidFloorAt(x), solidFloorAt(model.width - x));
  }
});

test('the rendered polygon agrees with material/opening classification away from boundaries', () => {
  const polygon = capProfilePoints(128);
  for (const point of polygon) assert.ok(point.every(Number.isFinite));
  close(Math.min(...polygon.map(point => point[0])), 0);
  close(Math.max(...polygon.map(point => point[0])), model.width);
  close(Math.max(...polygon.map(point => point[1])), model.height);
  for (let x = .3; x < model.width; x += .7) {
    for (let z = .3; z < model.height; z += .7) {
      if (Math.abs(z - solidFloorAt(x)) < .03 || Math.abs(z - outerTopAt(x)) < .03) continue;
      assert.equal(insidePolygon(x, z, polygon), isCapMaterial(x, z), `x=${x}, z=${z}`);
    }
  }
});

test('all four through holes fit the flat shoulders and avoid the A–A material plane', () => {
  assert.equal(model.holes.length, 4);
  const locations = new Set();
  for (const hole of model.holes) {
    locations.add(`${hole.x},${hole.y}`);
    close(hole.radius * 2, model.holeDiameter);
    assert.ok(hole.x - hole.radius > 0 && hole.x + hole.radius < model.width);
    assert.ok(hole.y - hole.radius > 0 && hole.y + hole.radius < model.depth);
    assert.ok(Math.abs(hole.y - model.sectionY) > hole.radius);
    for (let a = 0; a < Math.PI * 2; a += .2) {
      const x = hole.x + hole.radius * Math.cos(a);
      close(outerTopAt(x), model.shoulderHeight);
      assert.ok(isCapMaterial(x, model.shoulderHeight), 'a hole rim must lie on its shoulder');
    }
  }
  assert.equal(locations.size, 4);
  close(model.sectionY, model.depth / 2);
  assert.equal(model.sectionDirection, '+Y');
});

test('front, section, and top show coherent geometry rather than unrelated examples', () => {
  const frontOutline = elements(layers(view('front'), 'visible')[0], 'path')[0].attrs.d;
  const sectionOutline = elements(layers(view('section'), 'visible')[0], 'path')[0].attrs.d;
  assert.equal(frontOutline, capProfilePath());
  assert.equal(sectionOutline, capProfilePath([590, 265]));
  const circles = elements(layers(view('top'), 'visible')[0], 'circle');
  assert.equal(circles.length, model.holes.length);
  const scale = Number(circles[0].attrs.r) / model.holes[0].radius;
  const origin = [Number(circles[0].attrs.cx) - model.holes[0].x * scale,
    Number(circles[0].attrs.cy) - model.holes[0].y * scale];
  circles.forEach((circle, i) => {
    close(Number(circle.attrs.r), model.holes[i].radius * scale);
    close(Number(circle.attrs.cx), origin[0] + model.holes[i].x * scale);
    close(Number(circle.attrs.cy), origin[1] + model.holes[i].y * scale);
  });
  const projectedWalls = elements(layers(view('front'), 'hidden')[0], 'path');
  const uniqueWalls = [...new Set(model.holes.flatMap(hole => [hole.x - hole.radius, hole.x + hole.radius]))].sort((a, b) => a - b);
  assert.equal(projectedWalls.length, uniqueWalls.length, 'holes at different depths overlap in the front projection');
  projectedWalls.forEach((wall, i) => {
    const [start, end] = pointsOfLine(wall.attrs.d);
    close(start[0], origin[0] + uniqueWalls[i] * scale);
    close(end[0], start[0]);
    close(Math.abs(end[1] - start[1]) / scale, outerTopAt(uniqueWalls[i]) - solidFloorAt(uniqueWalls[i]), .001);
  });
});

test('section hatching is confined to the same solid outline and excludes hidden-hole lines', () => {
  const section = view('section');
  assert.equal(layers(section, 'hatch').length, 1);
  assert.equal(layers(section, 'hidden').length, 0);
  assert.equal(elements(section, 'circle').length, 0);
  const hatch = elements(layers(section, 'hatch')[0], 'path');
  assert.equal(hatch.length, 1);
  assert.equal(hatch[0].attrs.d, elements(layers(section, 'visible')[0], 'path')[0].attrs.d);
  assert.equal(hatch[0].attrs.stroke, 'none');
  assert.match(hatch[0].attrs.fill, /^url\(#.+\)$/);
  const patternId = hatch[0].attrs.fill.slice(5, -1);
  const pattern = elements(sheet, 'pattern').find(node => node.attrs.id === patternId);
  assert.ok(pattern, 'the material fill must resolve to a hatch pattern');
  assert.ok(Number(pattern.attrs.width) > 0 && Number(pattern.attrs.height) > 0);
  assert.match(pattern.attrs.patternTransform, /^rotate\(-?45\)$/);
});

test('all six teaching groups are present in appropriate cap views and keep thick/thin contrast', () => {
  const expected = ['visible', 'dimension', 'hidden', 'center', 'cutting', 'hatch'];
  assert.deepEqual([...new Set(findAll(sheet, node => node.attrs['data-line-layer']).map(node => node.attrs['data-line-layer']))].sort(), expected.toSorted());
  for (const type of expected) {
    assert.ok(layers(sheet, type).length > 0, type);
    assert.ok(view(lineTargets[type].view), `${type} target has a valid view`);
  }
  assert.equal(layers(view('top'), 'cutting').length, 1);
  assert.equal(layers(view('section'), 'cutting').length, 0);
  const thick = Number(layers(view('front'), 'visible')[0].attrs['stroke-width']);
  for (const type of ['dimension', 'hidden', 'center', 'hatch']) {
    close(thick / Number(layers(sheet, type)[0].attrs['stroke-width']), 2);
  }
});

test('the compact sheet shows all four cap views together and removes the shaft example', () => {
  const expected = ['front', 'top', 'section', 'iso'];
  const groups = findAll(sheet, node => node.attrs['data-drawing-view']);
  assert.deepEqual(groups.map(node => node.attrs['data-drawing-view']).sort(), expected.toSorted());
  assert.deepEqual(Object.keys(DRAWING_VIEWS).filter(name => name !== 'all').sort(), expected.toSorted());
  assert.equal(layers(sheet, 'break').length, 0);
  assert.equal(Object.hasOwn(lineTargets, 'break'), false);
  assert.doesNotMatch(createLineDrawing(), /poros|patahan|data-drawing-view="break"/i);
  const svg = elements(sheet, 'svg')[0];
  assert.equal(svg.attrs.viewBox, DRAWING_VIEWS.all.box.join(' '));
  const [, , sheetWidth, sheetHeight] = DRAWING_VIEWS.all.box;
  for (const group of groups) {
    assert.equal(group.attrs.hidden, undefined);
    assert.equal(group.attrs.display, undefined);
    const [x, y, width, height] = DRAWING_VIEWS[group.attrs['data-drawing-view']].box;
    assert.ok(x >= 0 && y >= 0 && x + width <= sheetWidth && y + height <= sheetHeight);
  }
});

test('A–A arrows match the positive-depth view direction and the section is labeled', () => {
  const cutting = layers(view('top'), 'cutting')[0];
  assert.equal(cutting.attrs['data-section-direction'], 'positive-y');
  const arrows = elements(cutting, 'path').filter(node => node.attrs['marker-end']);
  assert.equal(arrows.length, 2);
  for (const arrow of arrows) {
    const coordinates = [...arrow.attrs.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    assert.match(arrow.attrs.d, /^M[-\d.]+ [-\d.]+V[-\d.]+$/);
    assert.ok(coordinates[2] > coordinates[1], 'top projection has +Y downward');
  }
  assert.deepEqual(elements(cutting, 'text').map(node => node.text), ['A', 'A']);
  assert.ok(elements(view('section'), 'text').some(node => node.text === 'Potongan A–A'));
});

test('displayed dimensions measure their associated model feature', () => {
  const frontDimensions = layers(view('front'), 'dimension')[0];
  const scale = 3.35;
  const lines = elements(frontDimensions, 'path').filter(node => node.attrs['marker-start']);
  const labels = elements(frontDimensions, 'text').map(node => node.text);
  const measured = lines.map(node => {
    const [a, b] = pointsOfLine(node.attrs.d);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / scale;
  });
  [model.width, model.plateau[1] - model.plateau[0], model.height].forEach((size, i) => {
    close(measured[i], size, .001);
    assert.equal(Number(labels[i]), size);
  });
  assert.ok(labels.includes(`R${model.openingRadius}`));
  const radiusLine = elements(frontDimensions, 'path').find(node => node.attrs['marker-end'] && !node.attrs['marker-start']);
  const [centre, arc] = pointsOfLine(radiusLine.attrs.d);
  close(Math.hypot(arc[0] - centre[0], arc[1] - centre[1]) / scale, model.openingRadius, .001);
  const topDimensions = layers(view('top'), 'dimension')[0];
  const topMeasures = elements(topDimensions, 'path').filter(node => node.attrs['marker-start']).map(node => {
    const [a, b] = pointsOfLine(node.attrs.d);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / scale;
  });
  const rows = [...new Set(model.holes.map(hole => hole.y))].sort((a, b) => a - b);
  const topLabels = elements(topDimensions, 'text').map(node => node.text);
  [model.depth, rows[0], rows[1] - rows[0]].forEach((size, i) => {
    close(topMeasures[i], size, .001);
    assert.equal(Number(topLabels[i]), size);
  });
  assert.ok(topLabels.includes(`${model.holes.length} × Ø${model.holeDiameter}`));
});

test('hero, card, and main SVG IDs are unique and every local reference resolves', () => {
  const combined = svgTree(createLineDrawing() + createCapIllustration() + createCapIllustration('line-cap-card'));
  const ids = findAll(combined, node => node.attrs.id).map(node => node.attrs.id);
  assert.equal(new Set(ids).size, ids.length);
  const available = new Set(ids);
  for (const node of findAll(combined, () => true)) {
    for (const attribute of Object.values(node.attrs)) {
      for (const reference of attribute.matchAll(/url\(#([^)]+)\)/g)) assert.ok(available.has(reference[1]), reference[1]);
    }
    if (node.attrs['aria-labelledby']) {
      for (const reference of node.attrs['aria-labelledby'].split(/\s+/)) assert.ok(available.has(reference), reference);
    }
  }
});

test('isometric projection stays finite and preserves straight orthographic model edges', () => {
  const origin = [200, 150];
  const scale = 2;
  const p = projectIsometric(0, 0, 0, origin, scale);
  assert.deepEqual(p, origin);
  for (const [dx, dy, dz] of [[model.width, 0, 0], [0, model.depth, 0], [0, 0, model.height]]) {
    const end = projectIsometric(dx, dy, dz, origin, scale);
    assert.ok(end.every(Number.isFinite));
    const middle = projectIsometric(dx / 2, dy / 2, dz / 2, origin, scale);
    close(middle[0], (p[0] + end[0]) / 2);
    close(middle[1], (p[1] + end[1]) / 2);
    close(Math.hypot(end[0] - p[0], end[1] - p[1]), (dx + dy + dz) * scale);
  }
  for (const target of Object.values(lineTargets)) {
    const [x, y, width, height] = DRAWING_VIEWS[target.view].box;
    assert.ok(target.x >= x && target.x <= x + width && target.y >= y && target.y <= y + height, target.label);
  }
});

test('teaching callouts point to material and actual line features', () => {
  const scale = 3.35;
  const hatch = lineTargets.hatch;
  assert.ok(isCapMaterial((hatch.x - 590) / scale, (265 - hatch.y) / scale), 'hatch callout must avoid the empty arch');
  const centre = lineTargets.center;
  assert.ok(elements(layers(view('top'), 'visible')[0], 'circle').some(circle =>
    Math.hypot(Number(circle.attrs.cx) - centre.x, Number(circle.attrs.cy) - centre.y) < .001
  ), 'sumbu lubang callout must identify a hole centre');
  const hidden = lineTargets.hidden;
  assert.ok(elements(layers(view('front'), 'hidden')[0], 'path').some(wall => {
    const [a, b] = pointsOfLine(wall.attrs.d);
    return Math.abs(a[0] - hidden.x) < .001 && hidden.y > Math.min(a[1], b[1]) && hidden.y < Math.max(a[1], b[1]);
  }), 'hidden callout must identify the projected wall of a hole');
  const [roofX, roofZ] = [(lineTargets.visible.x - 120) / scale, (265 - lineTargets.visible.y) / scale];
  close(roofZ, outerTopAt(roofX), .001);
  close(lineTargets.cutting.y, 475 + model.sectionY * scale, .001);
});
