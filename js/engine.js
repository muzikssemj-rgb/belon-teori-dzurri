/* =============================================================================
   BUNYI (Web Audio — disintesis, tiada fail luaran)
   ============================================================================= */
const Sound = {
  ctx: null, enabled: true, noise: null,
  init(){
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = this.ctx.sampleRate * 0.4, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },
  pop(){  // letupan belon
    if (!this.enabled || !this.ctx) return; const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, t); bp.frequency.exponentialRampToValueAtTime(400, t + .15); bp.Q.value = .8;
    const g = c.createGain(); g.gain.setValueAtTime(1.1, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
    n.connect(bp).connect(g).connect(c.destination); n.start(t); n.stop(t + .2);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
    og.gain.setValueAtTime(.8, t); og.gain.exponentialRampToValueAtTime(.001, t + .14);
    o.connect(og).connect(c.destination); o.start(t); o.stop(t + .15);
  },
  correct(){  // arpeggio C major menaik
    if (!this.enabled || !this.ctx) return; const c = this.ctx, t = c.currentTime + .05;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
      const st = t + i * .09; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.35, st + .02); g.gain.exponentialRampToValueAtTime(.001, st + (i === 3 ? .6 : .25));
      o.connect(g).connect(c.destination); o.start(st); o.stop(st + .65);
    });
  },
  wrong(){  // bunyi "buzz" menurun
    if (!this.enabled || !this.ctx) return; const c = this.ctx, t = c.currentTime + .05;
    [0, .2].forEach((dt, i) => {
      const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(i ? 155 : 196, t + dt); o.frequency.linearRampToValueAtTime(i ? 98 : 150, t + dt + .22);
      lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(.0, t + dt); g.gain.linearRampToValueAtTime(.32, t + dt + .02); g.gain.exponentialRampToValueAtTime(.001, t + dt + .25);
      o.connect(lp).connect(g).connect(c.destination); o.start(t + dt); o.stop(t + dt + .3);
    });
  },
  tick(){
    if (!this.enabled || !this.ctx) return; const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 880;
    g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .07);
  },
  fanfare(){
    if (!this.enabled || !this.ctx) return; const c = this.ctx, t = c.currentTime + .05;
    [[523.25,0],[659.25,.15],[783.99,.3],[1046.5,.45],[783.99,.65],[1046.5,.8]].forEach(([f, dt]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(.3, t + dt + .02); g.gain.exponentialRampToValueAtTime(.001, t + dt + .4);
      o.connect(g).connect(c.destination); o.start(t + dt); o.stop(t + dt + .45);
    });
  }
};

/* =============================================================================
   MEDIA: KAMERA + MIKROFON
   ============================================================================= */
