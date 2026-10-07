const canAnimate = () => document.documentElement.dataset.motion === 'on';

// Pick complete learning blocks rather than canvases or the controls inside them.
const revealSelectors = {
  dashboard: '.studio-hero, .studio-topics-heading, #module-grid .studio-card',
  diagnostik: '.diag-hero-card, .diag-cbt-toolbar, .diag-section-tabs, .diag-sec-header, .diag-q-item, .diag-bottom-bar',
  settings: '.utility-intro, .utility-card, .utility-footnote',
  help: '.utility-intro, .utility-card',
  book: ':scope > .book-library-hero, :scope > .book-draft-panel, :scope > .book-selector-bar, :scope > .book-reader-panel',
  intro: '.intro-opening, .intro-index, .intro-lesson',
  tools: '.panel-header, .tools-showcase > *',
  pencils: '.panel-header, .pencils-layout > *',
  lines: '.line-hero, .line-catalog, .line-workspace > *, .line-quick-rules, .line-challenge',
  projection: '.projection-viewport, .projection-controls > .glass-panel',
  model3d: ':scope > .model-lab-hero, :scope > .cad-model-selector-bar, .model-lab-grid > *, :scope > .solidworks-library',
  lkpd: '.lkpd-header-banner, .lkpd-sheet > *, .lkpd-coming-soon-card',
  quiz: '#posttest-form-view > :not(.posttest-section-panel), .posttest-section-panel > .posttest-card'
};

export function initPageMotion() {
  const sidebar = document.querySelector('aside.sidebar');
  const navItems = [...document.querySelectorAll('.nav-item')];
  const pageTitle = document.getElementById('current-page-title');
  let observer;
  let prepared = new Set();
  let cleanupHandlers = new Map();
  let cleanupTimers = new Map();
  let menuTimer;

  navItems.forEach((item, index) => item.style.setProperty('--menu-delay', `${index * 38}ms`));

  const release = (element) => {
    observer?.unobserve(element);
    const handler = cleanupHandlers.get(element);
    if (handler) element.removeEventListener('transitionend', handler);
    cleanupHandlers.delete(element);
    clearTimeout(cleanupTimers.get(element));
    cleanupTimers.delete(element);
    element.classList.remove('motion-pending', 'motion-visible', 'motion-first-screen');
    element.style.removeProperty('--reveal-delay');
    prepared.delete(element);
  };

  const clearReveals = () => {
    observer?.disconnect();
    for (const element of [...prepared]) release(element);
    observer = undefined;
  };

  const prepare = (element) => {
    if (!observer || prepared.has(element)) return;
    const rect = element.getBoundingClientRect();
    element.classList.toggle('motion-first-screen', rect.top < window.innerHeight * .9 && rect.bottom > 0);
    element.classList.add('motion-pending');
    prepared.add(element);
    observer.observe(element);
  };

  const startObserver = () => {
    if (!canAnimate() || !('IntersectionObserver' in window)) return;
    const currentObserver = new IntersectionObserver((entries) => {
      if (observer !== currentObserver) return;
      entries.filter((entry) => entry.isIntersecting && !entry.target.hidden)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((entry, index) => {
          const element = entry.target;
          currentObserver.unobserve(element);
          element.style.setProperty('--reveal-delay', `${Math.min(index * 65, 260)}ms`);
          element.classList.add('motion-visible');
          const onEnd = (event) => {
            if (event.target !== element || !['opacity', 'translate'].includes(event.propertyName)) return;
            release(element);
          };
          cleanupHandlers.set(element, onEnd);
          element.addEventListener('transitionend', onEnd);
          cleanupTimers.set(element, setTimeout(() => {
            if (prepared.has(element) && element.classList.contains('motion-visible')) release(element);
          }, 900 + Math.min(index * 65, 260)));
        });
    }, { threshold: 0, rootMargin: '0px 0px -7% 0px' });
    observer = currentObserver;
  };

  const animateTitle = () => {
    if (!pageTitle?.animate) return;
    pageTitle.getAnimations().forEach((animation) => animation.cancel());
    pageTitle.animate([
      { opacity: 0, translate: '0 8px' },
      { opacity: 1, translate: '0 0' }
    ], { duration: 390, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };

  const enterSection = (initial = false) => {
    clearReveals();
    const section = document.querySelector('.app-section.active');
    if (!section || !canAnimate() || ['etiket', 'projection'].includes(section.id)) return;

    if (!initial) {
      document.documentElement.dataset.initialEntry = 'done';
      section.classList.remove('motion-page-enter');
      void section.offsetWidth; // Replay when the learner opens the same menu again.
      section.classList.add('motion-page-enter');
      animateTitle();
    }

    startObserver();
    if (!observer) return;
    const selector = revealSelectors[section.id] || ':scope > *';
    section.querySelectorAll(selector).forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (initial && rect.top < window.innerHeight * .9 && rect.bottom > 0) return;
      prepare(element);
    });
  };

  const enterMenu = () => {
    if (!sidebar || !canAnimate()) return;
    sidebar.classList.remove('motion-menu-enter');
    void sidebar.offsetWidth;
    sidebar.classList.add('motion-menu-enter');
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => sidebar.classList.remove('motion-menu-enter'), 1250);
  };

  navItems.forEach((item) => item.addEventListener('click', () => enterSection()));
  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
    const container = document.querySelector('.app-container');
    if (container?.classList.contains('sidebar-open') || !container?.classList.contains('sidebar-collapsed')) enterMenu();
  });

  document.querySelectorAll('.module-filter').forEach((filter) => {
    filter.addEventListener('click', () => requestAnimationFrame(() => {
      if (document.querySelector('.app-section.active')?.id !== 'dashboard' || !observer) return;
      document.querySelectorAll('#module-grid .studio-card').forEach((card) => {
        release(card);
        if (!card.hidden) {
          prepare(card);
          void card.offsetWidth;
        }
      });
    }));
  });

  enterSection(true);
  setTimeout(() => { document.documentElement.dataset.initialEntry = 'done'; }, 1100);
}
