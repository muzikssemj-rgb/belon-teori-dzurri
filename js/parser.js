/* =============================================================================
   PENGHURAI SOALAN (PDF / DOCX → soalan objektif)
   Format disokong:
     SET 1                      ← (pilihan) tajuk set; nombor soalan bermula semula
     1. Teks soalan …           ← soalan bernombor "1." atau "1)"
       A. pilihan               ← pilihan A–D (satu baris setiap satu, atau sebaris
       B. pilihan                  "A. … B. … C. … D. …")
     Jawapan: B                 ← (pilihan) jawapan terus selepas soalan
     SKEMA JAWAPAN              ← (pilihan) bahagian skema di akhir dokumen
     Set 1
     1. C 2. B 3. A …
   ============================================================================= */
function parseQuestionText(raw){
  const lines = String(raw).replace(/\r/g, '').replace(/ /g, ' ').split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [], key = {};                 // key["set|num"] = index jawapan
  let set = 1, cur = null, inKey = false, keySet = 1, sawSetHeading = false;
  const RE_SET = /^SET\s*(\d+)\b\s*[:.\-–—]?\s*(.{0,40})$/i;
  const RE_KEY = /^(SKEMA|KUNCI|SKIMA)\s*(JAWAPAN)?\b|^JAWAPAN\s*(SOALAN)?\s*[:\-–—]?\s*$|^ANSWER\s*KEY/i;
  const RE_Q = /^(?:soalan\s*)?(\d{1,3})\s*[.)]\s*(.+)$/i;
  const RE_OPT = /^\(?([A-Da-d])\s*[.)]\s*(.*)$/;
  const RE_ANS = /^(?:jawapan|jwp|ans(?:wer)?|kunci)\s*[:=\-]?\s*\(?([A-Da-d])\)?\b/i;
  const RE_SKIP = /^(nama|kelas|tarikh|markah|arahan|fokus topik)\b\s*[:.]?|^soalan\s+\d+\s*(dan|hingga|sehingga|-|–)\s*\d+|^(semakan|ulasan|tandatangan|catatan) guru\b/i;
  const L = s => 'ABCD'.indexOf(s.toUpperCase());
  const push = () => { if (cur && cur.q) out.push(cur); cur = null; };

  for (const line of lines) {
    if (RE_KEY.test(line)) { push(); inKey = true; keySet = sawSetHeading ? 0 : 1; continue; }
    if (inKey) {
      const ms = line.match(/^set\s*(\d+)/i); if (ms) keySet = +ms[1];
      const re = /(\d{1,3})\s*[.):\-]?\s*\(?([A-D])\)?(?![a-z])/gi; let m;
      const body = ms ? line.slice(ms[0].length) : line;
      while ((m = re.exec(body))) key[(keySet || 1) + '|' + (+m[1])] = L(m[2]);
      continue;
    }
    const sm = line.match(RE_SET);
    if (sm && !RE_Q.test(line)) { push(); set = +sm[1]; sawSetHeading = true; continue; }
    if (RE_SKIP.test(line)) continue;

    const am = line.match(RE_ANS);
    if (am && cur) { cur.ans = L(am[1]); continue; }

    const om = line.match(RE_OPT);
    if (om && cur && L(om[1]) === cur.opts.length) {      // pilihan mengikut turutan A, B, C, D
      // satu baris boleh mengandungi beberapa pilihan: "A. 2 B. 3 C. 4 D. 6"
      line.split(/\s+(?=\(?[A-D]\s*[.)]\s)/).forEach(seg => {
        const m = seg.match(RE_OPT);
        let t = m ? m[2] : seg;
        let mark = false;
        if (/\s*[\*✓✔]\s*$|\(betul\)\s*$/i.test(t)) { mark = true; t = t.replace(/\s*([\*✓✔]|\(betul\))\s*$/i, ''); }
        if (m && L(m[1]) === cur.opts.length) { if (mark) cur.ans = cur.opts.length; cur.opts.push(t.trim()); }
        else if (cur.opts.length) cur.opts[cur.opts.length - 1] += ' ' + seg;
      });
      continue;
    }
    const qm = line.match(RE_Q);
    if (qm && (!cur || cur.opts.length >= 2 || +qm[1] === (cur ? cur.num + 1 : +qm[1]))) {
      push(); cur = { set, num: +qm[1], q: qm[2], opts: [], ans: -1 }; continue;
    }
    if (cur) {                                         // sambungan baris
      if (cur.opts.length) cur.opts[cur.opts.length - 1] += ' ' + line; else cur.q += ' ' + line;
    }
  }
  push();
  return out.map(x => {
    if (x.ans < 0 && key[x.set + '|' + x.num] !== undefined) x.ans = key[x.set + '|' + x.num];
    x.opts = x.opts.map(o => o.replace(/\s+/g, ' ').trim()).filter(o => o.length);
    x.q = x.q.replace(/\s+/g, ' ').trim();
    const qn = x.q.replace(/antara berikut/ig, '');
    const needsPic = /\b(rajah|gambar|keratan|di atas|di bawah ini|(skor|not|simbol|tanda|petikan|melodi) (muzik )?(berikut|tersebut))\b/i.test(qn) || /\[\s*\]|^\s*$/.test(x.q);
    x.flags = [];
    if (x.opts.length < 2) x.flags.push('pilihan tidak lengkap');
    if (x.ans < 0 || x.ans >= x.opts.length) { x.flags.push('tiada jawapan'); x.ans = -1; }
    if (needsPic || x.opts.some(o => !o)) x.flags.push('mungkin perlukan gambar');
    x.ok = x.flags.length === 0;
    return x;
  });
}
if (typeof module !== 'undefined') module.exports = { parseQuestionText };
