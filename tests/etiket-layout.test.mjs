import test from 'node:test';
import assert from 'node:assert/strict';
import { ETIKET_TEMPLATES, createEtiketDrawing, createEtiketThumbnail, createEtiketHero, fitEtiketFont } from '../src/etiket-drawing.js';

function svgTree(svg) {
  const root = { name: 'document', attributes: {}, children: [] };
  const stack = [root];
  const expression = /<(\/?)([\w:-]+)([^>]*)>/g;
  let lastEnd = 0;
  for (const match of svg.matchAll(expression)) {
    stack.at(-1).text = (stack.at(-1).text || '') + svg.slice(lastEnd, match.index);
    lastEnd = match.index + match[0].length;
    if (match[1]) { assert.equal(stack.pop().name, match[2]); continue; }
    const attributes = [...match[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]]);
    assert.equal(new Set(attributes.map(([name]) => name)).size, attributes.length, 'no duplicated SVG attributes');
    const node = { name: match[2], attributes: Object.fromEntries(attributes), children: [] };
    stack.at(-1).children.push(node);
    if (!match[3].trimEnd().endsWith('/')) stack.push(node);
  }
  assert.equal(stack.length, 1);
  return root;
}
const nodes = (node, predicate = () => true) => [node, ...node.children.flatMap(child => nodes(child))].filter(predicate);
const fieldNodes = svg => nodes(svgTree(svg), node => node.attributes['data-etiket-field']);
const rootSvg = svg => nodes(svgTree(svg), node => node.name === 'svg')[0];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < .001, `${actual} != ${expected}`);

test('both reference layouts retain their true size and arithmetic dimension chains', () => {
  for (const [id, template] of Object.entries(ETIKET_TEMPLATES)) {
    assert.equal(template.id, id);
    assert.equal(template.width, 185);
    assert.equal(template.columns.reduce((sum, size) => sum + size, 0), template.width);
    assert.equal(template.rows.reduce((sum, size) => sum + size, 0), template.height);
    for (const box of Object.values(template.fields)) {
      assert.ok(box.width > 0 && box.height > 0);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= template.width && box.y + box.height <= template.height);
    }
  }
  assert.equal(ETIKET_TEMPLATES.detail.height, 68);
  assert.equal(ETIKET_TEMPLATES.ringkas.height, 30);
  assert.deepEqual(ETIKET_TEMPLATES.detail.columns, [21, 64, 16, 30, 30, 24]);
  assert.deepEqual(ETIKET_TEMPLATES.ringkas.columns, [30, 40, 64, 35, 16]);
  assert.equal(ETIKET_TEMPLATES.detail.fields.notes.label, 'Keterangan');
  assert.equal(Object.hasOwn(ETIKET_TEMPLATES.detail.fields, 'className'), false);
  assert.equal(ETIKET_TEMPLATES.ringkas.fields.className.label, 'Kelas');
});