const Media = {
  video: $('#cam'), videoStream: null, audioStream: null, facing: 'environment', mirror: false, mirrorOverride: null,
  analyser: null, level: 0, hasCam: false, hasMic: false,
  async requestAll(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw new Error('Pelayar ini tidak menyokong kamera, atau laman tidak dibuka melalui https://');
    const vCons = { facingMode: { ideal: this.facing }, width: { ideal: 1280 }, height: { ideal: 720 } };
    const aCons = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    let errs = [];
    try {  // minta kedua-duanya serentak (satu tetingkap kebenaran)
      const s = await navigator.mediaDevices.getUserMedia({ video: vCons, audio: aCons });
      this.videoStream = new MediaStream(s.getVideoTracks());
      this.audioStream = new MediaStream(s.getAudioTracks());
    } catch (e) {
      errs.push(e);
      try { this.videoStream = await navigator.mediaDevices.getUserMedia({ video: vCons }); } catch (e2) { errs.push(e2); }
      try { this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: aCons }); } catch (e3) { errs.push(e3); }
    }
    if (this.videoStream) await this.attachVideo();
    if (this.audioStream && this.audioStream.getAudioTracks().length) this.attachMic();
    return { cam: this.hasCam, mic: this.hasMic, errs };
  },
  async attachVideo(){
    this.video.srcObject = this.videoStream;
    try { await this.video.play(); } catch (e) {}
    this.hasCam = true;
    this.facing = this.detectFacing(this.facing);
    this.applyMirror();
    document.body.classList.remove('nocam');
  },
  /* Kenal pasti kamera hadapan/belakang. Banyak peranti (laptop, sesetengah Android)
     tidak melaporkan facingMode — guna keupayaan, label & jenis peranti sebagai sandaran. */
  detectFacing(requested){
    const tr = this.videoStream.getVideoTracks()[0]; if (!tr) return requested;
    const st = tr.getSettings ? tr.getSettings() : {};
    if (st.facingMode === 'user' || st.facingMode === 'environment') return st.facingMode;
    let caps = {}; try { caps = tr.getCapabilities ? tr.getCapabilities() : {}; } catch (e) {}
    if (caps.facingMode && caps.facingMode.length === 1) return caps.facingMode[0];
    const lbl = (tr.label || '').toLowerCase();
    if (/front|user|facetime|selfie|depan|integrated|webcam/.test(lbl)) return 'user';
    if (/back|rear|environment|belakang/.test(lbl)) return 'environment';
    const mobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
    return mobile ? requested : 'user';      // komputer riba: kamera sentiasa menghadap pengguna
  },
  /* Paparan video dan pemetaan jari SENTIASA dicermin bersama supaya kursor
     berada betul-betul di atas jari dalam paparan. */
  applyMirror(){
    let saved = null; try { saved = localStorage.getItem(CONFIG.STORAGE_KEY + '_mirror_' + this.facing); } catch (e) {}
    if (this.mirrorOverride === null && saved !== null) this.mirrorOverride = saved === '1';
    this.mirror = this.mirrorOverride !== null ? this.mirrorOverride : this.facing === 'user';
    this.video.classList.toggle('mirror', this.mirror);
    const b = document.getElementById('tMirror'); if (b) b.classList.toggle('on', this.mirror);
  },
  attachMic(){
    Sound.init();
    if (!Sound.ctx) return;
    const src = Sound.ctx.createMediaStreamSource(this.audioStream);
    this.analyser = Sound.ctx.createAnalyser(); this.analyser.fftSize = 1024;
    src.connect(this.analyser);           // TIDAK disambung ke speaker (elak bunyi suapan balik)
    this.buf = new Float32Array(this.analyser.fftSize);
    this.hasMic = true;
  },
  readLevel(){
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let peak = 0, sum = 0;
    for (let i = 0; i < this.buf.length; i++) { const v = Math.abs(this.buf[i]); sum += v * v; if (v > peak) peak = v; }
    const rms = Math.sqrt(sum / this.buf.length);
    this.level = Math.min(1, Math.max(rms * 3, peak * .9));
    return this.level;
  },
  async flip(){
    if (!this.hasCam) return false;
    const next = this.facing === 'user' ? 'environment' : 'user';
    this.videoStream.getTracks().forEach(t => t.stop());
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: next }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    } catch (e) {
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next } });
    }
    this.facing = next; this.mirrorOverride = null;
    await this.attachVideo();
    return true;
  }
};

/* =============================================================================
   PENJEJAKAN JARI (MediaPipe Hand Landmarker) — acu jari telunjuk ke belon
   ============================================================================= */
