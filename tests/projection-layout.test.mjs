import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECTION_VIEWS as views, PROJECTION_MODEL as model, viewPosition,
  createViewDrawing, createProjectionSymbol, createProjectionLayout, createProjectionHero
} from '../src/projection-drawing.js';

function svgTree(svg) {
  const root = { name: 'document', attrs: {}, children: [] };
  const stack = [root];
  const tags = /<(\/?)([\w:-]+)([^>]*)>/g;
  for (const tag of svg.matchAll(tags)) {
    if (tag[1]) { assert.equal(stack.pop().name, tag[2], 'SVG elements must be balanced'); continue; }
    const attributes = [...tag[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]]);
    assert.equal(new Set(attributes.map(([name]) => name)).size, attributes.length, 'SVG attributes must be unique');
    const node = { name: tag[2], attrs: Object.fromEntries(attributes), children: [] };
    stack.at(-1).children.push(node);
    if (!tag[3].trimEnd().endsWith('/')) stack.push(node);
  }
  assert.equal(stack.length, 1);
  return root;
}
const all = (node, predicate = () => true) => [node, ...node.children.flatMap(child => all(child))].filter(predicate);
const byClass = (tree, name) => all(tree, node => (node.attrs.class || '').split(' ').includes(name));
const shapeFor = (tree, id) => all(tree, node => node.attrs['data-shape-view'] === id)[0];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

function pathPoints(d) {
  const result = [];
  let x = 0, y = 0;
  for (const token of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
    const numbers = [...token[2].matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    if (token[1] === 'Z') continue;
    if (token[1] === 'H') x = numbers[0];
    else if (token[1] === 'V') y = numbers[0];
    else [x, y] = numbers;
    result.push([x, y]);
  }
  return result;
}

function polygonArea(points) {
  return Math.abs(points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    return sum + x * nextY - nextX * y;
  }, 0)) / 2;
}

