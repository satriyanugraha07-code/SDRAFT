import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_VIEW_PRESETS as views, createModelOrbitMatrix } from '../src/model3d-camera.js';

const close = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const BASIS = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const transform = (matrix, point) => [0, 1, 2].map(row =>
  point.reduce((sum, coordinate, column) => sum + matrix[column * 4 + row] * coordinate, matrix[12 + row])
);
const matrixFor = name => createModelOrbitMatrix(views[name].yaw, views[name].pitch);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

test('initial isometric view gives three equal foreshortenings and 120 degree projected axes', () => {
  const matrix = matrixFor('isometric');
  const projected = BASIS.map(axis => transform(matrix, axis).slice(0, 2));
  const lengths = projected.map(axis => Math.hypot(...axis));
  lengths.forEach(length => close(length, Math.sqrt(2 / 3)));
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const angle = Math.acos(dot(projected[i], projected[j]) / (lengths[i] * lengths[j]));
    close(angle * 180 / Math.PI, 120, .00002);
  }
  close(projected[1][0], 0);
  assert.ok(projected[1][1] > 0, 'model vertical axis points upward');
});

test('orbit keeps Y vertical on screen over yaw changes and legal pitch angles', () => {
  for (const yaw of [-Math.PI, -2.1, -.8, 0, .3, 1.7, Math.PI]) {
    for (const pitch of [-Math.PI / 2, -1.1, -.35, 0, .6, 1.3, Math.PI / 2]) {
      const vertical = transform(createModelOrbitMatrix(yaw, pitch), BASIS[1]);
      close(vertical[0], 0);
      assert.ok(vertical[1] >= -1e-7, 'yaw does not tip the vertical axis sideways or upside down');
      close(Math.hypot(...vertical), 1);
    }
  }
});

test('all presets and free orbits preserve distances, handedness, and homogeneous coordinates', () => {
  const configurations = [
    ...Object.values(views),
    ...[-2.6, -.4, .75, 2.2].flatMap(yaw => [-1.2, -.5, .8, 1.4].map(pitch => ({ yaw, pitch })))
  ];
  const a = [-21, 43, 65], b = [84, -12, 11];
  for (const { yaw, pitch } of configurations) {
    const matrix = createModelOrbitMatrix(yaw, pitch);
    const axes = BASIS.map(axis => transform(matrix, axis));
    axes.forEach(axis => close(Math.hypot(...axis), 1));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) close(dot(axes[i], axes[j]), 0);
    close(dot(axes[0], cross(axes[1], axes[2])), 1);
    close(Math.hypot(...transform(matrix, a).map((value, index) => value - transform(matrix, b)[index])), Math.hypot(...a.map((value, index) => value - b[index])), .00002);
    assert.deepEqual([matrix[3], matrix[7], matrix[11], matrix[15]], [0, 0, 0, 1]);
    assert.deepEqual([matrix[12], matrix[13], matrix[14]], [0, 0, 0]);
  }
});

test('actual model lug lies left and above the foot in the initial reference orientation', () => {
  const stl = readFileSync(new URL('../public/models/solidworks-library/job-kelas-extrim.stl', import.meta.url));
  const triangleCount = stl.readUInt32LE(80);
  assert.equal(stl.length, 84 + triangleCount * 50, 'binary STL body is complete');
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    for (let vertex = 0; vertex < 3; vertex++) for (let axis = 0; axis < 3; axis++) {
      const coordinate = stl.readFloatLE(84 + triangle * 50 + 12 + vertex * 12 + axis * 4);
      minimum[axis] = Math.min(minimum[axis], coordinate);
      maximum[axis] = Math.max(maximum[axis], coordinate);
    }
  }
  const center = minimum.map((value, index) => (value + maximum[index]) / 2);
  const centered = point => point.map((coordinate, axis) => coordinate - center[axis]);
  const matrix = matrixFor('isometric');
  const lug = transform(matrix, centered([20, 20, 40]));
  const foot = transform(matrix, centered([210, 30, 40]));
  assert.ok(lug[0] < 0 && foot[0] > 0, 'round lug left; solid foot right');
  assert.ok(lug[1] > foot[1], 'round lug above the solid foot in screen coordinates');
  assert.ok(lug[2] < foot[2], 'the right foot is nearer the camera, matching the reference');
});

test('six orthographic presets collapse their viewing axis and preserve expected front orientation', () => {
  const expected = {
    front: { viewing: [0, 0, 1], horizontal: [1, 0, 0], vertical: [0, 1, 0] },
    back: { viewing: [0, 0, -1], horizontal: [-1, 0, 0], vertical: [0, 1, 0] },
    right: { viewing: [1, 0, 0], horizontal: [0, 0, -1], vertical: [0, 1, 0] },
    left: { viewing: [-1, 0, 0], horizontal: [0, 0, 1], vertical: [0, 1, 0] },
    top: { viewing: [0, 1, 0], horizontal: [1, 0, 0], vertical: [0, 0, -1] },
    bottom: { viewing: [0, -1, 0], horizontal: [1, 0, 0], vertical: [0, 0, 1] }
  };
  for (const [name, { viewing, horizontal, vertical }] of Object.entries(expected)) {
    const matrix = matrixFor(name);
    const depthAxis = transform(matrix, viewing);
    close(depthAxis[0], 0); close(depthAxis[1], 0); close(depthAxis[2], 1);
    const right = transform(matrix, horizontal), up = transform(matrix, vertical);
    right.forEach((value, axis) => close(value, BASIS[0][axis]));
    up.forEach((value, axis) => close(value, BASIS[1][axis]));
  }
  const front = matrixFor('front');
  const sample = [23, 51, -17];
  assert.deepEqual(transform(front, sample), sample);
});
