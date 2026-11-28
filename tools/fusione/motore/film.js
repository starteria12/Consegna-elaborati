'use strict';
// Fusione "miniatura dorata" per il canale Dietro il perché: acquerelli in una cornice dorata, tipografia da HyperFrames
// (Oswald, EB Garamond), oro in foglia con la luce, quadrilobo, neve a biacca e cartiglio dallo stile Gilded Illumination
// di Lemo-Opuscar (vedi LICENSE-opuscar.txt). Tutto dipende da film.json e dal tempo t: render(t) è deterministico.

let CFG, DUR, SUBS, SHOTS;
const XF = .2;                                // metà di una dissolvenza incrociata
const S = Math.min(W, H) / 1080;              // scala dei caratteri e dei decori
const V = H > W;                              // formato verticale (Shorts)
const PX = Math.round(40 * S), PY = Math.round(40 * S), PW = W - 2 * PX, PH = H - 2 * PY;

let FR, FRg, MC, MCg, PANEL, IMG = {}, STARS = [];
let GW, GWg, GWD, GWI;
function resetCtx(g) { if (g.reset) g.reset(); g.__gp = g.__sp = g.__paint = g.__gf = g.__gff = null; }
function lapis(g) { if (!g.__paint) { g.__paint = g.createPattern(PAINTC, 'repeat'); g.__paint.setTransform(new DOMMatrix().scale(1.1)); } return g.__paint; }
function noMask(fn) { const s = MK; MK = null; fn(); MK = s; }
function wrap(g, text, maxW) {   // spezza il testo in righe che stanno in maxW
  const words = text.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

// ---------------------------------------------------------------- immagini (zoom lento, come in HyperFrames)
function shotWeights(t) {
  const on = SHOTS.filter(s => t >= s.t0 - XF && t < s.t1 + XF);
  return on.map((s, i) => ({ s, a: i === 0 ? 1 : ss((t - (s.t0 - XF)) / (2 * XF)) }));
}
function drawPic(g, sh, t, a) {
  const I = IMG[sh.img], u = clamp((t - (sh.t0 - XF)) / (sh.t1 - sh.t0 + 2 * XF)), e = sh.s[1] < sh.s[0] ? eio(u) : u;
  const s = lerp(sh.s[0], sh.s[1], e), cx = lerp(sh.c[0][0], sh.c[1][0], e), cy = lerp(sh.c[0][1], sh.c[1][1], e);
  const iw = I.naturalWidth, ih = I.naturalHeight, k = Math.max(PW / iw, PH / ih), vw = PW / (k * s), vh = PH / (k * s);
  const sx = clamp(cx * iw - vw / 2, 0, iw - vw), sy = clamp(cy * ih - vh / 2, 0, ih - vh);
  g.save(); g.globalAlpha = a; g.drawImage(I, sx, sy, vw, vh, PX, PY, PW, PH); g.restore();
}

// ---------------------------------------------------------------- lettere in foglia d'oro (scritte anche nella maschera della luce)
function goldGlyph(g, ch, x, y, font, a) {
  g.save(); g.globalAlpha = a; g.font = font; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(6,10,40,.6)'; g.fillText(ch, x + 5 * S, y + 6 * S);
  g.fillStyle = goldPat(g); g.fillText(ch, x, y);
  g.fillStyle = `rgba(46,28,10,${.34 * DIM})`; g.fillText(ch, x, y);
  g.globalAlpha = .45 * a; g.fillStyle = g.__sp; g.fillText(ch, x, y); g.globalAlpha = a;
  g.strokeStyle = INK; g.lineWidth = 2.6 * S; g.lineJoin = 'round'; g.strokeText(ch, x, y);
  if (MK) { MK.g.save(); MK.g.setTransform(1, 0, 0, 1, 0, 0); MK.g.globalAlpha = a; MK.g.font = font; MK.g.textAlign = 'left'; MK.g.fillStyle = MK.col; MK.g.fillText(ch, x, y); MK.g.restore(); }
  g.restore(); gpush(x + 45 * S, y - 70 * S, 110 * S, .9);
}

// ---------------------------------------------------------------- titolo: pannello di lapislazzuli con stelle d'oro e caratteri HyperFrames
const TL = {};   // posizioni del titolo, calcolate una volta
function makePanel() {
  const c = cnv(W, H), g = c.getContext('2d'); g.fillStyle = lapis(g); g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,10,48,.38)'); gr.addColorStop(1, 'rgba(20,30,100,.08)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const R = mulberry(12); setZoom(1); for (let i = 0; i < 80; i++) triad(g, R() * W * (V ? 1 : .58), R() * H * (V ? .5 : 1), 2.2 * S, .5, R() * TAU);
  g.globalCompositeOperation = 'destination-in';
  const m = V ? g.createLinearGradient(0, 0, 0, H) : g.createLinearGradient(0, 0, W, 0);
  m.addColorStop(0, 'rgba(0,0,0,.97)'); m.addColorStop(V ? .17 : .33, 'rgba(0,0,0,.92)'); m.addColorStop(V ? .34 : .62, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, W, H);
  const R2 = mulberry(1077); let guard = 0; const zx = V ? W : W * .42, zy = V ? H * .3 : H;
  while (STARS.length < 22 && guard++ < 5000) { const x = 60 * S + R2() * (zx - 120 * S), y = 60 * S + R2() * (zy - 120 * S);
    if (x > TL.x0 - 40 * S && x < TL.x1 + 40 * S && y > TL.y0 - 40 * S && y < TL.y1 + 40 * S) continue;
    if (STARS.some(s => Math.hypot(s.x - x, s.y - y) < 120 * S)) continue;
    STARS.push({ x, y, r: (9 + R2() * 13) * S, rot: R2() * .5 }); }
  return c;
}
function layoutTitle() {
  const T = CFG.titolo; if (!T) return;
  const g = FRg; let size = 178 * S; g.font = `${size}px Uncial`;
  const maxW = (V ? W - 2 * PX - 80 * S : W * .52);
  const w = g.measureText(T.testo).width; if (w > maxW) { size *= maxW / w; }
  TL.font = `${size}px Uncial`; TL.size = size;
  TL.x = V ? PX + 50 * S : 172 * S; TL.base = V ? H * .12 : H * .468;
  TL.x0 = TL.x; TL.x1 = TL.x + maxW; TL.y0 = TL.base - size; TL.y1 = TL.base + 240 * S;
}
function drawTitle(g, t) {
  const T = CFG.titolo; if (!T || t >= T.fine) return;
  const out = ss(seg(t, T.fine - .8, T.fine)), al = 1 - out, dy = -30 * S * out;
  g.save(); g.globalAlpha = al; g.drawImage(PANEL, 0, 0); g.restore();
  const far = V ? H * .34 : W * .5;
  for (const s of STARS) { const a = al * clamp(1.15 - (V ? s.y : s.x) / far), p = P2(q => star8(q, s.x, s.y, s.r, .45, s.rot));
    g.save(); g.globalAlpha = a; const f = () => leaf(g, p, [s.x - s.r, s.y - s.r, s.r * 2, s.r * 2], { lw: 1.6, rimW: 3, scale: SCR_LS }); a > .98 ? f() : noMask(f); g.restore(); gpush(s.x, s.y, s.r * 3, .9); }
  g.font = TL.font; let x = TL.x; const str = T.testo;
  for (let i = 0; i < str.length; i++) { const cw = g.measureText(str[i]).width, u = seg(t, .6 + .09 * i, 1.1 + .09 * i), e = 1 - Math.pow(1 - u, 3);
    if (u > 0) goldGlyph(g, str[i], x, TL.base + 40 * S * (1 - e) + dy, TL.font, u * al); x += cw; }
  const r = ss(seg(t, 1.5, 2.2)), rl = Math.min(600 * S, x - TL.x);
  if (r > 0) { const p = P2(q => { q.moveTo(TL.x + 4 * S, TL.base + 51 * S + dy); q.lineTo(TL.x + 4 * S + rl * r, TL.base + 51 * S + dy); }); g.save(); g.globalAlpha = al; const f = () => leafCord(g, p, 7 * S, { ink: 2.4 }); al > .98 ? f() : noMask(f); g.restore(); }
  if (T.data) { const ud = seg(t, 1.9, 2.5), ed = 1 - Math.pow(1 - ud, 2);
    g.save(); g.globalAlpha = ud * al; g.font = `500 ${60 * S}px Oswald`; g.letterSpacing = `${.32 * 60 * S}px`; g.fillStyle = '#f3e9d2'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 26 * S;
    g.fillText(T.data, TL.x + 4 * S, TL.base + 145 * S + 16 * S * (1 - ed) + dy); g.letterSpacing = '0px'; g.restore(); }
  if (T.luogo) { const up = seg(t, 3.0, 3.6), ep = 1 - Math.pow(1 - up, 2);
    g.save(); g.globalAlpha = up * al; g.font = `italic ${50 * S}px Garamond`; g.fillStyle = '#e8dcc0'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 22 * S;
    g.fillText(T.luogo, TL.x + 6 * S, TL.base + 219 * S + 14 * S * (1 - ep) + dy); g.restore(); }
}

