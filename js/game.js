/* =============================================================================
   SESI MURID — kod kelas, nama, kelas, sumber soalan
   ============================================================================= */
const LEVELS = {
  GURU: { label: 'Soalan Guru', icon: '📄', cls: 'pink', sub: 'Set soalan yang dimuat naik oleh guru anda' },
  UMUM: { label: 'Bank Soalan Umum', icon: '📚', cls: 'green', sub: 'Soalan teori muzik Menengah Rendah (nilai not, skel, jeda, meter, terminologi…)' },
  T2:   { label: 'Tingkatan 2 (DSKP)', icon: '📘', cls: 'blue', sub: 'Klef, nilai not, meter, skel A/B♭/E♭ major & minor, jeda, triad, terminologi' },
  T3:   { label: 'Tingkatan 3 (DSKP)', icon: '📗', cls: 'blue', sub: 'Lejer >2, tie & slur, tanda kromat, minor harmonik vs melodik, jeda, edit skor' },
  MIX:  { label: 'Campuran T2 + T3', icon: '🎲', cls: 'ghost', sub: 'Cabaran: soalan daripada kedua-dua tingkatan' }
};
const Session = {
  room: null, kod: null, roomQs: [], nama: '', kelas: '',
  get recording(){ return !!(this.room && this.room.rekod !== false); },
  N(){ return clamp(+(this.room && this.room.bilSoalan) || 20, 5, 60); },
  secs(){ return clamp(+(this.room && this.room.masa) || 25, 10, 120); },
  sources(){
    const s = this.room && this.room.sumber;
    let list = s ? ['GURU', 'UMUM', 'T2', 'T3', 'MIX'].filter(k => s[k.toLowerCase()]) : ['UMUM', 'T2', 'T3', 'MIX'];
    list = list.filter(k => k !== 'GURU' || this.roomQs.length > 0);
    return list.length ? list : ['UMUM'];
  }
};

/* Soalan bank (format {q, opts[], ans}) → format permainan {q, a:[betul, …]} */
function bankQuiz(items, N, lv){
  const valid = (items || []).filter(q => q && q.q && Array.isArray(q.opts) && q.opts.length >= 2 && q.ans >= 0 && q.ans < q.opts.length)
    .map((q, i) => ({ ...q, id: lv + '_' + (q.id || i) }));
  const chosen = History.pick(valid, Math.min(N, valid.length));
  History.mark(chosen);
  return chosen.map(q => ({ q: q.q, a: [q.opts[q.ans], ...q.opts.filter((_, j) => j !== q.ans)], t: q.topik || 'Teori Muzik', lv, id: q.id }));
}

/* =============================================================================
   LOGIK PERMAINAN
   ============================================================================= */
