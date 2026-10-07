import { modulesUnderDevelopment, isModuleLocked } from './module-availability.js';

const lockIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>`;

function targetModule(element) {
  const entry = element.closest('[data-target], [data-module], [data-open-module]');
  return entry?.dataset.target || entry?.dataset.module || entry?.dataset.openModule;
}

export function initModuleLocks() {
  if (document.documentElement.dataset.moduleLocksReady) return;
  document.documentElement.dataset.moduleLocksReady = 'true';
  for (const [id, title] of Object.entries(modulesUnderDevelopment)) {
    document.querySelectorAll(`[data-target="${id}"], [data-module="${id}"], [data-open-module="${id}"]`).forEach(entry => {
      entry.classList.add('module-is-locked');
      entry.setAttribute('aria-disabled', 'true');
      entry.setAttribute('aria-label', `${title} — Sedang dalam pengembangan`);
      entry.setAttribute('tabindex', '-1');
      entry.title = 'Sedang dalam pengembangan';
      if (entry.tagName === 'BUTTON') entry.disabled = true;
      if (entry.classList.contains('nav-item')) {
        entry.insertAdjacentHTML('beforeend', `<span class="module-nav-status" aria-hidden="true">Dalam pengembangan</span><span class="module-nav-lock" aria-hidden="true">${lockIcon}</span>`);
      } else if (entry.classList.contains('studio-card')) {
        entry.classList.remove('completed', 'active-learning');
        entry.querySelector('.studio-card-art')?.insertAdjacentHTML('beforeend', `<span class="module-card-lock" aria-hidden="true">${lockIcon}<strong>Sedang dalam<br>pengembangan</strong><span>Segera hadir</span></span>`);
      } else {
        entry.textContent = `${title} · Sedang dalam pengembangan`;
      }
    });

    const section = document.getElementById(id);
    if (!section) continue;
    section.classList.add('module-is-locked');
    section.dataset.moduleLocked = 'true';
    const content = document.createElement('div');
    content.className = 'module-locked-content';
    content.inert = true;
    content.setAttribute('aria-hidden', 'true');
    while (section.firstChild) content.append(section.firstChild);
    // Disable native controls as well as making the whole unfinished lesson inert.
    content.querySelectorAll('button, input, select, textarea, fieldset').forEach(control => { control.disabled = true; });
    section.append(content);
    section.insertAdjacentHTML('beforeend', `<div class="module-development-layer"><div class="module-development-notice"><span class="module-development-icon">${lockIcon}</span><p class="module-development-kicker">${title}</p><h2>Sedang dalam pengembangan</h2><p>Modul ini sedang disiapkan dan belum bisa digunakan. Kamu bisa melanjutkan belajar lewat materi yang sudah tersedia.</p><button type="button" class="module-development-back">Kembali ke beranda <span aria-hidden="true">→</span></button></div></div>`);
    section.querySelector('.module-development-back').addEventListener('click', () => document.querySelector('.nav-item[data-target="dashboard"]')?.click());
  }

  // Cover navigation from cards, sidebar, help links, and programmatic clicks.
  const blockEntry = event => {
    if (!(event.target instanceof Element) || !isModuleLocked(targetModule(event.target))) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  document.addEventListener('click', blockEntry, true);
  document.addEventListener('keydown', blockEntry, true);
}