// ---------------------------------------------------------------- quadrilobo a fondo oro (adattato dalla demo di Opuscar, MIT)
let OV, OVg, OM, OMg;
const SCR_LS = .6;
function quatrefoil(cx, cy, Lx, Ly, R) {
  const C = [[cx + Lx, cy], [cx, cy + Ly], [cx - Lx, cy], [cx, cy - Ly]], P = [];
  for (let i = 0; i < 4; i++) { const A = C[i], B = C[(i + 1) % 4], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy), h = Math.sqrt(Math.max(0, R * R - d * d / 4));
    const p1 = [mx - dy / d * h, my + dx / d * h], p2 = [mx + dy / d * h, my - dx / d * h]; P.push(Math.hypot(p1[0] - cx, p1[1] - cy) > Math.hypot(p2[0] - cx, p2[1] - cy) ? p1 : p2); }
  return P2(q => { for (let i = 0; i < 4; i++) { const c = C[i], a0 = Math.atan2(P[(i + 3) % 4][1] - c[1], P[(i + 3) % 4][0] - c[0]), a1 = Math.atan2(P[i][1] - c[1], P[i][0] - c[0]); q.arc(c[0], c[1], R, a0, a1, false); } q.closePath(); });
}
const QS = V ? S * .9 : S;   // il quadrilobo deve stare nella larghezza anche in verticale
function drawQuatrefoil(g, s, dimv) {
  if (!OV) { OV = cnv(W, H); OVg = OV.getContext('2d'); OM = cnv(W, H); OMg = OM.getContext('2d'); }
  s *= QS;
  const cx = W / 2, cy = H / 2 - 20 * S, Lx = 250 * s, Ly = 205 * s, Rl = 300 * s, qf = e => quatrefoil(cx, cy, Lx, Ly, Rl + e * s);
  const open = qf(0), e3 = qf(10), e2 = qf(36), e1 = qf(46), all = P2(q => q.rect(-50, -50, W + 100, H + 100));
  const o = OVg; o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H); o.__gp = null;
  const saveMK = MK; MK = null;
  leaf(o, all, [-50, -50, W + 100, H + 100], { dim: dimv, line: false, rim: false, nomask: true, scale: SCR_LS });
  o.strokeStyle = 'rgba(100,54,6,.42)'; o.lineWidth = 1.4; const step = 64 * s;
  const span = W + H;
  for (let k = -60; k <= 60; k++) { o.beginPath(); o.moveTo(cx + k * step, -60); o.lineTo(cx + k * step + span, span - 60); o.stroke(); o.beginPath(); o.moveTo(cx + k * step, -60); o.lineTo(cx + k * step - span, span - 60); o.stroke(); }
  o.fillStyle = 'rgba(100,54,6,.6)';
  for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) { const x = cx + i * step, y = cy + j * step; if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
    for (let a = 0; a < 6; a++) { o.beginPath(); o.arc(x + Math.cos(a * TAU / 6) * 7 * s, y + Math.sin(a * TAU / 6) * 7 * s, 1.9 * s, 0, TAU); o.fill(); } o.beginPath(); o.arc(x, y, 2.2 * s, 0, TAU); o.fill(); }
  o.save(); o.translate(6 * s, 8 * s); o.fillStyle = 'rgba(40,20,4,.35)'; o.fill(e1); o.restore();
  o.fillStyle = VERM; o.fill(e2); rimShade(o, e2, VERM_D, 10 * s);
  o.save(); o.clip(e3); leaf(o, all, [-50, -50, W + 100, H + 100], { dim: dimv, line: false, rim: false, nomask: true, scale: SCR_LS }); o.restore();
  const band = new Path2D(); band.addPath(e2); band.addPath(e3);
  o.save(); o.clip(band, 'evenodd');
  for (let i = 0; i < 4; i++) { const c = [[cx + Lx, cy], [cx, cy + Ly], [cx - Lx, cy], [cx, cy - Ly]][i]; pearls(o, c[0], c[1], Rl + 23 * s, 40, 3.6 * s, .92); }
  o.restore();
  for (const p of [e1, e2, e3]) { o.strokeStyle = INK; o.lineWidth = 3.4 * S; o.lineJoin = 'round'; o.stroke(p); }
  o.globalCompositeOperation = 'destination-out'; o.fillStyle = '#000'; o.fill(open); o.globalCompositeOperation = 'source-over';
  o.strokeStyle = INK; o.lineWidth = 4 * S; o.stroke(open);
  MK = saveMK;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(OV, 0, 0); g.restore();
  const m = OMg; m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
  m.fillStyle = '#f00'; m.fillRect(0, 0, W, H); m.globalCompositeOperation = 'destination-out'; m.fill(e2); m.globalCompositeOperation = 'source-over'; m.fill(e3);
  m.globalCompositeOperation = 'destination-out'; m.fill(open); m.globalCompositeOperation = 'source-over';
  const out = new Path2D(); out.addPath(all); out.addPath(open);
  if (MK) { MK.g.save(); MK.g.setTransform(1, 0, 0, 1, 0, 0); MK.g.globalCompositeOperation = 'destination-out'; MK.g.fill(out, 'evenodd');
    MK.g.globalCompositeOperation = 'source-over'; MK.g.drawImage(OM, 0, 0); MK.g.restore(); }
}
function quatScale(sh, t) {
  if (t < sh.t0 || t >= sh.t1) return 9;
  const c0 = sh.t0 + .05, c1 = sh.t0 + .85, o0 = sh.t1 - .45;
  return t < o0 ? lerp(4.6, 1.0, eo(seg(t, c0, c1))) : lerp(1.0, 4.6, ei(seg(t, o0, sh.t1)));
}
function drawLabel(g, sh, t) {
  const righe = sh.quadrilobo; if (!righe || !righe.length) return;
  const a = ss(seg(t, sh.t0 + .7, sh.t0 + 1.2)) * (1 - ss(seg(t, sh.t1 - .55, sh.t1 - .35))); if (a <= 0) return;
  const fs = 48 * S;
  g.save(); g.globalAlpha = a; g.font = `${fs}px Uncial`; g.textAlign = 'center'; g.lineJoin = 'round';
  const x = V ? W / 2 : 210 * S, y0 = V ? H / 2 - 20 * S - (205 + 300 + 70) * QS - (righe.length - 1) * fs * 1.25 : H / 2 - 24 * S;
  righe.forEach((s, i) => { const y = y0 + i * fs * 1.25; g.strokeStyle = 'rgba(251,246,234,.92)'; g.lineWidth = 7 * S; g.strokeText(s, x, y); g.fillStyle = VERM; g.fillText(s, x, y); g.strokeStyle = INK; g.lineWidth = 1.2 * S; g.strokeText(s, x, y);
    if (MK) { MK.g.save(); MK.g.setTransform(1, 0, 0, 1, 0, 0); MK.g.globalCompositeOperation = 'destination-out'; MK.g.font = g.font; MK.g.textAlign = 'center'; MK.g.lineWidth = 9 * S; MK.g.strokeText(s, x, y); MK.g.fillText(s, x, y); MK.g.restore(); } });   // la luce dell'oro non schiarisce la scritta
  g.restore();
}

