const SIZE = 200;
const RADIUS_STEP = 20;
const ENVELOPE_RADIUS = SIZE / Math.sqrt(2);
const MM_PER_UNIT = 70 / SIZE;
const CORNERS = [[0, 0], [SIZE, 0], [SIZE, SIZE], [0, SIZE]];
const RADII = Array.from({ length: 7 }, (_, index) => ENVELOPE_RADIUS - (6 - index) * RADIUS_STEP);
const DIMENSION_ANGLE = -70 * Math.PI / 180;
const radial = [Math.cos(DIMENSION_ANGLE), Math.sin(DIMENSION_ANGLE)];
const dimensionPoint = radius => [radius * radial[0], SIZE + radius * radial[1]];
const innerPoint = dimensionPoint(ENVELOPE_RADIUS - RADIUS_STEP);
const outerPoint = dimensionPoint(ENVELOPE_RADIUS);

/** Illustration units map to a 70 mm worksheet square; 20 units are 7 mm. */
export const ARC_PATTERN_GEOMETRY = Object.freeze({
  size: SIZE,
  millimetresPerUnit: MM_PER_UNIT,
  radiusStep: RADIUS_STEP,
  stepMillimetres: RADIUS_STEP * MM_PER_UNIT,
  envelopeRadius: ENVELOPE_RADIUS,
  radii: Object.freeze(RADII),
  corners: Object.freeze(CORNERS.map(point => Object.freeze(point))),
  center: Object.freeze([SIZE / 2, SIZE / 2]),
  edgeTransitions: Object.freeze([
    [ENVELOPE_RADIUS, 0], [SIZE, ENVELOPE_RADIUS],
    [SIZE - ENVELOPE_RADIUS, SIZE], [0, SIZE - ENVELOPE_RADIUS]
  ].map(point => Object.freeze(point))),
  dimension: Object.freeze({
    corner: 3,
    angleDegrees: -70,
    innerRadius: ENVELOPE_RADIUS - RADIUS_STEP,
    outerRadius: ENVELOPE_RADIUS,
    innerPoint: Object.freeze(innerPoint),
    outerPoint: Object.freeze(outerPoint),
    illustrationDistance: RADIUS_STEP,
    millimetres: RADIUS_STEP * MM_PER_UNIT,
    label: '7'
  })
});

const number = value => Number(value.toFixed(6)).toString();
const point = values => values.map(number).join(' ');

function arrow(tip, sign) {
  const normal = [-radial[1], radial[0]];
  const base = tip.map((coordinate, axis) => coordinate + sign * radial[axis] * 2.7);
  const left = base.map((coordinate, axis) => coordinate + normal[axis] * .95);
  const right = base.map((coordinate, axis) => coordinate - normal[axis] * .95);
  return `<path d="M${point(left)}L${point(tip)}L${point(right)}"/>`;
}

/**
 * Four concentric quarter-circle families meet along curved envelopes.
 * The 100√2 envelope reaches the exact square center; each neighboring family
 * clips against that envelope instead of a rectangular quadrant or cross.
 * Returns only the SVG contents, for the caller's 0..200 square and border.
 */
export function createArcPattern(prefix) {
  const id = String(prefix || 'lkpd-arcs').replace(/[^a-zA-Z0-9_-]/g, '-');
  const radius = number(ENVELOPE_RADIUS);
  const transition = number(SIZE - ENVELOPE_RADIUS);
  const region = `M0 0H${radius}A${radius} ${radius} 0 0 1 100 100A${radius} ${radius} 0 0 0 0 ${transition}Z`;
  const defs = CORNERS.map((_, index) => `<clipPath id="${id}-arc-family-${index}" clipPathUnits="userSpaceOnUse"><path d="${region}" transform="rotate(${index * 90} 100 100)"/></clipPath>`).join('');
  const families = CORNERS.map(([x, y], index) => `<g clip-path="url(#${id}-arc-family-${index})">${RADII.map(r => `<circle cx="${x}" cy="${y}" r="${number(r)}"/>`).join('')}</g>`).join('');
  const normal = [-radial[1], radial[0]];
  const labelPosition = innerPoint.map((coordinate, axis) => (coordinate + outerPoint[axis]) / 2 - normal[axis] * 4.25);
  const dimension = `<g class="lkpd-pattern-dimension" stroke-width=".8">
    <path d="M${point(innerPoint)}L${point(outerPoint)}"/>
    ${arrow(innerPoint, 1)}${arrow(outerPoint, -1)}
    <text transform="translate(${point(labelPosition)}) rotate(-70)" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="8" fill="#000" stroke="none">7</text>
  </g>`;
  return `<defs>${defs}</defs><g fill="none" stroke-width="1.6">${families}</g>${dimension}`;
}
