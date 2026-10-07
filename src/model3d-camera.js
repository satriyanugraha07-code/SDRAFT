const ISOMETRIC_PITCH = Math.asin(1 / Math.sqrt(3));

export const MODEL_VIEW_PRESETS = Object.freeze({
  isometric: Object.freeze({ yaw: -Math.PI / 4, pitch: ISOMETRIC_PITCH }),
  front: Object.freeze({ yaw: 0, pitch: 0 }),
  top: Object.freeze({ yaw: 0, pitch: Math.PI / 2 }),
  right: Object.freeze({ yaw: -Math.PI / 2, pitch: 0 }),
  left: Object.freeze({ yaw: Math.PI / 2, pitch: 0 }),
  back: Object.freeze({ yaw: Math.PI, pitch: 0 }),
  bottom: Object.freeze({ yaw: 0, pitch: -Math.PI / 2 })
});

/** Column-major Rx(pitch) × Ry(yaw): orbit around the model's upright Y axis. */
export function createModelOrbitMatrix(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return new Float32Array([
    cy, sp * sy, -cp * sy, 0,
    0, cp, sp, 0,
    sy, -sp * cy, cp * cy, 0,
    0, 0, 0, 1
  ]);
}