// ---------------------------------------------------------------- scheda della fonte (tipografia HyperFrames, bordo d'oro Opuscar)
const CARD = { on: false, x: 0, y: 0, w: 0, h: 0 };
function cardAlpha(sh, t) { return ss(seg(t, sh.t0 + .4, sh.t0 + 1.0)) * (1 - ss(seg(t, sh.t1 - .45, sh.t1 - .05))); }
function drawCard(g, sh, t) {
  const F = sh.fonte; if (!F) return; const a = cardAlpha(sh, t); if (a <= 0) return;
  const pad = 58 * S, maxW = V ? W - 2 * PX - 80 * S : W * .5;
  g.save();
  g.font = `italic ${50 * S}px Garamond`;
  const righe = [].concat(...(F.latino || F.testo || []).map(r => wrap(g, r, maxW - pad - 30 * S)));   // le righe troppo lunghe vanno a capo
  const lat = righe.map(r => r.split(' '));
  g.font = `${36 * S}px Garamond`; const it = F.italiano ? wrap(g, F.italiano, maxW - pad - 30 * S) : [];
  g.font = `500 ${23 * S}px Oswald`; g.letterSpacing = `${.14 * 23 * S}px`; const rif = F.rif ? wrap(g, F.rif.toUpperCase(), maxW - pad - 30 * S) : [];
  let wmax = 0; for (const r of rif) wmax = Math.max(wmax, g.measureText(r).width); g.letterSpacing = '0px';
  g.font = `italic ${50 * S}px Garamond`; for (const r of righe) wmax = Math.max(wmax, g.measureText(r).width);
  g.font = `${36 * S}px Garamond`; for (const r of it) wmax = Math.max(wmax, g.measureText(r).width);
  g.restore();
  const w = Math.min(maxW, wmax + pad + 62 * S), h = 50 * S + lat.length * 64 * S + it.length * 46 * S + rif.length * 34 * S + 44 * S;
  const x0 = (V ? PX + 40 * S : 110 * S) - 40 * S * (1 - eo(seg(t, sh.t0 + .4, sh.t0 + 1.0))), y0 = V ? PY + 110 * S : 108 * S;
  Object.assign(CARD, { on: true, x: x0, y: y0, w, h });
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(14,16,22,.86)'; g.fillRect(x0, y0, w, h); g.restore();
  const bd = P2(q => q.rect(x0, y0, 12 * S, h));
  g.save(); g.globalAlpha = a; const f = () => leaf(g, bd, [x0, y0, 12 * S, h], { lw: 1.6, rim: false, scale: SCR_LS }); a > .98 ? f() : noMask(f); g.restore();
  gpush(x0 + 6 * S, y0 + 50 * S, 60 * S, .9); gpush(x0 + 6 * S, y0 + h - 50 * S, 60 * S, .9);
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = `italic ${50 * S}px Garamond`; g.fillStyle = '#f3e9d2';
  let n = 0, y = y0 + 84 * S; const ts = sh.t0 + .8;
  for (const line of lat) { let x = x0 + pad; for (const wd of line) { const wa = seg(t, ts + n * .14, ts + .25 + n * .14); g.globalAlpha = a * wa; g.fillText(wd, x, y); x += g.measureText(wd + ' ').width; n++; } y += 64 * S; }
  const ti = ts + n * .14 + .3, ui = seg(t, ti, ti + .6), ei2 = 1 - Math.pow(1 - ui, 2);
  g.globalAlpha = a * ui; g.font = `${36 * S}px Garamond`; g.fillStyle = '#d9cfba'; y += 6 * S;
  for (const r of it) { g.fillText(r, x0 + pad, y + 10 * S * (1 - ei2)); y += 46 * S; }
  g.globalAlpha = a * seg(t, ti + .5, ti + 1.0); g.font = `500 ${23 * S}px Oswald`; g.letterSpacing = `${.14 * 23 * S}px`; g.fillStyle = '#f2c062'; y += 8 * S;
  for (const r of rif) { g.fillText(r, x0 + pad, y); y += 34 * S; } g.letterSpacing = '0px';
  g.restore();
}

