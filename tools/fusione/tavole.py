#!/usr/bin/env python3
"""Tavole disegnate in codice, nello stile della fusione: cartine (coste reali di Natural Earth, dominio pubblico) e linee del tempo.
Escono come immagini 2752x1536, cosi' lo script del video le tratta come le altre immagini (con "bordo": 0 nella scena).

Uso: python3 tavole.py tavole.json cartella_uscita
tavole.json: {"terra": "ne_10m_land.geojson", "tavole": [ {...}, ... ]}
  cartina: {"file": "mappa.png", "tipo": "cartina", "titolo": "...", "bbox": [lon0, lat0, lon1, lat1],
            "luoghi": [{"nome": "Venezia", "lon": 12.33, "lat": 45.44, "stella": false, "dx": 0, "dy": 0}],
            "mari": [{"nome": "Mar Ionio", "lon": .., "lat": ..}],
            "flotte": [{"nome": "Lega Santa", "colore": "#c8321f", "da": [lon, lat], "a": [lon, lat], "navi": 9}],
            "nota": "posizioni indicative"}
  linea del tempo: {"file": "linea.png", "tipo": "linea", "titolo": "...", "tappe": [{"data": "7 OTTOBRE 1571", "testo": "..."}]}
"""
import json, math, os, sys, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from shapely.geometry import shape, box
from shapely.ops import unary_union

W, H, K = 2752, 1536, 2          # K: si disegna al doppio e si riduce (bordi morbidi)
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'fusione')
INK, VELL, LAND, SEA, GOLD, VERM = (42, 26, 16), (239, 226, 196), (233, 214, 172), (52, 82, 150), (201, 153, 58), (200, 50, 31)


def font(nome, size, peso=None):
    f = ImageFont.truetype(os.path.join(CACHE, nome), int(size * K))
    if peso:
        try: f.set_variation_by_axes([peso])
        except Exception: pass
    return f


