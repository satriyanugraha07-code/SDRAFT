import test from 'node:test';
import assert from 'node:assert/strict';
import { createLkpdPattern, createLkpdHero, LKPD_PATTERN_GEOMETRY as geometry } from '../src/lkpd-drawing.js';
import { getHexagonVertices, getHexPatternSegments, HEX_PATTERN_GEOMETRY as hex } from '../src/lkpd-hex-pattern.js';
import { ARC_PATTERN_GEOMETRY as arc } from '../src/lkpd-arc-pattern.js';
import { createLkpdDrawingSheet } from '../src/lkpd-sheet.js';
import { LKPD_PATTERNS } from '../src/lkpd-markup.js';

const close = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const millimetres = units => units * geometry.millimetresPerUnit;

// Inspect the rendered shapes as well as their dimension metadata, without a
// browser dependency or assumptions about the worksheet's page orientation.
function svgTree(svg) {
  const root = { name: 'document', attrs: {}, children: [], text: '' };
  const stack = [root];
  let previousEnd = 0;
  for (const tag of svg.matchAll(/<(\/?)([\w:-]+)([^>]*)>/g)) {
    stack.at(-1).text += svg.slice(previousEnd, tag.index);
    previousEnd = tag.index + tag[0].length;
    if (tag[1]) {
      assert.equal(stack.pop().name, tag[2], 'SVG elements must be balanced');
      continue;
    }
    const attrs = [...tag[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]);
    assert.equal(new Set(attrs.map(([name]) => name)).size, attrs.length, 'SVG attributes must be unique');
    const node = { name: tag[2], attrs: Object.fromEntries(attrs), children: [], text: '' };
    stack.at(-1).children.push(node);
    if (!tag[3].trimEnd().endsWith('/') && !['br', 'img', 'input'].includes(tag[2])) stack.push(node);
  }
  assert.equal(stack.length, 1);
  return root;
}
const all = (node, predicate = () => true) => [node, ...node.children.flatMap(child => all(child))].filter(predicate);
const byClass = (node, name) => all(node, item => (item.attrs.class || '').split(' ').includes(name));
const paths = node => all(node, item => item.name === 'path');
const texts = node => all(node, item => item.name === 'text').map(item => item.text.trim());
const rendered = id => svgTree(createLkpdPattern(id));

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
const onSegment = (point, [a, b], tolerance = 1e-5) =>
  Math.abs(distance(a, point) + distance(point, b) - distance(a, b)) < tolerance;

test('straight examples and their dimension use the actual 3.5 mm line gap', () => {
  close(geometry.squareMillimetres / geometry.squareSize, geometry.millimetresPerUnit);
  for (const [id, axis] of [[1, 'y'], [2, 'x']]) {
    const lines = all(rendered(id), node => node.name === 'line');
    assert.ok(lines.length > 2);
    const coordinates = lines.map(line => Number(line.attrs[`${axis}1`]));
    coordinates.forEach((coordinate, index) => {
      close(Number(lines[index].attrs[`${axis}2`]), coordinate);
      if (index) close(millimetres(coordinate - coordinates[index - 1]), 3.5);
    });
  }
  close(millimetres(geometry.straightPitch), 3.5);
  const dimension = geometry.dimensions[2];
  close(millimetres(distance(dimension.start, dimension.end)), 3.5);
  const lines = all(rendered(2), node => node.name === 'line').map(line => [
    [Number(line.attrs.x1), Number(line.attrs.y1)], [Number(line.attrs.x2), Number(line.attrs.y2)]
  ]);
  assert.ok(lines.some(line => onSegment(dimension.start, line)));
  assert.ok(lines.some(line => onSegment(dimension.end, line)));
  assert.equal(dimension.label, '3,5');
  const horizontalDimension = geometry.dimensions[1];
  close(millimetres(distance(horizontalDimension.start, horizontalDimension.end)), 3.5);
  close(horizontalDimension.start[1], 0);
  close(horizontalDimension.end[1], 10);
});