// ---------------------------------------------------------------- cornice dorata intorno a ogni immagine
function drawFrame(g) {
  const outer = P2(q => { q.rect(-5, -5, W + 10, H + 10); q.rect(PX, PY, PW, PH); });
  if (MK) { MK.g.save(); MK.g.setTransform(1, 0, 0, 1, 0, 0); MK.g.globalCompositeOperation = 'destination-out'; MK.g.fillStyle = '#000'; MK.g.fill(outer, 'evenodd'); MK.g.restore(); }
  g.fillStyle = lapis(g); g.fill(outer, 'evenodd'); g.fillStyle = 'rgba(8,10,48,.3)'; g.fill(outer, 'evenodd');
  g.fillStyle = 'rgba(255,252,240,.85)'; const e = 9 * S, st = 24 * S;
  for (let x = 70 * S; x < W - 60 * S; x += st) for (const y of [e, H - e]) { g.beginPath(); g.arc(x, y, 2.1 * S, 0, TAU); g.fill(); }
  for (let y = 70 * S; y < H - 60 * S; y += st) for (const x of [e, W - e]) { g.beginPath(); g.arc(x, y, 2.1 * S, 0, TAU); g.fill(); }
  const m = 24 * S, fil = P2(q => q.rect(m, m, W - 2 * m, H - 2 * m)); leafCord(g, fil, 8 * S, { ink: 2.6 });
  for (let x = 240 * S; x < W; x += 480 * S) { gpush(x, m, 70 * S, .8); gpush(x, H - m, 70 * S, .8); } for (let y = 270 * S; y < H; y += 540 * S) { gpush(m, y, 70 * S, .8); gpush(W - m, y, 70 * S, .8); }
  g.strokeStyle = INK; g.lineWidth = 3.6 * S; g.strokeRect(PX, PY, PW, PH);
  const r = 23 * S;
  for (const [cx, cy] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) {
    const sq = P2(q => q.rect(cx - r, cy - r, 2 * r, 2 * r)); leaf(g, sq, [cx - r, cy - r, 2 * r, 2 * r], { lw: 2.2, rimW: 5, scale: SCR_LS });
    const qf = P2(q => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ox = cx + Math.cos(a) * 9 * S, oy = cy + Math.sin(a) * 9 * S; q.moveTo(ox + 8 * S, oy); q.arc(ox, oy, 8 * S, 0, TAU); } });
    g.fillStyle = ULTRA; g.fill(qf); ink(g, qf, 1.2); maskErase(g, qf);
    const dot = P2(q => q.arc(cx, cy, 5 * S, 0, TAU)); leaf(g, dot, [cx - 5 * S, cy - 5 * S, 10 * S, 10 * S], { lw: 1.2, rim: false, scale: SCR_LS }); gpush(cx, cy, 80 * S, 1);
  }
}