function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('six orthographic outlines have model dimensions and share one aligned scale', () => {
  const expected = { front: [120, 120], back: [120, 120], top: [120, 60], bottom: [120, 60], right: [60, 120], left: [60, 120] };
  assert.deepEqual(Object.keys(views).sort(), Object.keys(expected).sort());
  const tree = svgTree(createProjectionLayout('eu'));
  const transforms = {};
  for (const [id, [width, height]] of Object.entries(expected)) {
    const shape = shapeFor(tree, id);
    assert.ok(shape);
    const polygon = pathPoints(byClass(shape, 'projection-visible-outline')[0].attrs.d);
    close(Math.max(...polygon.map(point => point[0])) - Math.min(...polygon.map(point => point[0])), width);
    close(Math.max(...polygon.map(point => point[1])) - Math.min(...polygon.map(point => point[1])), height);
    assert.deepEqual(views[id].dimensions, { width, height });
    const [x, y, scale] = [...shape.attrs.transform.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    transforms[id] = { x, y, scale };
    close(scale, transforms.front?.scale || scale);
    close(polygonArea(polygon), id === 'front' || id === 'back' ? model.width * model.height - model.step ** 2 : width * height);
  }
  close(transforms.top.x, transforms.front.x);
  close(transforms.bottom.x, transforms.front.x);
  close(transforms.left.y, transforms.front.y);
  close(transforms.right.y, transforms.front.y);
  close(transforms.back.y, transforms.front.y);
});

test('front and back are exact horizontal mirrors of the same L rather than different prisms', () => {
  const front = pathPoints(byClass(svgTree(createViewDrawing('front')), 'projection-visible-outline')[0].attrs.d);
  const back = pathPoints(byClass(svgTree(createViewDrawing('back')), 'projection-visible-outline')[0].attrs.d);
  for (let x = 3; x < model.width; x += 7) for (let y = 3; y < model.height; y += 7) {
    assert.equal(insidePolygon(x, y, front), x < model.step || y > model.step);
    assert.equal(insidePolygon(model.width - x, y, back), insidePolygon(x, y, front));
  }
  const mirroredVertices = front.map(([x, y]) => `${model.width - x},${y}`).sort();
  assert.deepEqual(back.map(point => point.join(',')).sort(), mirroredVertices);
});

test('the step is hidden only behind the left wall and bottom and every edge lies at the actual step', () => {
  const tree = svgTree(createProjectionLayout());
  for (const id of Object.keys(views)) {
    const shape = shapeFor(tree, id);
    const hidden = byClass(shape, 'projection-hidden-edge');
    const visible = byClass(shape, 'projection-visible-edge');
    assert.equal(hidden.length, id === 'left' || id === 'bottom' ? 1 : 0, id);
    assert.equal(visible.length, id === 'right' || id === 'top' ? 1 : 0, id);
    const edge = [...hidden, ...visible][0];
    if (!edge) continue;
    const vertices = pathPoints(edge.attrs.d);
    assert.equal(vertices.length, 2);
    assert.deepEqual(vertices, id === 'top' || id === 'bottom' ? [[model.step, 0], [model.step, model.depth]] : [[0, model.step], [model.depth, model.step]]);
    if (hidden.length) {
      assert.ok(edge.attrs['stroke-dasharray'].split(' ').every(value => Number(value) > 0));
      assert.ok(Number(edge.attrs['stroke-width']) < Number(shape.attrs['stroke-width']));
    }
  }
});

test('first and third angle methods place the six views in the exact projection positions', () => {
  const expected = {
    eu: { front: [1, 1], back: [3, 1], top: [1, 2], bottom: [1, 0], right: [0, 1], left: [2, 1] },
    us: { front: [1, 1], back: [3, 1], top: [1, 0], bottom: [1, 2], right: [2, 1], left: [0, 1] }
  };
  for (const [system, placement] of Object.entries(expected)) {
    const tree = svgTree(createProjectionLayout(system));
    const cells = new Set();
    for (const [id, [col, row]] of Object.entries(placement)) {
      assert.deepEqual(viewPosition(id, system), { col, row });
      cells.add(`${col},${row}`);
      const group = all(tree, node => node.attrs['data-projection-view'] === id)[0];
      const tile = byClass(group, 'projection-view-tile')[0];
      close(Number(tile.attrs.x), 20 + 245 * col);
      close(Number(tile.attrs.y), 20 + 210 * row);
    }
    assert.equal(cells.size, 6, 'no two view tiles may occupy the same cell');
  }
});

test('all six layout tiles are keyboard targets and only the selected view is pressed', () => {
  for (const selected of Object.keys(views)) {
    const tree = svgTree(createProjectionLayout('eu', selected));
    const buttons = all(tree, node => node.attrs.role === 'button');
    assert.equal(buttons.length, 6);
    buttons.forEach(button => {
      assert.equal(button.attrs.tabindex, '0');
      assert.ok(button.attrs['aria-label'].includes(views[button.attrs['data-projection-view']].name.toLowerCase()));
      assert.equal(button.attrs['aria-pressed'], String(button.attrs['data-projection-view'] === selected));
    });
    assert.equal(buttons.filter(button => button.attrs['aria-pressed'] === 'true').length, 1);
    assert.equal(byClass(tree, 'is-selected').length, 1);
  }
});

test('ISO symbols retain the small cone end on the left while swapping circle position', () => {
  for (const [system, circleSide] of [['eu', 'right'], ['us', 'left']]) {
    const tree = svgTree(createProjectionSymbol(system));
    const cone = pathPoints(byClass(tree, 'projection-symbol-frustum')[0].attrs.d);
    const minX = Math.min(...cone.map(([x]) => x)), maxX = Math.max(...cone.map(([x]) => x));
    const left = cone.filter(([x]) => x === minX).map(([, y]) => y);
    const right = cone.filter(([x]) => x === maxX).map(([, y]) => y);
    assert.ok(Math.max(...left) - Math.min(...left) < Math.max(...right) - Math.min(...right));
    const outer = byClass(tree, 'projection-symbol-circle')[0];
    const centreX = Number(outer.attrs.cx), radius = Number(outer.attrs.r);
    assert.ok(circleSide === 'right' ? centreX - radius > maxX : centreX + radius < minX);
    const circles = all(tree, node => node.name === 'circle');
    assert.equal(circles.length, 2);
    circles.forEach(circle => { close(Number(circle.attrs.cx), centreX); close(Number(circle.attrs.cy), Number(outer.attrs.cy)); });
  }
});

test('combined heroes, layouts, symbols, and view SVGs have unique IDs and resolvable references', () => {
  const combined = svgTree(createProjectionHero() + createProjectionHero() + createProjectionSymbol('eu') + createProjectionSymbol('us') + createProjectionLayout('eu') + createProjectionLayout('us') + Object.keys(views).map(id => createViewDrawing(id)).join(''));
  const ids = all(combined, node => node.attrs.id).map(node => node.attrs.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const node of all(combined)) {
    for (const value of Object.values(node.attrs)) for (const reference of value.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(reference[1]), reference[1]);
    for (const id of (node.attrs['aria-labelledby'] || '').split(' ').filter(Boolean)) assert.ok(ids.includes(id), id);
  }
});
