import { publicAssetUrl } from '../src/asset-url.js';
import { BOOK_LIBRARY, renderBookMarkup } from '../src/book-markup.js';

// --- PEMBACA BUKU / FLIPBOOK ---

document.addEventListener('DOMContentLoaded', () => {
  const bookSection = document.getElementById('book');
  if (!bookSection || bookSection.dataset.bookReady === 'true') return;
  bookSection.innerHTML = renderBookMarkup();
  bookSection.dataset.bookReady = 'true';
  const reader = document.getElementById('book-reader');
  const stage = document.getElementById('book-stage');
  const frame = document.getElementById('book-page-frame');
  const pageImage = document.getElementById('book-page-image');
  const flipSheet = document.getElementById('book-flip-sheet');
  const flipStripsContainer = document.getElementById('book-flip-strips');
  const flipFrontImage = document.getElementById('book-flip-front-image');
  const flipBackImage = document.getElementById('book-flip-back-image');
  const flipFold = flipSheet?.querySelector('.book-flip-fold');
  const pageSheen = frame?.querySelector('.book-page-sheen');
  const loading = document.getElementById('book-page-loading');
  const currentPageLabel = document.getElementById('book-current-page');
  const progressLabel = document.getElementById('book-progress-label');
  const pageRange = document.getElementById('book-page-range');
  const zoomRange = document.getElementById('book-zoom-range');
  const zoomValue = document.getElementById('book-zoom-value');
  const thumbnails = document.getElementById('book-thumbnail-strip');
  const previousButton = document.getElementById('book-prev-page');
  const nextButton = document.getElementById('book-next-page');
  const previousEdge = document.getElementById('book-edge-prev');
  const nextEdge = document.getElementById('book-edge-next');
  const zoomOutButton = document.getElementById('book-zoom-out');
  const zoomInButton = document.getElementById('book-zoom-in');
  const fullscreenButton = document.getElementById('book-fullscreen');
  const startReadingButton = document.getElementById('book-start-reading');
  const totalPagesLabel = document.getElementById('book-total-pages');
  const readerStatus = document.getElementById('book-reader-status');
  const retryButton = document.getElementById('book-retry-page');
  const readingHint = document.getElementById('book-reading-hint');
  const positionNote = reader?.querySelector('.book-reader-footer > p');

  if (!reader || !stage || !frame || !pageImage) return;

  const books = Object.fromEntries(BOOK_LIBRARY.map(book => [book.id, {
    ...book,
    basePath: publicAssetUrl(`books/${book.folder}/pages`),
    pdfUrl: publicAssetUrl(`books/${book.folder}/${book.pdf}`)
  }]));
  const STORAGE_KEY = 'draftlab_book_pages';
  const ACTIVE_BOOK_KEY = 'draftlab_book_active';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const normalizePage = (value, count) => clamp(Number.parseInt(value, 10) || 1, 1, count);
  const readStorage = key => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  let storedPages = {};
  try {
    const value = JSON.parse(readStorage(STORAGE_KEY) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) storedPages = value;
  } catch { /* A damaged saved value should not stop the reader. */ }
  const savedPages = Object.fromEntries(BOOK_LIBRARY.map(book => [book.id,
    normalizePage(storedPages[book.id] ?? (book.id === 'gamtek-dasar' ? readStorage('draftlab_book_page') : 1), book.totalPages)
  ]));
  const storedBook = readStorage(ACTIVE_BOOK_KEY);
  let activeBookId = Object.hasOwn(books, storedBook) ? storedBook : BOOK_LIBRARY[0].id;
  let totalPages = books[activeBookId].totalPages;
  let pageBasePath = books[activeBookId].basePath;
  let currentPage = savedPages[activeBookId];
  let zoom = 100;
  let pageRequestId = 0;
  let turnAnimationFrame = null;
  let loadingTimer = null;
  let loadTimeout = null;
  let pendingImage = null;
  let cancelPaperTurn = null;
  let fullscreenControlsTimer = null;
  let pointerOverFullscreenControls = false;
  let fullscreenStartedByPointer = false;
  let isBusy = false;
  let swipeStart = null;
  let failedPage = null;
  let hasLoadedPage = false;
  const flipStrips = [];

  const pageSource = (page) => `${pageBasePath}/page-${String(page).padStart(2, '0')}.webp`;
  const setStatus = (text, state = '') => {
    if (!readerStatus) return;
    readerStatus.textContent = text;
    readerStatus.dataset.state = state;
  };
  const savePosition = () => {
    savedPages[activeBookId] = currentPage;
    let saved = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPages));
      localStorage.setItem(ACTIVE_BOOK_KEY, activeBookId);
      // Keep the original first-book key compatible with earlier installations.
      if (activeBookId === 'gamtek-dasar') localStorage.setItem('draftlab_book_page', String(currentPage));
    } catch { saved = false; }
    if (positionNote) {
      const detail = document.createElement('span');
      detail.textContent = saved ? 'Lanjutkan dari halaman terakhirmu saat kembali.' : 'Halaman tetap bisa dibaca. Catat nomor halaman untuk melanjutkan nanti.';
      positionNote.replaceChildren(
        document.createTextNode(saved ? 'Posisi setiap buku disimpan di browser ini.' : 'Browser belum bisa menyimpan posisi baca.'),
        document.createElement('br'), detail
      );
    }
    return saved;
  };

  const createFlipStrips = () => {
    if (!flipStripsContainer) return;

    const stripCount = 32;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < stripCount; index += 1) {
      const strip = document.createElement('span');
      const front = document.createElement('span');
      const back = document.createElement('span');
      const width = (100 / stripCount) + 0.12;
      const backgroundPosition = `${(index / (stripCount - 1)) * 100}% center`;

      strip.className = 'book-flip-strip';
      front.className = 'book-flip-strip-face book-flip-strip-front';
      back.className = 'book-flip-strip-face book-flip-strip-back';
      strip.style.left = `${(index / stripCount) * 100}%`;
      strip.style.width = `${width}%`;
      strip.style.setProperty('--strip-index', String(index));
      strip.style.setProperty('--strip-count', String(stripCount));
      front.style.backgroundSize = `${stripCount * 100}% 100%`;
      back.style.backgroundSize = `${stripCount * 100}% 100%`;
      front.style.backgroundPosition = backgroundPosition;
      back.style.backgroundPosition = backgroundPosition;
      strip.append(front, back);
      fragment.append(strip);
      flipStrips.push({ strip, front, back, index });
    }

    flipStripsContainer.append(fragment);
    flipSheet?.classList.add('has-strips');
  };

  const createThumbnails = () => {
    if (!thumbnails) return;

    const fragment = document.createDocumentFragment();
    for (let page = 1; page <= totalPages; page += 1) {
      const button = document.createElement('button');
      const image = document.createElement('img');
      const label = document.createElement('span');

      button.type = 'button';
      button.className = 'book-thumbnail';
      button.dataset.page = String(page);
      button.setAttribute('aria-label', `Buka halaman ${page}`);
      image.src = pageSource(page);
      image.alt = '';
      image.width = 993;
      image.height = 1404;
      image.loading = page <= 3 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => { image.style.visibility = 'hidden'; });
      label.textContent = String(page);
      button.append(image, label);
      button.addEventListener('click', () => {
        const direction = page >= currentPage ? 'next' : 'previous';
        renderPage(page, direction);
      });
      fragment.append(button);
    }

    thumbnails.replaceChildren(fragment);
  };

  const revealActiveThumbnail = () => {
    if (!thumbnails || !thumbnails.closest('details')?.open) return;
    const thumbnail = thumbnails.querySelector('.book-thumbnail.active');
    if (!thumbnail) return;
    const left = thumbnail.getBoundingClientRect().left - thumbnails.getBoundingClientRect().left + thumbnails.scrollLeft;
    if (left < thumbnails.scrollLeft || left + thumbnail.offsetWidth > thumbnails.scrollLeft + thumbnails.clientWidth) {
      thumbnails.scrollLeft = Math.max(0, left - (thumbnails.clientWidth - thumbnail.offsetWidth) / 2);
    }
  };

  const updatePageControls = () => {
    if (currentPageLabel) currentPageLabel.textContent = String(currentPage);
    if (totalPagesLabel) totalPagesLabel.textContent = String(totalPages);
    if (pageRange) {
      pageRange.max = String(totalPages);
      pageRange.value = String(currentPage);
      pageRange.setAttribute('aria-valuetext', `Halaman ${currentPage} dari ${totalPages}`);
    }
    if (progressLabel) {
      progressLabel.textContent = `Halaman ${currentPage} dari ${totalPages} · ${Math.round((currentPage / totalPages) * 100)}%`;
    }

    if (hasLoadedPage && currentPage >= 3 && typeof window.completeModule === 'function') {
      window.completeModule('book');
    }

    stage.setAttribute('aria-label', `Pratinjau buku, halaman ${currentPage} dari ${totalPages}`);
    stage.setAttribute('aria-busy', String(isBusy));
    [previousButton, previousEdge].filter(Boolean).forEach(button => {
      button.disabled = isBusy || currentPage <= 1;
    });
    [nextButton, nextEdge].filter(Boolean).forEach(button => {
      button.disabled = isBusy || currentPage >= totalPages;
    });
    if (pageRange) pageRange.disabled = isBusy;
    thumbnails?.classList.toggle('is-busy', isBusy);
    thumbnails?.querySelectorAll('.book-thumbnail').forEach(button => { button.disabled = isBusy; });

    const activeThumbnail = thumbnails?.querySelector('.book-thumbnail.active');
    activeThumbnail?.classList.remove('active');
    activeThumbnail?.removeAttribute('aria-current');

    const nextActiveThumbnail = thumbnails?.querySelector(`.book-thumbnail[data-page="${currentPage}"]`);
    if (nextActiveThumbnail) {
      nextActiveThumbnail.classList.add('active');
      nextActiveThumbnail.setAttribute('aria-current', 'page');
      revealActiveThumbnail();
    }
  };

  const updatePageWidth = () => {
    if (stage.clientWidth <= 0 || stage.clientHeight <= 0) return;
    const style = window.getComputedStyle(stage);
    const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const verticalPadding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    const widthLimit = Math.max(1, stage.clientWidth - horizontalPadding);
    const heightLimit = Math.max(1, stage.clientHeight - verticalPadding) * (993 / 1404);
    const baseWidth = Math.min(620, widthLimit, heightLimit);
    frame.style.setProperty('--book-render-width', `${Math.round(baseWidth * (zoom / 100))}px`);
  };

  const updateZoom = (nextZoom) => {
    zoom = clamp(Number(nextZoom) || 100, 75, 160);
    if (zoomRange) zoomRange.value = String(zoom);
    if (zoomValue) zoomValue.textContent = `${zoom}%`;
    if (zoomOutButton) zoomOutButton.disabled = zoom <= 75;
    if (zoomInButton) zoomInButton.disabled = zoom >= 160;
    stage.classList.toggle('is-zoomed', zoom > 100);
    stage.style.touchAction = zoom > 100 ? 'auto' : 'pan-y';
    if (readingHint) readingHint.textContent = zoom > 100
      ? 'Geser area halaman untuk melihat bagian yang diperbesar. Gunakan tombol panah untuk berganti halaman.'
      : 'Balik halaman dengan tombol panah. Di HP, usap halaman ke kiri atau kanan.';
    updatePageWidth();
  };

  const animatePaperTurn = (direction, previousSource, nextSource, onComplete) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!flipSheet || !flipFrontImage || !flipBackImage || !flipStrips.length || prefersReducedMotion) {
      onComplete();
      return;
    }

    window.cancelAnimationFrame(turnAnimationFrame);
    flipFrontImage.src = previousSource;
    flipBackImage.src = nextSource;
    flipStrips.forEach(({ strip, front, back }) => {
      strip.style.removeProperty('z-index');
      strip.style.removeProperty('filter');
      strip.style.removeProperty('transform');
      front.style.backgroundImage = `url("${previousSource}")`;
      back.style.backgroundImage = `url("${nextSource}")`;
    });
    flipSheet.classList.remove('flip-next', 'flip-previous', 'active');
    stage.classList.remove('page-turning-next', 'page-turning-previous');
    void flipSheet.offsetWidth;

    const directionClass = direction === 'previous' ? 'flip-previous' : 'flip-next';
    const stageClass = direction === 'previous' ? 'page-turning-previous' : 'page-turning-next';
    const duration = 1120;
    const stripCount = flipStrips.length;
    const frameWidth = frame.getBoundingClientRect().width;
    const stripWidth = frameWidth / stripCount;
    const curlWidth = 0.42;
    const directionSign = direction === 'previous' ? 1 : -1;
    let completed = false;

    const clampUnit = value => Math.min(1, Math.max(0, value));
    const smootherStep = value => {
      const bounded = clampUnit(value);
      return bounded * bounded * bounded * (bounded * (bounded * 6 - 15) + 10);
    };
    const easePaper = value => 0.5 - (Math.cos(Math.PI * clampUnit(value)) / 2);

    const resetPaperSurface = () => {
      flipStrips.forEach(({ strip }) => {
        strip.style.removeProperty('z-index');
        strip.style.removeProperty('filter');
        strip.style.removeProperty('transform');
      });
      if (flipFold) {
        flipFold.style.removeProperty('left');
        flipFold.style.removeProperty('right');
        flipFold.style.removeProperty('opacity');
        flipFold.style.removeProperty('transform');
      }
      if (pageSheen) {
        pageSheen.style.removeProperty('background');
        pageSheen.style.removeProperty('opacity');
      }
    };

    const finishTurn = () => {
      if (completed) return;
      completed = true;
      window.cancelAnimationFrame(turnAnimationFrame);
      flipSheet.classList.remove('active', directionClass);
      stage.classList.remove(stageClass);
      resetPaperSurface();
      cancelPaperTurn = null;
      onComplete();
    };

    cancelPaperTurn = () => {
      if (completed) return;
      completed = true;
      window.cancelAnimationFrame(turnAnimationFrame);
      flipSheet.classList.remove('active', directionClass);
      stage.classList.remove(stageClass);
      resetPaperSurface();
      cancelPaperTurn = null;
    };

    flipSheet.classList.add('active', directionClass);
    stage.classList.add(stageClass);

    let startTime = null;
    const drawPaperFrame = timestamp => {
      if (completed) return;
      if (startTime === null) startTime = timestamp;

      const rawProgress = clampUnit((timestamp - startTime) / duration);
      const progress = easePaper(rawProgress);
      const phase = progress * (1 + curlWidth);
      let crestX = direction === 'previous' ? 0 : frameWidth;
      let crestZ = 0;
      let crestAngle = 0;

      if (direction === 'next') {
        let paperX = 0;
        let paperZ = 0;

        flipStrips.forEach(({ strip, index }) => {
          const distanceFromSpine = (index + 0.5) / stripCount;
          const turnAmount = smootherStep((phase - (1 - distanceFromSpine)) / curlWidth);
          const angle = directionSign * Math.PI * turnAmount;
          const cosine = Math.cos(angle);
          const sine = Math.sin(angle);
          const baseX = index * stripWidth;
          const centerX = paperX + (cosine * stripWidth * 0.5);
          const centerZ = paperZ - (sine * stripWidth * 0.5);
          const lift = Math.abs(Math.sin(angle));

          strip.style.transformOrigin = 'left center';
          strip.style.transform = `translate3d(${paperX - baseX}px, ${-lift * 0.45}px, ${paperZ}px) rotateY(${angle}rad) scaleY(${1 - (lift * 0.003)})`;
          strip.style.filter = `brightness(${1 - (lift * 0.16)}) saturate(${1 - (lift * 0.035)})`;
          strip.style.zIndex = String(20 + Math.round(centerZ));

          if (centerZ > crestZ) {
            crestX = centerX;
            crestZ = centerZ;
            crestAngle = angle;
          }

          paperX += cosine * stripWidth;
          paperZ -= sine * stripWidth;
        });
      } else {
        let paperX = frameWidth;
        let paperZ = 0;

        for (let index = stripCount - 1; index >= 0; index -= 1) {
          const { strip } = flipStrips[index];
          const distanceFromSpine = (stripCount - index - 0.5) / stripCount;
          const turnAmount = smootherStep((phase - (1 - distanceFromSpine)) / curlWidth);
          const angle = directionSign * Math.PI * turnAmount;
          const cosine = Math.cos(angle);
          const sine = Math.sin(angle);
          const baseRight = (index + 1) * stripWidth;
          const centerX = paperX - (cosine * stripWidth * 0.5);
          const centerZ = paperZ + (sine * stripWidth * 0.5);
          const lift = Math.abs(Math.sin(angle));

          strip.style.transformOrigin = 'right center';
          strip.style.transform = `translate3d(${paperX - baseRight}px, ${-lift * 0.45}px, ${paperZ}px) rotateY(${angle}rad) scaleY(${1 - (lift * 0.003)})`;
          strip.style.filter = `brightness(${1 - (lift * 0.16)}) saturate(${1 - (lift * 0.035)})`;
          strip.style.zIndex = String(20 + Math.round(centerZ));

          if (centerZ > crestZ) {
            crestX = centerX;
            crestZ = centerZ;
            crestAngle = angle;
          }

          paperX -= cosine * stripWidth;
          paperZ += sine * stripWidth;
        }
      }

      const shadowStrength = Math.sin(Math.PI * progress);
      const crestPercent = clamp((crestX / frameWidth) * 100, 0, 100);
      const shadowStart = Math.max(0, crestPercent - 14);
      const shadowEnd = Math.min(100, crestPercent + 14);

      if (flipFold) {
        const foldWidth = clamp(frameWidth * 0.105, 38, 78);
        flipFold.style.left = `${crestX - (foldWidth / 2)}px`;
        flipFold.style.right = 'auto';
        flipFold.style.width = `${foldWidth}px`;
        flipFold.style.opacity = String(shadowStrength * 0.72);
        flipFold.style.transform = `translateZ(${crestZ + 5}px) rotateY(${crestAngle}rad) scaleX(${0.72 + (shadowStrength * 0.28)})`;
      }

      if (pageSheen) {
        pageSheen.style.opacity = String(shadowStrength * 0.7);
        pageSheen.style.background = `linear-gradient(90deg, transparent ${shadowStart}%, rgba(4, 24, 49, 0.3) ${crestPercent}%, rgba(255, 255, 255, 0.22) ${Math.min(100, crestPercent + 4)}%, transparent ${shadowEnd}%)`;
      }

      if (rawProgress < 1) {
        turnAnimationFrame = window.requestAnimationFrame(drawPaperFrame);
      } else {
        finishTurn();
      }
    };

    turnAnimationFrame = window.requestAnimationFrame(drawPaperFrame);
  };

  const preloadNearbyPages = () => {
    [currentPage - 1, currentPage + 1]
      .filter(page => page >= 1 && page <= totalPages)
      .forEach(page => {
        const image = new Image();
        image.src = pageSource(page);
      });
  };

  const renderPage = (requestedPage, direction = 'next', animate = true) => {
    const targetPage = normalizePage(requestedPage, totalPages);
    if (isBusy || (animate && targetPage === currentPage && hasLoadedPage && failedPage === null)) return;

    const requestId = ++pageRequestId;
    const requestBookId = activeBookId;
    const source = pageSource(targetPage);
    const preloader = new Image();
    pendingImage = preloader;
    const previousSource = pageImage.getAttribute('src') || pageSource(currentPage);

    isBusy = true;
    failedPage = null;
    if (retryButton) retryButton.hidden = true;
    setStatus(`Memuat halaman ${targetPage} dari ${books[activeBookId].title}…`);
    updatePageControls();
    window.clearTimeout(loadingTimer);
    window.clearTimeout(loadTimeout);
    loading?.classList.remove('error');
    if (loading) loading.innerHTML = '<span></span>Memuat halaman...';

    if (animate) {
      loadingTimer = window.setTimeout(() => loading?.classList.add('active'), 220);
    } else {
      loading?.classList.add('active');
      pageImage.classList.add('is-loading');
    }

    const requestIsCurrent = () => requestId === pageRequestId && requestBookId === activeBookId;
    const failLoading = () => {
      if (!requestIsCurrent()) return;
      window.clearTimeout(loadingTimer);
      window.clearTimeout(loadTimeout);
      preloader.onload = preloader.onerror = null;
      pendingImage = null;
      isBusy = false;
      failedPage = targetPage;
      pageImage.classList.remove('is-loading');
      if (loading) {
        loading.textContent = `Halaman ${targetPage} belum dapat dimuat.`;
        loading.classList.add('active', 'error');
      }
      if (retryButton) retryButton.hidden = false;
      setStatus(`Halaman ${targetPage} belum dapat dimuat. Pilih Coba muat lagi atau buka PDF buku ini.`, 'error');
      updatePageControls();
    };

    preloader.onload = () => {
      if (!requestIsCurrent()) return;

      window.clearTimeout(loadingTimer);
      window.clearTimeout(loadTimeout);
      pendingImage = null;
      preloader.onload = preloader.onerror = null;
      currentPage = targetPage;
      hasLoadedPage = true;
      pageImage.src = source;
      pageImage.alt = `Halaman ${currentPage} dari ${books[activeBookId].title}`;
      pageImage.style.visibility = 'visible';
      pageImage.classList.remove('is-loading');
      loading?.classList.remove('active');
      updatePageControls();
      preloadNearbyPages();
      const saved = savePosition();
      setStatus(`Halaman ${currentPage} dari ${totalPages}. ${saved ? 'Posisi bacamu tersimpan.' : 'Browser belum bisa menyimpan posisi baca; halaman tetap bisa dibaca.'}`, saved ? '' : 'storage-error');

      if (animate && !document.hidden) {
        animatePaperTurn(direction, previousSource, source, () => {
          isBusy = false;
          updatePageControls();
        });
      } else {
        isBusy = false;
        updatePageControls();
      }
    };

    preloader.onerror = failLoading;
    loadTimeout = window.setTimeout(failLoading, 15000);
    preloader.src = source;
  };

  const cancelPendingPage = () => {
    pageRequestId += 1;
    window.clearTimeout(loadingTimer);
    window.clearTimeout(loadTimeout);
    if (pendingImage) pendingImage.onload = pendingImage.onerror = null;
    pendingImage = null;
    cancelPaperTurn?.();
    isBusy = false;
    failedPage = null;
    if (retryButton) retryButton.hidden = true;
    loading?.classList.remove('active', 'error');
  };

  const updateBookPresentation = () => {
    const book = books[activeBookId];
    const title = document.getElementById('book-reader-title') || reader.querySelector('.book-reader-heading h3');
    if (title) title.textContent = book.title;
    ['book-reader-pdf', 'book-reader-download'].forEach(id => {
      const link = document.getElementById(id);
      if (!link) return;
      link.href = book.pdfUrl;
      link.setAttribute('aria-label', `${id === 'book-reader-pdf' ? 'Buka' : 'Unduh'} PDF ${book.title}`);
    });
    const download = document.getElementById('book-reader-download');
    if (download) download.setAttribute('download', book.pdf);
    bookSection.querySelectorAll('[data-book-id]').forEach(button => {
      const active = button.dataset.bookId === activeBookId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.removeAttribute('aria-selected');
    });
    updatePageControls();
  };

  const movePage = (step) => {
    if (isBusy) return;
    if ((step < 0 && currentPage <= 1) || (step > 0 && currentPage >= totalPages)) return;
    renderPage(currentPage + step, step < 0 ? 'previous' : 'next');
  };

  createFlipStrips();
  updateBookPresentation();
  createThumbnails();
  updateZoom(100);
  pageImage.style.visibility = 'hidden';
  renderPage(currentPage, 'next', false);

  previousButton?.addEventListener('click', () => movePage(-1));
  previousEdge?.addEventListener('click', () => movePage(-1));
  nextButton?.addEventListener('click', () => movePage(1));
  nextEdge?.addEventListener('click', () => movePage(1));

  pageRange?.addEventListener('change', event => {
    const page = Number(event.target.value);
    renderPage(page, page >= currentPage ? 'next' : 'previous');
  });

  zoomRange?.addEventListener('input', event => updateZoom(event.target.value));
  zoomOutButton?.addEventListener('click', () => updateZoom(zoom - 10));
  zoomInButton?.addEventListener('click', () => updateZoom(zoom + 10));
  retryButton?.addEventListener('click', () => renderPage(failedPage ?? currentPage, 'next', false));
  thumbnails?.closest('details')?.addEventListener('toggle', revealActiveThumbnail);

  startReadingButton?.addEventListener('click', () => {
    reader.scrollIntoView({ behavior: 'auto', block: 'start' });
    stage.focus({ preventScroll: true });
  });

  stage.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, [contenteditable]')) return;
    if (event.key === 'PageDown') {
      event.preventDefault();
      movePage(1);
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      movePage(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      renderPage(1, 'previous');
    } else if (event.key === 'End') {
      event.preventDefault();
      renderPage(totalPages, 'next');
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      updateZoom(zoom + 10);
    } else if (event.key === '-') {
      event.preventDefault();
      updateZoom(zoom - 10);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    if (!bookSection?.classList.contains('active') && document.fullscreenElement !== reader) return;

    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, button, a, [contenteditable]')) return;

    event.preventDefault();
    movePage(event.key === 'ArrowRight' ? 1 : -1);
  });

  stage.addEventListener('pointerdown', event => {
    if (zoom > 100 || isBusy || !event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });

  stage.addEventListener('pointerup', event => {
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;

    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      movePage(deltaX < 0 ? 1 : -1);
    }
  });

  stage.addEventListener('pointercancel', () => { swipeStart = null; });

  const hideFullscreenControlsLater = (delay = 1600) => {
    window.clearTimeout(fullscreenControlsTimer);
    fullscreenControlsTimer = window.setTimeout(() => {
      if (!pointerOverFullscreenControls && !reader.querySelector('.book-toolbar')?.contains(document.activeElement)) {
        reader.classList.remove('fullscreen-controls-visible');
      }
    }, delay);
  };

  const showFullscreenControls = () => {
    if (document.fullscreenElement !== reader) return;
    reader.classList.add('fullscreen-controls-visible');
    hideFullscreenControlsLater();
  };

  reader.addEventListener('pointermove', event => {
    if (document.fullscreenElement !== reader) return;
    const distanceFromBottom = window.innerHeight - event.clientY;
    if (distanceFromBottom <= 150) {
      showFullscreenControls();
    } else if (!event.target.closest('.book-toolbar')) {
      hideFullscreenControlsLater(650);
    }
  });

  const bookToolbar = reader.querySelector('.book-toolbar');
  bookToolbar?.addEventListener('pointerenter', () => {
    pointerOverFullscreenControls = true;
    window.clearTimeout(fullscreenControlsTimer);
    reader.classList.add('fullscreen-controls-visible');
  });

  bookToolbar?.addEventListener('pointerleave', () => {
    pointerOverFullscreenControls = false;
    hideFullscreenControlsLater(650);
  });
  bookToolbar?.addEventListener('focusin', () => {
    if (document.fullscreenElement !== reader) return;
    window.clearTimeout(fullscreenControlsTimer);
    reader.classList.add('fullscreen-controls-visible');
  });
  bookToolbar?.addEventListener('focusout', () => hideFullscreenControlsLater());
  reader.addEventListener('pointerdown', showFullscreenControls);

  fullscreenButton?.addEventListener('pointerdown', () => {
    fullscreenStartedByPointer = true;
  });

  fullscreenButton?.addEventListener('keydown', () => {
    fullscreenStartedByPointer = false;
  });

  const updateFullscreenControl = () => {
    if (!fullscreenButton) return;
    const isFullscreen = document.fullscreenElement === reader;
    const text = fullscreenButton.querySelector('span');
    if (text) text.textContent = isFullscreen ? 'Keluar layar penuh' : 'Layar penuh';
    fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Keluar dari layar penuh' : 'Buka layar penuh');
    fullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
    reader.classList.toggle('fullscreen-controls-visible', isFullscreen);
    if (isFullscreen) {
      if (fullscreenStartedByPointer) fullscreenButton.blur();
      fullscreenStartedByPointer = false;
      hideFullscreenControlsLater(2200);
    } else {
      window.clearTimeout(fullscreenControlsTimer);
      pointerOverFullscreenControls = false;
    }
    window.setTimeout(updatePageWidth, 60);
  };

  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === reader) {
        await document.exitFullscreen();
      } else {
        if (typeof reader.requestFullscreen !== 'function') throw new Error('Fullscreen unavailable');
        await reader.requestFullscreen();
      }
    } catch {
      setStatus('Layar penuh belum tersedia di browser ini. Kamu tetap bisa memperbesar halaman atau membuka PDF.', 'fullscreen-error');
    }
  });

  document.addEventListener('fullscreenchange', updateFullscreenControl);
  window.addEventListener('resize', updatePageWidth);
  if ('ResizeObserver' in window) {
    const stageResizeObserver = new ResizeObserver(updatePageWidth);
    stageResizeObserver.observe(stage);
  }

  // Multi-book switcher logic
  const switchBook = (bookId) => {
    if (!Object.hasOwn(books, bookId)) return;
    if (bookId === activeBookId) {
      if (failedPage !== null) renderPage(failedPage, 'next', false);
      return;
    }
    cancelPendingPage();
    activeBookId = bookId;
    totalPages = books[activeBookId].totalPages;
    pageBasePath = books[activeBookId].basePath;
    currentPage = savedPages[activeBookId];
    hasLoadedPage = false;
    pageImage.style.visibility = 'hidden';
    stage.scrollLeft = stage.scrollTop = 0;
    updateBookPresentation();
    createThumbnails();
    updateZoom(100);
    renderPage(currentPage, 'next', false);
  };

  bookSection.querySelectorAll('[data-book-id]').forEach(tab => {
    tab.addEventListener('click', () => {
      switchBook(tab.dataset.bookId);
    });
  });

  bookSection.querySelectorAll('[data-read-book]').forEach(button => {
    button.addEventListener('click', () => {
      switchBook(button.dataset.readBook);
      reader.scrollIntoView({ behavior: 'auto', block: 'start' });
      stage.focus({ preventScroll: true });
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cancelPaperTurn) {
      cancelPaperTurn();
      isBusy = false;
      updatePageControls();
    }
    if (!document.hidden && isBusy && !pendingImage && hasLoadedPage) {
      cancelPaperTurn?.();
      isBusy = false;
      updatePageControls();
    }
  });
});