// ---------------------------------------------------------------- neve a biacca (in coordinate dello schermo)
let WIND, FALL; const WX = [], WY = [], WSTEP = 1 / 120;
function buildWind() {
  const env = t => { let v = 0; for (const s of SHOTS) if (s.bufera) v = Math.max(v, ss(seg(t, s.t0 - .5, s.t0 + .5)) * (1 - ss(seg(t, s.t1 - .5, s.t1 + .4)))); return v; };
  WIND = t => 26 + 560 * env(t); FALL = t => 1 + .9 * env(t);
  let x = 0, y = 0; for (let i = 0; i <= DUR / WSTEP + 2; i++) { WX.push(x); WY.push(y); const t = i * WSTEP; x += WIND(t) * WSTEP; y += FALL(t) * WSTEP; }
}
const look = (A, t) => { const f = clamp(t, 0, DUR) / WSTEP, i = Math.floor(f); return lerp(A[i], A[Math.min(A.length - 1, i + 1)], f - i); };
const FLK = []; (() => { const R = mulberry(1077), n = Math.round(520 * W * H / (1920 * 1080)); for (let i = 0; i < n; i++) FLK.push({ x: R() * (W + 80), y: R() * (H + 80), r: (1.5 + R() * 3.4) * S, sp: .55 + R() * .9, ph: R() * TAU, k: R() }); })();
function drawSnow(g, t, amt) {
  if (amt <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(PX, PY, PW, PH);
  if (CARD.on) g.rect(CARD.x + CARD.w, CARD.y, -CARD.w - 40 * S, CARD.h);   // la scheda resta pulita (verso opposto = buco)
  g.clip('nonzero');
  const wx = look(WX, t), wy = look(WY, t), v = WIND(t), fl = FALL(t), MW = W + 80, MH = H + 80;
  for (const f of FLK) { if (f.k > amt) continue;
    const x = (((f.x + wx * f.sp * 1.4 * S + Math.sin(t * 1.3 + f.ph) * 14 * S) % MW) + MW) % MW - 40, y = ((f.y + wy * (70 + 120 * f.sp) * S) % MH) - 40;
    const a = .55 + .4 * Math.min(1, f.r / (4 * S));
    if (v > 120) { const dx = v * f.sp * .045 * S, dy = (70 + 120 * f.sp) * fl * .045 * S; g.strokeStyle = `rgba(255,252,240,${a})`; g.lineWidth = f.r * 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x, y); g.stroke(); }
    else { g.fillStyle = `rgba(255,252,240,${a})`; g.beginPath(); g.arc(x, y, f.r, 0, TAU); g.fill(); }
  }
  g.restore();
}

