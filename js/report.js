/* =============================================================================
   FAIL: baca PDF/DOCX, jana PDF semakan murid, eksport skor (Excel/PDF), QR, logo
   Pustaka dimuat hanya bila diperlukan (folder lib/).
   ============================================================================= */
const Lib = {
  _p: {},
  load(src){
    if (this._p[src]) return this._p[src];
    this._p[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = () => { delete this._p[src]; rej(new Error('Gagal memuatkan ' + src)); };
      document.head.appendChild(s);
    });
    return this._p[src];
  },
  async jspdf(){ await this.load('lib/jspdf.umd.min.js'); await this.load('lib/jspdf.plugin.autotable.min.js'); return window.jspdf.jsPDF; },
  async xlsx(){ await this.load('lib/xlsx.full.min.js'); return window.XLSX; },
  async mammoth(){ await this.load('lib/mammoth.browser.min.js'); return window.mammoth; },
  async pdfjs(){ await this.load('lib/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'; return window.pdfjsLib; },
  async qrcode(){ await this.load('lib/qrcode.js'); return window.qrcode; }
};

const Files = {
  /* PDF / DOCX / TXT → teks biasa (baris demi baris) */
  async extractText(file){
    const name = (file.name || '').toLowerCase(), buf = await file.arrayBuffer();
    if (name.endsWith('.docx')) {
      const m = await Lib.mammoth(); const r = await m.extractRawText({ arrayBuffer: buf }); return r.value;
    }
    if (name.endsWith('.pdf')) {
      const pdfjs = await Lib.pdfjs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const out = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p), tc = await page.getTextContent();
        const rows = [];   // kumpul item mengikut kedudukan Y → baris
        tc.items.forEach(it => {
          if (!it.str || !it.str.trim()) return;
          const y = it.transform[5], x = it.transform[4];
          let row = rows.find(r => Math.abs(r.y - y) < 3.5);
          if (!row) { row = { y, items: [] }; rows.push(row); }
          row.items.push({ x, s: it.str, w: it.width || 0 });
        });
        rows.sort((a, b) => b.y - a.y).forEach(r => {
          r.items.sort((a, b) => a.x - b.x);
          let line = '', lastEnd = null;
          r.items.forEach(i => { line += (lastEnd !== null && i.x - lastEnd > 1.5 ? ' ' : '') + i.s; lastEnd = i.x + i.w; });
          out.push(line);
        });
        out.push('');
      }
      return out.join('\n');
    }
    if (name.endsWith('.txt')) return new TextDecoder().decode(buf);
    if (name.endsWith('.doc')) throw new Error('Format .doc lama tidak disokong. Sila "Save As" .docx atau PDF.');
    throw new Error('Format fail tidak disokong: ' + file.name);
  },

  /* Logo → PNG kecil (dataURL) supaya muat dalam Firestore */
  resizeImage(file, max = 256){
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        let d = c.toDataURL('image/png');
        if (d.length > 250000) d = c.toDataURL('image/jpeg', .85);
        res(d);
      };
      img.onerror = () => rej(new Error('Imej tidak dapat dibaca'));
      img.src = url;
    });
  },

  async qrDataUrl(text){
    const qr = await Lib.qrcode(); const q = qr(0, 'M'); q.addData(text); q.make();
    return q.createDataURL(6, 2);
  },

  download(blob, filename){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  },
  async share(blob, filename, text){
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename, text }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
    }
    this.download(blob, filename); return 'downloaded';
  },
  safeName(s){ return String(s || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'murid'; }
};

/* jsPDF fon standard hanya menyokong Latin-1 → tukar simbol muzik kepada bentuk teks */
function pdfText(s){
  return String(s == null ? '' : s)
    .replace(/♭/g, 'b').replace(/♯/g, '#').replace(/♮/g, '(natural)').replace(/𝄪/g, 'x').replace(/𝄫/g, 'bb')
    .replace(/[→⇒]/g, '->').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...')
    .replace(/[✔✓]/g, '').replace(/[✘✗]/g, '').replace(/×/g, 'x')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '?');
}
const fmtDate = t => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

