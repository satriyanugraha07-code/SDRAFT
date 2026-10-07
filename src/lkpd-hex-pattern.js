const SIDE = 20;
const HALF_HEIGHT = SIDE * Math.sqrt(3) / 2;
const BOX = 200;
const ROW_ORIGIN = -4;
const number = value => Number(value.toFixed(4));

/** Illustration coordinates: a 70 mm square, with each 7 mm step drawn as 20 units. */
export const HEX_PATTERN_GEOMETRY = Object.freeze({
  box: BOX,
  physicalBoxMm: 70,
  spacingMm: 7,
  unitsPerMm: SIDE / 7,
  side: SIDE,
  rowRise: HALF_HEIGHT,
  rowOrigin: ROW_ORIGIN,
  columnPitch: SIDE * 1.5,
  thinWidth: .55,
  thickWidth: 1.6,
  dimensions: Object.freeze([
    Object.freeze({ x1: 60, x2: 80, anchorY: ROW_ORIGIN + HALF_HEIGHT * 4, lineY: ROW_ORIGIN + HALF_HEIGHT * 4 + 9, value: 7 }),
    Object.freeze({ x1: 80, x2: 100, anchorY: ROW_ORIGIN + HALF_HEIGHT * 4, lineY: ROW_ORIGIN + HALF_HEIGHT * 4 + 9, value: 7 })
  ])
});

/** Flat-topped regular hexagons sit on the same equilateral lattice as the fine lines. */
export function getHexagonVertices(cx, cy, side = SIDE) {
  const rise = side * Math.sqrt(3) / 2;
  return [
    [cx - side, cy], [cx - side / 2, cy - rise],
    [cx + side / 2, cy - rise], [cx + side, cy],
    [cx + side / 2, cy + rise], [cx - side / 2, cy + rise]
  ];
}

/** Return each shared contour once, so adjoining cells do not double the stroke. */
export function getHexPatternSegments() {
  const edges = new Map();
  const key = point => `${number(point[0])},${number(point[1])}`;
  for (let column = -1; column <= 7; column++) {
    for (let row = -1; row <= 6; row++) {
      const cx = SIDE / 2 + column * SIDE * 1.5;
      const cy = ROW_ORIGIN + HALF_HEIGHT + row * HALF_HEIGHT * 2 + (Math.abs(column) % 2) * HALF_HEIGHT;
      const vertices = getHexagonVertices(cx, cy);
      vertices.forEach((start, index) => {
        const end = vertices[(index + 1) % 6];
        const a = key(start);
        const b = key(end);
        const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edges.has(edgeKey)) edges.set(edgeKey, { start, end });
      });
    }
  }
  return [...edges.values()];
}

function fineLattice(edges) {
  // The reference has an X inside each cell. Horizontal construction segments
  // coincide with the hexagon sides rather than crossing the cell centres.
  const paths = edges.filter(({ start, end }) => Math.abs(start[1] - end[1]) < 1e-9)
    .map(({ start, end }) => `M${number(start[0])} ${number(start[1])}L${number(end[0])} ${number(end[1])}`);
  const run = (BOX - ROW_ORIGIN) / Math.sqrt(3);
  for (let x = -120; x <= 320; x += SIDE) {
    paths.push(`M${x} ${ROW_ORIGIN}L${number(x + run)} ${BOX}`);
    paths.push(`M${x} ${ROW_ORIGIN}L${number(x - run)} ${BOX}`);
  }
  return paths.join(' ');
}

function dimensions() {
  const { dimensions: intervals } = HEX_PATTERN_GEOMETRY;
  const y = intervals[0].lineY;
  const arrowLength = 2.6;
  const arrowHalfHeight = .9;
  const extensions = [...new Set(intervals.flatMap(interval => [interval.x1, interval.x2]))];
  const extensionLines = extensions.map(x => `<path d="M${x} ${number(intervals[0].anchorY + 1.1)}V${number(y + 2.5)}"/>`).join('');
  const spans = intervals.map(({ x1, x2, value }) => {
    const center = (x1 + x2) / 2;
    return `<g data-hex-dimension="${value}" data-dimension-start="${x1}" data-dimension-end="${x2}">
      <path d="M${x1} ${number(y)}H${x2}"/>
      <path d="M${x1} ${number(y)}L${number(x1 + arrowLength)} ${number(y - arrowHalfHeight)}V${number(y + arrowHalfHeight)}Z M${x2} ${number(y)}L${number(x2 - arrowLength)} ${number(y - arrowHalfHeight)}V${number(y + arrowHalfHeight)}Z" fill="#142b38" stroke="none"/>
      <rect x="${number(center - 3.25)}" y="${number(y - 7.6)}" width="6.5" height="6.15" fill="#fff" stroke="none"/>
      <text x="${center}" y="${number(y - 2)}" text-anchor="middle" fill="#142b38" stroke="none" font-family="Arial, sans-serif" font-size="5.8" font-weight="400">${value}</text>
    </g>`;
  }).join('');
  return `<g class="lkpd-pattern-dimensions" fill="none" stroke-width=".55">${extensionLines}${spans}</g>`;
}

let sequence = 0;

/** SVG contents only; the caller supplies the outer square, colour and accessible title. */
export function createHexPattern(prefix) {
  const safePrefix = String(prefix ?? `lkpd-hex-${++sequence}`).replace(/[^a-zA-Z0-9_-]/g, '-');
  const clipId = `${safePrefix}-hex-square`;
  const edges = getHexPatternSegments();
  const contours = edges.map(({ start, end }) =>
    `M${number(start[0])} ${number(start[1])}L${number(end[0])} ${number(end[1])}`
  ).join(' ');
  return `<defs><clipPath id="${clipId}"><rect width="${BOX}" height="${BOX}"/></clipPath></defs>
    <g clip-path="url(#${clipId})" fill="none" stroke-linecap="butt" stroke-linejoin="miter">
      <path class="lkpd-hex-lattice" d="${fineLattice(edges)}" stroke-width=".55"/>
      <path class="lkpd-hex-contours" d="${contours}" stroke-width="1.6"/>
      ${dimensions()}
    </g>`;
}