// ---------------------------------------------------------------- luce sull'oro (adattata dalla demo di Opuscar, MIT)
function lightAt(lights, x, y) {
  let v = 0; for (const L of lights) {
    if (L.type === 'r') { const d = Math.hypot(x - L.x, y - L.y) / L.r; if (d < 1) v += L.a * Math.pow(1 - d, 1.4); }
    else { const d = ((x - L.x) * L.nx + (y - L.y) * L.ny) / L.w; v += L.a * Math.exp(-d * d); }
  } return v;
}
function glintPass(lights, amb) {
  const md = MCg.getImageData(0, 0, W, H).data, img = ctx.getImageData(0, 0, W, H), fd = img.data;
  const QW = Math.floor(W / 4), QH = Math.floor(H / 4);
  if (!GW) { GW = cnv(QW, QH); GWg = GW.getContext('2d'); GWD = new Float32Array(QW * QH); GWI = GWg.createImageData(QW, QH); }
  GWD.fill(0);
  let ci = 1e9, cj = 1e9, nx = 1, ny = 0, th = 0, fam = 0, tone = 0, ox = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4, A = md[p + 3]; if (A < 6) continue;
      const fx = x / SCR_LS, fy = y / SCR_LS;
      const j = Math.floor(fy / LS), ro = rowOff(j), i = Math.floor((fx + ro) / LS);
      if (i !== ci || j !== cj) { ci = i; cj = j; ox = ro; th = leafTilt(i, j); nx = Math.cos(th); ny = Math.sin(th); const fa = .5 + .5 * Math.cos(th - .9); fam = fa * fa * fa * fa; tone = leafTone(i, j); }
      const lu = (fx + ox) / LS - i - .5, lv = fy / LS - j - .5, cup = 1 + .55 * (lu * nx + lv * ny);
      let R = amb * (.55 + .55 * fam);
      for (let k = 0; k < lights.length; k++) { const L = lights[k];
        if (L.type === 'r') { const dx = x - L.x, dy = y - L.y, d2 = dx * dx + dy * dy; if (d2 >= L.r * L.r) continue; const d = Math.sqrt(d2), v = L.a * Math.pow(1 - d / L.r, 1.4);
          let f = .5 + .5 * (dx * nx + dy * ny) / (d + 1e-3); f *= f; R += v * (.5 + .75 * f); }
        else { const dd = ((x - L.x) * L.nx + (y - L.y) * L.ny) / L.w; if (dd > 3 || dd < -3) continue; const v = L.a * Math.exp(-dd * dd);
          let f = .5 + .5 * Math.cos(dd * 1.9 + th); f *= f; R += v * (.45 + .8 * f); }
      }
      if (R < .004) continue;
      const k = A / 255 * Math.min(R * cup * .8, 2.2) * (.9 + .2 * tone);
      const qx = x >> 2, qy = y >> 2; if (k > .6 && qx < QW && qy < QH) GWD[qy * QW + qx] += (k - .6);
      const f = .82 * (1 - Math.exp(-1.15 * k)), r0 = fd[p], g0 = fd[p + 1], b0 = fd[p + 2];
      fd[p] = Math.min(255, r0 * (1 + .5 * k) + (250 - r0) * f); fd[p + 1] = Math.min(232, g0 * (1 + .45 * k) + (204 - g0) * f); fd[p + 2] = Math.min(150, b0 * (1 + .2 * k) + (96 - b0) * f);
    }
  }
  ctx.putImageData(img, 0, 0);
}
function glowPass(gain) {
  if (!GWD) return; const n = GWD.length, d = GWI.data;
  for (let i = 0; i < n; i++) { const v = Math.min(1, GWD[i] / 16 * gain); d[i * 4] = 255; d[i * 4 + 1] = 196; d[i * 4 + 2] = 110; d[i * 4 + 3] = 255 * v * v; }
  GWg.putImageData(GWI, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${10 * S}px)`; ctx.globalAlpha = .5; ctx.drawImage(GW, 0, 0, W, H);
  ctx.filter = `blur(${36 * S}px)`; ctx.globalAlpha = .5; ctx.drawImage(GW, 0, 0, W, H);
  ctx.restore();
}
function flashes(lights) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  for (const p of GP) {
    const v = lightAt(lights, p.x, p.y) * p.k; if (v < .55) continue; const a = clamp((v - .55) * 1.4), r = Math.min(p.r * (.4 + .45 * a), 120 * S);
    const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * .5); rg.addColorStop(0, `rgba(255,246,215,${.4 * a})`); rg.addColorStop(1, 'rgba(255,232,160,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, r * .5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,250,232,${.8 * a})`;
    for (const an of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { const rr = an % (Math.PI / 2) ? r * .45 : r; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(an + .2); ctx.beginPath(); ctx.moveTo(-rr, 0); ctx.quadraticCurveTo(0, -rr * .06, rr, 0); ctx.quadraticCurveTo(0, rr * .06, -rr, 0); ctx.fill(); ctx.restore(); }
  }
  ctx.globalCompositeOperation = 'source-over';
}
const sweep = (t, t0, t1, y, w, a) => { const u = seg(t, t0, t1); return u > 0 && u < 1 ? [{ type: 'b', x: lerp(-W * .2, W * 1.2, ss(u)), y, nx: .9, ny: .44, w: w * S, a: a * Math.sin(Math.PI * u) }] : []; };
function lightsAt(t) {
  const L = [];
  if (CFG.titolo) L.push(...sweep(t, 1.5, 3.9, TL.base - 60 * S, 90, 1.3));
  SHOTS.forEach((s, i) => {
    if (s.quadrilobo) L.push(...sweep(t, s.t0 + 1.0, s.t0 + 2.6, H / 2, 110, 1.15));
    else if (s.fonte) L.push(...sweep(t, s.t0 + .9, s.t0 + 2.3, (V ? PY + 260 * S : 260 * S), 80, 1.25));
    else if (i > 0 && i % 2 === 1) L.push(...sweep(t, s.t0 + .5, Math.min(s.t1, s.t0 + 2.4), H / 2, 150, .9));
  });
  return L;
}

