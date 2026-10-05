# SDRAFT

Media belajar gambar teknik yang dapat dipakai di desktop dan ponsel. Semua materi, simulasi, tes diagnostik, dan tes pemahaman dapat dibuka dari **Beranda Belajar** tanpa login. Identitas siswa bersifat opsional dan bisa diisi lewat ikon akun.

## Jalankan lokal

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite. Untuk mencoba dari Android atau iPhone pada jaringan Wi-Fi yang sama, jalankan `npm run dev -- --host 0.0.0.0`, lalu buka `http://IP-KOMPUTER:5173/` di browser ponsel. Jika port berubah, gunakan nomor port yang ditampilkan Vite. Firewall komputer mungkin perlu mengizinkan akses pada jaringan lokal.

## Build

```bash
npm run build
```

Hasil situs statis berada di `dist/` dan dapat diunggah ke hosting statis. Riwayat lokal tersimpan di browser masing-masing perangkat. Pengiriman ke SheetDB atau Google Apps Script dapat diatur lewat menu **Rekap di Perangkat Ini**.
