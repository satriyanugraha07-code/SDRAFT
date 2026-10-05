document.addEventListener('DOMContentLoaded', () => {
  const intro = document.getElementById('intro');
  if (!intro) return;

  intro.querySelectorAll('[data-intro-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.introTarget;
      document.querySelector(`.nav-item[data-target="${target}"]`)?.click();
    });
  });

  const check = intro.querySelector('.intro-check');
  const feedback = check?.querySelector('.intro-check-feedback');
  check?.querySelectorAll('[data-intro-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      const correct = button.dataset.introAnswer === 'correct';
      check.querySelectorAll('[data-intro-answer]').forEach((choice) => {
        choice.classList.toggle('selected', choice === button);
        choice.setAttribute('aria-pressed', String(choice === button));
      });
      feedback.textContent = correct
        ? 'Betul! Gambar teknik memberi informasi bentuk dan ukuran sebagai acuan pembuatan.'
        : 'Coba lagi. Gambar seni menyampaikan ekspresi atau suasana; pembuat membutuhkan gambar dengan ukuran yang jelas.';
      feedback.classList.toggle('is-correct', correct);
    });
  });
});

