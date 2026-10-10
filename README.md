# 🎈 Belon Teori Muzik AR

Permainan web AR tembak belon untuk **Teori Muzik — Pendidikan Muzik & Seni Muzik KSSM** (Menengah Rendah, Tingkatan 1–3).
Boleh dimainkan di telefon (Chrome / Safari), dipasang sebagai aplikasi (PWA) dan dimainkan tanpa internet.

**Ciri utama**

- Belon 3D terapung di atas kamera (AR). Tembak dengan ketik, acu jari ☝️ atau tepuk 👏
- Set soalan DSKP Tingkatan 2 & 3 (dijana rawak) + Bank Soalan Umum (312 soalan)
- **Admin Guru** (kata laluan daripada Cikgu Dzurri): sekolah & logo, kod kelas + QR, muat naik soalan PDF/DOCX, skor murid ke Excel/PDF
- Murid: daftar nama & kelas, skor dihantar kepada guru, PDF semakan jawapan boleh dikongsi
- Firebase (pilihan) untuk kelas PdPR jarak jauh — lihat `PANDUAN-FIREBASE.txt`

---

## 🚀 Terbitkan dengan GitHub Pages (percuma)

1. Log masuk ke **github.com** → butang **+** (atas kanan) → **New repository**
   - Repository name: `belon-teori-muzik-ar`
   - Pilih **Public** → **Create repository**
2. Dalam repository baharu, klik pautan **“uploading an existing file”**
3. Buka folder ini di komputer, **pilih SEMUA fail & folder di dalamnya** (index.html, js, lib, data, icons, …)
   dan seret ke halaman GitHub → **Commit changes**
   > Seret *kandungan* folder, bukan folder itu sendiri — `index.html` mesti berada di paras paling atas repository.
4. **Settings** → **Pages** → *Source*: **Deploy from a branch** → Branch: **main** / **(root)** → **Save**
5. Tunggu 1–2 minit. Pautan aplikasi:
   `https://NAMA-PENGGUNA-ANDA.github.io/belon-teori-muzik-ar/`

## 🔄 Kemas kini

1. Ubah fail (cth. `firebase-config.js` selepas sambung Firebase)
2. Dalam `sw.js` tukar `VERSION` (cth. `v4.0.0` → `v4.0.1`) supaya telefon murid menerima versi baharu
3. GitHub → buka fail → ikon ✏️ (edit) → tampal → **Commit changes**, atau **Add file → Upload files** untuk menggantikan fail

## 🧪 Uji di komputer

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## 📁 Struktur

| Fail / folder | Kegunaan |
|---|---|
| `index.html` | aplikasi |
| `js/` | permainan, admin, data, laporan, penghurai soalan |
| `lib/` | A-Frame, jsPDF, SheetJS, Mammoth, PDF.js, QR |
| `data/soalan-lalai.json` | Bank Soalan Umum (312 soalan) |
| `firebase-config.js` | tetapan Firebase (kosong = Mod Peranti) |
| `firestore.rules` | peraturan keselamatan Firestore |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `.nojekyll` | supaya GitHub Pages menghantar semua fail apa adanya |

Panduan lanjut: `BACA-SAYA.txt` · `PANDUAN-FIREBASE.txt` · `SEMAKAN-SKEMA.txt`

---
Dibangunkan untuk guru-guru muzik Malaysia · Cikgu Dzurri
