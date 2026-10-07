// Illustrative technical-drawing examples, not measured ISO line widths or
// a claim that a graphite grade alone guarantees a physical line width.
// Hard pencil + excessive pressure can groove paper: https://files.eric.ed.gov/fulltext/ED249090.pdf
// Light initial lines are easier to correct: https://openoregon.pressbooks.pub/drawing/part/chapter-1/
export const pencilGrades = [
  { id: '2h', name: '2H', barrel: '#3899c7', soft: '#e4f7fd', accent: '#1588ae', graphite: '#3f474f', character: 'Keras', lineTrait: 'Garis sangat tipis', width: .025, hardness: .95, residue: .035, use: 'Garis bantu dan konstruksi yang halus sebelum garis utama dibuat.', description: 'Dalam contoh gambar teknik ini, 2H menghasilkan garis paling tipis. Grafitnya keras; gunakan tekanan ringan supaya kertas tetap bersih dan garis mudah dikoreksi.', erase: 'Goresan ringan relatif mudah dikoreksi. Jika ditekan terlalu kuat, grafit dapat terhapus tetapi bekas tekanan atau lekukan pada kertas bisa tetap tertinggal.', tip: 'Coba tekanan ringan, lalu kuat pada Gores & hapus. Perhatikan bekas pada kertas, bukan hanya hilangnya grafit.' },
  { id: 'h', name: 'H', barrel: '#459c85', soft: '#e6f8ee', accent: '#25866b', graphite: '#3f474f', character: 'Agak keras', lineTrait: 'Garis tipis', width: .04, hardness: .85, residue: .045, use: 'Garis bantu, garis ukuran, dan arsiran potongan yang tipis.', description: 'H ditampilkan dengan garis tipis, sedikit lebih tebal daripada 2H. Grafitnya masih keras sehingga tekanan berlebihan dapat meninggalkan bekas pada permukaan kertas.', erase: 'Goresan ringan dapat dikoreksi relatif bersih. Bila ditekan keras, bekas tekanan atau lekukan dapat tetap terlihat meskipun grafit sudah dihapus.', tip: 'Tarik garis H dengan ringan. Menekan kuat dapat meninggalkan bekas yang tidak hilang bersama grafit saat dihapus.' },
  { id: 'hb', name: 'HB', barrel: '#e2ad36', soft: '#fff7df', accent: '#a67d22', graphite: '#3f474f', character: 'Sedang', lineTrait: 'Garis sedang', width: .065, hardness: .5, residue: .07, use: 'Latihan garis utama dan tulisan pada gambar teknik.', description: 'HB berada di tengah dalam contoh ini: garisnya lebih tebal daripada H dan lebih tipis daripada B. Kekerasannya sedang untuk latihan garis utama dan tulisan.', erase: 'Goresan dapat dikoreksi. Tekanan berlebihan atau gosokan berulang dapat meninggalkan sisa grafit dan mengganggu permukaan kertas.', tip: 'Bedakan garis utama dari garis bantu. Jaga ketebalan tetap rata dari awal sampai akhir garis.' },
  { id: 'b', name: 'B', barrel: '#df856a', soft: '#fff0e9', accent: '#c1664e', graphite: '#3f474f', character: 'Agak lunak', lineTrait: 'Garis tebal', width: .11, hardness: .3, residue: .15, use: 'Contoh penegasan garis yang lebih tebal daripada HB.', description: 'B ditampilkan dengan garis tebal. Grafitnya lebih lunak; perhatikan kebersihan goresan dan hindari grafit berpindah ke bagian gambar lain.', erase: 'Dapat dihapus, tetapi grafit yang banyak dapat menyisakan bercak atau noda. Gunakan penghapus bersih dan koreksi perlahan.', tip: 'Hindari menyapu goresan dengan telapak tangan agar grafit tidak menyebar dan menodai gambar.' },
  { id: '2b', name: '2B', barrel: '#9773c6', soft: '#f2ebfc', accent: '#7951aa', graphite: '#3f474f', character: 'Lunak', lineTrait: 'Garis lebih tebal', width: .17, hardness: .2, residue: .22, use: 'Pembanding garis tebal terhadap garis bantu tipis dari 2H.', description: 'Dalam perbandingan ini, 2B menghasilkan garis paling tebal sehingga bedanya dengan 2H terlihat jelas. Grafitnya lunak; kebersihan kertas perlu lebih diperhatikan.', erase: 'Masih dapat dihapus, namun sisa grafit atau noda lebih perlu diperhatikan. Hindari menggosok sampai grafit menyebar ke sekitar garis.', tip: 'Bandingkan langsung 2H dan 2B: perhatikan ketebalan garis serta kondisi kertas setelah dikoreksi.' }
];

export const pencilById = Object.fromEntries(pencilGrades.map(grade => [grade.id, grade]));
export const pressures = {
  light: { name: 'Ringan', factor: .8 },
  medium: { name: 'Sedang', factor: 1 },
  firm: { name: 'Kuat', factor: 1.4 }
};

