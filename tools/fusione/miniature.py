#!/usr/bin/env python3
"""Miniature YouTube 1280x720 nello stile della fusione: immagine a tutto campo, cornice d'oro sottile,
testo Oswald crema #F3E9D2 con la parola chiave ocra #E8B04B, contorno scuro e ombra (testo disegnato in codice).

Uso: python3 miniature.py miniature.json cartella_uscita
miniature.json: [{"file": "A.jpg", "img": "33_S1.png", "righe": ["FLOTTA RIFATTA", "IN 6 MESI"], "chiave": "6 MESI",
                  "posizione": "alto"|"basso"|"destra"|"sinistra", "centro": [0.5, 0.5], "zoom": 1.0, "bordo": 0.03}]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'fusione')
CREMA, OCRA, SCURO, ORO = (243, 233, 210), (232, 176, 75), (20, 14, 10), (201, 153, 58)


def oswald(size):
    f = ImageFont.truetype(os.path.join(CACHE, 'Oswald.ttf'), size)
    try: f.set_variation_by_axes([700])
    except Exception: pass
    return f


def base(M, pdir):
    im = Image.open(os.path.join(pdir, M['img'])).convert('RGB')
    b = M.get('bordo', 0.03); iw, ih = im.size
    im = im.crop((int(iw * b), int(ih * b), int(iw * (1 - b)), int(ih * (1 - b))))
    z = M.get('zoom', 1.0); iw, ih = im.size; cx, cy = M.get('centro', [0.5, 0.5])
    vw, vh = iw / z, iw / z * H / W
    if vh > ih: vh = ih; vw = ih * W / H / 1
    x0 = min(max(cx * iw - vw / 2, 0), iw - vw); y0 = min(max(cy * ih - vh / 2, 0), ih - vh)
    return im.crop((int(x0), int(y0), int(x0 + vw), int(y0 + vh))).resize((W, H), Image.LANCZOS)


def ombra(im, pos):
    g = Image.new('L', (W, H), 0); d = ImageDraw.Draw(g)
    for i in range(255):
        a = int(170 * (1 - i / 255) ** 1.6)
        if pos == 'alto': d.line([(0, i * 1.4), (W, i * 1.4)], fill=a, width=2)
        elif pos == 'basso': d.line([(0, H - i * 1.4), (W, H - i * 1.4)], fill=a, width=2)
        elif pos == 'sinistra': d.line([(i * 2.6, 0), (i * 2.6, H)], fill=a, width=3)
        else: d.line([(W - i * 2.6, 0), (W - i * 2.6, H)], fill=a, width=3)
    nero = Image.new('RGB', (W, H), (8, 10, 30))
    return Image.composite(nero, im, g)


def scrivi(im, M):
    d = ImageDraw.Draw(im); righe, chiave, pos = M['righe'], M.get('chiave', ''), M.get('posizione', 'alto')
    size = 132
    while True:   # la riga piu' lunga deve stare nel 90% della larghezza disponibile
        f = oswald(size); larg = max(d.textlength(r, font=f) for r in righe)
        if larg <= (W * (0.9 if pos in ('alto', 'basso') else 0.5)) or size < 50: break
        size -= 4
    lh = size * 1.08; tot = lh * len(righe)
    y0 = {'alto': 40, 'basso': H - 40 - tot, 'sinistra': (H - tot) / 2, 'destra': (H - tot) / 2}[pos]
    for i, r in enumerate(righe):
        w = d.textlength(r, font=f)
        x = {'sinistra': 60, 'destra': W - 60 - w}.get(pos, (W - w) / 2); y = y0 + i * lh
        sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).text((x + 6, y + 8), r, font=f, fill=200)
        im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
        d = ImageDraw.Draw(im)
        # la parola chiave in ocra, il resto crema
        if chiave and chiave in r:
            a, b = r.split(chiave, 1); xx = x
            for part, col in ((a, CREMA), (chiave, OCRA), (b, CREMA)):
                if part:
                    d.text((xx, y), part, font=f, fill=col, stroke_width=6, stroke_fill=SCURO); xx += d.textlength(part, font=f)
        else:
            d.text((x, y), r, font=f, fill=CREMA, stroke_width=6, stroke_fill=SCURO)
    return im


def cornice(im):
    d = ImageDraw.Draw(im)
    d.rectangle([6, 6, W - 7, H - 7], outline=(30, 40, 110), width=8)
    d.rectangle([12, 12, W - 13, H - 13], outline=ORO, width=4)
    return im


def main():
    spec = json.load(open(sys.argv[1], encoding='utf-8')); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    pdir = os.path.dirname(os.path.abspath(sys.argv[1]))
    for M in spec:
        im = base(M, pdir); im = ombra(im, M.get('posizione', 'alto')); im = scrivi(im, M); im = cornice(im)
        dest = os.path.join(out, M['file']); im.save(dest, quality=92); print('pronta', dest)


if __name__ == '__main__':
    main()