const Game = {
  player: '', level: 'T2', qs: [], idx: 0, score: 0, correct: 0, streak: 0,
  state: 'idle',            // idle | loading | countdown | playing | answered | paused | over
  timeLeft: 0, lastTickSec: 0, wrongList: [], log: [], cur: null, clapOn: false, gyroOn: false,
  dwell: { b: null, t0: 0 }, lastClap: 0, lastId: null, lastRec: null,

  async start(level){
    if (this.state === 'loading') return;
    this.level = level; this.state = 'loading';
    CONFIG.QUESTIONS_PER_GAME = Session.N(); CONFIG.SECONDS_PER_QUESTION = Session.secs();
    let qs = [];
    try {
      if (level === 'GURU') qs = bankQuiz(Session.roomQs, Session.N(), 'GURU');
      else if (level === 'UMUM') { toast('Memuatkan bank soalan… ⏳', 1500); qs = bankQuiz(await Store.getGlobalBank(), Session.N(), 'UMUM'); }
      else qs = buildQuiz(level);
    } catch (e) { console.error(e); }
    if (!qs.length) { this.state = 'idle'; toast('Tiada soalan dalam set ini. Pilih set lain.'); return; }
    this.qs = qs;
    this.idx = 0; this.score = 0; this.correct = 0; this.streak = 0; this.wrongList = []; this.log = [];
    $('#qScore').textContent = '⭐ 0';
    showScreen(null); $('#hud').classList.add('show'); document.body.classList.add('ingame'); PWA.keepAwake(true);
    this.updateHint();
    this.countdown(() => this.showQuestion());
  },
  countdown(done){
    this.state = 'countdown'; const el = $('#countdown'); el.classList.add('show');
    const steps = ['3', '2', '1', 'Mula!']; let i = 0;
    const next = () => {
      if (i >= steps.length) { el.classList.remove('show'); el.innerHTML = ''; done(); return; }
      el.innerHTML = `<span>${steps[i]}</span>`; Sound.tick(); i++; setTimeout(next, 750);
    };
    next();
  },
  showQuestion(){
    const q = this.qs[this.idx];
    $('#qNum').textContent = `Soalan ${this.idx + 1}/${this.qs.length}`;
    const tag = { T2: 'T2', T3: 'T3', UMUM: 'Umum', GURU: 'Guru' }[q.lv] || '';
    $('#qTopic').textContent = `${tag} · ${q.t || 'Teori Muzik'}`;
    $('#qText').textContent = q.q;
    $('#qText').style.fontSize = q.q.length > 110 ? '14.5px' : '';
    const st = $('#qStaff');
    if (q.staff) { st.innerHTML = staffSVG(q.staff.clef, q.staff.s); st.style.display = 'flex'; } else { st.innerHTML = ''; st.style.display = 'none'; }
    const opts = shuffle(q.a.map((text, i) => ({ full: String(text), correct: i === 0 })));
    // pilihan panjang: teks penuh di panel soalan, belon tunjuk versi ringkas
    const long = opts.some(o => o.full.length > 30);
    opts.forEach(o => { o.text = o.full; o.label = long && o.full.length > 28 ? o.full.slice(0, 26).trim() + '…' : o.full; });
    const ol = $('#qOpts'); ol.innerHTML = '';
    if (long) { opts.forEach(o => { const li = document.createElement('li'); li.textContent = o.full; ol.appendChild(li); }); ol.hidden = false; } else ol.hidden = true;
    try { World.spawn(opts); }
    catch (e) {   // perlindungan: soalan yang gagal dipaparkan diganti dengan soalan bank statik
      console.warn('Soalan gagal dipaparkan, diganti:', q.q, e);
      const lv = q.lv === 'T3' ? 'T3' : 'T2', used = new Set(this.qs.map(x => x.q));
      const alt = shuffle(BANK[lv]).find(x => !used.has(x.q)) || BANK[lv][0];
      this.qs[this.idx] = { ...alt, lv };
      return this.showQuestion();
    }
    this.cur = { s: q.q + (q.staff ? ' (soalan bergambar staf)' : ''), p: opts.map(o => o.full), b: opts.findIndex(o => o.correct), m: -1 };
    this.timeLeft = CONFIG.SECONDS_PER_QUESTION; this.lastTickSec = Math.ceil(this.timeLeft);
    this.state = 'playing'; this.dwell = { b: null, t0: 0 };
  },
  shoot(b){
    if (this.state !== 'playing' || !b || b.popped) return;
    this.state = 'answered';
    World.pop(b); Sound.pop();
    const q = this.qs[this.idx];
    if (this.cur) { this.cur.m = b.index; this.log.push(this.cur); this.cur = null; }
    if (b.correct) {
      this.correct++; this.streak++;
      const bonus = Math.round(CONFIG.MAX_TIME_BONUS * this.timeLeft / CONFIG.SECONDS_PER_QUESTION);
      const combo = this.streak >= 3 ? CONFIG.STREAK_BONUS : 0;
      const pts = CONFIG.POINTS_CORRECT + bonus + combo; this.score += pts;
      setTimeout(() => Sound.correct(), 120);
      this.feedback(true, `+${pts}` + (combo ? ` 🔥x${this.streak}` : ''));
    } else {
      this.streak = 0;
      this.wrongList.push({ q: q.q, your: this.log.length ? this.log[this.log.length - 1].p[b.index] : b.text, ans: q.a[0] });
      setTimeout(() => Sound.wrong(), 120);
      this.feedback(false, `Jawapan: ${q.a[0]}`);
      const right = World.balloons.find(x => x.correct); if (right) World.reveal(right);
    }
    $('#qScore').textContent = `⭐ ${this.score}`;
    setTimeout(() => this.next(), b.correct ? 1500 : 2300);
  },
  timeout(){
    this.state = 'answered'; this.streak = 0;
    const q = this.qs[this.idx];
    if (this.cur) { this.log.push(this.cur); this.cur = null; }
    this.wrongList.push({ q: q.q, your: '(masa tamat)', ans: q.a[0] });
    Sound.wrong(); this.feedback(false, `Masa tamat! Jawapan: ${q.a[0]}`);
    const right = World.balloons.find(x => x.correct); if (right) World.reveal(right);
    setTimeout(() => this.next(), 2300);
  },
  next(){
    if (this.state === 'over' || this.state === 'idle') return;
    if (this.state === 'paused') { this.pendingNext = true; return; }
    this.idx++;
    if (this.idx >= this.qs.length) return this.end();
    this.showQuestion();
  },
  feedback(ok, sub){
    const f = $('#feedback'), fl = $('#flash');
    f.className = ''; fl.className = ''; void f.offsetWidth;
    f.innerHTML = `<span class="emo">${ok ? '😊' : '😡'}</span>${ok ? 'Betul!' : 'Salah!'}<span class="pts"></span>`;
    f.querySelector('.pts').textContent = sub;
    f.className = (ok ? 'ok' : 'bad') + ' anim'; fl.className = (ok ? 'ok' : 'bad') + ' anim';
    if (navigator.vibrate) navigator.vibrate(ok ? 40 : [60, 50, 60]);
  },
  end(){
    this.state = 'over'; World.clear(); $('#hud').classList.remove('show'); document.body.classList.remove('ingame'); PWA.keepAwake(false);
    const total = this.log.length || 1, acc = Math.round(this.correct / total * 100);
    const { rank, id } = Leaderboard.add(this.level, { n: this.player, s: this.score, c: this.correct, t: total, d: Date.now() });
    this.lastId = id;
    this.lastRec = { nama: this.player, kelas: Session.kelas || '', skor: this.score, betul: this.correct, jumlah: this.log.length,
      tahap: (LEVELS[this.level] || {}).label || this.level, tarikh: Date.now(), butiran: this.log.map(x => ({ s: x.s, p: x.p, b: x.b, m: x.m })) };
    $('#endHead').style.display = '';
    $('#endEmoji').textContent = acc >= 80 ? '🏆' : acc >= 50 ? '🎉' : '💪';
    $('#endTitle').textContent = acc >= 80 ? `Hebat, ${this.player}!` : acc >= 50 ? `Syabas, ${this.player}!` : `Teruskan usaha, ${this.player}!`;
    $('#endWho').textContent = [Session.kelas, (LEVELS[this.level] || {}).label, Session.room && Session.room.sekolah].filter(Boolean).join(' · ');
    $('#endScore').textContent = this.score;
    $('#stCorrect').textContent = this.correct; $('#stWrong').textContent = this.log.length - this.correct; $('#stAcc').textContent = acc + '%';
    $('#stRank').textContent = rank <= CONFIG.LEADERBOARD_SIZE ? '#' + rank : '-';
    $('#pdfBtns').style.display = this.log.length ? '' : 'none';
    const rl = $('#reviewList'); rl.innerHTML = '';
    if (!this.wrongList.length) { $('#reviewBox').style.display = 'none'; }
    else {
      $('#reviewBox').style.display = '';
      this.wrongList.forEach(w => {
        const li = document.createElement('li');
        li.append(w.q, document.createElement('br'));
        const a = document.createElement('span'); a.className = 'ans'; a.textContent = '✔ ' + w.ans;
        const y = document.createElement('span'); y.style.color = '#ffb3b3'; y.textContent = '   ✘ ' + w.your;
        li.append(a, y); rl.appendChild(li);
      });
    }
    $('#endBtns').style.display = ''; $('#btnCloseLb').style.display = 'none';
    Leaderboard.render(this.level, id);
    $('#mdlEnd').classList.add('show'); Sound.fanfare();
    this.submit();
  },
  async submit(){
    const box = $('#endSubmit'); box.className = 'end-submit'; box.hidden = false;
    if (!Session.room) {
      box.textContent = Store.online ? 'ℹ️ Main individu — skor tidak direkodkan untuk guru. Masukkan Kod Kelas daripada guru untuk merekod skor.'
                                     : 'ℹ️ Main individu — skor hanya disimpan dalam peranti ini.';
      return;
    }
    if (!Session.recording) { box.textContent = 'ℹ️ Guru tidak mengaktifkan rekod skor untuk kelas ini.'; return; }
    if (!this.lastRec.jumlah) { box.hidden = true; return; }
    box.textContent = '⏳ Menghantar skor kepada guru…';
    const r = await Store.submitScore(Session.kod, this.lastRec);
    if (r.ok) { box.className = 'end-submit ok'; box.textContent = r.local ? '✅ Skor direkodkan dalam peranti guru ini.' : `✅ Skor telah dihantar kepada guru (${Session.room.guru || Session.room.sekolah || 'Kod ' + Session.kod}).`; }
    else { box.className = 'end-submit bad'; box.textContent = '⚠️ ' + (r.msg || 'Skor gagal dihantar.'); }
  },
  async reviewPdf(){
    const r = this.lastRec; if (!r) return null;
    const room = Session.room || {};
    return Reports.studentReview({ ...r, sekolah: room.sekolah, logo: room.logo, kod: Session.kod });
  },
  pdfName(){ const d = new Date(); return `Semakan_${Files.safeName(this.player)}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.pdf`; },
  pause(){ if (this.state === 'playing' || this.state === 'answered') { this.prevState = this.state; this.state = 'paused'; $('#mdlPause').classList.add('show'); } },
  resume(){
    $('#mdlPause').classList.remove('show');
    if (this.state !== 'paused') return;
    this.state = this.prevState;
    if (this.pendingNext) { this.pendingNext = false; this.next(); }
  },
  quitToMenu(){
    this.state = 'idle'; World.clear(); $('#hud').classList.remove('show'); $('#mdlPause').classList.remove('show'); document.body.classList.remove('ingame'); PWA.keepAwake(false);
    $('#mdlEnd').classList.remove('show'); showLevels();
  },
  updateHint(){
    let h = 'Ketik belon jawapan yang betul 🎯';
    if (Hand.active) h = 'Acu hujung jari telunjuk pada belon & tahan ☝️ (terbalik? tekan 🪞)';
    if (this.clapOn) h += ' · Tepuk untuk tembak 👏';
    $('#hint').textContent = h;
    $('#crosshair').classList.toggle('show', (this.clapOn || this.gyroOn) && !Hand.active);
    $('#micMeter').classList.toggle('show', this.clapOn && Media.hasMic);
    $('#micThresh').style.bottom = (CONFIG.CLAP_THRESHOLD * 100) + '%';
  },
  aimPoint(){
    if (Hand.active && Hand.point) return Hand.point;
    const r = $('#crosshair').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
  tick(t, dt){
    // kursor jari
    Hand.update();
    const fc = $('#fingerCursor');
    if (Hand.active && Hand.point) {
      fc.classList.add('show'); fc.style.transform = `translate(${Hand.point.x}px,${Hand.point.y}px)`;
      if (this.state === 'playing') {
        const now = performance.now(), hit = World.pick(Hand.point.x, Hand.point.y, CONFIG.FINGER_TOLERANCE_PX);
        // toleransi: jari tergelincir sekejap (<220ms) tidak memadam kemajuan "acu"
        if (hit) { if (hit !== this.dwell.b) this.dwell = { b: hit, t0: now, last: now }; else this.dwell.last = now; }
        else if (this.dwell.b && now - (this.dwell.last || 0) > 220) this.dwell = { b: null, t0: now };
        const b = this.dwell.b;
        const prog = b ? clamp((now - this.dwell.t0) / CONFIG.DWELL_MS, 0, 1) : 0;
        $('#dwellRing').setAttribute('stroke-dashoffset', 150.8 * (1 - prog));
        if (b && prog >= 1) { this.dwell = { b: null, t0: now }; this.shoot(b); }
      } else $('#dwellRing').setAttribute('stroke-dashoffset', 150.8);
    } else fc.classList.remove('show');

    // mikrofon: meter & tepukan
    if (this.clapOn && Media.hasMic) {
      const lv = Media.readLevel(); $('#micFill').style.height = (lv * 100) + '%';
      const now = performance.now();
      if (this.state === 'playing' && lv > CONFIG.CLAP_THRESHOLD && now - this.lastClap > 700) {
        this.lastClap = now; const p = this.aimPoint(); const b = World.pick(p.x, p.y); if (b) this.shoot(b);
      }
    }

    // pemasa soalan
    if (this.state === 'playing') {
      this.timeLeft -= dt / 1000;
      const frac = clamp(this.timeLeft / CONFIG.SECONDS_PER_QUESTION, 0, 1);
      const tf = $('#timerFill'); tf.style.width = (frac * 100) + '%'; tf.classList.toggle('low', frac < .3);
      const sec = Math.ceil(this.timeLeft);
      if (sec !== this.lastTickSec) { this.lastTickSec = sec; if (sec <= 5 && sec > 0) Sound.tick(); }
      if (this.timeLeft <= 0) this.timeout();
    }
  }
};

/* =============================================================================
   PENGIKAT UI
   ============================================================================= */
// 1) Pendaftaran (nama, kelas, kod kelas)
function setRoom(room, qs){
  Session.room = room; Session.kod = room ? room.kod : null; Session.roomQs = qs || [];
  const ban = $('#roomBanner');
  if (!room) { ban.hidden = true; $('#kelasWrap').hidden = true; $('#modeNote').textContent = Store.online ? 'Tanpa kod kelas: main individu (skor tidak dihantar kepada guru).' : ''; return; }
  ban.hidden = false;
  $('#roomSchool').textContent = room.sekolah || 'Kelas ' + room.kod;
  $('#roomTeacher').textContent = [room.guru, room.kod !== LOCAL_CODE ? 'Kod ' + room.kod : 'Mod kelas peranti ini'].filter(Boolean).join(' · ');
  const img = $('#roomLogo'); if (room.logo) { img.src = room.logo; img.hidden = false; } else img.hidden = true;
  $('#btnLeaveRoom').hidden = room.kod === LOCAL_CODE;
  $('#kelasWrap').hidden = !Session.recording;
  const list = (room.senaraiKelas || []).filter(Boolean), sel = $('#kelasSelect');
  if (list.length) {
    sel.innerHTML = '<option value="">— Pilih kelas —</option>' + list.map(k => `<option>${esc(k)}</option>`).join('');
    sel.hidden = false; $('#kelasInput').hidden = true;
  } else { sel.hidden = true; $('#kelasInput').hidden = false; }
  const saved = LS.get('belon_student', {}); if (saved.kelas) { $('#kelasInput').value = saved.kelas; if (list.includes(saved.kelas)) sel.value = saved.kelas; }
  $('#modeNote').textContent = Session.recording ? '📝 Skor anda akan direkodkan untuk guru.' : '';
}
async function applyCode(k, quiet){
  const code = Store.normCode(k), err = $('#nameErr');
  if (!code) { setRoom(null); return false; }
  $('#btnCode').disabled = true; $('#btnCode').textContent = '…'; err.textContent = '';
  try {
    const r = await Store.getRoom(code);
    if (!r) { err.textContent = `Kod kelas "${code}" tidak dijumpai. Semak semula dengan guru.`; setRoom(null); return false; }
    if (r.aktif === false) { err.textContent = 'Kelas ini telah ditutup oleh guru.'; setRoom(null); return false; }
    let qs = [];
    if (!r.sumber || r.sumber.guru) { try { qs = await Store.listRoomQuestions(code); } catch (e) {} }
    setRoom(r, qs); $('#codeInput').value = code;
    const st = LS.get('belon_student', {}); st.kod = code; LS.set('belon_student', st);
    if (!quiet) toast(`✅ Kelas ${r.sekolah || code} dijumpai`);
    return true;
  } catch (e) { console.warn(e); err.textContent = 'Tidak dapat menyemak kod kelas. Semak sambungan internet.'; return false; }
  finally { $('#btnCode').disabled = false; $('#btnCode').textContent = 'Semak'; }
}
async function initRegistration(){
  const saved = LS.get('belon_student', {});
  if (saved.nama) $('#nameInput').value = saved.nama;
  else try { const n = localStorage.getItem(CONFIG.STORAGE_KEY + '_name'); if (n) $('#nameInput').value = n; } catch (e) {}
  await Store.init();
  $('#codeWrap').hidden = !Store.online;
  if (Store.online) {
    const urlKod = new URLSearchParams(location.search).get('kod');
    const k = urlKod || saved.kod;
    if (k) await applyCode(k, !urlKod); else setRoom(null);
  } else {
    const r = await Store.getRoom(LOCAL_CODE);
    if (r && r.aktif !== false) setRoom(r, await Store.listRoomQuestions(LOCAL_CODE)); else setRoom(null);
  }
}
$('#btnCode').addEventListener('click', () => applyCode($('#codeInput').value));
$('#codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') applyCode($('#codeInput').value); });
$('#btnLeaveRoom').addEventListener('click', () => {
  setRoom(null); $('#codeInput').value = '';
  const st = LS.get('belon_student', {}); delete st.kod; LS.set('belon_student', st);
  if (location.search.includes('kod=')) history.replaceState(null, '', location.pathname);
});
$('#btnRegister').addEventListener('click', async () => {
  const n = $('#nameInput').value.trim().replace(/\s+/g, ' '), err = $('#nameErr');
  if (n.length < 2) { err.textContent = 'Sila tulis nama anda (sekurang-kurangnya 2 huruf).'; return; }
  const typed = Store.normCode($('#codeInput').value);
  if (Store.online && typed && typed !== Session.kod) { if (!(await applyCode(typed))) return; }
  let kelas = '';
  if (Session.recording) {
    kelas = (!$('#kelasSelect').hidden ? $('#kelasSelect').value : $('#kelasInput').value).trim().replace(/\s+/g, ' ');
    if (!kelas) { err.textContent = 'Sila isi kelas anda — guru perlukan nama & kelas untuk merekod skor.'; return; }
  }
  err.textContent = '';
  Game.player = n; Session.nama = n; Session.kelas = kelas;
  const st = LS.get('belon_student', {}); st.nama = n; if (kelas) st.kelas = kelas; LS.set('belon_student', st);
  Sound.init();                     // AudioContext mesti dicipta melalui sentuhan pengguna
  $('#helloName').textContent = n;
  if (Media.hasCam || Media.hasMic) showLevels(); else showScreen('scrPerm');
});
$('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnRegister').click(); });
$('#btnBackReg').addEventListener('click', () => showScreen('scrRegister'));
$('#btnAdmin').addEventListener('click', () => Admin.open());