/* Penapis One Euro — kurangkan gegaran kursor tanpa melambatkan pergerakan pantas */
class OneEuro {
  constructor(minCutoff = 1.4, beta = 0.012, dCutoff = 1.0){ Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: 0, t: 0 }); }
  alpha(cutoff, dt){ const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(v, t){
    if (this.x === null) { this.x = v; this.t = t; return v; }
    const dt = Math.max(1e-3, (t - this.t) / 1000); this.t = t;
    const dx = (v - this.x) / dt; this.dx += this.alpha(this.dCutoff, dt) * (dx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += this.alpha(cutoff, dt) * (v - this.x); return this.x;
  }
  reset(){ this.x = null; this.dx = 0; }
}

const Hand = {
  landmarker: null, loading: false, active: false, point: null, raw: null, bones: null, lastVideoTime: -1,
  lostAt: 0, fx: new OneEuro(), fy: new OneEuro(),
  async enable(){
    if (!Media.hasCam) throw new Error('Kamera diperlukan untuk mod jari.');
    if (!this.landmarker) {
      this.loading = true;
      const vision = await import(CONFIG.MEDIAPIPE_BUNDLE);
      const files = await vision.FilesetResolver.forVisionTasks(CONFIG.MEDIAPIPE_WASM);
      const opts = d => ({ baseOptions: { modelAssetPath: CONFIG.HAND_MODEL, delegate: d }, runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: .6, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
      try { this.landmarker = await vision.HandLandmarker.createFromOptions(files, opts('GPU')); }
      catch (e) { this.landmarker = await vision.HandLandmarker.createFromOptions(files, opts('CPU')); }
      this.loading = false;
    }
    this.active = true;
  },
  disable(){ this.active = false; this.point = null; this.bones = null; this.drawBones(); },
  /* Tukar koordinat ternormal video → piksel skrin (ambil kira object-fit:cover & cermin) */
  toScreen(lm){
    const v = Media.video, W = innerWidth, H = innerHeight, vw = v.videoWidth || W, vh = v.videoHeight || H;
    const sc = Math.max(W / vw, H / vh), dw = vw * sc, dh = vh * sc;
    let x = (W - dw) / 2 + lm.x * dw; const y = (H - dh) / 2 + lm.y * dh;
    if (Media.mirror) x = W - x;
    return { x, y };
  },
  update(){
    if (!this.active || !this.landmarker) return;
    const v = Media.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    const now = performance.now();
    let res; try { res = this.landmarker.detectForVideo(v, now); } catch (e) { return; }
    if (!res || !res.landmarks || !res.landmarks.length) {
      if (this.point && now - this.lostAt > 250) { this.point = null; this.bones = null; this.fx.reset(); this.fy.reset(); this.drawBones(); }
      if (!this.lostAt) this.lostAt = now;
      return;
    }
    this.lostAt = 0;
    const lm = res.landmarks[0];
    this.bones = [5, 6, 7, 8].map(i => this.toScreen(lm[i]));        // tulang jari telunjuk
    const tip = this.bones[3];                                          // landmark 8 = hujung jari telunjuk
    this.raw = tip;
    this.point = { x: this.fx.filter(tip.x, now), y: this.fy.filter(tip.y, now) };
    this.drawBones();
  },
  drawBones(){   // lukis jari telunjuk yang dikesan — pemain nampak penjejakan selari dengan jari sebenar
    const c = document.getElementById('handCanvas'); if (!c) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== innerWidth * dpr || c.height !== innerHeight * dpr) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
    if (!this.active || !this.bones) return;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 9; g.beginPath(); this.bones.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
    g.strokeStyle = '#fcc419'; g.lineWidth = 5; g.stroke();
    this.bones.forEach(p => { g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 4, 0, 6.3); g.fill(); });
  }
};

/* =============================================================================
   ENJIN BELON 3D (A-Frame / Three.js)
   ============================================================================= */
const COLORS = ['#ff4d6d', '#4dabf7', '#40c057', '#fcc419'];
const LETTERS = ['A', 'B', 'C', 'D'];
const World = {
  scene: null, THREE: null, root: null, balloons: [], particles: [], raycaster: null,
  init(sceneEl){
    this.sceneEl = sceneEl; this.THREE = AFRAME.THREE;
    this.root = new this.THREE.Group(); sceneEl.object3D.add(this.root);
    this.raycaster = new this.THREE.Raycaster();
    const T = this.THREE;
    this.geo = {
      body: new T.SphereGeometry(.42, 36, 26),
      knot: new T.ConeGeometry(.07, .12, 14),
      shine: new T.SphereGeometry(.09, 12, 10),
      label: new T.PlaneGeometry(1.0, .5),
      shard: new T.TetrahedronGeometry(.06),
      ring: new T.RingGeometry(.3, .38, 40)
    };
  },
  makeLabelTexture(letter, text, color){
    text = String(text);
    const T = this.THREE, c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const r = 46; g.fillStyle = 'rgba(255,255,255,0.96)';
    g.beginPath(); g.moveTo(r, 6); g.arcTo(506, 6, 506, 250, r); g.arcTo(506, 250, 6, 250, r); g.arcTo(6, 250, 6, 6, r); g.arcTo(6, 6, 506, 6, r); g.closePath(); g.fill();
    g.lineWidth = 10; g.strokeStyle = color; g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(62, 128, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 62, 131);
    // teks jawapan — auto saiz & balut baris
    g.fillStyle = '#1b1446'; g.textAlign = 'center';
    const maxW = 370, x0 = 300;
    let size = 66, lines;
    const wrap = sz => {
      g.font = `bold ${sz}px "Trebuchet MS", sans-serif`;
      const words = text.split(' '), out = []; let line = '';
      for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; }
      if (line) out.push(line); return out;
    };
    do { lines = wrap(size); size -= 3; } while ((lines.length * size * 1.15 > 220 || lines.some(l => g.measureText(l).width > maxW)) && size > 20);
    size += 3; g.font = `bold ${size}px "Trebuchet MS", sans-serif`;
    const lh = size * 1.12, startY = 128 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => g.fillText(l, x0, startY + i * lh + 2));
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  },
  makeBalloon(i, text, correct){
    const T = this.THREE, color = COLORS[i];
    const grp = new T.Group();
    const bodyMat = new T.MeshStandardMaterial({ color, roughness: .22, metalness: .05, emissive: new T.Color(color).multiplyScalar(.18) });
    const body = new T.Mesh(this.geo.body, bodyMat); body.scale.set(1, 1.16, 1); grp.add(body);
    const knot = new T.Mesh(this.geo.knot, bodyMat); knot.position.y = -.53; knot.rotation.x = Math.PI; grp.add(knot);
    const shine = new T.Mesh(this.geo.shine, new T.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .55 }));
    shine.position.set(-.15, .2, .33); shine.scale.set(1, 1.5, .5); grp.add(shine);
    const pts = []; for (let k = 0; k <= 16; k++) { const tt = k / 16; pts.push(new T.Vector3(Math.sin(tt * 7) * .05, -.6 - tt * .95, 0)); }
    const str = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85 }));
    grp.add(str);
    const labelMat = new T.MeshBasicMaterial({ map: this.makeLabelTexture(LETTERS[i], text, color), transparent: true, depthTest: false });
    const label = new T.Mesh(this.geo.label, labelMat); label.position.set(0, -.02, .5); label.renderOrder = 10; grp.add(label);
    const b = { grp, body, label, bodyMat, labelMat, color, correct, text, index: i, popped: false, phase: Math.random() * 6.28, born: 0, base: new T.Vector3(), glow: false };
    body.userData.balloon = b; label.userData.balloon = b;
    this.root.add(grp);
    return b;
  },
  layout(){  // susun 4 belon mengikut saiz & orientasi skrin
    const cam = this.sceneEl.camera, aspect = cam.aspect || innerWidth / innerHeight;
    const d = 4, halfH = d * Math.tan(cam.fov * Math.PI / 360), halfW = halfH * aspect;
    let pos, scale;
    if (aspect < 1.05) {   // potret: grid 2 × 2
      scale = clamp(halfW * .37 / .62, .5, 1.2);
      const dx = halfW * .47, yTop = halfH * .0, yBot = -halfH * .5;
      pos = [[-dx, yTop], [dx, yTop], [-dx, yBot], [dx, yBot]];
    } else {               // landskap: satu baris
      scale = clamp(halfW * .2 / .62, .5, 1.2);
      const dx = halfW * .36;
      pos = [[-dx * 1.5, -halfH * .22], [-dx * .5, -halfH * .12], [dx * .5, -halfH * .22], [dx * 1.5, -halfH * .12]];
    }
    // ikut arah pandangan semasa (penting dalam mod giroskop)
    const T = this.THREE, dir = new T.Vector3(); cam.getWorldDirection(dir);
    const yaw = Math.atan2(-dir.x, -dir.z), camPos = new T.Vector3(); cam.getWorldPosition(camPos);
    return pos.map(([x, y]) => {
      const v = new T.Vector3(x, y, -d).applyAxisAngle(new T.Vector3(0, 1, 0), yaw);
      return { p: v.add(camPos), cam: camPos.clone(), yaw, scale };
    });
  },
  spawn(options){  // options: [{text, correct}] × 4 (sudah dirawak)
    this.clear();
    const L = this.layout(), now = performance.now();
    this.balloons = options.map((o, i) => {
      const b = this.makeBalloon(i, o.label || o.text, o.correct);
      b.base.copy(L[i].p); b.grp.position.copy(b.base); b.grp.lookAt(L[i].cam.x, b.base.y, L[i].cam.z); b.baseRotY = b.grp.rotation.y; b.grp.scale.setScalar(L[i].scale); b.scale = L[i].scale;
      b.born = now + i * 120; b.grp.position.copy(b.base); b.grp.position.y -= 4; return b;
    });
  },
  clear(){
    this.balloons.forEach(b => { this.root.remove(b.grp); b.bodyMat.dispose(); b.labelMat.map.dispose(); b.labelMat.dispose(); });
    this.balloons = [];
  },
  pop(b){
    if (b.popped) return; b.popped = true;
    const T = this.THREE, wp = new T.Vector3(); b.body.getWorldPosition(wp);
    b.grp.visible = false;
    const mat = new T.MeshBasicMaterial({ color: b.color, transparent: true, side: T.DoubleSide });
    for (let k = 0; k < 22; k++) {
      const m = new T.Mesh(this.geo.shard, mat.clone()); m.position.copy(wp);
      const v = new T.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize().multiplyScalar(2 + Math.random() * 2.5);
      m.scale.setScalar(b.scale * (0.7 + Math.random()));
      this.root.add(m); this.particles.push({ m, v, life: .9, max: .9, spin: new T.Vector3(Math.random() * 9, Math.random() * 9, 0) });
    }
    const ring = new T.Mesh(this.geo.ring, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: T.DoubleSide, depthTest: false }));
    ring.position.copy(wp); ring.rotation.y = b.grp.rotation.y; this.root.add(ring);
    this.particles.push({ m: ring, ring: true, life: .45, max: .45, s0: b.scale });
  },
  reveal(b){ b.glow = true; },
  tick(t, dt){
    const s = dt / 1000, now = performance.now();
    for (const b of this.balloons) {
      if (b.popped) continue;
      const age = (now - b.born) / 900, e = age <= 0 ? 0 : age >= 1 ? 1 : 1 - Math.pow(1 - age, 3);
      const tt = t / 1000 + b.phase;
      b.grp.position.set(b.base.x + Math.sin(tt * .9) * .06, b.base.y - (1 - e) * 4 + Math.sin(tt * 1.6) * .1, b.base.z);
      b.grp.rotation.z = Math.sin(tt * 1.1) * .06;
      if (b.glow) {
        const k = 1 + Math.sin(t / 90) * .12; b.grp.scale.setScalar(b.scale * k);
        b.bodyMat.emissive.set('#ffffff').multiplyScalar(.35 + .25 * Math.sin(t / 90));
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= s;
      if (p.life <= 0) { this.root.remove(p.m); p.m.material.dispose(); this.particles.splice(i, 1); continue; }
      const k = p.life / p.max;
      if (p.ring) { p.m.scale.setScalar(p.s0 * (1 + (1 - k) * 4)); p.m.material.opacity = k; }
      else { p.v.y -= 6 * s; p.m.position.addScaledVector(p.v, s); p.m.rotation.x += p.spin.x * s; p.m.rotation.y += p.spin.y * s; p.m.material.opacity = k; }
    }
  },
  pick(x, y, tol = 55){  // cari belon pada titik skrin (x, y)
    const cam = this.sceneEl.camera, rect = this.sceneEl.canvas.getBoundingClientRect(), T = this.THREE;
    const ndc = new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, cam);
    const live = this.balloons.filter(b => !b.popped);
    const hits = this.raycaster.intersectObjects(live.flatMap(b => [b.label, b.body]), false);
    if (hits.length) return hits[0].object.userData.balloon;
    // toleransi: belon terdekat dalam radius tol piksel
    let best = null, bd = tol;
    for (const b of live) {
      const wp = new T.Vector3(); b.body.getWorldPosition(wp); wp.project(cam);
      const sx = rect.left + (wp.x + 1) / 2 * rect.width, sy = rect.top + (1 - wp.y) / 2 * rect.height;
      const dd = Math.hypot(sx - x, sy - y); if (dd < bd) { bd = dd; best = b; }
    }
    return best;
  }
};

