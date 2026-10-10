/* =============================================================================
   KONFIGURASI
   ============================================================================= */
const CONFIG = {
  QUESTIONS_PER_GAME: 20,
  STATIC_RATIO: 0.4,            // 40% daripada bank statik, 60% soalan dijana automatik
  SECONDS_PER_QUESTION: 25,
  POINTS_CORRECT: 10,           // markah asas jawapan betul
  MAX_TIME_BONUS: 5,            // bonus kepantasan (maks)
  STREAK_BONUS: 2,              // bonus kombo (3 betul berturut-turut ke atas)
  DWELL_MS: 800,                // tempoh jari "mengacu" sebelum belon ditembak
  FINGER_TOLERANCE_PX: 70,      // radius bantuan sasaran untuk mod jari
  CLAP_THRESHOLD: 0.5,          // kepekaan tepukan (0–1, lebih rendah = lebih peka)
  LEADERBOARD_SIZE: 10,
  STORAGE_KEY: 'belonTeoriMuzikAR_v1',
  MEDIAPIPE_BUNDLE: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
  MEDIAPIPE_WASM:   'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  HAND_MODEL: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
};

/* =============================================================================
   BANK SOALAN — Bidang 3.0 Teori Muzik (DSKP KSSM Seni Muzik SSeM)
   Format: { sp: Standard Pembelajaran, t: topik, q: soalan,
             a: [JAWAPAN BETUL, pengganggu1, pengganggu2, pengganggu3],
             staff: {clef:'treble'|'bass', s: kedudukan} (pilihan, lukis not pada staf)
             s = 0 garisan bawah, 2 garisan ke-2, ... 8 garisan atas; negatif = bawah staf }
   Pilihan jawapan dirawak semasa permainan.
   ============================================================================= */
