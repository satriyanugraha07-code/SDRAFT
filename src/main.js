import '../app.js';
import '../js/tools.js';
import '../js/pencils.js';
import '../js/etiket.js';
import '../js/lines.js';
import '../js/projection.js';
import '../js/book-reader.js';
import '../js/model-3d.js';
import '../js/intro.js';
import { initLkpd } from '../js/lkpd.js';
import { initAuth } from '../js/auth.js';
import { initDiagnostik } from '../js/diagnostik.js';
import { initPostTest } from '../js/post-test.js';
import { publicAssetUrl } from './asset-url.js';
import { initHeroScene } from './hero-scene.js';
import { initPageInteractions } from './interactions.js';
import { initPageMotion } from './page-motion.js';
import { initDisplaySettings } from './display-settings.js';

document.addEventListener('DOMContentLoaded', () => {
  initDisplaySettings();
  const scenePreview = document.getElementById('learning-scene');
  if (scenePreview && 'IntersectionObserver' in window) {
    const sceneObserver = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      sceneObserver.disconnect();
      initHeroScene();
    }, { rootMargin: '120px' });
    sceneObserver.observe(scenePreview);
  } else {
    initHeroScene();
  }
  initLkpd();
  initAuth();
  initDiagnostik();
  initPostTest();
  const pageTitle = document.getElementById('current-page-title');
  const navigationItems = document.querySelectorAll('.nav-item');
  const absoluteSocialImage = new URL(publicAssetUrl('brand/sdraft-wordmark.png'), window.location.origin).href;

  document.getElementById('og-image')?.setAttribute('content', absoluteSocialImage);
  document.getElementById('twitter-image')?.setAttribute('content', absoluteSocialImage);

  pageTitle?.setAttribute('aria-live', 'polite');

  navigationItems.forEach((item) => {
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        item.click();
      }
    });
  });

  document.querySelectorAll('[data-open-module]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-open-module');
      document.querySelector(`.nav-item[data-target="${target}"]`)?.click();
    });
  });

  const categories = {
    book: 'materi', intro: 'materi', lines: 'materi',
    tools: 'praktik', pencils: 'praktik', etiket: 'praktik', projection: 'praktik', model3d: 'praktik', lkpd: 'praktik',
    quiz: 'evaluasi'
  };
  const cards = document.querySelectorAll('.hub-grid .module-card');
  document.querySelectorAll('.module-filter').forEach((filter) => {
    filter.addEventListener('click', () => {
      const selected = filter.dataset.filter;
      document.querySelectorAll('.module-filter').forEach((option) => {
        const active = option === filter;
        option.classList.toggle('active', active);
        option.setAttribute('aria-pressed', String(active));
      });
      cards.forEach((card) => {
        card.hidden = selected !== 'all' && categories[card.dataset.module] !== selected;
      });
    });
  });

  cards.forEach((card) => {
    card.setAttribute('aria-label', `Buka ${card.querySelector('.gamtek-card-title')?.textContent.trim() || 'modul'}`);
    if (card.tagName === 'BUTTON') return;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });

  initPageInteractions();
  initPageMotion();
});
