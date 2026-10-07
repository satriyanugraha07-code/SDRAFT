// Scene units represent centimetres. The separation is measured normal to the lines.
export function triangleMeasurement(angleDegrees, spacingCm) {
  const angle = angleDegrees * Math.PI / 180;
  const direction = [Math.cos(angle), Math.sin(angle)];
  const normal = [direction[1], -direction[0]];
  const slide = spacingCm / direction[1];
  return { direction, normal, slide, startReading: 1, endReading: 1 + slide };
}