const BANK = {
  T2: [
    {sp:'3.1.1', t:'Nilai Not', q:'Dalam meter 2/2 (detik minim), not semibrif bernilai…', a:['2 detik','4 detik','1 detik','½ detik']},
    {sp:'3.1.1', t:'Nilai Not', q:'Berapakah bilangan kuaver yang sama nilai dengan satu minim?', a:['4','2','8','6']},
    {sp:'3.1.1', t:'Not Bertitik', q:'Minim bertitik sama nilai dengan berapa krocet?', a:['3 krocet','2 krocet','4 krocet','1½ krocet']},
    {sp:'3.1.1', t:'Tanda Rehat', q:'Dua tanda rehat kuaver sama nilai dengan satu tanda rehat…', a:['Krocet','Minim','Semibrif','Semikuaver']},
    {sp:'3.1.1', t:'Triplet', q:'Triplet kuaver ialah tiga kuaver yang dimainkan dalam masa…', a:['2 kuaver','3 kuaver','4 kuaver','1 kuaver']},
    {sp:'3.1.1', t:'Tie', q:'Apakah fungsi tie?', a:['Menyambung nilai dua not sama pic','Memainkan not putus-putus','Menyambung not berlainan pic','Mengulang bar']},
    {sp:'3.1.1', t:'Klef', q:'Klef trebel juga dikenali sebagai…', a:['Klef G','Klef F','Klef C','Klef bes']},
    {sp:'3.1.1', t:'Bacaan Notasi', q:'Namakan not pada klef trebel ini.', staff:{clef:'treble',s:2}, a:['G','B','E','F']},
    {sp:'3.1.1', t:'Bacaan Notasi', q:'Namakan not pada klef bes ini.', staff:{clef:'bass',s:8}, a:['A','F','C','G']},
    {sp:'3.1.1', t:'Garisan Lejer', q:'Not pada garisan lejer pertama di bawah staf klef trebel ialah…', staff:{clef:'treble',s:-2}, a:['C tengah','A','D','B']},
    {sp:'3.1.1', t:'Garisan Lejer', q:'Not pada garisan lejer pertama di atas staf klef bes ialah…', staff:{clef:'bass',s:10}, a:['C tengah','B','D','E']},
    {sp:'3.1.2', t:'Meter Lazim', q:'Dalam meter 3/2, angka atas "3" bermaksud…', a:['3 detik dalam satu bar','3 bar dalam lagu','Detik ialah minim','Tempo lagu ialah 3']},
    {sp:'3.1.2', t:'Meter Lazim', q:'Dalam meter 2/2, angka bawah "2" mewakili detik…', a:['Minim','Krocet','Kuaver','Semibrif']},
    {sp:'3.1.2', t:'Meter Lazim', q:'Satu bar dalam meter 3/8 mengandungi jumlah nilai…', a:['3 kuaver','3 krocet','3 minim','8 kuaver']},
    {sp:'3.1.2', t:'Pengumpulan Not', q:'Bar 4/2 sudah ada satu semibrif dan satu minim. Apakah nilai yang perlu ditambah?', a:['1 minim','1 krocet','1 semibrif','1 kuaver']},
    {sp:'3.1.3', t:'Tanda Nada', q:'Tanda nada skel B♭ major mempunyai…', a:['2 flat (B♭, E♭)','1 flat (B♭)','3 flat','2 syap']},
    {sp:'3.1.3', t:'Tanda Nada', q:'Tanda nada skel A major mempunyai…', a:['3 syap (F♯ C♯ G♯)','2 syap','3 flat','4 syap']},
    {sp:'3.1.3', t:'Nama Teknikal', q:'Nama teknikal bagi darjah ke-5 dalam skel ialah…', a:['Dominan','Subdominan','Median','Tonik']},
    {sp:'3.1.3', t:'Nama Teknikal', q:'Dalam skel E♭ major, not B♭ dikenali sebagai…', a:['Dominan','Subdominan','Submedian','Supertonik']},
    {sp:'3.1.4', t:'Minor Harmonik', q:'Not yang dinaikkan dalam skel A minor harmonik ialah…', a:['G♯','F♯','C♯','D♯']},
    {sp:'3.1.5', t:'Minor Melodik', q:'Tanda kromat bagi skel D minor melodik menaik ialah…', a:['B♮ dan C♯','B♭ dan C','C♯ sahaja','F♯ dan G♯']},
    {sp:'3.1.5', t:'Minor Melodik', q:'Skel minor melodik semasa menurun adalah sama seperti skel…', a:['Minor asli','Minor harmonik','Major','Kromatik']},
    {sp:'3.1.6', t:'Jeda', q:'Jeda dari A ke E (menaik) ialah…', a:['Perfek ke-5','Perfek ke-4','Major ke-6','Major ke-3']},
    {sp:'3.1.6', t:'Jeda', q:'Jeda dari E♭ ke C (menaik) ialah…', a:['Major ke-6','Minor ke-6','Major ke-7','Perfek ke-5']},
    {sp:'3.1.7', t:'Jeda', q:'Dalam skel D minor harmonik, jeda dari D ke C♯ ialah…', a:['Major ke-7','Minor ke-7','Oktaf','Major ke-6']},
    {sp:'3.1.9', t:'Triad Tonik', q:'Triad tonik kedudukan perdu bagi B♭ major ialah…', a:['B♭ – D – F','B♭ – D♭ – F','B♭ – E♭ – G','D – F – A']},
    {sp:'3.1.10', t:'Tempo', q:'Terminologi "Allegro" bermaksud…', a:['Cepat dan riang','Perlahan','Sederhana perlahan','Semakin perlahan']},
    {sp:'3.1.10', t:'Dinamik', q:'Crescendo (cresc.) bermaksud…', a:['Beransur-ansur kuat','Beransur-ansur lembut','Sangat kuat','Kuat kemudian lembut']},
    {sp:'3.1.10', t:'Artikulasi', q:'Staccato (titik pada kepala not) bermaksud…', a:['Dimainkan pendek & terputus','Dimainkan bersambung','Dimainkan kuat','Tahan not lebih lama']},
    {sp:'3.1.10', t:'Simbol Muzik', q:'Simbol "common time" (C) sama dengan meter…', a:['4/4','2/2','3/4','2/4']},
    {sp:'3.1.10', t:'Simbol Muzik', q:'Simbol "cut time" (¢) sama dengan meter…', a:['2/2','4/4','3/2','2/4']},
    {sp:'3.1.10', t:'Arahan Persembahan', q:'Da Capo (D.C.) bermaksud…', a:['Ulang dari awal','Ulang dari tanda segno','Pergi ke coda','Tamat di sini']},
    {sp:'3.1.10', t:'Arahan Persembahan', q:'Fermata bermaksud…', a:['Tahan not lebih lama','Ulang dari awal','Main dengan pantas','Main putus-putus']},
    {sp:'3.1.10', t:'Arahan Persembahan', q:'Akhiran 1 dan 2 (1st & 2nd time bar) digunakan bersama…', a:['Tanda ulangan','Tanda penamat','Fermata','Tie']},
    {sp:'3.1.10', t:'Arahan Persembahan', q:'Coda bermaksud…', a:['Bahagian penutup lagu','Bahagian pengenalan','Ulang dari awal','Tahan not']},
    {sp:'3.1.10', t:'Dinamik', q:'Simbol "pp" (pianissimo) bermaksud…', a:['Sangat lembut','Sangat kuat','Sederhana lembut','Lembut']},
    {sp:'3.1.10', t:'Dinamik', q:'Simbol "f" (forte) bermaksud…', a:['Kuat','Lembut','Sangat kuat','Sederhana lembut']},
    {sp:'3.1.10', t:'Tempo', q:'Terminologi "Adagio" bermaksud…', a:['Perlahan','Cepat','Sangat cepat','Sederhana cepat']},
    {sp:'3.1.10', t:'Tempo', q:'Terminologi "Moderato" bermaksud…', a:['Sederhana','Sangat perlahan','Sangat cepat','Beransur perlahan']},
    {sp:'3.1.10', t:'Artikulasi', q:'Legato bermaksud…', a:['Dimainkan bersambung & lancar','Dimainkan putus-putus','Dimainkan dengan tekanan','Dimainkan sangat lembut']},
    {sp:'3.1.1', t:'Tie', q:'Satu minim disambung dengan tie kepada satu krocet (pic sama). Jumlah nilainya…', a:['3 krocet','2 krocet','4 krocet','1 minim']},
    {sp:'3.1.10', t:'Simbol Muzik', q:'Tanda penamat (double bar line tebal) menunjukkan…', a:['Lagu tamat','Ulang dari awal','Tukar meter','Tukar tanda nada']}
  ],
  T3: [
    {sp:'3.1.1', t:'Garisan Lejer', q:'Namakan not pada garisan lejer ke-3 di atas staf klef trebel.', staff:{clef:'treble',s:14}, a:['E','C','G','A']},
    {sp:'3.1.1', t:'Garisan Lejer', q:'Namakan not pada garisan lejer ke-3 di bawah staf klef trebel.', staff:{clef:'treble',s:-6}, a:['F','A','D','E']},
    {sp:'3.1.1', t:'Garisan Lejer', q:'Namakan not pada garisan lejer ke-3 di bawah staf klef bes.', staff:{clef:'bass',s:-6}, a:['A','C','F','E']},
    {sp:'3.1.1', t:'Nilai Not', q:'Berapakah bilangan semikuaver dalam satu minim bertitik?', a:['12','8','6','16']},
    {sp:'3.1.1', t:'Tanda Rehat', q:'Tanda rehat semibrif ditulis…', a:['Tergantung di bawah garisan ke-4','Duduk di atas garisan ke-3','Di bawah garisan ke-2','Di atas garisan ke-5']},
    {sp:'3.1.1', t:'Triplet', q:'Triplet krocet dimainkan dalam masa…', a:['2 krocet','3 krocet','1 krocet','1 semibrif']},
    {sp:'3.1.1', t:'Tie & Slur', q:'Slur menghubungkan not yang…', a:['Berlainan pic (legato)','Sama pic, nilai dicampur','Dimainkan staccato','Diulang dua kali']},
    {sp:'3.1.2', t:'Meter Lazim', q:'Meter lazim (simple) ialah meter yang setiap detiknya boleh dibahagi kepada…', a:['2 bahagian','3 bahagian','5 bahagian','6 bahagian']},
    {sp:'3.1.2', t:'Meter Lazim', q:'Dalam meter 2/2, setiap bar mengandungi…', a:['2 detik minim','2 detik krocet','2 detik kuaver','4 detik minim']},
    {sp:'3.1.2', t:'Simbol Meter', q:'Simbol "cut time" (¢) sama dengan meter…', a:['2/2','4/4','2/4','3/4']},
    {sp:'3.1.3', t:'Tanda Kromat', q:'Apakah fungsi tanda syap (♯)?', a:['Meninggikan pic satu semiton','Merendahkan pic satu semiton','Mengembalikan pic asal','Meninggikan pic satu ton']},
    {sp:'3.1.3', t:'Tanda Kromat', q:'Apakah fungsi tanda natural (♮)?', a:['Mengembalikan not ke pic asal','Meninggikan pic satu semiton','Merendahkan pic satu semiton','Memanjangkan not']},
    {sp:'3.1.3', t:'Tanda Nada', q:'Skel minor yang mempunyai tanda nada 1 syap ialah…', a:['E minor','D minor','A minor','B minor']},
    {sp:'3.1.3', t:'Tanda Nada', q:'Skel relatif minor bagi D major (2 syap) ialah…', a:['B minor','E minor','F♯ minor','A minor']},
    {sp:'3.1.4', t:'Minor Harmonik', q:'Dalam skel minor harmonik, jarak antara darjah ke-6 dan ke-7 ialah…', a:['1½ ton','1 ton','½ ton (semiton)','2 ton']},
    {sp:'3.1.4', t:'Minor Melodik', q:'Skel minor melodik menaik menaikkan darjah…', a:['Ke-6 dan ke-7','Ke-7 sahaja','Ke-3 dan ke-6','Ke-4 dan ke-7']},
    {sp:'3.1.4', t:'Minor Melodik', q:'Apabila skel minor melodik menurun, darjah ke-6 dan ke-7…', a:['Dikembalikan seperti minor asli','Kekal dinaikkan','Hanya ke-7 dinaikkan','Direndahkan satu ton']},
    {sp:'3.1.4', t:'Minor Harmonik', q:'Tanda kromat bagi skel E minor harmonik ialah…', a:['D♯','C♯ dan D♯','F♯','G♯']},
    {sp:'3.1.4', t:'Ton & Semiton', q:'Dalam skel major, semiton berlaku di antara darjah…', a:['3–4 dan 7–8','2–3 dan 6–7','4–5 dan 7–8','1–2 dan 5–6']},
    {sp:'3.1.5', t:'Jeda', q:'Jeda dari C ke A (menaik) ialah…', a:['Major ke-6','Minor ke-6','Perfek ke-5','Major ke-7']},
    {sp:'3.1.5', t:'Jeda', q:'Jeda dari E ke C (menaik) ialah…', a:['Minor ke-6','Major ke-6','Minor ke-7','Perfek ke-5']},
    {sp:'3.1.5', t:'Jeda', q:'Jeda dari A ke C (menaik) ialah…', a:['Minor ke-3','Major ke-3','Perfek ke-4','Major ke-2']},
    {sp:'3.1.5', t:'Jeda', q:'Jeda dari C ke C di atasnya (8 darjah) ialah…', a:['Oktaf / Perfek ke-8','Major ke-7','Perfek ke-5','Unison']},
    {sp:'3.1.6', t:'Tempo', q:'Terminologi "Andante" bermaksud…', a:['Sederhana perlahan (kadar berjalan)','Sangat cepat','Beransur cepat','Sangat perlahan']},
    {sp:'3.1.6', t:'Dinamik', q:'Diminuendo (dim.) bermaksud…', a:['Beransur-ansur lembut','Beransur-ansur kuat','Sederhana kuat','Sangat kuat']},
    {sp:'3.1.6', t:'Arahan Persembahan', q:'Dal Segno (D.S.) bermaksud…', a:['Ulang dari tanda segno','Ulang dari awal','Pergi ke coda','Mainkan akhiran kedua']},
    {sp:'3.1.6', t:'Tempo', q:'M.M. ♩ = 100 bermaksud…', a:['100 detik krocet seminit','100 bar seminit','100 not dalam lagu','Lagu selama 100 saat']},
    {sp:'3.1.6', t:'Artikulasi', q:'Tanda tekanan (>) pada not bermaksud…', a:['Not dimainkan dengan tekanan','Not dimainkan pendek','Tahan not lebih lama','Mainkan dengan lembut']},
    {sp:'3.1.7', t:'Mengedit Skor', q:'Susunan yang betul pada permulaan staf ialah…', a:['Klef → Tanda nada → Meter','Meter → Klef → Tanda nada','Tanda nada → Klef → Meter','Klef → Meter → Tanda nada']},
    {sp:'3.1.7', t:'Mengedit Skor', q:'Batang not (stem) bagi not di atas garisan ke-3 ditulis…', a:['Ke bawah, sebelah kiri kepala not','Ke atas, sebelah kanan kepala not','Ke atas, sebelah kiri kepala not','Ke bawah, sebelah kanan kepala not']},
    {sp:'3.1.6', t:'Tempo', q:'Ritardando (rit.) bermaksud…', a:['Beransur-ansur perlahan','Beransur-ansur cepat','Kembali ke tempo asal','Sangat cepat']},
    {sp:'3.1.6', t:'Tempo', q:'Accelerando (accel.) bermaksud…', a:['Beransur-ansur cepat','Beransur-ansur perlahan','Sangat perlahan','Tahan not']},
    {sp:'3.1.6', t:'Tempo', q:'"A tempo" bermaksud…', a:['Kembali ke tempo asal','Beransur cepat','Bebas tempo','Berhenti seketika']},
    {sp:'3.1.6', t:'Tempo', q:'Terminologi "Presto" bermaksud…', a:['Sangat cepat','Sederhana','Perlahan','Sangat perlahan']},
    {sp:'3.1.6', t:'Tempo', q:'Terminologi "Largo" bermaksud…', a:['Sangat perlahan & luas','Cepat & riang','Sederhana cepat','Beransur cepat']},
    {sp:'3.1.6', t:'Dinamik', q:'Simbol "mp" (mezzo piano) bermaksud…', a:['Sederhana lembut','Sederhana kuat','Sangat lembut','Kuat']},
    {sp:'3.1.6', t:'Dinamik', q:'Simbol "ff" (fortissimo) bermaksud…', a:['Sangat kuat','Kuat','Sangat lembut','Sederhana kuat']},
    {sp:'3.1.6', t:'Arahan Persembahan', q:'Segno ialah simbol yang menunjukkan…', a:['Tempat mula ulangan D.S.','Bahagian penutup','Tamat lagu','Tahan not']},
    {sp:'3.1.6', t:'Arahan Persembahan', q:'"D.C. al Fine" bermaksud…', a:['Ulang dari awal hingga Fine','Ulang dari segno hingga coda','Pergi terus ke Fine','Ulang bar terakhir']},
    {sp:'3.1.6', t:'Artikulasi', q:'Tenuto (garis pendek pada not) bermaksud…', a:['Tahan not penuh nilainya','Mainkan sangat pendek','Mainkan sangat kuat','Langkau not']},
    {sp:'3.1.7', t:'Mengedit Skor', q:'Tanda nada ditulis…', a:['Selepas klef, sebelum meter','Sebelum klef','Selepas meter','Di hujung staf']},
    {sp:'3.1.7', t:'Mengedit Skor', q:'Not yang berada TEPAT pada garisan ke-3 lazimnya ditulis dengan batang…', a:['Ke bawah','Ke atas sahaja','Tanpa batang','Di tengah kepala not']},
    {sp:'3.1.7', t:'Mengedit Skor', q:'Batang not bagi not di bawah garisan ke-3 ditulis…', a:['Ke atas, sebelah kanan kepala not','Ke bawah, sebelah kanan','Ke atas, sebelah kiri','Ke bawah, sebelah kiri']},
    {sp:'3.1.7', t:'Mengedit Skor', q:'Bendera (flag) kuaver sentiasa ditulis…', a:['Di sebelah kanan batang not','Di sebelah kiri batang not','Di bawah kepala not','Tanpa batang']}
  ]
};

