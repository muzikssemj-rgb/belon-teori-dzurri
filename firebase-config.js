/* =============================================================================
   TETAPAN FIREBASE — Belon Teori Muzik AR
   -----------------------------------------------------------------------------
   Selagi apiKey kosong, aplikasi berjalan dalam "MOD PERANTI":
     • tetapan admin, soalan guru & skor murid disimpan dalam peranti itu sahaja.
   Selepas diisi (lihat PANDUAN-FIREBASE.txt), aplikasi berjalan dalam
   "MOD KELAS DALAM TALIAN":
     • guru cipta Kod Kelas → murid main melalui pautan/QR → skor masuk ke guru.
   ============================================================================= */
window.BELON_FIREBASE = {
  // 1) Tampal firebaseConfig daripada Firebase Console → Project settings → Your apps (Web)
  config: {
    apiKey: "AIzaSyDcAg-g-HokZmj0nHtddIuXj9Z6cPxhF_4",
  authDomain: "belon-muzik.firebaseapp.com",
  projectId: "belon-muzik",
  storageBucket: "belon-muzik.firebasestorage.app",
  messagingSenderId: "681194444239",
  appId: "1:681194444239:web:fd8f164f93753ded886eba",
  measurementId: "G-TTT8WZ6J89"
  },
  // 2) Akaun Authentication (Email/Password) yang dikongsi oleh SEMUA GURU.
  //    Kata laluannya "dzurri" (guru hanya taip kata laluan; emel diisi automatik).
  adminEmail: "guru@belonmuzik.app",

  // 3) Akaun Pentadbir Utama (Cikgu Dzurri sahaja) — untuk mengurus Bank Soalan Umum.
  //    Guna emel & kata laluan anda sendiri yang KUAT. Mesti sama dengan firestore.rules.
  superEmail: "dzurri@belonmuzik.app",

  // Versi SDK Firebase (tidak perlu diubah)
  sdkBase: "https://www.gstatic.com/firebasejs/10.12.2/"
};