// ---------------------------------------------------------------- sottotitoli: il cartiglio di pergamena (adattato dalla demo di Opuscar, MIT)
const SUBF = () => `italic ${(V ? 44 : 46) * S}px Garamond`;
function subAt(t) {
  let cur = null, idx = -1; SUBS.forEach((s, i) => { if (t >= s[0] - .25 && t < s[1] + .35) { cur = s; idx = i; } });
  if (!cur) return null;
  const prev = SUBS[idx - 1], next = SUBS[idx + 1];
  const joinedIn = prev && cur[0] - prev[1] < .9, joinedOut = next && next[0] - cur[1] < .9;
  const open = (joinedIn ? 1 : eo(seg(t, cur[0] - .25, cur[0] + .1))) * (joinedOut ? 1 : 1 - ss(seg(t, cur[1] + .05, cur[1] + .35)));
  return { s: cur, open, prev: joinedIn ? prev : null };
}
let BAND = null;
function bandLayout(g) {   // una sola larghezza per tutto il video; le frasi lunghe vanno su due righe
  if (BAND) return BAND; g.font = SUBF(); const maxHalf = W / 2 - PX - 90 * S;
  let wmax = 0, lines = 1; const L = SUBS.map(s => { const r = wrap(g, s[2], 2 * maxHalf - 100 * S); lines = Math.max(lines, r.length); r.forEach(x => wmax = Math.max(wmax, g.measureText(x).width)); return r; });
  BAND = { half: Math.min(maxHalf, wmax / 2 + 60 * S), lines: L, n: Math.min(lines, 3) }; return BAND;
}
function drawBanderole(g, t) {
  const A = subAt(t); if (!A || A.open <= 0) return;
  const s = A.s, open = A.open, B = bandLayout(g), lh = 52 * S;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const nr = Math.max(B.lines[SUBS.indexOf(s)].length, A.prev && t < s[0] ? B.lines[SUBS.indexOf(A.prev)].length : 1);   // altezza della frase in corso
  const h = 82 * S + (nr - 1) * lh, cx = W / 2, cy = V ? H - 300 * S - h / 2 : H - 108 * S - (nr - 1) * lh / 2, hw = B.half * open;
  for (const sd of [-1, 1]) { const ex = cx + sd * hw; const tail = P2(q => { q.moveTo(ex - sd * 6 * S, cy - h / 2 + 18 * S); q.lineTo(ex + sd * 56 * S, cy - h / 2 + 28 * S); q.lineTo(ex + sd * 34 * S, cy + 4 * S); q.lineTo(ex + sd * 62 * S, cy + h / 2 + 18 * S); q.lineTo(ex - sd * 6 * S, cy + h / 2 - 6 * S); q.closePath(); });
    g.fillStyle = '#d8c69c'; g.fill(tail); rimShade(g, tail, '#a8926a', 8 * S); g.strokeStyle = INK; g.lineWidth = 3 * S; g.lineJoin = 'round'; g.stroke(tail);
    const fold = P2(q => { q.moveTo(ex - sd * 3 * S, cy + h / 2 - 6 * S); q.lineTo(ex - sd * 3 * S, cy + h / 2 + 12 * S); q.lineTo(ex + sd * 22 * S, cy + h / 2 + 2 * S); q.closePath(); }); g.fillStyle = '#8a7552'; g.fill(fold); g.lineWidth = 2 * S; g.stroke(fold); }
  const band = P2(q => { q.moveTo(cx - hw, cy - h / 2); q.bezierCurveTo(cx - hw * .4, cy - h / 2 - 9 * S, cx + hw * .4, cy - h / 2 + 8 * S, cx + hw, cy - h / 2); q.lineTo(cx + hw, cy + h / 2);
    q.bezierCurveTo(cx + hw * .4, cy + h / 2 + 8 * S, cx - hw * .4, cy + h / 2 - 9 * S, cx - hw, cy + h / 2); q.closePath(); });
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18 * S; g.shadowOffsetY = 6 * S; g.fillStyle = VELL; g.fill(band); g.restore();
  g.save(); g.clip(band); g.globalAlpha = .5; g.fillStyle = g.__sp || (g.__sp = g.createPattern(SPKC, 'repeat')); g.fillRect(cx - hw, cy - h, hw * 2, h * 2); g.restore();
  rimShade(g, band, '#c9b386', 9 * S); g.strokeStyle = INK; g.lineWidth = 3 * S; g.stroke(band);
  g.strokeStyle = 'rgba(255,252,238,.75)'; g.lineWidth = 2 * S; g.beginPath(); g.moveTo(cx - hw + 12 * S, cy - h / 2 + 7 * S); g.lineTo(cx + hw - 12 * S, cy - h / 2 + 6 * S); g.stroke();
  const write = (S2, wipe, alpha) => { const rows = B.lines[SUBS.indexOf(S2)]; g.save(); g.globalAlpha = alpha * clamp((open - .2) / .3); g.clip(band); g.beginPath(); g.rect(cx - hw, 0, hw * 2 * wipe, H); g.clip();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = SUBF(); g.fillStyle = '#3e2412';
    const y0 = cy + 14 * S - (rows.length - 1) * lh / 2; rows.forEach((r, i) => g.fillText(r, cx, y0 + i * lh)); g.restore(); };
  if (A.prev && t < s[0]) write(A.prev, 1, 1 - ss(seg(t, s[0] - .25, s[0] - .02)));
  if (t >= s[0]) write(s, eo(seg(t, s[0], s[0] + .5)), 1);
}

