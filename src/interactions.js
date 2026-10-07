const canAnimate = () => document.documentElement.dataset.motion === 'on';

export function initPageInteractions() {
  const cards = [...document.querySelectorAll('#module-grid .studio-card')];

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (card.disabled || card.getAttribute('aria-disabled') === 'true') return;
      if (!finePointer.matches || !canAnimate()) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--card-glow-x', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--card-glow-y', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--card-tilt-x', `${((0.5 - y) * 4).toFixed(2)}deg`);
      card.style.setProperty('--card-tilt-y', `${((x - 0.5) * 4).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--card-tilt-x', '0deg');
      card.style.setProperty('--card-tilt-y', '0deg');
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!canAnimate() || !(event.target instanceof Element)) return;
    const target = event.target.closest('.studio-primary, .studio-card, .module-filter, .nav-item');
    if (!target) return;
    if (target.matches(':disabled, [aria-disabled="true"]')) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'press-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height) * 1.8}px`;
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}
