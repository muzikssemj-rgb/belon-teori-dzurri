/* =============================================================================
   PANEL ADMIN GURU
   - Log masuk (kata laluan "dzurri")
   - Kelas & Sekolah: nama sekolah, logo, senarai kelas, set soalan, kod kelas + QR
   - Soalan Guru: muat naik PDF/DOCX → jana soalan (semak & edit sebelum simpan)
   - Skor Murid: jadual, tapis, muat turun Excel / PDF
   - Bank Umum: (Pentadbir Utama) urus soalan Firebase untuk semua guru
   ============================================================================= */
const DEFAULT_ROOM = () => ({ sekolah: '', guru: '', logo: '', senaraiKelas: [], bilSoalan: 20, masa: 25, rekod: true, aktif: true,
  sumber: { guru: true, umum: true, t2: true, t3: true, mix: false } });

/* Komponen semakan soalan hasil muat naik (edit sebelum simpan) */
const Review = {
  render(box, items, onSave, saveLabel){
    const st = { items: items.map(x => ({ ...x, use: x.ok })) };
    const draw = () => {
      const ok = st.items.filter(x => x.ok).length, sel = st.items.filter(x => x.use).length;
      box.innerHTML = `
        <div class="rv-sum">🔎 <b>${st.items.length}</b> soalan dijumpai · <b class="ok">${ok}</b> lengkap · <b>${st.items.length - ok}</b> perlu semakan
          <div class="row"><button class="btn mini ghost" data-act="all">Pilih semua yang lengkap</button><button class="btn mini ghost" data-act="none">Nyahpilih semua</button></div></div>
        ${st.items.map((x, i) => `
          <div class="rv ${x.ok ? '' : 'bad'} ${x.use ? '' : 'off'}" data-i="${i}">
            <div class="rv-head"><input type="checkbox" data-f="use" ${x.use ? 'checked' : ''}> <b>#${i + 1}</b>
              ${x.set ? `<span>Set ${x.set} · No. ${x.num}</span>` : ''} ${x.flags.map(f => `<span class="flag">${esc(f)}</span>`).join(' ')}
              <span style="flex:1"></span><button class="link" data-act="del" title="Buang">🗑</button></div>
            <textarea data-f="q" rows="2">${esc(x.q)}</textarea>
            ${[0, 1, 2, 3].map(j => `<div class="ro"><input type="radio" name="rv${i}" data-f="ans" value="${j}" ${x.ans === j ? 'checked' : ''} title="Jawapan betul">
              <b>${'ABCD'[j]}</b><input type="text" data-f="o${j}" value="${esc(x.opts[j] || '')}" placeholder="${j < 2 ? 'wajib' : '(pilihan)'}"></div>`).join('')}
          </div>`).join('')}
        <div class="rv-bar"><b>${sel}</b> soalan dipilih <span style="flex:1"></span>
          <button class="btn mini ghost" data-act="cancel">Batal</button><button class="btn mini green" data-act="save">${saveLabel || '💾 Simpan'} (${sel})</button></div>`;
    };
    const validate = x => {
      x.opts = x.opts.map(o => (o || '').trim()); const filled = x.opts.filter(Boolean);
      x.flags = x.flags.filter(f => f === 'mungkin perlukan gambar');
      if (filled.length < 2) x.flags.push('pilihan tidak lengkap');
      if (!(x.ans >= 0 && x.opts[x.ans])) x.flags.push('tiada jawapan');
      if (!x.q.trim()) x.flags.push('soalan kosong');
      x.ok = !x.flags.some(f => f !== 'mungkin perlukan gambar');
    };
    box.oninput = e => {
      const card = e.target.closest('.rv'); if (!card) return; const x = st.items[+card.dataset.i], f = e.target.dataset.f;
      if (f === 'q') x.q = e.target.value;
      else if (/^o\d$/.test(f)) x.opts[+f[1]] = e.target.value;
      else return;
      validate(x);
    };
    box.onchange = e => {
      const card = e.target.closest('.rv'); if (!card) return; const x = st.items[+card.dataset.i], f = e.target.dataset.f;
      if (f === 'use') { x.use = e.target.checked; draw(); }
      else if (f === 'ans') { x.ans = +e.target.value; validate(x); if (x.ok) x.use = true; draw(); }
      else if (f === 'q' || /^o\d$/.test(f)) { validate(x); if (!x.ok) x.use = false; draw(); }
    };
    box.onclick = async e => {
      const act = e.target.dataset.act; if (!act) return;
      if (act === 'all') st.items.forEach(x => x.use = x.ok);
      if (act === 'none') st.items.forEach(x => x.use = false);
      if (act === 'del') st.items.splice(+e.target.closest('.rv').dataset.i, 1);
      if (act === 'cancel') { box.innerHTML = ''; return; }
      if (act === 'save') {
        const chosen = st.items.filter(x => x.use);
        const bad = chosen.filter(x => !x.ok);
        if (!chosen.length) return toast('Tiada soalan dipilih');
        if (bad.length) return toast(`${bad.length} soalan dipilih masih belum lengkap (tiada jawapan / pilihan). Betulkan atau nyahpilih.`, 4000);
        e.target.disabled = true; e.target.textContent = '⏳ Menyimpan…';
        try {
          await onSave(chosen.map(x => {   // susun semula pilihan kosong
            const pairs = x.opts.map((o, j) => ({ o, j })).filter(p => p.o);
            return { q: x.q.trim(), opts: pairs.map(p => p.o), ans: pairs.findIndex(p => p.j === x.ans) };
          }));
          box.innerHTML = '';
        } catch (err) { console.error(err); toast('Gagal menyimpan: ' + (err.message || err), 4000); e.target.disabled = false; }
        return;
      }
      draw();
    };
    draw();
  }
};