const Reports = {
  /* PDF semakan jawapan murid */
  async studentReview(r){
    const jsPDF = await Lib.jspdf(); const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 14; let y = M;
    const header = () => {
      let x = M;
      if (r.logo) { try { doc.addImage(r.logo, M, y, 18, 18); x = M + 22; } catch (e) {} }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(27, 20, 70);
      doc.text(pdfText(r.sekolah || 'Belon Teori Muzik AR'), x, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90);
      doc.text('Semakan Jawapan - Kuiz Teori Muzik (Belon Teori Muzik AR)', x, y + 12);
      y += 22; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 6;
    };
    header();
    const info = [['Nama', r.nama], ['Kelas', r.kelas || '-'], ['Tahap / Set', r.tahap], ['Tarikh', fmtDate(r.tarikh)],
      ['Skor', String(r.skor)], ['Betul', `${r.betul} / ${r.jumlah}  (${Math.round(r.betul / r.jumlah * 100)}%)`]];
    if (r.kod && r.kod !== 'PERANTI') info.push(['Kod Kelas', r.kod]);
    doc.setFontSize(10.5); doc.setTextColor(30);
    info.forEach(([k, v], i) => {
      const col = i % 2, row = Math.floor(i / 2), x = M + col * 92;
      doc.setFont('helvetica', 'bold'); doc.text(k + ':', x, y + row * 6);
      doc.setFont('helvetica', 'normal'); doc.text(pdfText(v), x + 26, y + row * 6);
    });
    y += Math.ceil(info.length / 2) * 6 + 4;
    const L = 'ABCD';
    r.butiran.forEach((b, i) => {
      const qLines = doc.splitTextToSize(pdfText(`${i + 1}. ${b.s}`), W - 2 * M - 22);
      const optLines = b.p.map((o, j) => doc.splitTextToSize(pdfText(`${L[j]}. ${o}`), W - 2 * M - 52));
      const need = qLines.length * 5 + optLines.reduce((a, l) => a + l.length * 4.6, 0) + 8;
      if (y + need > 285) { doc.addPage(); y = M; }
      const ok = b.m === b.b;
      doc.setFillColor(ok ? 220 : 255, ok ? 247 : 228, ok ? 230 : 228);
      doc.roundedRect(W - M - 20, y - 4, 20, 6.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(ok ? 20 : 190, ok ? 140 : 30, ok ? 70 : 30);
      doc.text(ok ? 'BETUL' : (b.m < 0 ? 'MASA TAMAT' : 'SALAH'), W - M - 10, y + .6, { align: 'center' });
      doc.setFontSize(10.5); doc.setTextColor(25); doc.text(qLines, M, y); y += qLines.length * 5;
      doc.setFontSize(10);
      optLines.forEach((ls, j) => {
        let tag = '', c = [70, 70, 70], bold = false;
        if (j === b.b) { tag = 'Jawapan betul'; c = [20, 140, 70]; bold = true; }
        if (j === b.m && !ok) { tag = 'Jawapan anda'; c = [200, 40, 40]; bold = true; }
        if (j === b.m && ok) tag = 'Jawapan anda (betul)';
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...c);
        doc.text(ls, M + 6, y);
        if (tag) { doc.setFontSize(8.5); doc.text('<- ' + tag, W - M - 44, y); doc.setFontSize(10); }
        y += ls.length * 4.6;
      });
      y += 4;
    });
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(140); doc.text(`Belon Teori Muzik AR · ${pdfText(r.nama)} · halaman ${p}/${pages}`, W / 2, 292, { align: 'center' }); }
    return doc.output('blob');
  },

  scoreRows(list){
    return list.slice().sort((a, b) => String(a.kelas).localeCompare(String(b.kelas)) || String(a.nama).localeCompare(String(b.nama)) || a.tarikh - b.tarikh)
      .map((s, i) => ({ No: i + 1, Nama: s.nama, Kelas: s.kelas || '-', 'Tahap / Set': s.tahap || '-', Skor: s.skor, Betul: s.betul, Jumlah: s.jumlah,
        'Peratus (%)': s.jumlah ? Math.round(s.betul / s.jumlah * 100) : 0, Tarikh: fmtDate(s.tarikh) }));
  },
  summaryByClass(list){
    const m = {};
    list.forEach(s => { const k = s.kelas || '-'; (m[k] = m[k] || []).push(s); });
    return Object.keys(m).sort().map(k => {
      const a = m[k], pct = a.map(s => s.jumlah ? s.betul / s.jumlah * 100 : 0);
      return { Kelas: k, 'Bil. Percubaan': a.length, 'Bil. Murid': new Set(a.map(s => s.nama.toLowerCase())).size,
        'Purata (%)': Math.round(pct.reduce((x, y) => x + y, 0) / a.length), 'Tertinggi (%)': Math.round(Math.max(...pct)), 'Terendah (%)': Math.round(Math.min(...pct)) };
    });
  },
  itemAnalysis(list){
    const m = {};
    list.forEach(s => (s.butiran || []).forEach(b => { const k = b.s; m[k] = m[k] || { Soalan: b.s, 'Jawapan Betul': b.p[b.b], Dijawab: 0, Betul: 0 }; m[k].Dijawab++; if (b.m === b.b) m[k].Betul++; }));
    return Object.values(m).map(x => ({ ...x, 'Peratus Betul (%)': Math.round(x.Betul / x.Dijawab * 100) })).sort((a, b) => a['Peratus Betul (%)'] - b['Peratus Betul (%)']);
  },

  async scoresExcel(list, room){
    const X = await Lib.xlsx(), wb = X.utils.book_new();
    const head = [[room.sekolah || 'Belon Teori Muzik AR'], [`Skor Murid · Kod Kelas: ${room.kod || '-'} · Guru: ${room.guru || '-'} · Dijana: ${fmtDate(Date.now())}`], []];
    const add = (name, rows, widths) => {
      const ws = X.utils.aoa_to_sheet(head); X.utils.sheet_add_json(ws, rows, { origin: 'A4' });
      ws['!cols'] = widths.map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, name);
    };
    add('Skor Murid', this.scoreRows(list), [5, 28, 10, 22, 8, 8, 8, 11, 17]);
    add('Ringkasan Kelas', this.summaryByClass(list), [12, 15, 11, 11, 13, 13]);
    const ia = this.itemAnalysis(list); if (ia.length) add('Analisis Soalan', ia, [70, 28, 9, 8, 16]);
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },

  async scoresPdf(list, room){
    const jsPDF = await Lib.jspdf(); const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const M = 12; let x = M;
    if (room.logo) { try { doc.addImage(room.logo, M, 8, 16, 16); x = M + 20; } catch (e) {} }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(27, 20, 70); doc.text(pdfText(room.sekolah || 'Belon Teori Muzik AR'), x, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80);
    doc.text(pdfText(`Laporan Skor Murid - Kuiz Teori Muzik (Belon Teori Muzik AR)   |   Kod Kelas: ${room.kod || '-'}   |   Guru: ${room.guru || '-'}   |   Dijana: ${fmtDate(Date.now())}`), x, 21);
    const rows = this.scoreRows(list);
    doc.autoTable({
      startY: 28, head: [Object.keys(rows[0] || { No: '', Nama: '', Kelas: '', 'Tahap / Set': '', Skor: '', Betul: '', Jumlah: '', 'Peratus (%)': '', Tarikh: '' })],
      body: rows.map(r => Object.values(r).map(pdfText)), styles: { fontSize: 9, cellPadding: 1.8 },
      headStyles: { fillColor: [34, 26, 92] }, alternateRowStyles: { fillColor: [245, 243, 255] }, margin: { left: M, right: M }
    });
    const sum = this.summaryByClass(list);
    if (sum.length) {
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 8, head: [Object.keys(sum[0])], body: sum.map(r => Object.values(r).map(pdfText)),
        styles: { fontSize: 9 }, headStyles: { fillColor: [252, 196, 25], textColor: [27, 20, 70] }, margin: { left: M, right: M }, tableWidth: 180 });
    }
    return doc.output('blob');
  }
};