// 3) Pilih set soalan (bergantung pada tetapan guru)
function showLevels(){
  const box = $('#levelBtns'); box.innerHTML = '';
  Session.sources().forEach(k => {
    const L = LEVELS[k], b = document.createElement('button');
    b.className = 'btn ' + L.cls; b.dataset.level = k;
    const extra = k === 'GURU' ? ` (${Session.roomQs.length} soalan)` : '';
    b.innerHTML = `${L.icon} ${esc(L.label)}${extra}<small>${esc(L.sub)}</small>`;
    b.addEventListener('click', () => { Sound.init(); Game.start(k); });
    box.appendChild(b);
  });
  $('#levelSub').textContent = `${Session.N()} soalan rawak · ${Session.secs()} saat setiap soalan` + (Session.room ? ` · ${Session.room.sekolah || 'Kelas ' + Session.kod}` : '');
  showScreen('scrLevel');
}
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// 2) Kebenaran kamera & mikrofon
$('#btnPerm').addEventListener('click', async () => {
  const st = $('#permStatus'); st.className = 'status'; st.textContent = 'Menunggu kebenaran…';
  $('#btnPerm').disabled = true;
  try {
    const r = await Media.requestAll();
    if (r.cam || r.mic) {
      st.className = 'status ok';
      st.textContent = `${r.cam ? '📷 Kamera aktif' : '📷 Kamera ditolak'} · ${r.mic ? '🎤 Mikrofon aktif' : '🎤 Mikrofon ditolak'}`;
      if (!r.cam) document.body.classList.add('nocam');
      if (r.mic) { Game.clapOn = true; $('#tClap').classList.add('on'); }
      setTimeout(() => showLevels(), 900);
    } else {
      st.className = 'status err';
      st.textContent = 'Kebenaran ditolak atau tidak disokong. Anda masih boleh bermain tanpa kamera.';
    }
  } catch (e) { st.className = 'status err'; st.textContent = e.message; }
  $('#btnPerm').disabled = false;
});
$('#btnNoCam').addEventListener('click', () => { document.body.classList.add('nocam'); showLevels(); });