/* =============================================================================
   UTILITI
   ============================================================================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function showScreen(id){ $$('.screen').forEach(s => s.classList.toggle('show', s.id === id)); }
const LEVEL_NAME = {T2:'Tingkatan 2', T3:'Tingkatan 3', MIX:'Campuran T2+T3'};

/* Lukis staf + not (SVG) untuk soalan bacaan notasi */
function staffSVG(clef, s){
  const gap = 12, bottom = 0, x0 = 8, x1 = 212, nx = 140;
  const yOf = k => bottom - k * gap / 2;
  const ny = yOf(s);
  const minY = Math.min(yOf(8), ny) - gap, maxY = Math.max(yOf(0), ny) + gap;
  let g = '';
  for (let i = 0; i < 5; i++) g += `<line x1="${x0}" x2="${x1}" y1="${yOf(i*2)}" y2="${yOf(i*2)}" stroke="#222" stroke-width="1.6"/>`;
  g += `<line x1="${x0}" x2="${x0}" y1="${yOf(8)}" y2="${yOf(0)}" stroke="#222" stroke-width="2"/>`;
  for (let k = -2; k >= s; k -= 2) g += `<line x1="${nx-17}" x2="${nx+17}" y1="${yOf(k)}" y2="${yOf(k)}" stroke="#222" stroke-width="1.6"/>`;
  for (let k = 10; k <= s; k += 2) g += `<line x1="${nx-17}" x2="${nx+17}" y1="${yOf(k)}" y2="${yOf(k)}" stroke="#222" stroke-width="1.6"/>`;
  // label klef (teks — mesra semua telefon)
  const lbl = clef === 'treble' ? 'Klef Trebel' : 'Klef Bes';
  g += `<rect x="14" y="${yOf(6)-2}" width="78" height="${gap*2+4}" rx="6" fill="${clef==='treble'?'#ff4d6d':'#4dabf7'}"/>`;
  g += `<text x="53" y="${yOf(4)+5}" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${lbl}</text>`;
  // not semibrif
  g += `<ellipse cx="${nx}" cy="${ny}" rx="9" ry="6.2" fill="#222" transform="rotate(-18 ${nx} ${ny})"/>`;
  g += `<ellipse cx="${nx}" cy="${ny}" rx="4.2" ry="2.8" fill="#fff" transform="rotate(48 ${nx} ${ny})"/>`;
  return `<svg viewBox="0 ${minY} 220 ${maxY-minY}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

/* =============================================================================
   PENJANA SOALAN DINAMIK — beratus-ratus variasi soalan baharu setiap kali main
   (semua jawapan dikira secara automatik menggunakan teori muzik, bukan hafalan)
   ============================================================================= */
const Theory = (() => {
  const L = 'CDEFGAB', PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  const parse = n => ({ l: n[0], a: n.includes('♯') ? 1 : n.includes('♭') ? -1 : 0 });
  const name = n => n.l + ACC[n.a];
  const pc = n => (PC[n.l] + n.a + 120) % 12;
  const STEPS = {
    major: [0, 2, 4, 5, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11],
    melUp: [0, 2, 3, 5, 7, 9, 11], natMin: [0, 2, 3, 5, 7, 8, 10]
  };
  function scale(tonic, type){          // eja skel dengan nama huruf yang betul
    const t = parse(tonic), i0 = L.indexOf(t.l), base = pc(t);
    return STEPS[type].map((st, d) => {
      const l = L[(i0 + d) % 7]; let a = ((base + st) - PC[l]) % 12;
      if (a > 6) a -= 12; if (a < -6) a += 12; return { l, a };
    });
  }
  const INT = { 2: { 1: 'Minor ke-2', 2: 'Major ke-2' }, 3: { 3: 'Minor ke-3', 4: 'Major ke-3' }, 4: { 5: 'Perfek ke-4' },
    5: { 7: 'Perfek ke-5' }, 6: { 8: 'Minor ke-6', 9: 'Major ke-6' }, 7: { 10: 'Minor ke-7', 11: 'Major ke-7' }, 8: { 12: 'Oktaf' } };
  function interval(a, b){              // jeda menaik dari a ke b
    const A = typeof a === 'string' ? parse(a) : a, B = typeof b === 'string' ? parse(b) : b;
    let num = (L.indexOf(B.l) - L.indexOf(A.l) + 7) % 7 + 1; let semi = (pc(B) - pc(A) + 12) % 12;
    if (num === 1 && semi === 0) { num = 8; semi = 12; }
    return (INT[num] || {})[semi] || null;
  }
  const KEYSIG = { C: 0, G: 1, D: 2, A: 3, F: -1, 'B♭': -2, 'E♭': -3 };
  const MINSIG = { A: 0, E: 1, B: 2, 'F♯': 3, D: -1, G: -2, C: -3 };
  const sigText = n => n === 0 ? 'Tiada syap / flat' : n > 0
    ? `${n} syap (${['F♯', 'C♯', 'G♯'].slice(0, n).join(', ')})` : `${-n} flat (${['B♭', 'E♭', 'A♭'].slice(0, -n).join(', ')})`;
  return { L, PC, parse, name, pc, scale, interval, KEYSIG, MINSIG, sigText };
})();

const Gen = (() => {
  const R = arr => arr[Math.floor(Math.random() * arr.length)];
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  // pilih 3 pengganggu unik (utamakan yang "hampir" dahulu)
  function opts(correct, near, pool){
    correct = String(correct);
    const out = [correct], push = x => { x = String(x); if (!out.includes(x)) out.push(x); };
    shuffle(near || []).forEach(x => out.length < 4 && push(x));
    shuffle(pool || []).forEach(x => out.length < 4 && push(x));
    return out.length === 4 ? out : null;
  }
  const TECH = ['Tonik', 'Supertonik', 'Median', 'Subdominan', 'Dominan', 'Submedian', 'Leading note'];
  const VAL = { 24: 'semibrif bertitik', 16: 'semibrif', 12: 'minim bertitik', 8: 'minim', 6: 'krocet bertitik', 4: 'krocet', 3: 'kuaver bertitik', 2: 'kuaver', 1: 'semikuaver' };
  const PLAIN = [[16, 'semibrif'], [8, 'minim'], [4, 'krocet'], [2, 'kuaver'], [1, 'semikuaver']];
  const BEAT = { 2: ['minim', 8], 4: ['krocet', 4], 8: ['kuaver', 2] };
  const INTS = ['Major ke-2', 'Major ke-3', 'Minor ke-3', 'Perfek ke-4', 'Perfek ke-5', 'Major ke-6', 'Minor ke-6', 'Major ke-7', 'Oktaf'];
  const LEVEL = {
    T2: { majors: ['A', 'B♭', 'E♭'], minors: ['A', 'E', 'D'], meters: ['2/2', '3/2', '4/2', '3/8'], sMin: -4, sMax: 12 },
    T3: { majors: ['C', 'G', 'D', 'A', 'F', 'B♭', 'E♭'], minors: ['A', 'E', 'B', 'D', 'G', 'C'], meters: ['2/4', '3/4', '4/4', '2/2', '3/2', '4/2', '3/8'], sMin: -8, sMax: 16 }
  };
  const nm = Theory.name;

  const G = {
    /* 3.1.1 Bacaan notasi pada klef trebel & bes */
    readNote(lv){
      const c = LEVEL[lv], clef = R(['treble', 'bass']);
      let s = ri(c.sMin, c.sMax);
      if (lv === 'T3' && Math.random() < .65) s = R([-8, -7, -6, -5, 13, 14, 15, 16]);  // melebihi 2 garisan lejer
      const base = clef === 'treble' ? 30 : 18, idx = base + s, letter = Theory.L[idx % 7];
      const near = [Theory.L[(idx + 1) % 7], Theory.L[(idx + 6) % 7], Theory.L[(idx + 2) % 7], Theory.L[(idx + 5) % 7]];
      const where = s < 0 ? 'di bawah staf' : s > 8 ? 'di atas staf' : 'pada staf';
      return { sp: '3.1.1', t: 'Bacaan Notasi', q: `Namakan not ${where} klef ${clef === 'treble' ? 'trebel' : 'bes'} ini.`,
        staff: { clef, s }, a: opts(letter, near, [...Theory.L]) };
    },
    /* 3.1.1 Nilai not */
    noteRatio(){
      const [bv, bn] = R([[16, 'semibrif'], [12, 'minim bertitik'], [8, 'minim'], [6, 'krocet bertitik'], [4, 'krocet'], [24, 'semibrif bertitik']]);
      const smalls = PLAIN.filter(([v]) => v < bv && bv % v === 0 && bv / v <= 16);
      const [sv, sn] = R(smalls), k = bv / sv;
      return { sp: '3.1.1', t: 'Nilai Not', q: `Berapakah bilangan ${sn} yang sama nilai dengan satu ${bn}?`,
        a: opts(k, [k * 2, k / 2, k + 1, k - 1, k + 2].filter(x => Number.isInteger(x) && x > 0 && x !== k), [2, 3, 4, 6, 8, 12, 16]) };
    },
    noteSum(){
      const keys = Object.keys(VAL).map(Number);
      for (let tries = 0; tries < 40; tries++) {
        const a = R(keys.filter(v => v <= 12)), b = R(keys.filter(v => v <= 8)), sum = a + b;
        if (!VAL[sum] || a === 1 && b === 1) continue;
        const correct = VAL[sum];
        return { sp: '3.1.1', t: 'Nilai Not', q: `Satu ${VAL[a]} + satu ${VAL[b]} sama nilai dengan satu…`,
          a: opts(cap(correct), [], Object.values(VAL).map(cap)) };
      }
      return null;
    },
    restPair(){
      const [v, n] = R(PLAIN.slice(1)), big = PLAIN.find(p => p[0] === v * 2);
      return { sp: '3.1.1', t: 'Tanda Rehat', q: `Dua tanda rehat ${n} sama nilai dengan satu tanda rehat…`,
        a: opts(cap(big[1]), [], PLAIN.map(p => cap(p[1]))) };
    },
    triplet(lv){
      const [n, eq] = R(lv === 'T2' ? [['kuaver', 'krocet'], ['semikuaver', 'kuaver'], ['krocet', 'minim']] : [['kuaver', 'krocet'], ['krocet', 'minim']]);
      return Math.random() < .5
        ? { sp: '3.1.1', t: 'Triplet', q: `Triplet ${n} (3 not) dimainkan dalam masa berapa ${n} biasa?`, a: opts(`2 ${n}`, [`3 ${n}`, `4 ${n}`, `1 ${n}`], []) }
        : { sp: '3.1.1', t: 'Triplet', q: `Satu kumpulan triplet ${n} sama nilai dengan satu…`, a: opts(cap(eq), [], ['Semibrif', 'Minim', 'Krocet', 'Kuaver', 'Semikuaver']) };
    },
    /* 3.1.2 Meter lazim */
    meterBar(lv){
      const m = R(LEVEL[lv].meters), [top, bot] = m.split('/').map(Number), [bn] = BEAT[bot];
      const others = Object.values(BEAT).map(b => b[0]).filter(x => x !== bn);
      return { sp: '3.1.2', t: 'Meter Lazim', q: `Satu bar dalam meter ${m} mengandungi jumlah nilai…`,
        a: opts(`${top} ${bn}`, [`${top} ${others[0]}`, `${top} ${others[1]}`, `${top + 1} ${bn}`, `${bot} ${bn}`], []) };
    },
    meterCount(lv){
      const m = R(LEVEL[lv].meters), [top, bot] = m.split('/').map(Number), units = top * BEAT[bot][1];
      const [sv, sn] = R(PLAIN.filter(([v]) => v < units && units % v === 0 && units / v <= 16 && units / v >= 2));
      const k = units / sv;
      return { sp: '3.1.2', t: 'Pengumpulan Not', q: `Berapakah bilangan ${sn} yang memenuhi satu bar meter ${m}?`,
        a: opts(k, [k * 2, k / 2, k + 1, k - 1, top].filter(x => Number.isInteger(x) && x > 0 && x !== k), [2, 3, 4, 6, 8, 12]) };
    },
    meterComplete(lv){
      const m = R(LEVEL[lv].meters), [top, bot] = m.split('/').map(Number), units = top * BEAT[bot][1];
      const vals = [16, 12, 8, 6, 4, 3, 2, 1];
      for (let tries = 0; tries < 60; tries++) {
        const miss = R(vals.filter(v => v < units && v >= BEAT[bot][1] / 2)); let rest = units - miss;
        const have = [];
        while (rest > 0 && have.length < 3) { const v = R(vals.filter(x => x <= rest && (rest - x === 0 || vals.some(y => y <= rest - x)))); have.push(v); rest -= v; }
        if (rest !== 0 || !have.length) continue;
        const list = have.map(v => VAL[v]).join(', ');
        return { sp: '3.1.2', t: 'Pengumpulan Not', q: `Bar meter ${m} sudah ada: ${list}. Satu not apakah yang melengkapkan bar ini?`,
          a: opts(cap(VAL[miss]), [], Object.values(VAL).map(cap)) };
      }
      return null;
    },
    meterLower(lv){
      const m = R(LEVEL[lv].meters), [top, bot] = m.split('/').map(Number);
      return Math.random() < .5
        ? { sp: '3.1.2', t: 'Maksud Angka Meter', q: `Dalam meter ${m}, angka bawah "${bot}" mewakili detik…`, a: opts(cap(BEAT[bot][0]), [], ['Semibrif', 'Minim', 'Krocet', 'Kuaver', 'Semikuaver']) }
        : { sp: '3.1.2', t: 'Maksud Angka Meter', q: `Dalam meter ${m}, angka atas "${top}" bermaksud…`,
            a: opts(`${top} detik sesuatu bar`, [`${bot} detik sesuatu bar`, `${top} bar dalam lagu`, `Tempo ${top} detik seminit`, `Nilai not ${top} kali ganda`], []) };
    },
    /* 3.1.3 Tanda nada */
    keySig(lv){
      const majors = LEVEL[lv].majors, k = R(majors), sig = Theory.KEYSIG[k];
      const allSigs = [-3, -2, -1, 0, 1, 2, 3].map(Theory.sigText);
      return Math.random() < .5
        ? { sp: '3.1.3', t: 'Tanda Nada', q: `Tanda nada bagi skel ${k} major ialah…`, a: opts(Theory.sigText(sig), [-sig, sig + Math.sign(sig || 1)].filter(x => Math.abs(x) <= 3).map(Theory.sigText), allSigs) }
        : { sp: '3.1.3', t: 'Tanda Nada', q: `Skel major yang mempunyai tanda nada ${Theory.sigText(sig)} ialah…`,
            a: opts(`${k} major`, [], Object.keys(Theory.KEYSIG).map(x => `${x} major`)) };
    },
    minorSig(lv){
      const k = R(LEVEL[lv].minors), sig = Theory.MINSIG[k];
      const rel = Object.keys(Theory.KEYSIG).find(x => Theory.KEYSIG[x] === sig);
      return lv === 'T3' && Math.random() < .5
        ? { sp: '3.1.3', t: 'Relatif Major/Minor', q: `Skel relatif major bagi ${k} minor ialah…`, a: opts(`${rel} major`, [`${k} major`], Object.keys(Theory.KEYSIG).map(x => `${x} major`)) }
        : { sp: '3.1.3', t: 'Tanda Nada', q: `Tanda nada bagi skel ${k} minor ialah…`, a: opts(Theory.sigText(sig), [Theory.sigText(-sig)], [-3, -2, -1, 0, 1, 2, 3].map(Theory.sigText)) };
    },
    /* 3.1.3 Nama teknikal */
    techName(lv){
      const isMaj = Math.random() < .55, k = isMaj ? R(LEVEL[lv].majors) : R(LEVEL[lv].minors);
      const sc = Theory.scale(k, isMaj ? 'major' : 'harm'), d = ri(1, 6), label = `${k} ${isMaj ? 'major' : 'minor harmonik'}`;
      const notes = sc.map(nm);
      return Math.random() < .5
        ? { sp: '3.1.3', t: 'Nama Teknikal', q: `Dalam skel ${label}, not ${TECH[d]} ialah…`, a: opts(notes[d], notes.filter((_, i) => i !== d), []) }
        : { sp: '3.1.3', t: 'Nama Teknikal', q: `Dalam skel ${label}, not ${notes[d]} dikenali sebagai…`, a: opts(TECH[d], [TECH[(d + 1) % 7], TECH[(d + 6) % 7]], TECH) };
    },
    /* 3.1.4 / 3.1.5 Skel minor harmonik & melodik — tanda kromat */
    minorAccidental(lv){
      const k = R(LEVEL[lv].minors), nat = Theory.scale(k, 'natMin'), h = Theory.scale(k, 'harm'), m = Theory.scale(k, 'melUp');
      const natural = n => n.a === 0 ? n.l + '♮' : nm(n);
      const melAns = `${natural(m[5])} dan ${natural(m[6])}`;
      if (Math.random() < .5) {
        return { sp: '3.1.4', t: 'Minor Harmonik', q: `Tanda kromat (not darjah ke-7 dinaikkan) dalam skel ${k} minor harmonik ialah…`,
          a: opts(natural(h[6]), [nm(nat[6]), natural(m[5]), nm({ l: h[5].l, a: h[5].a + 1 })], ['G♯', 'D♯', 'C♯', 'A♯', 'F♯', 'B♮', 'E♭']) };
      }
      return { sp: lv === 'T2' ? '3.1.5' : '3.1.4', t: 'Minor Melodik', q: `Tanda kromat dalam skel ${k} minor melodik (menaik) ialah…`,
        a: opts(melAns, [`${natural(h[6])} sahaja`, `${nm(nat[5])} dan ${natural(h[6])}`, `${natural(m[6])} dan ${nm({ l: m[0].l, a: m[0].a + 1 })}`], []) };
    },
    /* 3.1.6–3.1.8 / T3 3.1.5 Jeda */
    intervalScale(lv){
      const pick = Math.random();
      let k, type, degs, label;
      if (pick < .45) { k = R(LEVEL[lv].majors); type = 'major'; degs = [1, 2, 3, 4, 5, 6, 7]; label = `${k} major`; }
      else if (pick < .8 || lv === 'T3') { k = R(LEVEL[lv].minors); type = 'harm'; degs = [1, 2, 3, 4, 5, 6, 7]; label = `${k} minor harmonik`; }
      else { k = R(LEVEL[lv].minors); type = 'melUp'; degs = [1, 2, 3, 4, 5, 7]; label = `${k} minor melodik`; }
      const sc = Theory.scale(k, type), d = R(degs);
      const target = d === 7 ? sc[0] : sc[d], ans = Theory.interval(sc[0], target);
      if (!ans) return null;
      const num = ans.match(/\d/) ? ans.match(/\d/)[0] : null;
      const near = INTS.filter(x => x !== ans && num && x.includes(num));
      return { sp: lv === 'T2' ? '3.1.6' : '3.1.5', t: 'Jeda', q: `Dalam skel ${label}, jeda dari ${nm(sc[0])} ke ${nm(target)}${d === 7 ? ' (8 darjah di atas)' : ''} (menaik) ialah…`,
        a: opts(ans, near, INTS) };
    },
    /* T2 3.1.9 Triad tonik */
    triad(lv){
      const isMaj = Math.random() < .5, k = isMaj ? R(LEVEL[lv].majors) : R(LEVEL[lv].minors);
      const sc = Theory.scale(k, isMaj ? 'major' : 'harm'), tri = n => n.map(nm).join(' – ');
      const correct = tri([sc[0], sc[2], sc[4]]);
      const alt3 = { l: sc[2].l, a: sc[2].a + (isMaj ? -1 : 1) };
      return { sp: '3.1.9', t: 'Triad Tonik', q: `Triad tonik kedudukan perdu bagi skel ${k} ${isMaj ? 'major' : 'minor'} ialah…`,
        a: opts(correct, [tri([sc[0], alt3, sc[4]]), tri([sc[0], sc[3], sc[5]]), tri([sc[2], sc[4], sc[6]]), tri([sc[0], sc[2], sc[5]])], []) };
    },
    /* T3 3.1.3 Fungsi syap, flat, natural */
    accidental(){
      const type = R(['sharp', 'flat', 'natural']), l = R(type === 'sharp' ? ['C', 'D', 'F', 'G', 'A'] : type === 'flat' ? ['D', 'E', 'G', 'A', 'B'] : [...Theory.L]);
      if (type === 'sharp') return { sp: '3.1.3', t: 'Tanda Kromat', q: `Not ${l} dinaikkan satu semiton menggunakan tanda syap menjadi…`, a: opts(l + '♯', [l + '♭', l + '♮', Theory.L[(Theory.L.indexOf(l) + 1) % 7] + '♯'], []) };
      if (type === 'flat') return { sp: '3.1.3', t: 'Tanda Kromat', q: `Not ${l} direndahkan satu semiton menggunakan tanda flat menjadi…`, a: opts(l + '♭', [l + '♯', l + '♮', Theory.L[(Theory.L.indexOf(l) + 6) % 7] + '♭'], []) };
      const from = R([l + '♯', l + '♭']);
      return { sp: '3.1.3', t: 'Tanda Kromat', q: `Tanda natural (♮) diletakkan pada not ${from}. Not itu kini dibaca sebagai…`, a: opts(l, [from === l + '♯' ? l + '♭' : l + '♯', from, Theory.L[(Theory.L.indexOf(l) + 1) % 7], Theory.L[(Theory.L.indexOf(l) + 6) % 7]], []) };
    },
    /* T3 3.1.4 Ton & semiton */
    toneSemi(){
      const i = ri(0, 6), a = { l: Theory.L[i], a: 0 }, b = { l: Theory.L[(i + 1) % 7], a: 0 };
      if (Math.random() < .35) b.a = R([-1, 1]);
      const semi = (Theory.pc(b) - Theory.pc(a) + 12) % 12;
      const ans = { 1: 'Semiton (½ ton)', 2: 'Ton (1 ton)', 3: '1½ ton', 0: null }[semi];
      if (!ans) return null;
      return { sp: '3.1.4', t: 'Ton & Semiton', q: `Jarak antara not ${nm(a)} dan ${nm(b)} (menaik) ialah…`, a: opts(ans, [], ['Semiton (½ ton)', 'Ton (1 ton)', '1½ ton', '2 ton']) };
    }
  };
  function cap(s){ return s[0].toUpperCase() + s.slice(1); }
  const BY_LEVEL = {
    T2: ['readNote', 'readNote', 'noteRatio', 'noteSum', 'restPair', 'triplet', 'meterBar', 'meterCount', 'meterComplete', 'meterLower',
         'keySig', 'minorSig', 'techName', 'minorAccidental', 'intervalScale', 'intervalScale', 'triad'],
    T3: ['readNote', 'readNote', 'noteRatio', 'noteSum', 'restPair', 'triplet', 'meterBar', 'meterCount', 'meterComplete', 'meterLower',
         'accidental', 'keySig', 'minorSig', 'techName', 'minorAccidental', 'minorAccidental', 'toneSemi', 'intervalScale', 'intervalScale']
  };
  function make(lv, n, avoid){
    const out = [], seen = new Set(avoid || []); let guard = 0, order = [];
    while (out.length < n && guard++ < n * 30) {
      if (!order.length) order = shuffle(BY_LEVEL[lv]);
      const g = order.pop(); let q = null;
      try { q = G[g](lv); } catch (e) { q = null; }
      if (!q || !q.a || q.a.length !== 4 || new Set(q.a).size !== 4) continue;
      const key = q.q + '|' + q.a[0] + '|' + (q.staff ? q.staff.clef + q.staff.s : '');
      if (seen.has(key)) continue; seen.add(key);
      q.lv = lv; q.gen = g; out.push(q);
    }
    return out;
  }
  return { make, G, BY_LEVEL };
})();

/* Sejarah soalan statik — soalan yang paling lama tidak keluar diutamakan */
const History = {
  key: CONFIG.STORAGE_KEY + '_seen',
  load(){ try { return JSON.parse(localStorage.getItem(this.key)) || { n: 0, s: {} }; } catch (e) { return { n: 0, s: {} }; } },
  pick(items, count){
    const h = this.load();
    return shuffle(items).sort((a, b) => (h.s[a.id] || 0) - (h.s[b.id] || 0)).slice(0, count);
  },
  mark(items){
    const h = this.load(); h.n++; items.forEach(q => { if (q.id) h.s[q.id] = h.n; });
    try { localStorage.setItem(this.key, JSON.stringify(h)); } catch (e) {}
  }
};

/* Bina set 20 soalan: ~40% bank statik (yang jarang keluar) + ~60% soalan jana baharu */
function buildQuiz(level){
  const N = CONFIG.QUESTIONS_PER_GAME, nStatic = Math.round(N * CONFIG.STATIC_RATIO);
  const levels = level === 'MIX' ? ['T2', 'T3'] : [level];
  const statics = levels.flatMap(lv => BANK[lv].map((q, i) => ({ ...q, lv, id: lv + '_' + i })));
  const chosen = History.pick(statics, nStatic);
  const gens = [];
  levels.forEach((lv, i) => gens.push(...Gen.make(lv, Math.ceil((N - nStatic) / levels.length))));
  const all = shuffle([...chosen, ...shuffle(gens)].slice(0, N));
  History.mark(chosen);
  return all;
}

