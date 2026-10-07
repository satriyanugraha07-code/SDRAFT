import { lkpdMarkup, LKPD_PATTERNS } from '../src/lkpd-markup.js';
import { createLkpdPattern } from '../src/lkpd-drawing.js';
import { openLkpdPrintPreview } from '../src/lkpd-print.js';

const STORAGE_KEY = 'draftlab_lkpd_job1_data';
const SESSION_KEY = 'draftlab_student_session';

function studentSession() {
  try {
    const student = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return student && typeof student === 'object' && student.nama ? student : null;
  } catch {
    return null;
  }
}

function todayText() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
}

export function initLkpd() {
  const section = document.getElementById('lkpd');
  if (!section || section.dataset.lkpdReady === 'true') return;
  section.innerHTML = lkpdMarkup();
  section.dataset.lkpdReady = 'true';
  const find = id => section.querySelector(`#${id}`);
  const fields = {
    name: find('lkpd-name'), className: find('lkpd-class'), absen: find('lkpd-absen'),
    date: find('lkpd-date'), score: find('lkpd-score'), paraf: find('lkpd-paraf'), note: find('lkpd-note')
  };
  const checks = Array.from(section.querySelectorAll('.lkpd-check-item input'));
  const status = find('lkpd-save-status');
  let saveTimer;
  let currentStudent = studentSession();
  let activePattern = 1;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved && typeof saved === 'object') {
      Object.entries(fields).forEach(([key, field]) => {
        if (typeof saved[key] === 'string' || typeof saved[key] === 'number') field.value = String(saved[key]);
      });
      if (Array.isArray(saved.checks)) checks.forEach((check, index) => { check.checked = saved.checks[index] === true; });
    }
  } catch {
    status.textContent = 'Isian sebelumnya belum bisa dimuat. Kamu tetap bisa mengisi lembar ini.';
  }
  if (!fields.date.value) fields.date.value = todayText();

  const payload = () => ({
    ...Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])),
    checks: checks.map(check => check.checked), updatedAt: new Date().toISOString()
  });

  const updateSheetIdentity = () => {
    const defaults = { name: 'Nama siswa', className: 'Kelas', date: '—', paraf: 'Paraf guru' };
    section.querySelectorAll('#lkpd-interactive-sheet [data-sheet-field]').forEach(cell => {
      cell.textContent = fields[cell.dataset.sheetField]?.value.trim() || defaults[cell.dataset.sheetField];
    });
  };

  const save = (explicit = false) => {
    updateSheetIdentity();
    clearTimeout(saveTimer);
    saveTimer = undefined;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload()));
      status.textContent = explicit ? 'Isian Job 1 berhasil disimpan di browser ini.' : 'Semua perubahan tersimpan di browser ini.';
      status.dataset.state = 'saved';
      return true;
    } catch {
      status.textContent = 'Browser belum bisa menyimpan isian. Isianmu tetap terlihat; cetak atau simpan PDF untuk menyimpan salinannya.';
      status.dataset.state = 'error';
      return false;
    }
  };

  const updateChecks = () => {
    const count = checks.filter(check => check.checked).length;
    find('lkpd-check-count').textContent = `${count} / 4`;
    find('lkpd-check-progress').value = count;
    find('lkpd-check-status').textContent = count === 4
      ? 'Semua sudah diperiksa. Siap dikumpulkan sesuai arahan guru.'
      : count === 0 ? 'Centang setelah kamu memeriksa hasil gambarmu.' : `${count} pemeriksaan selesai. Lanjutkan memeriksa bagian lainnya.`;
  };

  const applyStudent = (student, persist = true) => {
    currentStudent = student && typeof student === 'object' && student.nama ? student : null;
    const badge = find('lkpd-sync-badge');
    badge.hidden = !currentStudent;
    find('lkpd-account-note').hidden = !currentStudent;
    [fields.name, fields.className, fields.absen].forEach(field => {
      field.readOnly = Boolean(currentStudent);
      if (currentStudent) {
        field.setAttribute('aria-describedby', 'lkpd-sync-text');
        field.title = 'Identitas mengikuti akun siswa yang sedang masuk.';
      } else {
        field.removeAttribute('aria-describedby');
        field.removeAttribute('title');
      }
    });
    if (currentStudent) {
      fields.name.value = String(currentStudent.nama);
      fields.className.value = String(currentStudent.kelas || '');
      fields.absen.value = String(currentStudent.absen ?? '');
      find('lkpd-sync-text').textContent = `Akun siswa: ${currentStudent.nama} · ${currentStudent.kelas || 'Kelas belum diisi'} · No. ${currentStudent.absen ?? '—'}`;
      if (persist) save();
    }
    updateSheetIdentity();
  };
  applyStudent(currentStudent);
  updateChecks();

  window.addEventListener('draftlab:student-login', event => applyStudent(event.detail || studentSession()));
  window.addEventListener('draftlab:student-logout', () => {
    applyStudent(null, false);
    fields.name.value = fields.className.value = fields.absen.value = '';
    save();
  });

  Object.values(fields).forEach(field => field.addEventListener('input', () => {
    updateSheetIdentity();
    status.textContent = 'Menyimpan perubahan…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(), 350);
  }));
  checks.forEach(check => check.addEventListener('change', () => { updateChecks(); save(); }));
  window.addEventListener('pagehide', () => { if (saveTimer) save(); });
  find('btn-save-lkpd').addEventListener('click', () => save(true));

  const scrollTo = element => {
    element.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  find('lkpd-start').addEventListener('click', () => {
    scrollTo(find('lkpd-identity'));
    fields.name.focus({ preventScroll: true });
  });

  const guide = find('lkpd-pattern-modal');
  const showPattern = id => {
    const pattern = LKPD_PATTERNS.find(item => item.id === Number(id));
    if (!pattern) return;
    activePattern = pattern.id;
    find('lkpd-modal-number').textContent = `PANDUAN POLA 0${pattern.id}`;
    find('lkpd-modal-title').textContent = pattern.title;
    find('lkpd-modal-tools').textContent = pattern.tools;
    find('lkpd-modal-desc').textContent = pattern.description;
    find('lkpd-modal-tip').textContent = pattern.tip;
    const steps = find('lkpd-modal-steps');
    steps.replaceChildren(...pattern.steps.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    find('lkpd-modal-svg-box').innerHTML = createLkpdPattern(pattern.id);
    find('lkpd-modal-svg-box').style.setProperty('--pattern-soft', pattern.soft);
    find('lkpd-guide-count').textContent = `${pattern.id} / 6`;
    find('lkpd-guide-prev').disabled = pattern.id === 1;
    find('lkpd-guide-next').disabled = pattern.id === 6;
    if (!guide.open) guide.showModal();
    else guide.scrollTop = 0;
  };
  section.querySelectorAll('[data-pattern]').forEach(button => button.addEventListener('click', () => showPattern(button.dataset.pattern)));
  find('btn-guide-lkpd').addEventListener('click', () => showPattern(1));
  find('lkpd-guide-prev').addEventListener('click', () => showPattern(activePattern - 1));
  find('lkpd-guide-next').addEventListener('click', () => showPattern(activePattern + 1));
  find('lkpd-modal-close').addEventListener('click', () => guide.close());
  find('lkpd-modal-dismiss').addEventListener('click', () => guide.close());

  const resetDialog = find('lkpd-reset-dialog');
  find('btn-reset-lkpd').addEventListener('click', () => {
    find('lkpd-reset-description').textContent = currentStudent
      ? 'Checklist, nilai, paraf, dan catatan akan dikosongkan. Identitas akun siswa yang sedang masuk tetap digunakan.'
      : 'Nama, kelas, nomor absen, checklist, nilai, paraf, dan catatan akan dikosongkan. Tanggal diubah menjadi hari ini.';
    resetDialog.showModal();
  });
  find('lkpd-reset-cancel').addEventListener('click', () => resetDialog.close());
  find('lkpd-reset-confirm').addEventListener('click', () => {
    Object.values(fields).forEach(field => { field.value = ''; });
    fields.date.value = todayText();
    checks.forEach(check => { check.checked = false; });
    applyStudent(currentStudent, false);
    updateChecks();
    save();
    if (status.dataset.state !== 'error') status.textContent = 'Isian sudah dikosongkan. Kamu bisa mulai lagi.';
    resetDialog.close();
    scrollTo(find('lkpd-identity'));
    fields.name.focus({ preventScroll: true });
  });

  find('btn-print-lkpd').addEventListener('click', () => {
    save();
    openLkpdPrintPreview(section, payload());
  });
}