// Tembak dengan ketikan/sentuhan
document.addEventListener('pointerdown', e => {
  if (Game.state !== 'playing') return;
  if (e.target.closest('button, .modal, .screen')) return;
  const b = World.pick(e.clientX, e.clientY); if (b) Game.shoot(b);
}, { passive: true });

// Bar alat
$('#tPause').addEventListener('click', () => Game.pause());
$('#btnResume').addEventListener('click', () => Game.resume());
$('#btnQuit').addEventListener('click', () => { $('#mdlPause').classList.remove('show'); Game.state = 'answered'; Game.end(); });
$('#btnMenu').addEventListener('click', () => Game.quitToMenu());
$('#tSound').addEventListener('click', e => { Sound.enabled = !Sound.enabled; e.currentTarget.classList.toggle('on', Sound.enabled); e.currentTarget.firstChild.textContent = Sound.enabled ? '🔊' : '🔇'; });
$('#tFlip').addEventListener('click', async () => {
  if (!Media.hasCam) return toast('Kamera tidak aktif');
  try { await Media.flip(); toast(Media.facing === 'user' ? 'Kamera hadapan' : 'Kamera belakang'); } catch (e) { toast('Tidak dapat menukar kamera'); }
});
$('#tMirror').addEventListener('click', () => {
  if (!Media.hasCam) return toast('Kamera tidak aktif');
  Media.mirrorOverride = !Media.mirror; Media.applyMirror();
  try { localStorage.setItem(CONFIG.STORAGE_KEY + '_mirror_' + Media.facing, Media.mirror ? '1' : '0'); } catch (e) {}
  Hand.fx.reset(); Hand.fy.reset();
  toast(Media.mirror ? 'Paparan dicermin (seperti cermin) 🪞' : 'Paparan biasa (tidak dicermin)');
});
$('#tClap').addEventListener('click', e => {
  if (!Media.hasMic) return toast('Mikrofon tidak aktif');
  Game.clapOn = !Game.clapOn; e.currentTarget.classList.toggle('on', Game.clapOn); Game.updateHint();
});
$('#tHand').addEventListener('click', async e => {
  const btn = e.currentTarget;
  if (Hand.active) { Hand.disable(); btn.classList.remove('on'); Game.updateHint(); return; }
  if (Hand.loading) return;
  const wasPlaying = Game.state === 'playing'; if (wasPlaying) Game.pause();
  toast('Memuatkan penjejak jari… ⏳', 6000);
  try { await Hand.enable(); btn.classList.add('on'); toast('Mod jari aktif ☝️ Garis kuning mesti mengikut jari anda. Jika bergerak bertentangan, tekan 🪞', 4500); }
  catch (err) { Hand.loading = false; toast('Mod jari gagal: ' + (err.message || err)); }
  Game.updateHint(); if (wasPlaying) Game.resume();
});
$('#tGyro').addEventListener('click', async e => {
  const btn = e.currentTarget, camEl = $('#cameraEl');
  if (!Game.gyroOn) {
    try {   // iOS 13+ perlukan kebenaran giroskop
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return toast('Kebenaran giroskop ditolak');
      }
    } catch (err) { return toast('Giroskop tidak disokong'); }
    Game.gyroOn = true; camEl.setAttribute('look-controls', 'enabled', true);
    toast('Giroskop aktif 🧭 Pusingkan telefon untuk mencari belon');
  } else {
    Game.gyroOn = false; camEl.setAttribute('look-controls', 'enabled', false);
    const lc = camEl.components['look-controls']; if (lc) { lc.pitchObject.rotation.set(0, 0, 0); lc.yawObject.rotation.set(0, 0, 0); }
    camEl.object3D.rotation.set(0, 0, 0);
  }
  btn.classList.toggle('on', Game.gyroOn); Game.updateHint();
});