def pergamena(w, h, seed=3):
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h), VELL)
    noise = Image.effect_noise((w // 8, h // 8), 22).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6 * K))
    im = Image.blend(im, Image.merge('RGB', [noise.point(lambda v: 200 + v * 0.22)] * 3), 0.18)
    d = ImageDraw.Draw(im, 'RGBA')
    for _ in range(140):   # macchie leggere della carta
        x, y, r = rnd.randrange(w), rnd.randrange(h), rnd.randrange(20, 120) * K
        d.ellipse([x - r, y - r, x + r, y + r], fill=(150, 110, 60, 6))
    return im


def cornice(d, w, h):
    m = 18 * K
    d.rectangle([m, m, w - m, h - m], outline=INK, width=5 * K)
    d.rectangle([m + 14 * K, m + 14 * K, w - m - 14 * K, h - m - 14 * K], outline=GOLD, width=6 * K)


def testo(d, xy, s, f, fill=INK, anchor='mm', alone=None):
    if alone:
        d.text(xy, s, font=f, fill=alone, anchor=anchor, stroke_width=int(9 * K), stroke_fill=alone)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def cartina(T, terra, out):
    lon0, lat0, lon1, lat1 = T['bbox']
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    w, h = W * K, H * K
    # proiezione equirettangolare con correzione della latitudine, centrata e "a riempimento"
    sx = w / ((lon1 - lon0) * kx); sy = h / (lat1 - lat0); s = max(sx, sy)
    cx, cy = (lon0 + lon1) / 2, (lat0 + lat1) / 2
    P = lambda lon, lat: (w / 2 + (lon - cx) * kx * s, h / 2 - (lat - cy) * s)
    im = pergamena(w, h)
    sea = Image.new('RGBA', (w, h), SEA + (255,))
    tex = Image.effect_noise((w // 6, h // 6), 30).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(4 * K))
    sea.putalpha(tex.point(lambda v: 150 + int(v * 0.25)))
    im.paste(sea, (0, 0), sea)
    d = ImageDraw.Draw(im, 'RGBA')
    for i in range(60):   # onde a biacca sul mare
        rnd = random.Random(i * 7)
        x, y = rnd.randrange(w), rnd.randrange(h)
        d.arc([x - 40 * K, y - 14 * K, x + 40 * K, y + 14 * K], 200, 340, fill=(250, 246, 234, 120), width=3 * K)
    mondo = box(lon0 - 1, lat0 - 1, lon1 + 1, lat1 + 1)
    geoms = [g for g in terra if g.intersects(mondo)]
    land = unary_union([g.intersection(mondo) for g in geoms])
    polys = [land] if land.geom_type == 'Polygon' else list(getattr(land, 'geoms', []))
    for pg in polys:
        if pg.geom_type != 'Polygon' or pg.is_empty: continue
        ext = [P(*c) for c in pg.exterior.coords]
        d.polygon(ext, fill=LAND)
        for hole in pg.interiors: d.polygon([P(*c) for c in hole.coords], fill=SEA)
    for pg in polys:   # linea di costa a inchiostro, con un'ombra azzurra verso il mare
        if pg.geom_type != 'Polygon' or pg.is_empty: continue
        ext = [P(*c) for c in pg.exterior.coords]
        d.line(ext + [ext[0]], fill=(90, 120, 190, 110), width=12 * K, joint='curve')
        d.line(ext + [ext[0]], fill=INK, width=3 * K, joint='curve')
    fl = font('EBGaramond-Italic.ttf', 46); fm = font('EBGaramond-Italic.ttf', 54); fn = font('EBGaramond.ttf', 44)
    for m in T.get('mari', []):
        testo(d, P(m['lon'], m['lat']), m['nome'], fm, fill=(240, 236, 220))
    for fo in T.get('flotte', []):
        col = tuple(int(fo['colore'][i:i + 2], 16) for i in (1, 3, 5))
        (ax, ay), (bx, by) = P(*fo['da']), P(*fo['a'])
        n = fo.get('navi', 9)
        for i in range(n):
            u = i / max(1, n - 1); x, y = ax + (bx - ax) * u, ay + (by - ay) * u
            r = 16 * K
            hull = [(x - r * 1.6, y - r * .35), (x + r * 1.6, y - r * .35), (x + r * 1.1, y + r * .45), (x - r * 1.1, y + r * .45)]
            d.polygon(hull, fill=col + (255,), outline=INK)
            d.line([(x, y - r * .35), (x, y - r * 1.6)], fill=INK, width=3 * K)
        if fo.get('etichetta'):
            ex, ey = P(*fo['etichetta'])
            testo(d, (ex, ey), fo['nome'], fn, fill=col, alone=(250, 244, 228, 255))
    for L in T.get('luoghi', []):
        x, y = P(L['lon'], L['lat'])
        if L.get('stella'):
            r = 22 * K; pts = []
            for k in range(16):
                a = -math.pi / 2 + k * math.pi / 8; rr = r if k % 2 == 0 else r * .45
                pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
            d.polygon(pts, fill=GOLD + (255,), outline=INK)
        else:
            r = 11 * K; d.ellipse([x - r, y - r, x + r, y + r], fill=VERM, outline=INK, width=2 * K)
        testo(d, (x + L.get('dx', 0) * K, y + L.get('dy', -46) * K), L['nome'], fl, alone=(246, 238, 216, 255))
    cornice(d, w, h)
    if T.get('titolo'):
        ft = font('UncialAntiqua-Regular.ttf', 64)
        tw = d.textlength(T['titolo'], font=ft)
        bx0 = w / 2 - tw / 2 - 50 * K; by0 = (h - 190 * K) if T.get('titolo_basso') else 60 * K
        d.rectangle([bx0, by0, bx0 + tw + 100 * K, by0 + 100 * K], fill=VELL + (235,), outline=INK, width=3 * K)
        testo(d, (w / 2, by0 + 52 * K), T['titolo'], ft, fill=VERM)
    if T.get('nota'):
        testo(d, (w - 70 * K, h - 70 * K), T['nota'], font('EBGaramond-Italic.ttf', 34), anchor='rs', alone=(246, 238, 216, 255))
    im.resize((W, H), Image.LANCZOS).save(out)


def linea(T, out):
    w, h = W * K, H * K
    im = pergamena(w, h, seed=9); d = ImageDraw.Draw(im, 'RGBA')
    cornice(d, w, h)
    if T.get('titolo'):
        testo(d, (w / 2, 230 * K), T['titolo'], font('UncialAntiqua-Regular.ttf', 92), fill=VERM)
    n = len(T['tappe']); x0, x1, y = 300 * K, w - 300 * K, h * .55
    for k in range(6):   # filetto d'oro a piu' passate: scuro, oro, luce
        d.line([(x0, y + (k - 3) * K), (x1, y + (k - 3) * K)], fill=(150 + k * 15, 105 + k * 12, 30 + k * 6), width=4 * K)
    fd, ft = font('Oswald.ttf', 58, 600), font('EBGaramond.ttf', 52)
    for i, tp in enumerate(T['tappe']):
        x = x0 + (x1 - x0) * i / max(1, n - 1); r = 30 * K
        d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD, outline=INK, width=4 * K)
        d.ellipse([x - r * .45, y - r * .45, x + r * .45, y + r * .45], fill=VERM)
        up = i % 2 == 0
        testo(d, (x, y + (-110 if up else 110) * K), tp['data'], fd, fill=INK)
        righe = tp['testo'].split('\n')
        for j, rg in enumerate(righe):
            testo(d, (x, y + ((-200 - (len(righe) - 1 - j) * 62) if up else (200 + j * 62)) * K), rg, ft, fill=(70, 46, 26))
    im.resize((W, H), Image.LANCZOS).save(out)


def main():
    spec = json.load(open(sys.argv[1], encoding='utf-8')); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    terra = None
    for T in spec['tavole']:
        dest = os.path.join(out, T['file'])
        if T['tipo'] == 'cartina':
            if terra is None:
                gj = json.load(open(os.path.join(base, spec['terra'])))
                terra = [shape(f['geometry']) for f in gj['features']]
            cartina(T, terra, dest)
        else:
            linea(T, dest)
        print('pronta', dest)


if __name__ == '__main__':
    main()