/* Komponen A-Frame: gelung permainan setiap bingkai */
AFRAME.registerComponent('game-loop', {
  init(){ const go = () => World.init(this.el); this.el.hasLoaded ? go() : this.el.addEventListener('loaded', go); },
  tick(t, dt){
    if (!World.root) return;
    try { World.tick(t, Math.min(dt || 16, 50)); Game.tick(t, Math.min(dt || 16, 50)); }
    catch (e) { if (!this._warned) { console.error('Ralat gelung permainan:', e); this._warned = true; } }
  }
});

/* =============================================================================
   PAPAN SKOR TERTINGGI (localStorage)
   ============================================================================= */
const Leaderboard = {
  load(){ try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || {}; } catch (e) { return {}; } },
  save(data){ try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data)); } catch (e) {} },
  add(level, entry){
    const data = this.load(); const list = data[level] || [];
    entry.id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    list.push(entry);
    list.sort((a, b) => b.s - a.s || b.c - a.c || a.d - b.d);
    const rank = list.findIndex(e => e.id === entry.id) + 1;
    data[level] = list.slice(0, CONFIG.LEADERBOARD_SIZE); this.save(data);
    return { rank, id: entry.id };
  },
  render(level, highlightId){
    const list = (this.load()[level]) || [];
    $$('#lbTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === level));
    const box = $('#lbBody'); box.innerHTML = '';
    if (!list.length) { box.innerHTML = '<div class="empty">Belum ada rekod. Jadilah juara pertama! 🎈</div>'; return; }
    const tbl = document.createElement('table'); tbl.className = 'lb';
    tbl.innerHTML = '<tr><th>#</th><th>Nama</th><th class="r">Betul</th><th class="r">Skor</th></tr>';
    list.forEach((e, i) => {
      const tr = document.createElement('tr'); if (e.id === highlightId) tr.className = 'me';
      const medal = ['🥇', '🥈', '🥉'][i] || (i + 1);
      [medal, e.n, `${e.c}/${e.t}`, e.s].forEach((v, k) => { const td = document.createElement('td'); td.textContent = v; if (k >= 2) td.className = 'r'; tr.appendChild(td); });
      tbl.appendChild(tr);
    });
    box.appendChild(tbl);
  }
};