const Admin = {
  room: null, roomQs: [], scores: [],

  async open(){
    $('#admin').hidden = false; document.body.style.overflow = 'hidden';
    await Store.init();
    const chip = $('#admMode');
    chip.textContent = Store.online ? '🟢 Dalam Talian (Firebase)' : Store.initError ? '⚠️ Firebase tidak aktif' : '🟠 Mod Peranti';
    chip.className = 'chip ' + (Store.online ? 'on' : 'warn');
    if (Store.initError) toast('⚠️ ' + Store.reason(), 7000);
    chip.title = Store.online ? 'Kod kelas & skor disimpan di Firebase' : 'Tetapan & skor hanya disimpan dalam peranti ini. Sambungkan Firebase untuk kelas PdPR jarak jauh.';
    if (Store.isAdmin()) this.enter(); else this.showLogin();
  },
  close(){
    $('#admin').hidden = true; document.body.style.overflow = '';
    initRegistration();          // kemas kini skrin murid (tetapan mungkin berubah)
  },
  showLogin(){ $('#admLogin').hidden = false; $('#admMain').hidden = true; $('#admPw').value = ''; setTimeout(() => $('#admPw').focus(), 50); },
  async login(){
    const pw = $('#admPw').value, err = $('#admLoginErr');
    if (!pw) { err.textContent = 'Masukkan kata laluan.'; return; }
    $('#admLoginBtn').disabled = true; err.textContent = '';
    const r = await Store.loginAdmin(pw);
    $('#admLoginBtn').disabled = false;
    if (!r.ok) { err.textContent = r.msg; return; }
    this.enter();
  },
  async logout(){ await Store.logout(); this.room = null; this.showLogin(); },
  async enter(){
    $('#admLogin').hidden = true; $('#admMain').hidden = false;
    $('#admWho').textContent = Store.online ? `Log masuk: ${Store.user ? Store.user.email : ''}` : 'Admin (Mod Peranti)';
    $('#roomPicker').hidden = !Store.online;
    if (!Store.online) await this.loadRoom(LOCAL_CODE, true);
    else {
      this.renderRooms();
      const last = LS.get('belon_admin_room', null);
      if (last && !this.room) await this.loadRoom(last, true);
      else if (!this.room) this.showForm(false);
    }
    this.tab('kelas');
  },
  tab(name){
    $$('#admTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    $$('.adm-pane').forEach(p => p.hidden = p.dataset.pane !== name);
    this.curTab = name;
    if (name === 'soalan') this.loadQs();
    if (name === 'skor') this.loadScores();
    if (name === 'bank') this.renderBank();
  },
  needRoom(){
    if (this.room) return false;
    toast('Pilih atau cipta kelas dahulu (tab 🏫 Kelas & Sekolah)', 3000); this.tab('kelas'); return true;
  },

  /* ---------------- KELAS & SEKOLAH ---------------- */
  renderRooms(){
    const box = $('#myRooms'), mine = Store.myRooms();
    box.innerHTML = mine.length ? mine.map(r => `<button data-kod="${esc(r.kod)}" class="${this.room && this.room.kod === r.kod ? 'on' : ''}">${esc(r.kod)}<small>${esc(r.sekolah || r.guru || '')}</small></button>`).join('')
      : '<span class="adm-hint">Belum ada kelas pada peranti ini. Cipta kelas baharu atau buka kod sedia ada.</span>';
  },
  showForm(show){ $('#roomForm').hidden = !show; if (!show) $('#shareCard').hidden = true; },
  async loadRoom(kod, quiet){
    try {
      const r = await Store.getRoom(kod);
      if (!r) {
        if (!Store.online) { this.room = { ...DEFAULT_ROOM(), kod: LOCAL_CODE, aktif: false, isNew: true }; this.fillForm(); return; }
        if (!quiet) toast('Kod kelas tidak dijumpai'); return;
      }
      this.room = { ...DEFAULT_ROOM(), ...r, sumber: { ...DEFAULT_ROOM().sumber, ...(r.sumber || {}) } };
      if (Store.online) LS.set('belon_admin_room', r.kod);
      this.fillForm(); this.renderRooms(); this.renderShare();
    } catch (e) { console.error(e); toast('Gagal membuka kelas: ' + e.message); }
  },
  async newRoom(){
    const kod = await Store.newCode();
    this.room = { ...DEFAULT_ROOM(), kod, isNew: true };
    const prev = Store.myRooms()[0];
    if (prev) { const p = await Store.getRoom(prev.kod).catch(() => null); if (p) { this.room.sekolah = p.sekolah || ''; this.room.guru = p.guru || ''; this.room.logo = p.logo || ''; } }
    this.fillForm(); $('#shareCard').hidden = true; this.renderRooms();
    toast(`Kelas baharu ${kod} — isi tetapan & tekan Simpan`, 3000);
  },
  fillForm(){
    const r = this.room; this.showForm(true);
    $('#roomFormTitle').textContent = Store.online ? `Tetapan Kelas ${r.kod}${r.isNew ? ' (baharu — belum disimpan)' : ''}` : 'Tetapan Kelas (Peranti Ini)';
    $('#roomFormHint').innerHTML = Store.online
      ? 'Setiap kod kelas mempunyai sekolah, set soalan &amp; rekod skor sendiri. Cipta kod berasingan untuk setiap kelas/kumpulan jika perlu.'
      : (Store.initError ? `<b style="color:#ffd8a8">⚠️ Firebase tidak aktif: ${esc(Store.reason())}</b><br>` : '') + '<b>Mod Peranti:</b> tetapan, soalan &amp; skor disimpan dalam peranti ini sahaja (sesuai untuk komputer/tablet kelas). Untuk PdPR jarak jauh, sambungkan Firebase — lihat <code>PANDUAN-FIREBASE.txt</code>.';
    $('#fSekolah').value = r.sekolah || ''; $('#fGuru').value = r.guru || '';
    $('#fKelas').value = (r.senaraiKelas || []).join(', ');
    $('#sGuru').checked = !!r.sumber.guru; $('#sUmum').checked = !!r.sumber.umum; $('#sT2').checked = !!r.sumber.t2; $('#sT3').checked = !!r.sumber.t3; $('#sMix').checked = !!r.sumber.mix;
    $('#fBil').value = String(r.bilSoalan || 20); $('#fMasa').value = String(r.masa || 25);
    $('#fRekod').checked = r.rekod !== false; $('#fAktif').checked = r.aktif !== false;
    $('#fAktif').nextElementSibling.textContent = Store.online ? 'Kelas dibuka untuk murid' : 'Aktifkan mod kelas pada peranti ini';
    this.setLogo(r.logo || '');
    $('#admRoomStatus').textContent = '';
  },
  setLogo(d){ this.room.logo = d; const im = $('#fLogoPrev'); if (d) { im.src = d; im.hidden = false; $('#fLogoDel').hidden = false; } else { im.hidden = true; $('#fLogoDel').hidden = true; } },
  readForm(){
    const r = this.room;
    return { sekolah: $('#fSekolah').value.trim(), guru: $('#fGuru').value.trim(), logo: r.logo || '',
      senaraiKelas: $('#fKelas').value.split(/[,\n;]+/).map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60),
      sumber: { guru: $('#sGuru').checked, umum: $('#sUmum').checked, t2: $('#sT2').checked, t3: $('#sT3').checked, mix: $('#sMix').checked },
      bilSoalan: +$('#fBil').value, masa: +$('#fMasa').value, rekod: $('#fRekod').checked, aktif: $('#fAktif').checked,
      dicipta: r.dicipta || Date.now() };
  },
  async saveRoom(){
    const data = this.readForm(), st = $('#admRoomStatus');
    if (!Object.values(data.sumber).some(Boolean)) { st.className = 'status err'; st.textContent = 'Pilih sekurang-kurangnya satu set soalan.'; return; }
    $('#admSaveRoom').disabled = true; st.className = 'status'; st.textContent = '⏳ Menyimpan…';
    try {
      const kod = await Store.saveRoom(this.room.kod, data);
      this.room = { ...this.room, ...data, kod, isNew: false };
      if (Store.online) LS.set('belon_admin_room', kod);
      st.className = 'status ok'; st.textContent = '✅ Tetapan disimpan.';
      $('#roomFormTitle').textContent = Store.online ? `Tetapan Kelas ${kod}` : 'Tetapan Kelas (Peranti Ini)';
      this.renderRooms(); this.renderShare();
    } catch (e) { console.error(e); st.className = 'status err'; st.textContent = '❌ Gagal menyimpan: ' + (e.code === 'permission-denied' ? 'tiada kebenaran (log masuk semula)' : e.message); }
    $('#admSaveRoom').disabled = false;
  },
  shareLink(){ return location.origin + location.pathname.replace(/index\.html$/, '') + '?kod=' + this.room.kod; },
  async renderShare(){
    if (!Store.online || !this.room || this.room.isNew) { $('#shareCard').hidden = true; return; }
    $('#shareCard').hidden = false;
    $('#shareCode').textContent = this.room.kod; $('#shareLink').value = this.shareLink();
    try { $('#shareQR').src = await Files.qrDataUrl(this.shareLink()); } catch (e) { console.warn(e); }
  },

  /* ---------------- SOALAN GURU ---------------- */
  async loadQs(){
    if (this.needRoom()) return;
    $('#qList').innerHTML = '<div class="adm-hint">⏳ Memuatkan…</div>';
    try { this.roomQs = await Store.listRoomQuestions(this.room.kod); } catch (e) { this.roomQs = []; toast('Gagal memuatkan soalan: ' + e.message); }
    $('#qCount').textContent = this.roomQs.length;
    $('#qList').innerHTML = this.roomQs.length ? this.roomQs.map((q, i) => `<div class="qitem"><div class="qt">${i + 1}. ${esc(q.q)}
        <small>${q.opts.map((o, j) => j === q.ans ? `<span class="ok">${'ABCD'[j]}. ${esc(o)} ✔</span>` : `${'ABCD'[j]}. ${esc(o)}`).join(' · ')}${q.topik ? ' · <i>' + esc(q.topik) + '</i>' : ''}</small></div>
        <button data-del="${esc(q.id)}" title="Padam">🗑</button></div>`).join('')
      : '<div class="adm-hint">Belum ada soalan guru. Muat naik fail PDF/DOCX di atas atau tambah secara manual.</div>';
  },
  async handleUpload(input, statusEl, reviewEl, saveFn, saveLabel){
    const files = [...input.files]; if (!files.length) return;
    statusEl.className = 'status'; statusEl.textContent = '⏳ Membaca fail…'; reviewEl.innerHTML = '';
    let all = [];
    for (const f of files) {
      try {
        const text = await Files.extractText(f);
        const qs = parseQuestionText(text);
        qs.forEach(q => q.file = f.name); all = all.concat(qs);
        if (!qs.length) toast(`Tiada soalan dikesan dalam ${f.name}. Semak format (1. soalan / A. pilihan).`, 4500);
      } catch (e) { console.error(e); toast(`${f.name}: ${e.message}`, 4500); }
    }
    input.value = '';
    if (!all.length) { statusEl.className = 'status err'; statusEl.textContent = 'Tiada soalan objektif dikesan. Pastikan soalan bernombor (1. 2. 3.) dengan pilihan A. B. C. D.'; return; }
    all.forEach(q => { while (q.opts.length < 4) q.opts.push(''); q.opts = q.opts.slice(0, 4); });
    statusEl.className = 'status ok'; statusEl.textContent = `✅ ${all.length} soalan dikesan. Semak jawapan di bawah (kuning = perlu semakan), kemudian tekan Simpan.`;
    Review.render(reviewEl, all, async chosen => {
      const n = await saveFn(chosen);
      statusEl.className = 'status ok'; statusEl.textContent = `✅ ${n} soalan disimpan.`;
      toast(`✅ ${n} soalan disimpan`);
    }, saveLabel);
  },
  async addManual(){
    if (this.needRoom()) return;
    const q = $('#mQ').value.trim(), opts = [0, 1, 2, 3].map(j => $('#mA' + j).value.trim());
    const ans = +document.querySelector('input[name=mAns]:checked').value, st = $('#mStatus');
    if (!q || !opts[0] || !opts[1]) { st.className = 'status err'; st.textContent = 'Isi soalan dan sekurang-kurangnya pilihan A & B.'; return; }
    if (!opts[ans]) { st.className = 'status err'; st.textContent = 'Jawapan yang ditanda tidak mempunyai teks.'; return; }
    const pairs = opts.map((o, j) => ({ o, j })).filter(p => p.o);
    await Store.addRoomQuestions(this.room.kod, [{ q, opts: pairs.map(p => p.o), ans: pairs.findIndex(p => p.j === ans), topik: $('#upTopik').value.trim() || 'Soalan Guru' }]);
    $('#mQ').value = ''; [0, 1, 2, 3].forEach(j => $('#mA' + j).value = '');
    st.className = 'status ok'; st.textContent = '✅ Soalan ditambah.'; this.loadQs();
  },

  /* ---------------- SKOR MURID ---------------- */
  async loadScores(){
    if (this.needRoom()) return;
    $('#scTable').innerHTML = '<tr><td>⏳ Memuatkan…</td></tr>';
    try { this.scores = await Store.listScores(this.room.kod); }
    catch (e) { this.scores = []; $('#scTable').innerHTML = `<tr><td>❌ ${esc(e.code === 'permission-denied' ? 'Tiada kebenaran — log masuk semula.' : e.message)}</td></tr>`; return; }
    const fill = (sel, vals, first) => { const cur = sel.value; sel.innerHTML = `<option value="">${first}</option>` + [...new Set(vals)].filter(Boolean).sort().map(v => `<option>${esc(v)}</option>`).join(''); sel.value = cur; };
    fill($('#scKelas'), this.scores.map(s => s.kelas), 'Semua kelas');
    fill($('#scTahap'), this.scores.map(s => s.tahap), 'Semua set');
    this.renderScores();
  },
  filtered(){
    const k = $('#scKelas').value, t = $('#scTahap').value;
    return this.scores.filter(s => (!k || s.kelas === k) && (!t || s.tahap === t)).sort((a, b) => b.tarikh - a.tarikh);
  },
  renderScores(){
    const list = this.filtered();
    $('#scCount').textContent = `${list.length} rekod`;
    $('#scTable').innerHTML = list.length ? `<tr><th>Nama</th><th>Kelas</th><th>Set</th><th class="r">Skor</th><th class="r">Betul</th><th class="r">%</th><th>Tarikh</th><th></th></tr>` +
      list.map(s => `<tr><td>${esc(s.nama)}</td><td>${esc(s.kelas || '-')}</td><td>${esc(s.tahap || '-')}</td><td class="r">${s.skor}</td><td class="r">${s.betul}/${s.jumlah}</td>
        <td class="r">${s.jumlah ? Math.round(s.betul / s.jumlah * 100) : 0}</td><td>${fmtDate(s.tarikh)}</td>
        <td><button data-pdf="${esc(s.id)}" title="PDF semakan murid">📄</button><button data-delsc="${esc(s.id)}" title="Padam">🗑</button></td></tr>`).join('')
      : '<tr><td class="empty">Belum ada skor. Kongsi kod kelas / pautan kepada murid.</td></tr>';
  },
  roomForReport(){ return { ...this.room, kod: Store.online ? this.room.kod : 'Peranti' }; },
  stamp(){ const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; },
  async exportXlsx(){
    const list = this.filtered(); if (!list.length) return toast('Tiada skor untuk dimuat turun');
    try { Files.download(await Reports.scoresExcel(list, this.roomForReport()), `Skor_${Files.safeName(this.room.sekolah || this.room.kod)}_${this.stamp()}.xlsx`); }
    catch (e) { console.error(e); toast('Excel gagal: ' + e.message); }
  },
  async exportPdf(){
    const list = this.filtered(); if (!list.length) return toast('Tiada skor untuk dimuat turun');
    try { Files.download(await Reports.scoresPdf(list, this.roomForReport()), `Skor_${Files.safeName(this.room.sekolah || this.room.kod)}_${this.stamp()}.pdf`); }
    catch (e) { console.error(e); toast('PDF gagal: ' + e.message); }
  },

  /* ---------------- BANK UMUM ---------------- */
  async renderBank(){
    const info = $('#bankInfo'), lalai = await Store.bundledBank();
    $('#seedN').textContent = lalai.length;
    if (!Store.online) {
      info.innerHTML = `<h3>📚 Bank Soalan Umum</h3><p class="adm-hint">Dalam Mod Peranti, Bank Umum menggunakan <b>${lalai.length}</b> soalan terbina dalam aplikasi
        (daripada set soalan teori muzik Menengah Rendah Cikgu Dzurri). Guru boleh terus guna tanpa muat naik apa-apa.<br>
        Selepas Firebase disambung, Pentadbir Utama boleh menambah soalan baharu di sini dan ia akan keluar secara rawak untuk semua murid.</p>`;
      $('#superLogin').hidden = true; $('#superTools').hidden = true; return;
    }
    info.innerHTML = `<h3>📚 Bank Soalan Umum (Firebase)</h3><p class="adm-hint">Soalan di sini dikongsi oleh <b>semua guru</b> dan keluar secara rawak dalam set “Bank Soalan Umum”.
      Jika bank Firebase kosong, aplikasi guna ${lalai.length} soalan terbina.</p><div class="status" id="bankNow">⏳</div>`;
    Store.countGlobal().then(n => { const el = $('#bankNow'); if (el) el.textContent = `Bilangan soalan dalam Firebase: ${n}`; }).catch(e => { const el = $('#bankNow'); if (el) el.textContent = 'Tidak dapat membaca: ' + e.message; });
    const sup = Store.isSuper();
    $('#superLogin').hidden = sup; $('#superTools').hidden = !sup;
    if (sup) this.loadBankList();
  },
  async loadBankList(){
    try { this.bank = await Store.listGlobal(); } catch (e) { this.bank = []; }
    $('#bankCount').textContent = this.bank.length;
    this.renderBankList();
  },
  renderBankList(){
    const f = ($('#bankSearch').value || '').toLowerCase();
    const list = (this.bank || []).filter(q => !f || q.q.toLowerCase().includes(f)).slice(0, 200);
    $('#bankList').innerHTML = list.length ? list.map(q => `<div class="qitem"><div class="qt">${esc(q.q)}<small>${esc(q.tahap || '')} · ${esc(q.topik || '')} · ✔ ${esc(q.opts[q.ans])}</small></div><button data-delbank="${esc(q.id)}">🗑</button></div>`).join('')
      : '<div class="adm-hint">Tiada soalan Firebase (atau tiada padanan carian).</div>';
  },
  async seedBank(){
    const btn = $('#bankSeed'), st = $('#bankSeedStatus');
    if (!btn.dataset.sure) { btn.dataset.sure = '1'; btn.textContent = '⚠️ Tekan sekali lagi untuk sahkan'; setTimeout(() => { delete btn.dataset.sure; btn.textContent = '⬆️ Muat naik soalan lalai ke Firebase'; }, 5000); return; }
    delete btn.dataset.sure; btn.disabled = true; st.textContent = '⏳ Memuat naik…';
    try {
      const lalai = await Store.bundledBank();
      const existing = new Set((await Store.listGlobal()).map(q => String(q.q).trim().toLowerCase()));
      const add = lalai.filter(q => !existing.has(q.q.trim().toLowerCase()));
      const n = add.length ? await Store.addGlobalQuestions(add) : (await Store.rebuildBankSnapshot(), 0);
      st.className = 'status ok'; st.textContent = `✅ ${n} soalan dimuat naik (${lalai.length - add.length} sudah ada).`;
      this.renderBank();
    } catch (e) { st.className = 'status err'; st.textContent = '❌ ' + e.message; }
    btn.disabled = false; btn.textContent = '⬆️ Muat naik soalan lalai ke Firebase';
  },
  async superLogin(){
    const r = await Store.loginSuper($('#supEmail').value, $('#supPw').value);
    if (!r.ok) { $('#supErr').textContent = r.msg; return; }
    $('#supErr').textContent = ''; $('#admWho').textContent = `Log masuk: ${Store.user.email} (Pentadbir Utama)`; this.renderBank();
  },
  twoStep(btn, label, fn){
    if (!btn.dataset.sure) { btn.dataset.sure = '1'; const t = btn.textContent; btn.textContent = '⚠️ ' + label; setTimeout(() => { delete btn.dataset.sure; btn.textContent = t; }, 4000); return; }
    delete btn.dataset.sure; fn();
  }
};

