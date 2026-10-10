/* =============================================================================
   LAPISAN DATA — Firebase (Mod Kelas Dalam Talian) / localStorage (Mod Peranti)
   Struktur Firestore:
     soalan/{id}                 Bank Soalan Umum (diurus Pentadbir Utama)
     kelas/{KOD}                 tetapan kelas guru (sekolah, logo, sumber soalan…)
     kelas/{KOD}/soalan/{id}     soalan yang dimuat naik guru
     kelas/{KOD}/skor/{id}       skor & jawapan murid (hanya guru boleh baca)
   ============================================================================= */
const LOCAL_CODE = 'PERANTI';
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('Storan penuh', e); return false; } },
  del(k){ try { localStorage.removeItem(k); } catch (e) {} }
};
const K = {
  room: 'belon_local_room', roomQ: 'belon_local_roomq', scores: 'belon_local_scores',
  outbox: 'belon_outbox', bank: 'belon_bank_cache', myRooms: 'belon_my_rooms', admin: 'belon_local_admin'
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
async function sha256(s){
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return 'x' + s; }
}

const Store = {
  mode: 'local', fb: null, db: null, auth: null, user: null, _init: null,
  get cfg(){ return window.BELON_FIREBASE || {}; },
  get online(){ return this.mode === 'firebase'; },

  init(){
    if (this._init) return this._init;
    this._init = (async () => {
      const c = this.cfg;
      if (!c.config || !c.config.apiKey || !c.config.projectId) { this.mode = 'local'; return this.mode; }
      try {
        const base = c.sdkBase || 'https://www.gstatic.com/firebasejs/10.12.2/';
        const [A, F, U] = await Promise.all([
          import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-auth.js')
        ]);
        this.fb = { ...A, ...F, ...U };
        const app = A.initializeApp(c.config);
        this.db = F.getFirestore(app);
        this.auth = U.getAuth(app);
        try { await U.setPersistence(this.auth, U.browserLocalPersistence); } catch (e) {}
        await new Promise(res => { const off = U.onAuthStateChanged(this.auth, u => { this.user = u; off && off(); res(); }); setTimeout(res, 4000); });
        U.onAuthStateChanged(this.auth, u => { this.user = u; });
        this.mode = 'firebase';
        this.flushOutbox();
        addEventListener('online', () => this.flushOutbox());
      } catch (e) {
        console.warn('Firebase gagal dimuatkan — guna Mod Peranti', e);
        this.mode = 'local'; this.initError = e;
      }
      return this.mode;
    })();
    return this._init;
  },

  /* ---------------- Log masuk ---------------- */
  isAdmin(){
    if (this.online) return !!(this.user && [this.cfg.adminEmail, this.cfg.superEmail].includes(this.user.email));
    try { return sessionStorage.getItem('belon_admin') === '1'; } catch (e) { return !!this._localAdmin; }
  },
  isSuper(){ return this.online && !!this.user && this.user.email === this.cfg.superEmail; },
  async loginAdmin(pw){
    if (this.online) {
      try { const r = await this.fb.signInWithEmailAndPassword(this.auth, this.cfg.adminEmail, pw); this.user = r.user; return { ok: true }; }
      catch (e) { return { ok: false, msg: this.authMsg(e) }; }
    }
    const ok = (await sha256(pw)) === (await sha256('dzurri'));
    if (ok) { this._localAdmin = true; try { sessionStorage.setItem('belon_admin', '1'); } catch (e) {} }
    return ok ? { ok: true } : { ok: false, msg: 'Kata laluan salah.' };
  },
  async loginSuper(email, pw){
    if (!this.online) return { ok: false, msg: 'Bank Soalan Umum memerlukan Firebase.' };
    try { const r = await this.fb.signInWithEmailAndPassword(this.auth, email.trim(), pw); this.user = r.user;
      if (r.user.email !== this.cfg.superEmail) return { ok: false, msg: 'Akaun ini bukan Pentadbir Utama.' };
      return { ok: true }; }
    catch (e) { return { ok: false, msg: this.authMsg(e) }; }
  },
  async logout(){
    this._localAdmin = false; try { sessionStorage.removeItem('belon_admin'); } catch (e) {}
    if (this.online && this.auth) await this.fb.signOut(this.auth);
    this.user = null;
  },
  authMsg(e){
    const c = (e && e.code) || '';
    if (/wrong-password|invalid-credential|invalid-login/.test(c)) return 'Kata laluan salah.';
    if (/user-not-found/.test(c)) return 'Akaun admin belum dicipta dalam Firebase (lihat PANDUAN-FIREBASE).';
    if (/network/.test(c)) return 'Tiada sambungan internet.';
    if (/too-many/.test(c)) return 'Terlalu banyak cubaan. Cuba sebentar lagi.';
    return 'Gagal log masuk: ' + (c || e.message || e);
  },

  /* ---------------- Kelas (tetapan guru) ---------------- */
  normCode(k){ return String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); },
  async newCode(){
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 8; i++) {
      let k = ''; for (let j = 0; j < 6; j++) k += A[Math.floor(Math.random() * A.length)];
      if (!this.online || !(await this.getRoom(k))) return k;
    }
    return 'K' + Date.now().toString(36).toUpperCase().slice(-7);
  },
  async getRoom(code){
    code = this.normCode(code); if (!code) return null;
    if (!this.online) { const r = LS.get(K.room, null); return r && code === LOCAL_CODE ? { ...r, kod: LOCAL_CODE } : null; }
    const s = await this.fb.getDoc(this.fb.doc(this.db, 'kelas', code));
    return s.exists() ? { ...s.data(), kod: code } : null;
  },
  async saveRoom(code, data){
    code = this.normCode(code);
    const clean = { ...data }; delete clean.kod; clean.dikemas = Date.now();
    if (!this.online) { LS.set(K.room, { ...(LS.get(K.room, {}) || {}), ...clean }); return LOCAL_CODE; }
    await this.fb.setDoc(this.fb.doc(this.db, 'kelas', code), clean, { merge: true });
    const mine = LS.get(K.myRooms, []).filter(r => r.kod !== code); mine.unshift({ kod: code, sekolah: data.sekolah || '', guru: data.guru || '' });
    LS.set(K.myRooms, mine.slice(0, 20));
    return code;
  },
  myRooms(){ return LS.get(K.myRooms, []); },

  /* ---------------- Soalan guru (per kelas) ---------------- */
  async listRoomQuestions(code){
    if (!this.online) return LS.get(K.roomQ, []);
    const s = await this.fb.getDocs(this.fb.collection(this.db, 'kelas', this.normCode(code), 'soalan'));
    return s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (a.dicipta || 0) - (b.dicipta || 0));
  },
  async addRoomQuestions(code, arr){ return this._addMany(['kelas', this.normCode(code), 'soalan'], arr, K.roomQ); },
  async deleteRoomQuestion(code, id){
    if (!this.online) { LS.set(K.roomQ, LS.get(K.roomQ, []).filter(q => q.id !== id)); return; }
    await this.fb.deleteDoc(this.fb.doc(this.db, 'kelas', this.normCode(code), 'soalan', id));
  },
  async clearRoomQuestions(code){
    if (!this.online) { LS.set(K.roomQ, []); return; }
    const all = await this.listRoomQuestions(code); await this._deleteMany(['kelas', this.normCode(code), 'soalan'], all.map(q => q.id));
  },

  /* ---------------- Skor murid ---------------- */
  async submitScore(code, rec){
    rec = { ...rec };
    if (!this.online || code === LOCAL_CODE) {
      const all = LS.get(K.scores, []); all.push({ ...rec, id: uid() });
      if (!LS.set(K.scores, all)) { all.forEach(s => delete s.butiran); LS.set(K.scores, all); }
      return { ok: true, local: true };
    }
    try {
      await this.fb.addDoc(this.fb.collection(this.db, 'kelas', this.normCode(code), 'skor'), rec);
      return { ok: true };
    } catch (e) {
      console.warn('Skor gagal dihantar — disimpan untuk dihantar semula', e);
      if (/permission/i.test(e.code || '')) return { ok: false, msg: 'Kelas ini tidak menerima skor (rekod skor dimatikan oleh guru).' };
      const ob = LS.get(K.outbox, []); ob.push({ kod: code, rec }); LS.set(K.outbox, ob);
      return { ok: false, queued: true, msg: 'Tiada internet — skor akan dihantar automatik bila ada sambungan.' };
    }
  },
  async flushOutbox(){
    if (!this.online || !navigator.onLine) return 0;
    const ob = LS.get(K.outbox, []); if (!ob.length) return 0;
    const left = []; let sent = 0;
    for (const it of ob) {
      try { await this.fb.addDoc(this.fb.collection(this.db, 'kelas', it.kod, 'skor'), it.rec); sent++; }
      catch (e) { if (!/permission/i.test(e.code || '')) left.push(it); }
    }
    LS.set(K.outbox, left);
    if (sent && window.toast) toast(`✅ ${sent} skor tertangguh telah dihantar kepada guru`);
    return sent;
  },
  pendingCount(){ return LS.get(K.outbox, []).length; },
  async listScores(code){
    if (!this.online) return LS.get(K.scores, []);
    const s = await this.fb.getDocs(this.fb.collection(this.db, 'kelas', this.normCode(code), 'skor'));
    return s.docs.map(d => ({ ...d.data(), id: d.id }));
  },
  async deleteScore(code, id){
    if (!this.online) { LS.set(K.scores, LS.get(K.scores, []).filter(s => s.id !== id)); return; }
    await this.fb.deleteDoc(this.fb.doc(this.db, 'kelas', this.normCode(code), 'skor', id));
  },
  async clearScores(code){
    if (!this.online) { LS.set(K.scores, []); return; }
    const all = await this.listScores(code); await this._deleteMany(['kelas', this.normCode(code), 'skor'], all.map(s => s.id));
  },

  /* ---------------- Bank Soalan Umum ---------------- */
  async bundledBank(){
    if (this._bundled) return this._bundled;
    try { const r = await fetch('data/soalan-lalai.json'); this._bundled = await r.json(); }
    catch (e) { this._bundled = window.SOALAN_LALAI || []; }
    return this._bundled;
  },
  /* Murid membaca SATU dokumen ringkasan (bank/umum) — jimat kuota bacaan Firebase.
     Pentadbir Utama mengurus soalan dalam koleksi "soalan"; ringkasan dibina semula selepas setiap perubahan. */
  async getGlobalBank(force){
    if (this.online) {
      const c = LS.get(K.bank, null);
      if (!force && c && Date.now() - c.t < 6 * 3600e3 && c.items.length) return c.items;
      try {
        let items = [];
        const snap = await this.fb.getDoc(this.fb.doc(this.db, 'bank', 'umum'));
        if (snap.exists() && Array.isArray(snap.data().items)) items = snap.data().items;
        else items = await this.listGlobal();
        items = items.filter(q => q.aktif !== false && Array.isArray(q.opts) && q.opts.length >= 2);
        if (items.length) { LS.set(K.bank, { t: Date.now(), items }); return items; }
      } catch (e) { console.warn('Bank umum Firebase tidak dapat dibaca', e); if (c && c.items.length) return c.items; }
    }
    return this.bundledBank();
  },
  async listGlobal(){
    const s = await this.fb.getDocs(this.fb.collection(this.db, 'soalan'));
    return s.docs.map(d => ({ ...d.data(), id: d.id }));
  },
  async rebuildBankSnapshot(){
    const items = (await this.listGlobal()).filter(q => q.aktif !== false && Array.isArray(q.opts) && q.opts.length >= 2 && q.ans >= 0)
      .map(q => ({ id: q.id, q: q.q, opts: q.opts, ans: q.ans, topik: q.topik || '', tahap: q.tahap || 'UMUM' }));
    let keep = items;
    while (JSON.stringify(keep).length > 900000) keep = keep.slice(0, Math.floor(keep.length * .9));   // had dokumen 1 MB
    await this.fb.setDoc(this.fb.doc(this.db, 'bank', 'umum'), { items: keep, n: keep.length, dikemas: Date.now() });
    LS.del(K.bank);
    return { n: keep.length, total: items.length };
  },
  async addGlobalQuestions(arr){ const n = await this._addMany(['soalan'], arr, null); await this.rebuildBankSnapshot(); return n; },
  async deleteGlobal(id){ await this.fb.deleteDoc(this.fb.doc(this.db, 'soalan', id)); await this.rebuildBankSnapshot(); },
  async countGlobal(){ const s = await this.fb.getDocs(this.fb.collection(this.db, 'soalan')); return s.size; },

  /* ---------------- Pembantu tulis/padam pukal ---------------- */
  async _addMany(path, arr, localKey){
    const now = Date.now();
    const rows = arr.map((q, i) => ({ q: q.q, opts: q.opts, ans: q.ans, topik: q.topik || 'Soalan Guru', tahap: q.tahap || 'UMUM', aktif: true, dicipta: now + i }));
    if (!this.online) { const cur = LS.get(localKey, []); rows.forEach(r => cur.push({ ...r, id: uid() })); if (!LS.set(localKey, cur)) throw new Error('Storan peranti penuh'); return rows.length; }
    for (let i = 0; i < rows.length; i += 400) {
      const b = this.fb.writeBatch(this.db);
      rows.slice(i, i + 400).forEach(r => b.set(this.fb.doc(this.fb.collection(this.db, ...path)), r));
      await b.commit();
    }
    if (path[0] === 'soalan') LS.del(K.bank);
    return rows.length;
  },
  async _deleteMany(path, ids){
    for (let i = 0; i < ids.length; i += 400) {
      const b = this.fb.writeBatch(this.db);
      ids.slice(i, i + 400).forEach(id => b.delete(this.fb.doc(this.db, ...path, id)));
      await b.commit();
    }
  }
};
