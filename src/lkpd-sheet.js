import { createLkpdPattern } from './lkpd-drawing.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

// Percentages follow an A4 landscape sheet. At 297 mm wide, the six drawing
// squares are 70 mm wide with 7 mm gutters; the title block is 185 × 25 mm.
export const LKPD_SHEET_CSS = `
  .lkpd-drawing-paper, .lkpd-drawing-paper * { box-sizing: border-box; }
  .lkpd-drawing-paper { position: relative; width: 100%; aspect-ratio: 297 / 210; container-type: inline-size; color: #27353b; background: #fff; border: 1px solid #35434b; font-family: Arial, sans-serif; box-shadow: 0 8px 25px #1d486415; }
  .lkpd-drawing-frame { position: absolute; inset: 2.381% 1.684% 2.381% 5.051%; border: 1px solid #35434b; }
  .lkpd-sheet-patterns { position: absolute; top: 11.429%; left: 14.478%; width: 75.421%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.357cqw; }
  .lkpd-sheet-pattern { position: relative; display: block; width: 100%; aspect-ratio: 1; padding: 0; margin: 0; border: 0; border-radius: 0; background: transparent; color: inherit; }
  button.lkpd-sheet-pattern { cursor: pointer; }
  .lkpd-sheet-pattern > .lkpd-pattern-svg { display: block; width: 100%; height: 100%; overflow: visible; }
  button.lkpd-sheet-pattern:hover { background: #e9f9ff; outline: 2px solid #69bacd; outline-offset: 4px; }
  button.lkpd-sheet-pattern:hover > svg > rect:first-of-type { fill: #f2fbff; }
  button.lkpd-sheet-pattern:focus-visible { outline: 3px solid #078bad; outline-offset: 4px; }
  .lkpd-sheet-tip { position: absolute; inset: auto 0 0; padding: 4px; background: #087b95ed; color: white; font: 700 10px/1.5 Arial, sans-serif; text-align: center; opacity: 0; pointer-events: none; }
  button.lkpd-sheet-pattern:hover .lkpd-sheet-tip, button.lkpd-sheet-pattern:focus-visible .lkpd-sheet-tip { opacity: 1; }
  .lkpd-sheet-etiket { position: absolute; right: 0; bottom: 0; width: 66.788%; height: 12.5%; display: grid; grid-template-columns: 30fr 40fr 64fr 51fr; grid-template-rows: repeat(3, 1fr) 2fr; border-top: 1px solid #35434b; border-left: 1px solid #35434b; font-size: .83cqw; line-height: 1.2; font-style: italic; }
  .lkpd-sheet-cell { display: flex; align-items: center; gap: .7cqw; min-width: 0; overflow: hidden; padding: .2cqw .45cqw; border-right: 1px solid #35434b; border-bottom: 1px solid #35434b; }
  .lkpd-sheet-cell:last-child { border-right: 0; }
  .lkpd-sheet-cell span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lkpd-sheet-cell b { flex-shrink: 0; font-size: .76cqw; font-weight: normal; letter-spacing: .035em; }
  .lkpd-sheet-projection { grid-column: 1; grid-row: 1 / 4; flex-direction: column; align-items: start; gap: .1cqw; }
  .lkpd-sheet-projection svg { display: block; width: 90%; flex: 1; min-height: 0; }
  .lkpd-sheet-school { grid-column: 1 / 3; grid-row: 4; border-bottom: 0; font-size: 1.06cqw; letter-spacing: .035em; }
  .lkpd-sheet-scale { grid-column: 2; grid-row: 1; }
  .lkpd-sheet-unit { grid-column: 2; grid-row: 2; }
  .lkpd-sheet-date { grid-column: 2; grid-row: 3; }
  .lkpd-sheet-name { grid-column: 3; grid-row: 1; }
  .lkpd-sheet-class { grid-column: 3; grid-row: 2; }
  .lkpd-sheet-check { grid-column: 3; grid-row: 3; }
  .lkpd-sheet-title { grid-column: 3; grid-row: 4; flex-direction: column; align-items: start; justify-content: center; gap: .1cqw; border-bottom: 0; }
  .lkpd-sheet-title span { align-self: center; font-size: 1.15cqw; letter-spacing: .045em; }
  .lkpd-sheet-note { grid-column: 4; grid-row: 1 / 4; align-items: start; flex-direction: column; gap: .4cqw; border-right: 0; }
  .lkpd-sheet-note span { white-space: normal; font-size: .74cqw; }
  .lkpd-sheet-number { grid-column: 4; grid-row: 4; display: grid; grid-template-columns: 1fr 1fr; padding: 0; border-right: 0; border-bottom: 0; }
  .lkpd-sheet-number > div { display: flex; flex-direction: column; padding: .2cqw .45cqw; min-height: 100%; }
  .lkpd-sheet-number > div + div { border-left: 1px solid #35434b; align-items: center; }
  .lkpd-sheet-number span { font-size: 1.05cqw; }
`;