test('dimensioned drawings keep the complete table and measurement graphics inside the view box', () => {
  for (const id of Object.keys(ETIKET_TEMPLATES)) {
    const svg = svgTree(createEtiketDrawing(id));
    const root = nodes(svg, node => node.name === 'svg')[0];
    const [x, y, width, height] = root.attributes.viewBox.split(' ').map(Number);
    const table = ETIKET_TEMPLATES[id];
    assert.ok(x < 0 && y < -12 && x + width > 200 && y + height >= table.height + 16);
    const grid = nodes(svg, node => node.attributes.class === 'etiket-grid')[0];
    const frame = grid.children.find(node => node.name === 'rect');
    assert.equal(Number(frame.attributes.width), table.width);
    assert.equal(Number(frame.attributes.height), table.height);
    const dimensions = nodes(svg, node => node.attributes.class === 'etiket-dimensions')[0];
    const measured = nodes(dimensions, node => node.attributes['marker-start']).map(node => {
      const coordinates = [...node.attributes.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
      return Math.hypot(coordinates[2] - coordinates[0], coordinates[3] - coordinates[1]);
    });
    table.columns.forEach(size => assert.ok(measured.some(value => Math.abs(value - size) < .001)));
    assert.ok(measured.includes(185));
  }
});

test('print and SVG exports use the exact 185 mm table dimensions without interaction hotspots', () => {
  for (const [id, table] of Object.entries(ETIKET_TEMPLATES)) {
    const svg = createEtiketDrawing(id, {}, { dimensions: false, interactive: false });
    const root = rootSvg(svg);
    assert.equal(root.attributes.viewBox, `0 0 185 ${table.height}`);
    assert.equal(root.attributes.width, '185mm');
    assert.equal(root.attributes.height, `${table.height}mm`);
    assert.doesNotMatch(svg, /role="button"|tabindex=|etiket-field-hit|etiket-dimensions/);
  }
});

test('every editable field has a keyboard target and exact transparent hit geometry below the grid', () => {
  for (const [id, table] of Object.entries(ETIKET_TEMPLATES)) {
    const svg = createEtiketDrawing(id);
    const fields = fieldNodes(svg);
    assert.deepEqual(fields.map(node => node.attributes['data-etiket-field']).sort(), Object.keys(table.fields).sort());
    for (const node of fields) {
      const key = node.attributes['data-etiket-field'];
      assert.equal(node.attributes.role, 'button');
      assert.equal(node.attributes.tabindex, '0');
      assert.ok(node.attributes['aria-label'].startsWith(table.fields[key].label));
      const hit = node.children[0];
      assert.equal(hit.attributes.fill, 'transparent');
      assert.equal(hit.attributes.stroke, 'none');
      for (const dimension of ['x', 'y', 'width', 'height']) close(Number(hit.attributes[dimension]), table.fields[key][dimension]);
    }
    assert.ok(svg.indexOf('class="etiket-field"') < svg.indexOf('class="etiket-grid"'));
  }
});

test('school naming uses SMK and text values cannot introduce SVG markup or attributes', () => {
  const payload = '<script>alert("test")</script> & "onload="x"';
  for (const id of Object.keys(ETIKET_TEMPLATES)) {
    const svg = createEtiketDrawing(id, { school: 'UNIVERSITAS contoh', title: payload, drawnBy: payload });
    assert.doesNotMatch(svg, /UNIVERSITAS|<script>|onload="x"/i);
    assert.match(svg, /SMK contoh/);
    assert.match(svg, /&lt;script&gt;/);
    assert.match(svg, /&quot;/);
    svgTree(svg);
  }
  assert.match(createEtiketDrawing('detail', { school: 'TEKNIK 2' }), /SMK TEKNIK 2/);
  assert.match(createEtiketDrawing('detail'), /SMK NAMA SEKOLAH/);
  assert.doesNotMatch(createEtiketDrawing('detail'), /SMK NEGERI 1/);
});

test('the detailed Keterangan cell uses the note value while the compact class cell uses the class', () => {
  const values = { notes: 'Catatan khusus', className: 'X TKR' };
  const detailed = fieldNodes(createEtiketDrawing('detail', values));
  const note = detailed.find(node => node.attributes['data-etiket-field'] === 'notes');
  assert.ok(note.children.some(node => node.name === 'text' && node.text === 'Catatan khusus'));
  assert.equal(detailed.some(node => node.attributes['data-etiket-field'] === 'className'), false);
  const compact = fieldNodes(createEtiketDrawing('ringkas', values));
  const classField = compact.find(node => node.attributes['data-etiket-field'] === 'className');
  assert.ok(classField.children.some(node => node.name === 'text' && node.text === 'Kelas: X TKR'));
});

test('long names and titles stay within their cells by fitting size and final text length', () => {
  const normal = fitEtiketFont('Siswa', 12, 5.5, 2.6);
  const long = fitEtiketFont('Nama siswa yang sangat panjang', 12, 5.5, 2.6);
  assert.ok(long < normal && long > 0);
  const svg = createEtiketDrawing('detail', { title: 'M'.repeat(1000), drawnBy: 'M'.repeat(1000) });
  const title = fieldNodes(svg).find(node => node.attributes['data-etiket-field'] === 'title');
  const drawing = fieldNodes(svg).find(node => node.attributes['data-etiket-field'] === 'drawnBy');
  for (const [node, available] of [[title, 96], [drawing, 12]]) {
    const text = node.children.find(child => child.name === 'text');
    assert.ok(Number(text.attributes.textLength) <= available);
    assert.equal(text.attributes.lengthAdjust, 'spacingAndGlyphs');
  }
});

test('projection symbols keep the frustum direction and move the ring according to ISO 5456-2', () => {
  for (const [projection, ringX, coneLeft] of [['first', 20.5, 4], ['third', 9, 15]]) {
    const svg = svgTree(createEtiketDrawing('ringkas', { projection }));
    const group = nodes(svg, node => node.attributes.class === 'etiket-projection-symbol')[0];
    assert.equal(group.attributes['data-projection'], projection);
    const rings = group.children.filter(node => node.name === 'circle');
    assert.equal(rings.length, 2);
    rings.forEach(ring => assert.equal(Number(ring.attributes.cx), ringX));
    const cone = group.children.find(node => node.name === 'path');
    assert.ok(cone.attributes.d.startsWith(`M${coneLeft} 8.5`));
    assert.equal(ETIKET_TEMPLATES.ringkas.fields.projection.width, 30);
  }
});

test('combined hero, thumbnails, and main examples have unique resolvable SVG IDs', () => {
  const combined = svgTree(createEtiketDrawing('detail') + createEtiketDrawing('ringkas') + createEtiketThumbnail('detail') + createEtiketThumbnail('ringkas') + createEtiketHero());
  const ids = nodes(combined, node => node.attributes.id).map(node => node.attributes.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const node of nodes(combined)) {
    for (const value of Object.values(node.attributes)) for (const reference of value.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(reference[1]));
    for (const reference of (node.attributes['aria-labelledby'] || '').split(' ').filter(Boolean)) assert.ok(ids.includes(reference));
  }
});