test('interlocking ribbons and the rendered width dimension span 7 mm', () => {
  close(millimetres(geometry.ribbonWidth), 7);
  const tree = rendered(3);
  const dimension = byClass(tree, 'lkpd-pattern-dimension')[0];
  const [start, end] = pathPoints(paths(dimension)[0].attrs.d);
  close(millimetres(distance(start, end)), 7);
  const ribbonGroup = all(tree, node => node.name === 'g' && node.attrs['stroke-width'] === '.85')[0];
  const segments = paths(ribbonGroup).map(path => pathPoints(path.attrs.d));
  const verticals = segments.filter(([a, b]) => a[0] === b[0]);
  assert.ok(verticals.some(segment => onSegment(start, segment)), 'width starts on a ribbon boundary');
  assert.ok(verticals.some(segment => onSegment(end, segment)), 'width ends on the next ribbon boundary');
  const neighboringCoordinates = [...new Set(verticals.map(([a]) => a[0]))].sort((a, b) => a - b);
  for (let i = 1; i < neighboringCoordinates.length; i++) close(millimetres(neighboringCoordinates[i] - neighboringCoordinates[i - 1]), 7);
});

test('45 degree spacing is measured perpendicular to two adjacent rendered lines', () => {
  const family = all(rendered(4), node => node.name === 'g' && /-sector-0\)/.test(node.attrs['clip-path'] || ''))[0];
  const lines = paths(family).map(path => pathPoints(path.attrs.d));
  const [start, end] = pathPoints(paths(byClass(rendered(4), 'lkpd-pattern-dimension')[0])[0].attrs.d);
  const displacement = [end[0] - start[0], end[1] - start[1]];
  close(millimetres(distance(start, end)), 7);
  const selected = [start, end].map(point => lines.findIndex(([a, b]) => {
    const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
    return Math.abs(cross) < .001 && onSegment(point, [a, b]);
  }));
  assert.ok(selected.every(index => index >= 0), 'both arrow tips lie on actual lines');
  assert.equal(Math.abs(selected[0] - selected[1]), 1, 'the dimension spans adjacent lines');
  const [a, b] = lines[selected[0]];
  const direction = [b[0] - a[0], b[1] - a[1]];
  close(direction[1] / direction[0], 1);
  close(direction[0] * displacement[0] + direction[1] * displacement[1], 0, .001);
  close(millimetres(geometry.diagonalInterceptPitch / Math.sqrt(2)), 7);
});

test('hexagon contours have 7 mm sides and both horizontal dimensions span 7 mm', () => {
  close(hex.physicalBoxMm / hex.box, geometry.millimetresPerUnit);
  const vertices = getHexagonVertices(80, 80);
  for (let i = 0; i < vertices.length; i++) close(millimetres(distance(vertices[i], vertices[(i + 1) % vertices.length])), 7);
  const segments = getHexPatternSegments();
  const keys = segments.map(({ start, end }) => [start.join(','), end.join(',')].sort().join('|'));
  assert.equal(new Set(keys).size, keys.length, 'shared contours occur once');
  segments.forEach(({ start, end }) => close(millimetres(distance(start, end)), 7));
  const tree = rendered(5);
  const intervals = all(tree, node => node.attrs['data-hex-dimension']);
  assert.equal(intervals.length, 2);
  intervals.forEach(interval => {
    const [start, end] = pathPoints(paths(interval)[0].attrs.d);
    close(start[1], end[1]);
    close(millimetres(distance(start, end)), 7);
    assert.equal(interval.attrs['data-hex-dimension'], '7');
  });
  const contours = paths(byClass(tree, 'lkpd-hex-contours')[0])[0];
  const points = pathPoints(contours.attrs.d);
  for (let i = 0; i < points.length; i += 2) close(millimetres(distance(points[i], points[i + 1])), 7, .00005);
});