const field = (key, value, fallback) => `<span data-sheet-field="${key}">${escape(value || fallback)}</span>`;

export function createLkpdDrawingSheet({ patterns = [], interactive = false, payload = {} } = {}) {
  const tag = interactive ? 'button' : 'div';
  return `<div class="lkpd-drawing-paper" role="group" aria-label="Lembar gambar Job 1: enam pola dalam susunan tiga kolom dan dua baris">
    <div class="lkpd-drawing-frame">
      <div class="lkpd-sheet-etiket" aria-label="Etiket lembar gambar">
        <div class="lkpd-sheet-cell lkpd-sheet-projection"><b>Proyeksi</b><svg viewBox="0 0 92 36" fill="none" stroke="currentColor" stroke-width=".8" aria-hidden="true"><circle cx="20" cy="18" r="11"/><circle cx="20" cy="18" r="5"/><path d="M5 18h30M20 3v30M45 11l31-7v28l-31-7ZM40 18h41"/></svg></div>
        <div class="lkpd-sheet-cell lkpd-sheet-scale"><b>SKALA</b><span>1 : 1</span></div>
        <div class="lkpd-sheet-cell lkpd-sheet-unit"><b>UKURAN</b><span>mm</span></div>
        <div class="lkpd-sheet-cell lkpd-sheet-date"><b>TANGGAL</b>${field('date', payload.date, '—')}</div>
        <div class="lkpd-sheet-cell lkpd-sheet-name"><b>DIGAMBAR</b>${field('name', payload.name, 'Nama siswa')}</div>
        <div class="lkpd-sheet-cell lkpd-sheet-class"><b>KELAS</b>${field('className', payload.className, 'Kelas')}</div>
        <div class="lkpd-sheet-cell lkpd-sheet-check"><b>DILIHAT</b>${field('paraf', payload.paraf, 'Paraf guru')}</div>
        <div class="lkpd-sheet-cell lkpd-sheet-school">SMK N 2 DEPOK SLEMAN</div>
        <div class="lkpd-sheet-cell lkpd-sheet-title"><b>Nama:</b><span>GARIS DALAM GAMBAR</span></div>
        <div class="lkpd-sheet-cell lkpd-sheet-note"><b>Keterangan:</b><span>Jarak 7 mm dan 3,5 mm<br>Kotak 70 × 70 mm</span></div>
        <div class="lkpd-sheet-cell lkpd-sheet-number"><div><b>NOMOR:</b><span>JOB 01</span></div><div><b>FORM:</b><span>A4</span></div></div>
      </div>
    </div>
    <div class="lkpd-sheet-patterns">${patterns.map(pattern => `<${tag} class="lkpd-sheet-pattern" ${interactive ? `type="button" data-pattern="${pattern.id}" aria-haspopup="dialog" aria-label="Pola ${pattern.id}: ${escape(pattern.title)} — buka cara pengerjaan" title="${escape(pattern.title)} · lihat cara pengerjaan"` : `aria-label="${escape(pattern.title)}"`}>${createLkpdPattern(pattern.id, { decorative: interactive, paper: true })}${interactive ? '<span class="lkpd-sheet-tip" aria-hidden="true">Lihat cara pengerjaan ↗</span>' : ''}</${tag}>`).join('')}</div>
  </div>`;
}