// Papan skor
function openLeaderboardOnly(){
  $('#endHead').style.display = 'none'; $('#reviewBox').style.display = 'none';
  $('#endBtns').style.display = 'none'; $('#btnCloseLb').style.display = '';
  $('#pdfBtns').style.display = 'none'; $('#endSubmit').hidden = true;
  Leaderboard.render(Game.level || 'T2'); $('#mdlEnd').classList.add('show');
}
$('#btnShowLb1').addEventListener('click', openLeaderboardOnly);
$('#btnShowLb2').addEventListener('click', openLeaderboardOnly);
$('#btnCloseLb').addEventListener('click', () => $('#mdlEnd').classList.remove('show'));
$$('#lbTabs button').forEach(b => b.addEventListener('click', () => Leaderboard.render(b.dataset.tab, Game.lastId)));
$('#btnAgain').addEventListener('click', () => { $('#mdlEnd').classList.remove('show'); Game.start(Game.level); });
$('#btnLevel').addEventListener('click', () => { $('#mdlEnd').classList.remove('show'); Game.state = 'idle'; showLevels(); });
$('#btnPdfReview').addEventListener('click', async e => {
  const btn = e.currentTarget; btn.disabled = true; const t = btn.textContent; btn.textContent = '⏳ Menjana PDF…';
  try { Files.download(await Game.reviewPdf(), Game.pdfName()); } catch (err) { console.error(err); toast('PDF gagal dijana: ' + err.message); }
  btn.disabled = false; btn.textContent = t;
});
$('#btnShareReview').addEventListener('click', async e => {
  const btn = e.currentTarget; btn.disabled = true;
  try {
    const r = Game.lastRec, how = await Files.share(await Game.reviewPdf(), Game.pdfName(),
      `Semakan kuiz teori muzik: ${r.nama}${r.kelas ? ' (' + r.kelas + ')' : ''} — skor ${r.skor}, betul ${r.betul}/${r.jumlah}`);
    if (how === 'downloaded') toast('PDF dimuat turun — hantar fail itu kepada guru melalui WhatsApp/Google Classroom 📤', 4000);
  } catch (err) { toast('Gagal berkongsi: ' + err.message); }
  btn.disabled = false;
});