test('arc gaps and dimension endpoints are radial 7 mm intervals; envelopes reach center', () => {
  close(arc.millimetresPerUnit, geometry.millimetresPerUnit);
  close(millimetres(arc.radiusStep), 7);
  const tree = rendered(6);
  const circles = all(tree, node => node.name === 'circle');
  for (const [x, y] of arc.corners) {
    const family = circles.filter(circle => Number(circle.attrs.cx) === x && Number(circle.attrs.cy) === y);
    const radii = family.map(circle => Number(circle.attrs.r)).sort((a, b) => a - b);
    assert.ok(radii.length > 2);
    for (let i = 1; i < radii.length; i++) close(millimetres(radii[i] - radii[i - 1]), 7);
    close(distance([x, y], arc.center), radii.at(-1));
  }
  const { innerPoint, outerPoint, innerRadius, outerRadius, corner } = arc.dimension;
  close(millimetres(distance(innerPoint, outerPoint)), 7);
  close(distance(arc.corners[corner], innerPoint), innerRadius);
  close(distance(arc.corners[corner], outerPoint), outerRadius);
  const arrows = paths(byClass(tree, 'lkpd-pattern-dimension')[0]);
  const renderedInner = pathPoints(arrows[1].attrs.d)[1];
  const renderedOuter = pathPoints(arrows[2].attrs.d)[1];
  close(distance(renderedInner, innerPoint), 0);
  close(distance(renderedOuter, outerPoint), 0);
  const clips = all(tree, node => node.name === 'clipPath' && /-arc-family-/.test(node.attrs.id || ''));
  assert.equal(clips.length, 4);
  clips.forEach(clip => {
    assert.equal(all(clip, node => node.name === 'rect').length, 0, 'arc families use curved envelopes');
    assert.match(paths(clip)[0].attrs.d, /A[^A]*100 100A/);
  });
  assert.ok(!paths(tree).some(path => path.attrs.d === 'M100 0V200M0 100H200'), 'there is no central cross divider');
});

test('all six examples and hero coexist with unique IDs and resolving clip/title references', () => {
  const examples = Array.from({ length: 6 }, (_, index) => createLkpdPattern(index + 1));
  const tree = svgTree(`<g>${examples.join('')}${createLkpdHero()}${examples.map((_, index) => createLkpdPattern(index + 1)).join('')}</g>`);
  const identified = all(tree, node => node.attrs.id);
  const ids = new Map(identified.map(node => [node.attrs.id, node]));
  assert.equal(ids.size, identified.length, 'instance IDs must not collide');
  all(tree).forEach(node => {
    for (const value of Object.values(node.attrs)) for (const reference of value.matchAll(/url\(#([^)]*)\)/g)) {
      assert.equal(ids.get(reference[1])?.name, 'clipPath', `unresolved clip ${reference[1]}`);
    }
    if (node.attrs['aria-labelledby']) for (const id of node.attrs['aria-labelledby'].split(/\s+/)) assert.equal(ids.get(id)?.name, 'title');
  });
});

test('dimension text contains only the corrected 7 and 3,5 labels', () => {
  const expected = [['3,5'], ['3,5'], ['7'], ['7'], ['7', '7'], ['7']];
  for (let id = 1; id <= 6; id++) assert.deepEqual(texts(rendered(id)), expected[id - 1]);
});

test('the paper preserves six keyboard-accessible guide buttons and safely displays identity', () => {
  const sheet = createLkpdDrawingSheet({ patterns: LKPD_PATTERNS, interactive: true, payload: { name: '<img src=x>', className: 'X TP 1' } });
  const tree = svgTree(sheet);
  const buttons = all(tree, node => node.name === 'button');
  assert.equal(buttons.length, 6);
  assert.deepEqual(buttons.map(button => Number(button.attrs['data-pattern'])), [1, 2, 3, 4, 5, 6]);
  buttons.forEach(button => {
    assert.equal(button.attrs.type, 'button');
    assert.equal(button.attrs['aria-haspopup'], 'dialog');
    assert.ok(button.attrs['aria-label'].includes('cara pengerjaan'));
    const svg = all(button, node => node.name === 'svg')[0];
    assert.equal(svg.attrs.viewBox, '0 0 200 200', 'paper squares use the measured drawing bounds');
  });
  assert.ok(sheet.includes('&lt;img src=x&gt;'));
  assert.equal(all(tree, node => node.name === 'img').length, 0);
});
