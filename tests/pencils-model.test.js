import test from 'node:test';
import assert from 'node:assert/strict';
import { pencilGrades, pencilById, pressures, strokeAppearance, paperEffects } from '../src/pencils-data.js';

const pressureIds = Object.keys(pressures);
const gradeOrder = ['2h', 'h', 'hb', 'b', '2b'].map(id => pencilById[id]);

test('the displayed comparison gets strictly wider from 2H to 2B at equal pressure', () => {
  for (const pressure of pressureIds) {
    const widths = gradeOrder.map(grade => strokeAppearance(grade, pressure).strokeWidth);
    for (let i = 1; i < widths.length; i++) assert.ok(widths[i] > widths[i - 1]);
  }
});

test('each demonstrated line keeps the same width from start to end', () => {
  for (const grade of pencilGrades) {
    for (const pressure of pressureIds) {
      const { strokeWidth, endWidth } = strokeAppearance(grade, pressure);
      assert.equal(endWidth, strokeWidth, `${grade.id} at ${pressure} pressure must not taper`);
    }
  }
});

test('increasing pressure widens the displayed line for each grade', () => {
  for (const grade of pencilGrades) {
    const widths = ['light', 'medium', 'firm'].map(pressure => strokeAppearance(grade, pressure).strokeWidth);
    assert.ok(widths[0] < widths[1], grade.id);
    assert.ok(widths[1] < widths[2], grade.id);
  }
});

test('hard graphite alone does not create a paper groove in a light stroke', () => {
  for (const grade of [pencilById['2h'], pencilById.h]) {
    const light = paperEffects(grade, 'light');
    const firm = paperEffects(grade, 'firm');
    assert.equal(light.indentation, 0);
    assert.ok(firm.indentation > light.indentation);
  }
});

test('remaining graphite and paper indentation are distinct correction effects', () => {
  const hard = paperEffects(pencilById['2h'], 'firm');
  const soft = paperEffects(pencilById['2b'], 'firm');
  const softLight = paperEffects(pencilById['2b'], 'light');
  assert.ok(hard.indentation > soft.indentation);
  assert.ok(hard.eraseResidue < soft.eraseResidue);
  assert.equal(softLight.indentation, 0);
  assert.ok(softLight.eraseResidue > 0);
  assert.ok(soft.eraseResidue > softLight.eraseResidue);
});

test('every selectable combination stays finite and within normalized rendering bounds', () => {
  for (const grade of pencilGrades) {
    for (const pressure of pressureIds) {
      const { strokeWidth, endWidth } = strokeAppearance(grade, pressure);
      const { indentation, eraseResidue } = paperEffects(grade, pressure);
      for (const value of [strokeWidth, endWidth, indentation, eraseResidue]) {
        assert.ok(Number.isFinite(value));
        assert.ok(value >= 0 && value <= 1);
      }
      assert.ok(strokeWidth > 0);
    }
  }
});