export function strokeAppearance(grade, pressure = 'medium') {
  const strokeWidth = grade.width * pressures[pressure].factor;
  return { graphite: grade.graphite, strokeWidth, endWidth: strokeWidth };
}

export function paperEffects(grade, pressure = 'medium') {
  const indentation = pressure === 'firm' ? grade.hardness * .9 : 0;
  const eraseResidue = Math.min(.42, grade.residue * (pressure === 'light' ? .5 : pressure === 'firm' ? 1.5 : 1));
  return { indentation, eraseResidue };
}

// Original vector pencil: wood, graphite tip, three barrel facets and grade stamp.
export function pencilDrawing(grade, key) {
  return `<defs><linearGradient id="pencil-${key}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${grade.barrel}"/><stop offset="1" stop-color="${grade.accent}"/></linearGradient></defs>
    <ellipse cx="119" cy="20" rx="101" ry="7" fill="#153451" opacity=".11"/>
    <path d="M3 0 37-12 37 12Z" fill="#e4bd87"/><path d="M3 0 37-12 37-3 12 3Z" fill="#f7d6a2"/><path d="M3 0 14-4 14 4Z" fill="${grade.graphite}"/>
    <path d="M37-12H212Q220-12 220-5V5Q220 12 212 12H37Z" fill="url(#pencil-${key})"/>
    <path d="M37-12H212Q218-12 220-5H37Z" fill="#fff" opacity=".29"/>
    <path d="M37 5H220V6Q220 12 212 12H37Z" fill="#153451" opacity=".13"/>
    <path d="M198-12V12M202-12V12" stroke="#fff" stroke-width="1.5" opacity=".58"/>
    <text x="78" y="3" fill="#fff" font-family="sans-serif" font-weight="700" font-size="6" letter-spacing="1.2">SDRAFT</text>
    <text x="178" y="4" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="800" font-size="11">${grade.name}</text>`;
}

export function pencilIllustration(grade, key) {
  return `<svg viewBox="0 0 240 105" role="img" aria-label="Pensil kayu ${grade.name} dengan ujung grafit dan penanda grade"><g transform="translate(8 79) rotate(-17)">${pencilDrawing(grade, key)}</g></svg>`;
}

export function strokeSample(grade, key, mode = 'line', pressure = 'medium', annotate = true) {
  const { graphite, strokeWidth, endWidth } = strokeAppearance(grade, pressure);
  const start = strokeWidth * 48, end = endWidth * 48;
  if (mode === 'erase') {
    const { indentation, eraseResidue } = paperEffects(grade, pressure);
    const result = indentation > .35 ? 'Bekas tekanan' : eraseResidue > .12 ? 'Sisa grafit' : 'Koreksi relatif bersih';
    return `<svg viewBox="0 0 260 94" role="img" aria-label="Pensil ${grade.name} setelah dihapus: ${result.toLowerCase()}"><text x="66" y="18" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#678396">Goresan</text><text x="202" y="18" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#678396">Dihapus</text><path d="M14 ${37-start/2}L115 ${37-end/2}V${37+end/2}L14 ${37+start/2}Z" fill="${graphite}"/><path d="M148 ${37-start/2}L246 ${37-end/2}V${37+end/2}L148 ${37+start/2}Z" fill="${graphite}" opacity="${eraseResidue}"/>${indentation > .35 ? `<path d="M149 37H245" stroke="#7993a1" stroke-width="1.5" opacity="${indentation}"/><path d="M149 39H245" stroke="#fff" stroke-width="1.4"/>` : ''}<path d="M123 37H137m-4-4 4 4-4 4" fill="none" stroke="#92afbf" stroke-width="1.3"/><path d="M185 72H213V41" fill="none" stroke="${grade.accent}" stroke-width="1.2"/><text x="180" y="76" text-anchor="end" font-family="sans-serif" font-size="9" font-weight="700" fill="${grade.accent}">${result}</text></svg>`;
  }
  const strokes = mode === 'hatch'
    ? Array.from({ length: 14 }, (_, i) => `<path d="M${20 + i * 12} 58l23-27" fill="none" stroke="${graphite}" stroke-width="${start + (end-start) * i/13}" stroke-linecap="round"/>`).join('')
    : `<path d="M20 ${45-start/2}L200 ${45-end/2}V${45+end/2}L20 ${45+start/2}Z" fill="${graphite}"/>`;
  const pointerX = mode === 'hatch' ? 187 : 200;
  return `<svg viewBox="0 0 260 94" role="img" aria-label="${mode === 'hatch' ? 'Arsiran' : 'Garis'} pensil ${grade.name}: ${grade.lineTrait.toLowerCase()}">${strokes}${annotate ? `<path d="M154 72H${pointerX}V45" fill="none" stroke="${grade.accent}" stroke-width="1.3"/><circle cx="${pointerX}" cy="45" r="2.4" fill="${grade.accent}"/><text x="149" y="76" text-anchor="end" font-family="sans-serif" font-size="9" font-weight="700" fill="${grade.accent}">${grade.lineTrait}</text>` : ''}</svg>`;
}