/* ---------------- Pengikat UI admin ---------------- */
$('#admClose').addEventListener('click', () => Admin.close());
$('#admLoginBtn').addEventListener('click', () => Admin.login());
$('#admPw').addEventListener('keydown', e => { if (e.key === 'Enter') Admin.login(); });
$('#admLogout').addEventListener('click', () => Admin.logout());
$$('#admTabs button').forEach(b => b.addEventListener('click', () => Admin.tab(b.dataset.tab)));
$('#myRooms').addEventListener('click', e => { const b = e.target.closest('button[data-kod]'); if (b) Admin.loadRoom(b.dataset.kod); });
$('#admOpenBtn').addEventListener('click', () => Admin.loadRoom($('#admOpenCode').value));
$('#admNewRoom').addEventListener('click', () => Admin.newRoom());
$('#admSaveRoom').addEventListener('click', () => Admin.saveRoom());
$('#fLogo').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { Admin.setLogo(await Files.resizeImage(f, 256)); } catch (err) { toast(err.message); }
  e.target.value = '';
});
$('#fLogoDel').addEventListener('click', () => Admin.setLogo(''));
$('#shareCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#shareLink').value); toast('📋 Pautan disalin'); }
  catch (e) { $('#shareLink').select(); document.execCommand && document.execCommand('copy'); toast('📋 Pautan disalin'); }
});
$('#shareSend').addEventListener('click', async () => {
  const r = Admin.room, text = `🎈 Kuiz Teori Muzik AR — ${r.sekolah || ''} ${r.guru ? '(' + r.guru + ')' : ''}\nKod kelas: ${r.kod}\nBuka: ${Admin.shareLink()}`;
  if (navigator.share) { try { await navigator.share({ title: 'Belon Teori Muzik AR', text }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(text); toast('📋 Mesej jemputan disalin — tampal di WhatsApp / Classroom'); } catch (e) {} }
});
$('#shareQRdl').addEventListener('click', async () => {
  const blob = await (await fetch($('#shareQR').src)).blob(); Files.download(blob, `QR_Kelas_${Admin.room.kod}.gif`);
});
$('#upFile').addEventListener('change', e => {
  if (Admin.needRoom()) { e.target.value = ''; return; }
  Admin.handleUpload(e.target, $('#upStatus'), $('#upReview'), async chosen => {
    const topik = $('#upTopik').value.trim() || 'Soalan Guru';
    const n = await Store.addRoomQuestions(Admin.room.kod, chosen.map(q => ({ ...q, topik })));
    if (!Admin.room.sumber.guru) { Admin.room.sumber.guru = true; $('#sGuru').checked = true; await Store.saveRoom(Admin.room.kod, Admin.readForm()); }
    Admin.loadQs(); return n;
  }, '💾 Simpan ke kelas');
});
$('#mAdd').addEventListener('click', () => Admin.addManual());
$('#qRefresh').addEventListener('click', () => Admin.loadQs());
$('#qList').addEventListener('click', async e => {
  const id = e.target.dataset.del; if (!id) return;
  await Store.deleteRoomQuestion(Admin.room.kod, id); Admin.loadQs();
});
$('#qClear').addEventListener('click', e => Admin.twoStep(e.currentTarget, 'Tekan lagi untuk padam SEMUA soalan', async () => {
  if (Admin.needRoom()) return; await Store.clearRoomQuestions(Admin.room.kod); toast('Semua soalan guru dipadam'); Admin.loadQs();
}));
$('#scKelas').addEventListener('change', () => Admin.renderScores());
$('#scTahap').addEventListener('change', () => Admin.renderScores());
$('#scRefresh').addEventListener('click', () => Admin.loadScores());
$('#scXlsx').addEventListener('click', () => Admin.exportXlsx());
$('#scPdf').addEventListener('click', () => Admin.exportPdf());
$('#scTable').addEventListener('click', async e => {
  const pid = e.target.dataset.pdf, did = e.target.dataset.delsc;
  if (pid) {
    const s = Admin.scores.find(x => x.id === pid); if (!s) return;
    if (!s.butiran || !s.butiran.length) return toast('Rekod ini tiada butiran jawapan');
    const blob = await Reports.studentReview({ ...s, sekolah: Admin.room.sekolah, logo: Admin.room.logo, kod: Admin.room.kod });
    Files.download(blob, `Semakan_${Files.safeName(s.nama)}_${Files.safeName(s.kelas)}.pdf`);
  }
  if (did) Admin.twoStep(e.target, '', async () => { await Store.deleteScore(Admin.room.kod, did); Admin.scores = Admin.scores.filter(x => x.id !== did); Admin.renderScores(); });
});
$('#scClear').addEventListener('click', e => Admin.twoStep(e.currentTarget, 'Tekan lagi untuk padam SEMUA skor', async () => {
  if (Admin.needRoom()) return; await Store.clearScores(Admin.room.kod); toast('Semua skor dipadam'); Admin.loadScores();
}));
$('#supLogin').addEventListener('click', () => Admin.superLogin());
$('#bankSeed').addEventListener('click', () => Admin.seedBank());
$('#bankRebuild').addEventListener('click', async e => {
  const btn = e.currentTarget; btn.disabled = true;
  try { const r = await Store.rebuildBankSnapshot(); toast(`✅ Bank murid dikemas kini: ${r.n} soalan` + (r.n < r.total ? ` (had saiz: ${r.total - r.n} tidak dimuatkan)` : ''), 4000); Admin.loadBankList(); }
  catch (err) { toast('Gagal: ' + err.message); }
  btn.disabled = false;
});
$('#bankSearch').addEventListener('input', () => Admin.renderBankList());
$('#bankList').addEventListener('click', async e => {
  const id = e.target.dataset.delbank; if (!id) return;
  await Store.deleteGlobal(id); Admin.bank = Admin.bank.filter(q => q.id !== id); Admin.renderBankList(); $('#bankCount').textContent = Admin.bank.length;
});
$('#bankFile').addEventListener('change', e => {
  Admin.handleUpload(e.target, $('#bankStatus'), $('#bankReview'), async chosen => {
    const tahap = $('#bankTahap').value, topik = $('#bankTopik').value.trim() || 'Teori Muzik';
    const n = await Store.addGlobalQuestions(chosen.map(q => ({ ...q, tahap, topik }))); Admin.loadBankList(); return n;
  }, '🌐 Simpan ke Bank Umum');
});