// ---------------------------------------------------------------- cartello finale degli Shorts
function drawFinale(g, t) {
  const F = CFG.finale, a = ss(seg(t, F.t0 - .1, F.t0 + .45));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a * .9; g.fillStyle = lapis(g); g.fillRect(PX, PY, PW, PH);
  g.globalAlpha = a * .35; g.fillStyle = '#080a30'; g.fillRect(PX, PY, PW, PH); g.globalAlpha = a;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `italic ${(V ? 78 : 70) * S}px Garamond`; g.fillStyle = '#f3e9d2'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 20 * S;
  const dq = wrap(g, F.domanda, PW - 160 * S), lh = (V ? 96 : 86) * S, y0 = H * (V ? .42 : .4) - (dq.length - 1) * lh / 2;
  dq.forEach((r, i) => g.fillText(r, W / 2, y0 + i * lh));
  const u = seg(t, F.t0 + .35, F.t0 + .9); g.globalAlpha = a * u;
  g.font = `600 ${(V ? 44 : 40) * S}px Oswald`; g.letterSpacing = `${.08 * 44 * S}px`; g.fillStyle = '#e8b04b';
  const dr = wrap(g, F.riga, PW - 160 * S); dr.forEach((r, i) => g.fillText(r, W / 2, y0 + dq.length * lh + 50 * S + i * 58 * S));
  g.letterSpacing = '0px'; g.restore();
}

// ---------------------------------------------------------------- un fotogramma
function render(tf) {
  tf = clamp(tf, 0, DUR - 1e-4);
  resetCtx(FRg); MCg.setTransform(1, 0, 0, 1, 0, 0); MCg.clearRect(0, 0, W, H);
  MK = { g: MCg, pre: new DOMMatrix(), col: '#f00' }; DIM = .28; GP = []; setZoom(1); CARD.on = false;
  const g = FRg; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, W, H);
  const ws = shotWeights(tf);
  for (const { s, a } of ws) drawPic(g, s, tf, a);
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .1; g.fillStyle = g.createPattern(GRAINC, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
  drawTitle(g, tf);
  for (const s of SHOTS) if (s.quadrilobo) { const qs = quatScale(s, tf); if (qs < 4.5) { drawQuatrefoil(g, qs, .3); drawLabel(g, s, tf); } }
  for (const s of SHOTS) if (s.fonte && tf >= s.t0 && tf < s.t1) drawCard(g, s, tf);
  drawFrame(g);
  MK = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.drawImage(FR, 0, 0);
  const lights = lightsAt(tf);
  glintPass(lights, .42);
  glowPass(.55);
  flashes(lights);
  let snow = 0; for (const { s, a } of ws) snow = lerp(snow, s.neve || 0, a);
  drawSnow(ctx, tf, snow);
  const v = ctx.createRadialGradient(W * .5, H * .46, Math.min(W, H) * .5, W / 2, H / 2, Math.max(W, H) * .6); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,12,40,.28)');
  ctx.fillStyle = v; ctx.fillRect(PX, PY, PW, PH);
  if (CFG.finale && tf >= CFG.finale.t0 - .1) drawFinale(ctx, tf); else drawBanderole(ctx, tf);
  const black = clamp(1 - ss(seg(tf, 0, .8)) + ss(seg(tf, CFG.fade_out[0], CFG.fade_out[1])));
  if (black > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}

(async () => {
  CFG = await (await fetch(Q.get('cfg') || 'film.json')).json();
  DUR = CFG.dur; SUBS = CFG.sottotitoli; SHOTS = CFG.scene;
  await Promise.all(['128px Uncial', '500 40px Oswald', '40px Garamond', 'italic 40px Garamond'].map(f => document.fonts.load(f, 'aèÈù«»')));
  await Promise.all([...new Set(SHOTS.map(s => s.img))].map(async k => { const I = new Image(); I.src = k; await I.decode(); IMG[k] = I; }));
  GOLDC = makeGold(); GOLDF = makeGoldFine(512, 3, 1); GOLDFF = makeGoldFine(1024, 9, 1.6); SPKC = makeSpk(); GRAINC = makeGrain(); PAINTC = makePaint();
  FR = cnv(W, H); FRg = FR.getContext('2d'); MC = cnv(W, H); MCg = MC.getContext('2d', { willReadFrequently: true });
  layoutTitle(); PANEL = makePanel(); buildWind();
  window.DUR = DUR; window.render = render;
  render(Q.get('t') ? +Q.get('t') : 3.5); window.READY = true;
})();
