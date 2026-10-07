export const etiketFieldInfo = {
  school: { label: 'Nama sekolah', description: 'Menunjukkan sekolah pemilik atau pembuat gambar. Kedua contoh memakai nama SMK.', example: 'SMK NAMA SEKOLAH', maxLength: 38 },
  title: { label: 'Judul gambar', description: 'Nama benda atau pekerjaan yang digambar. Tulis singkat dan jelas agar mudah dikenali.', example: 'TUTUP BANTALAN', maxLength: 30 },
  drawingNumber: { label: 'Nomor gambar', description: 'Kode untuk mengenali, menyimpan, dan mencari dokumen gambar. Gunakan kode yang konsisten.', example: 'GT-01', maxLength: 20 },
  scale: { label: 'Skala gambar', description: 'Perbandingan ukuran gambar dengan ukuran benda. Skala ini berlaku untuk gambar bendanya.', example: '1 : 2 berarti gambar setengah ukuran benda.', options: [['1 : 1', '1 : 1 — ukuran asli'], ['1 : 2', '1 : 2 — diperkecil'], ['1 : 5', '1 : 5 — diperkecil'], ['1 : 10', '1 : 10 — diperkecil'], ['2 : 1', '2 : 1 — diperbesar'], ['5 : 1', '5 : 1 — diperbesar']] },
  unit: { label: 'Satuan ukuran', description: 'Satuan yang digunakan untuk ukuran benda pada gambar. Nyatakan satuannya agar angka tidak menimbulkan salah tafsir.', example: 'mm — milimeter', options: [['mm', 'mm — milimeter'], ['cm', 'cm — sentimeter']] },
  drawnBy: { label: 'Digambar oleh', description: 'Nama siswa atau pembuat yang bertanggung jawab menyusun gambar.', example: 'NAMA SISWA', maxLength: 24 },
  checkedBy: { label: 'Diperiksa oleh', description: 'Nama orang yang memeriksa gambar, misalnya guru mata pelajaran.', example: 'GURU MAPEL', maxLength: 24 },
  approvedBy: { label: 'Disetujui oleh', description: 'Nama pihak yang menyetujui gambar setelah pemeriksaan. Isi sesuai alur pemeriksaan di sekolah.', example: 'KEPALA LAB', maxLength: 24 },
  date: { label: 'Tanggal gambar', description: 'Tanggal dokumen gambar dibuat. Pada etiket, tanggal ditulis dengan urutan hari, bulan, dan tahun.', example: '07-10-2026', type: 'date' },
  className: { label: 'Kelas', description: 'Kelas pembuat gambar untuk membantu mengelompokkan tugas siswa.', example: 'XI TPM', maxLength: 16 },
  notes: { label: 'Keterangan', description: 'Catatan singkat yang membantu pembaca memahami dokumen atau tugas gambar.', example: 'LATIHAN GAMBAR TEKNIK', maxLength: 46 },
  material: { label: 'Bahan', description: 'Material benda atau bagian yang digambar. Isi sesuai rancangan, bukan nama alat menggambarnya.', example: 'BAJA', maxLength: 14 },
  partName: { label: 'Nama bagian', description: 'Nama bagian yang dicatat pada tabel bagian di etiket lengkap.', example: 'TUTUP BANTALAN', maxLength: 30 },
  quantity: { label: 'Jumlah', description: 'Banyaknya bagian yang dibutuhkan. Angka harus sesuai dengan rancangan benda.', example: '1', type: 'number', min: 1, max: 999 },
  registerNumber: { label: 'Nomor bagian / register', description: 'Kode bagian pada tabel. Bedakan dari nomor gambar yang mengenali seluruh dokumen.', example: '01', maxLength: 10 },
  size: { label: 'Ukuran bagian', description: 'Ringkasan ukuran bagian dalam tabel. Ukuran terperinci tetap harus dicantumkan pada gambar benda.', example: '98 × 56 × 41', maxLength: 20 },
  revision: { label: 'Perubahan', description: 'Identitas revisi untuk mencatat perubahan pada gambar. Gunakan kode sesuai ketentuan tugas.', example: 'A — revisi pertama', maxLength: 30 },
  replaces: { label: 'Pengganti dari', description: 'Nomor dokumen lama yang digantikan oleh gambar ini. Kosongkan bila belum ada penggantian.', example: 'GT-00', maxLength: 18 },
  replacedBy: { label: 'Diganti dengan', description: 'Nomor dokumen baru yang menggantikan gambar ini. Kosongkan bila gambar masih berlaku.', example: 'GT-02', maxLength: 18 },
  paper: { label: 'Format kertas', description: 'Format lembar tempat gambar dibuat. Contoh etiket selebar 185 mm ini ditempatkan pada lembar lanskap.', example: 'A4 — 297 × 210 mm dalam posisi lanskap.', options: [['A4', 'A4 — 297 × 210 mm'], ['A3', 'A3 — 420 × 297 mm']] },
  projection: { label: 'Sistem proyeksi', description: 'Simbol menunjukkan cara menata pandangan benda. Simbol harus sesuai dengan sistem proyeksi yang dipakai pada gambar.', example: 'Sudut pertama atau sudut ketiga.', options: [['first', 'Sudut pertama'], ['third', 'Sudut ketiga']] }
};

export function etiketDefaults() {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return { school: 'SMK NAMA SEKOLAH', title: 'TUTUP BANTALAN', drawingNumber: 'GT-01', scale: '1 : 1', unit: 'mm', drawnBy: 'NAMA SISWA', checkedBy: '', approvedBy: '', date, className: 'XI TPM', notes: 'LATIHAN GAMBAR TEKNIK', material: 'BAJA', partName: 'TUTUP BANTALAN', quantity: '1', registerNumber: '01', size: '98 × 56 × 41', revision: 'A', replaces: '', replacedBy: '', paper: 'A4', projection: 'first' };
}

export function normaliseEtiketValues(values) {
  const result = etiketDefaults();
  for (const [key, info] of Object.entries(etiketFieldInfo)) {
    if (typeof values?.[key] !== 'string') continue;
    const value = values[key].replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f]/g, '').trim();
    if (info.options) {
      if (info.options.some(([option]) => option === value)) result[key] = value;
    } else if (info.type === 'date') {
      const parsed = new Date(`${value}T00:00:00Z`);
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      if (valid || !value) result[key] = value;
    } else if (info.type === 'number') {
      if (/^\d{1,3}$/.test(value) && Number(value) >= info.min && Number(value) <= info.max) result[key] = value;
    } else result[key] = value.slice(0, info.maxLength || 50);
  }
  const schoolName = result.school.replace(/^SMK\b\s*/i, '').trim();
  result.school = schoolName ? `SMK ${schoolName}` : 'SMK';
  return result;
}

export function etiketDrawingValues(values) {
  const [year, month, day] = (values.date || '').split('-');
  return { ...values, date: day ? `${day}-${month}-${year}` : '' };
}

export const etiketPaper = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 }
};
