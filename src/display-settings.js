export function initDisplaySettings() {
  const storageKey = 'sdraft_display_settings';
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
  } catch { /* Use defaults when storage is unavailable. */ }

  const choiceButtons = [...document.querySelectorAll('[data-text-size]')];
  const contrastInput = document.getElementById('setting-high-contrast');
  const settings = {
    textSize: saved.textSize === 'large' ? 'large' : 'normal',
    highContrast: saved.highContrast === true
  };

  const apply = () => {
    document.documentElement.dataset.textSize = settings.textSize;
    document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    choiceButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.textSize === settings.textSize));
    });
    if (contrastInput) contrastInput.checked = settings.highContrast;
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* The preference still applies for this visit. */ }
  };

  choiceButtons.forEach((button) => button.addEventListener('click', () => {
    settings.textSize = button.dataset.textSize;
    apply();
  }));
  contrastInput?.addEventListener('change', () => {
    settings.highContrast = contrastInput.checked;
    apply();
  });
  apply();
}
