import test from 'node:test';
import assert from 'node:assert/strict';
import { triangleMeasurement } from '../src/instruments-geometry.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('10 mm parallel spacing needs different guide travel at each angle', () => {
  for (const [angle, expected] of [[30, 2], [45, Math.SQRT2], [60, 2 / Math.sqrt(3)], [90, 1]]) {
    const measure = triangleMeasurement(angle, 1);
    close(measure.slide, expected);
    close(measure.endReading - measure.startReading, expected);
  }
});

test('normal measuring ruler joins both finite parallel lines for every selectable setting', () => {
  for (const angle of [30, 45, 60, 90]) {
    for (let millimetres = 5; millimetres <= 10; millimetres++) {
      const spacing = millimetres / 10;
      const { direction: u, normal: n, slide } = triangleMeasurement(angle, spacing);
      close(u[0] * n[0] + u[1] * n[1], 0);
      // Line 2 is line 1 translated horizontally by slide; their normal distance is spacing.
      close(slide * n[0], spacing);
      const start = u.map(component => component * 2.45);
      const end = start.map((component, i) => component + n[i] * spacing);
      const relative = [end[0] - slide, end[1]];
      close(relative[0] * n[0] + relative[1] * n[1], 0);
      const secondLinePosition = relative[0] * u[0] + relative[1] * u[1];
      assert.ok(secondLinePosition >= 0 && secondLinePosition <= 4.1);
      // The moving base retains contact with the 3.8 cm guide, whose right end is at 2.8.
      assert.ok(slide < 2.8);
    }
  }
});
