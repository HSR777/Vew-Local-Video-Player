# Vew — Local Video Player

Pemutar video lokal berbasis web dengan antarmuka bergaya YouTube yang dipadukan dengan prinsip desain Material 3. Seluruh proses pemutaran video berjalan sepenuhnya di sisi klien (browser) — tidak ada file yang diunggah ke server mana pun.

![Status](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![No Backend](https://img.shields.io/badge/backend-none-lightgrey)

## Daftar Isi

- [Fitur](#fitur)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Proyek](#struktur-proyek)
- [Cara Menjalankan](#cara-menjalankan)
- [Cara Pakai](#cara-pakai)
- [Kompatibilitas Browser](#kompatibilitas-browser)
- [Batasan yang Diketahui](#batasan-yang-diketahui)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Fitur

**Playlist**
- Unggah satu folder penuh video sekaligus untuk langsung membentuk daftar putar
- Unggah video satuan tanpa menghapus daftar yang sudah ada (ditambahkan ke akhir daftar)
- Validasi otomatis: judul video (nama file tanpa ekstensi) yang sama tidak dapat diunggah dua kali
- Thumbnail dan durasi dihasilkan otomatis dari setiap file video
- Pencarian judul video secara real-time
- Hapus video satuan atau bersihkan seluruh daftar putar

**Pemutaran**
- Video sebelumnya / berikutnya
- Repeat satu video
- Repeat seluruh daftar putar
- A-B Repeat (mengulang segmen tertentu dalam satu video)
- Picture-in-picture
- Layar penuh
- Mode teater (menyembunyikan panel daftar putar untuk fokus ke video)
- Kontrol kecepatan putar, volume, dan seek bar dengan indikator buffer

## Teknologi yang Digunakan

| Kategori | Teknologi |
|---|---|
| Markup | HTML5 |
| Styling | Tailwind CSS (via CDN, JIT) + CSS kustom (`style.css`) untuk token desain Material 3 |
| Logika | JavaScript (ES6+), tanpa framework atau library eksternal |
| Tipografi | Google Fonts — `Roboto Flex` dan `Space Grotesk` |
| Media | HTML5 `<video>` API, `File API`, `URL.createObjectURL` |
| API Browser | Picture-in-Picture API, Fullscreen API, Canvas API (untuk thumbnail) |

Tidak ada proses build, bundler, atau package manager yang diperlukan. Proyek ini murni *static site* tiga berkas.

## Struktur Proyek

```
vew-local-video-player/
├── index.html   # Struktur halaman & markup komponen
├── style.css    # Token warna Material 3, komponen tombol, animasi
├── script.js    # Logika playlist, pemutaran, dan kontrol
└── README.md
```

## Cara Menjalankan

Tidak memerlukan instalasi apa pun.

1. Unduh atau clone repositori ini
2. Buka `index.html` langsung di browser (klik dua kali, atau *drag and drop* ke jendela browser)

> **Catatan:** Diperlukan koneksi internet saat pertama kali membuka halaman karena Tailwind CSS dan Google Fonts dimuat dari CDN. Video yang diputar tetap diproses sepenuhnya secara lokal.

## Cara Pakai

1. Klik **Unggah Folder** untuk memilih folder berisi kumpulan video sebagai daftar putar awal, atau **Unggah Video** untuk menambahkan satu video.
2. Klik salah satu item di daftar putar untuk memutarnya.
3. Gunakan panel kontrol di bawah pemutar untuk navigasi, pengulangan, A-B repeat, picture-in-picture, layar penuh, dan mode teater.
4. Gunakan kotak pencarian di panel daftar putar untuk menemukan video berdasarkan judul.

### Pintasan keyboard

| Tombol | Aksi |
|---|---|
| `Spasi` | Putar / jeda |
| `←` / `→` | Mundur / maju 5 detik |
| `F` | Layar penuh |
| `T` | Mode teater |

## Kompatibilitas Browser

Diuji dan berjalan baik pada browser berbasis Chromium (Chrome, Edge, Brave) dan Firefox versi terbaru. Fitur Picture-in-Picture bergantung pada dukungan browser masing-masing; jika tidak didukung, aplikasi akan menampilkan pesan peringatan tanpa menghentikan pemutaran video.

## Batasan yang Diketahui

- Daftar putar tidak persisten — akan hilang saat halaman dimuat ulang, karena file diakses melalui `URL.createObjectURL` yang bersifat sementara per sesi browser.
- Membutuhkan koneksi internet untuk memuat Tailwind CSS dan font dari CDN.
- Belum ada dukungan drag-and-drop file langsung ke jendela aplikasi.

## Kontribusi

Kontribusi terbuka untuk siapa saja. Alur yang disarankan:

1. Fork repositori ini
2. Buat branch baru untuk perubahan yang diajukan
3. Ajukan Pull Request dengan deskripsi perubahan yang jelas

Untuk laporan bug atau permintaan fitur, silakan buka tab **Issues**.

## Lisensi

Didistribusikan di bawah [Lisensi MIT](LICENSE). Bebas digunakan, dimodifikasi, dan didistribusikan ulang dengan tetap mencantumkan atribusi.
