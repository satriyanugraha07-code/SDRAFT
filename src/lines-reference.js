export function initLineReference() {
  // --- ISO 3098 LETTERING SIMULATOR ---
  const letterInput = document.getElementById('iso-letter-input');
  const letterDisplay = document.getElementById('iso-letter-display');
  const heightButtons = document.querySelectorAll('#iso-height-picker .toggle-btn');
  const slantButtons = document.querySelectorAll('#iso-slant-picker .toggle-btn');

  if (letterInput && letterDisplay) {
    letterInput.addEventListener('input', () => {
      letterDisplay.textContent = letterInput.value || "SDRAFT 2026";
      if (typeof window.completeModule === 'function') {
        window.completeModule('lines');
      }
    });

    heightButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        heightButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const h = btn.dataset.h;
        const fontMap = { '2.5': '1.05rem', '3.5': '1.25rem', '5': '1.55rem', '7': '1.9rem' };
        letterDisplay.style.fontSize = fontMap[h] || '1.5rem';
        if (typeof window.completeModule === 'function') {
          window.completeModule('lines');
        }
      });
    });

    slantButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        slantButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.slant === 'italic') {
          letterDisplay.classList.add('italic');
        } else {
          letterDisplay.classList.remove('italic');
        }
        if (typeof window.completeModule === 'function') {
          window.completeModule('lines');
        }
      });
    });
  }

  // --- ISO 216 PAPER SIZES INTERACTIVE ---
  const paperData = {
    a0: { name: "Format Kertas A0", area: "1 m²", dim: "841 × 1189 mm", marginL: "20 mm", marginO: "10 mm", orient: "Horizontal (Lanskap)", w: 84, h: 119 },
    a1: { name: "Format Kertas A1", area: "1/2 m²", dim: "594 × 841 mm", marginL: "20 mm", marginO: "10 mm", orient: "Horizontal (Lanskap)", w: 80, h: 113 },
    a2: { name: "Format Kertas A2", area: "1/4 m²", dim: "420 × 594 mm", marginL: "20 mm", marginO: "10 mm", orient: "Horizontal (Lanskap)", w: 75, h: 106 },
    a3: { name: "Format Kertas A3", area: "1/8 m²", dim: "297 × 420 mm", marginL: "20 mm", marginO: "10 mm", orient: "Horizontal (Lanskap)", w: 70, h: 99 },
    a4: { name: "Format Kertas A4", area: "1/16 m²", dim: "210 × 297 mm", marginL: "20 mm", marginO: "10 mm", orient: "Vertikal / Horizontal", w: 65, h: 92 }
  };

  const paperTabButtons = document.querySelectorAll('.paper-tab-btn');
  const paperTitle = document.getElementById('paper-name-title');
  const paperArea = document.getElementById('paper-area-tag');
  const paperDim = document.getElementById('paper-dimensions');
  const paperML = document.getElementById('paper-margin-left');
  const paperMO = document.getElementById('paper-margin-other');
  const paperOrient = document.getElementById('paper-orientation');
  const paperRatioBox = document.getElementById('paper-ratio-box');
  const paperAspectPrev = document.getElementById('paper-aspect-preview');

  if (paperTabButtons.length && paperTitle) {
    paperTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        paperTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = paperData[btn.dataset.paper];
        if (!p) return;

        paperTitle.textContent = p.name;
        paperArea.textContent = p.area;
        paperDim.textContent = p.dim;
        paperML.textContent = p.marginL;
        paperMO.textContent = p.marginO;
        paperOrient.textContent = p.orient;
        paperAspectPrev.textContent = `${btn.dataset.paper.toUpperCase()} (1:√2)`;

        if (paperRatioBox) {
          paperRatioBox.style.width = `${p.w}px`;
          paperRatioBox.style.height = `${p.h}px`;
        }

        if (typeof window.completeModule === 'function') {
          window.completeModule('lines');
        }
      });
    });
  }

}