// Jeda automatik bila tab disembunyikan
document.addEventListener('visibilitychange', () => { if (document.hidden) Game.pause(); });


/* =============================================================================
   PWA — pasang aplikasi, luar talian, kemas kini, skrin sentiasa hidup
   ============================================================================= */
const PWA = {
  deferred: null, wakeLock: null,
  isStandalone(){ return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; },
  init(){
    // Daftar service worker (perlu https:// atau localhost)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw && nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) $('#updBar').classList.add('show');
          });
        });
      }).catch(e => console.warn('SW gagal', e));
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (window.__updating && !reloaded) { reloaded = true; location.reload(); } });
    }
    $('#btnUpdate').addEventListener('click', () => { window.__updating = true; navigator.serviceWorker.getRegistration().then(r => r && r.waiting ? r.waiting.postMessage('skipWaiting') : location.reload()); });

    // Butang pasang (Chrome/Edge/Android)
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.deferred = e; if (!this.isStandalone()) $('#btnInstall').classList.add('show'); });
    $('#btnInstall').addEventListener('click', async () => {
      if (!this.deferred) return;
      this.deferred.prompt();
      const r = await this.deferred.userChoice.catch(() => null);
      this.deferred = null; $('#btnInstall').classList.remove('show');
      if (r && r.outcome === 'accepted') toast('Aplikasi sedang dipasang 🎉');
    });
    addEventListener('appinstalled', () => { $('#btnInstall').classList.remove('show'); toast('Belon Muzik telah dipasang di skrin utama ✅'); });
    // iOS Safari tiada beforeinstallprompt — tunjuk arahan manual
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !this.isStandalone()) $('#iosHint').classList.add('show');

    // Status rangkaian
    const net = () => {
      const c = $('#netChip');
      if (!navigator.onLine) { c.textContent = '📴 Luar talian — permainan masih boleh dimainkan'; c.classList.add('show'); }
      else c.classList.remove('show');
    };
    addEventListener('online', net); addEventListener('offline', net); net();
  },
  async keepAwake(on){   // elak skrin padam semasa bermain
    try {
      if (on && 'wakeLock' in navigator && !this.wakeLock) { this.wakeLock = await navigator.wakeLock.request('screen'); this.wakeLock.addEventListener('release', () => this.wakeLock = null); }
      if (!on && this.wakeLock) { await this.wakeLock.release(); this.wakeLock = null; }
    } catch (e) {}
  }
};
PWA.init();
document.addEventListener('visibilitychange', () => { if (!document.hidden && document.body.classList.contains('ingame')) PWA.keepAwake(true); });

// Toast ringkas
let toastTimer;
function toast(msg, ms = 2200){
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 110px);transform:translateX(-50%);z-index:40;background:rgba(0,0,0,.8);color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;max-width:90vw;text-align:center;pointer-events:none';
    document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = 'none', ms);
}


initRegistration();
