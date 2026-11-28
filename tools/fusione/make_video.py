#!/usr/bin/env python3
"""Fusione "miniatura dorata": da immagini, voce, musica e testo a un video finito, orizzontale e/o verticale.

Uso:
    python3 make_video.py progetto.json                 # 16:9 (YouTube)
    python3 make_video.py progetto.json --formato 9:16  # verticale (Shorts, TikTok, Reels)
    python3 make_video.py progetto.json --formato entrambi
    python3 make_video.py progetto.json --anteprima 3,12,20   # solo alcuni fotogrammi, per controllare

Cosa fa da solo:
1. trova le pause della voce (ffmpeg silencedetect) e assegna a ogni frase il suo tratto di voce;
2. calcola quando inizia ogni scena (nella pausa prima della sua frase) e i tempi dei sottotitoli;
3. prepara le immagini (taglio del bordo di carta, nitidezza);
4. disegna il video fotogramma per fotogramma (motore/: Canvas + Playwright, costo 0);
5. mixa voce e musica e porta il volume a circa -14 LUFS (livello di YouTube).
Il formato di progetto.json e' descritto nel README.md accanto a questo file.
"""
import argparse, functools, hashlib, http.server, json, os, re, shutil, socket, subprocess, sys, threading, urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
MOTORE = os.path.join(QUI, 'motore')
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'fusione')
GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl'
FONT = {
    'UncialAntiqua-Regular.ttf': f'{GF}/uncialantiqua/UncialAntiqua-Regular.ttf',
    'Oswald.ttf': f'{GF}/oswald/Oswald%5Bwght%5D.ttf',
    'EBGaramond.ttf': f'{GF}/ebgaramond/EBGaramond%5Bwght%5D.ttf',
    'EBGaramond-Italic.ttf': f'{GF}/ebgaramond/EBGaramond-Italic%5Bwght%5D.ttf',
    'OFL-UncialAntiqua.txt': f'{GF}/uncialantiqua/OFL.txt',
    'OFL-Oswald.txt': f'{GF}/oswald/OFL.txt',
    'OFL-EBGaramond.txt': f'{GF}/ebgaramond/OFL.txt',
}
# movimenti di macchina usati quando una scena non li indica: zoom e panoramiche alternati
MOSSE = [([1.0, 1.12], [[.5, .5], [.5, .45]]), ([1.12, 1.12], [[.4, .5], [.6, .5]]), ([1.15, 1.0], [[.5, .5], [.5, .5]]),
         ([1.0, 1.14], [[.5, .55], [.52, .48]]), ([1.12, 1.12], [[.6, .5], [.4, .5]])]


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def durata(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout)


def tratti_voce(voce, fino_a, soglia=-35, minimo=0.18):
    """Tratti parlati [inizio, fine] della voce, dalle pause trovate da ffmpeg."""
    err = subprocess.run(['ffmpeg', '-hide_banner', '-t', str(fino_a), '-i', voce, '-af', f'silencedetect=noise={soglia}dB:d={minimo}', '-f', 'null', '-'],
                         text=True, capture_output=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    out, cur = [], 0.0
    for s, e in zip(starts, ends + [None] * (len(starts) - len(ends))):
        if s - cur > 0.15: out.append([round(cur, 3), round(s, 3)])
        cur = e if e is not None else fino_a
    if fino_a - cur > 0.15: out.append([round(cur, 3), round(fino_a, 3)])
    return out


def allinea(frasi, tratti, lam=1.5):
    """Assegna a ogni frase un gruppo consecutivo di tratti di voce (programmazione dinamica): la durata deve essere
    proporzionale alla lunghezza del testo, e i confini tra le frasi cadono di preferenza nelle pause piu' lunghe.
    Se ci sono piu' frasi che tratti, divide in proporzione."""
    n, m = len(frasi), len(tratti)
    chars = [max(1, len(f)) for f in frasi]
    if n > m:
        t0, t1, tot, acc, out = tratti[0][0], tratti[-1][1], sum(chars), 0, []
        for c in chars:
            a = t0 + (t1 - t0) * acc / tot; acc += c; out.append([round(a, 3), round(t0 + (t1 - t0) * acc / tot, 3)])
        return out
    rate = sum(e - s for s, e in tratti) / sum(chars)
    gap = [0] + [tratti[j][0] - tratti[j - 1][1] for j in range(1, m)]
    pre = [0]
    for s, e in tratti: pre.append(pre[-1] + e - s)
    INF = float('inf')
    best = [[INF] * (m + 1) for _ in range(n + 1)]; prev = [[0] * (m + 1) for _ in range(n + 1)]
    best[0][0] = 0
    for i in range(1, n + 1):
        for j in range(i, m - (n - i) + 1):
            for k in range(i - 1, j):
                if best[i - 1][k] == INF: continue
                e = rate * chars[i - 1]
                c = best[i - 1][k] + ((pre[j] - pre[k] - e) / max(e, 1.0)) ** 2 - (lam * gap[j] if j < m else 0)
                if c < best[i][j]: best[i][j] = c; prev[i][j] = k
    out, j = [], m
    for i in range(n, 0, -1):
        k = prev[i][j]; out.append([tratti[k][0], tratti[j - 1][1]]); j = k
    return out[::-1]


def scarica_font(dest):
    os.makedirs(CACHE, exist_ok=True); os.makedirs(dest, exist_ok=True)
    for nome, url in FONT.items():
        c = os.path.join(CACHE, nome)
        if not os.path.exists(c):
            print('scarico', nome); urllib.request.urlretrieve(url, c)
        shutil.copy(c, os.path.join(dest, nome))


def prepara_immagine(src, dest, bordo):
    vf = (f'crop=iw*{1 - 2 * bordo}:ih*{1 - 2 * bordo},' if bordo > 0 else '') + 'scale=2400:-2:flags=lanczos,unsharp=5:5:0.5'
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', vf, '-q:v', '2', dest])


def costruisci(P, base, voce_fino):
    att, coda = P.get('attacco', 0.8), P.get('coda', 1.0)
    frasi = P['frasi']
    if P.get('tempi'):
        tempi = P['tempi']
    else:
        tratti = tratti_voce(P['voce'], voce_fino, P.get('soglia_silenzio', -35))
        tempi = allinea(frasi, tratti)
    fine_voce = att + voce_fino
    dur = round(fine_voce + coda, 3)
    T = [[round(a + att, 3), round(b + att, 3)] for a, b in tempi]
    subs = []
    for i, (a, b) in enumerate(T):
        nxt = T[i + 1][0] if i + 1 < len(T) else dur - 1.2
        subs.append([a, round(min(nxt - 0.2, b + 0.9), 3), frasi[i]])
    scene, sc = [], P['scene']
    for k, s in enumerate(sc):
        f = s['frase']
        t0 = 0.0 if k == 0 else max(T[f][0] - 0.25, (T[f - 1][1] + 0.05) if f > 0 else 0)
        scene.append({'t0': round(t0, 3)})
    for k, s in enumerate(sc):
        scene[k]['t1'] = scene[k + 1]['t0'] if k + 1 < len(sc) else dur
        mz, mc = MOSSE[k % len(MOSSE)]
        scene[k].update({'img': s.get('_img', f'img/s{k}.jpg'), 's': s.get('zoom', mz), 'neve': s.get('neve', 0), 'bufera': s.get('bufera', False)})
        scene[k]['c'] = s.get('centro', mc)
        scene[k]['c_v'] = s.get('centro_v', scene[k]['c'])
        if s.get('quadrilobo'): scene[k]['quadrilobo'] = s['quadrilobo']
        if s.get('fonte'): scene[k]['fonte'] = s['fonte']
    tit = None
    if P.get('titolo'):
        fa = P['titolo'].get('fino_a_frase')
        fine = (T[fa][0] - 0.3) if fa is not None else ((scene[1]['t0'] if len(scene) > 1 else dur) - 0.3)
        tit = dict(P['titolo'], fine=round(fine, 3))
    cfg = {'dur': dur, 'titolo': tit, 'scene': scene, 'sottotitoli': subs, 'fade_out': [round(fine_voce - 0.5, 3), round(dur - 0.1, 3)]}
    if P.get('finale'):   # cartello finale degli Shorts: la domanda e il rimando al video lungo
        F = P['finale']; d = F.get('durata', 2.5)
        cfg['finale'] = {'domanda': F['domanda'], 'riga': F.get('riga', 'LA RISPOSTA NEL VIDEO COMPLETO SU YOUTUBE'), 't0': round(dur, 3)}
        cfg['dur'] = round(dur + d, 3); cfg['fade_out'] = [round(cfg['dur'] - 0.6, 3), round(cfg['dur'] - 0.05, 3)]
        scene[-1]['t1'] = cfg['dur']
    return cfg, T


class Silenzioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def servi(cartella):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); porta = s.getsockname()[1]; s.close()
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', porta), functools.partial(Silenzioso, directory=cartella))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{porta}'


def node_env():
    env = dict(os.environ)
    try: env['NODE_PATH'] = run(['npm', 'root', '-g']).stdout.strip()
    except Exception: pass
    return env


def loudness(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], text=True, capture_output=True).stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', err); pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', err)
    return (float(i[-1]) if i else None), (float(pk[-1]) if pk else None)


def mixa(P, video, out, voce_fino, dur, cartella):
    att = int(P.get('attacco', 0.8) * 1000)
    voce = (f"[1:a]atrim=0:{voce_fino},afade=t=out:st={max(0, voce_fino - 0.3)}:d=0.3,adelay={att}|{att},apad=whole_dur={dur},"
            f"acompressor=threshold=-22dB:ratio=2.5:attack=5:release=120[v]")
    ingressi = ['-i', video, '-i', P['voce']]
    if P.get('musica'):
        ingressi += ['-i', P['musica']]
        mus = f"[2:a]atrim=0:{dur},volume={P.get('musica_db', -20)}dB,afade=t=in:st=0:d=1,afade=t=out:st={max(0, dur - 2.6)}:d=2.6[m];[v][m]amix=inputs=2:normalize=0:duration=first"
    else:
        mus = '[v]anull'
    prova = os.path.join(cartella, 'mix_prova.wav')
    # prima passata senza guadagno, solo per misurare il volume (l'ingresso 0 e' un segnale muto al posto del video)
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'] + ingressi[2:] +
        ['-filter_complex', f'{voce};{mus}[a]', '-map', '[a]', '-t', str(dur), prova])
    I, _ = loudness(prova)
    guad = round(-14.0 - I, 2) if I is not None else 14.2
    # il limitatore toglie un po' di volume: si corregge il guadagno sul solo audio finche' si arriva vicino a -14 LUFS
    for _ in range(4):
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'] + ingressi[2:] +
            ['-filter_complex', f"{voce};{mus},volume={guad}dB,alimiter=limit=0.75:attack=3:release=60:level=false[a]", '-map', '[a]', '-t', str(dur), prova])
        I2, _ = loudness(prova)
        if I2 is None or abs(I2 + 14.2) <= 0.4: break
        guad = round(guad + (-14.2 - I2), 2)
    run(['ffmpeg', '-v', 'error', '-y'] + ingressi + ['-filter_complex', f"{voce};{mus},volume={guad}dB,alimiter=limit=0.75:attack=3:release=60:level=false[a]",
         '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
         '-movflags', '+faststart', '-t', str(dur), out])
    os.remove(prova)
    return loudness(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('progetto'); ap.add_argument('--formato', default='16:9', choices=['16:9', '9:16', 'entrambi'])
    ap.add_argument('--out', default=None); ap.add_argument('--fps', type=int, default=30); ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--anteprima', default=None, help='tempi in secondi separati da virgola: solo fotogrammi di prova')
    ap.add_argument('--riusa-video', action='store_true', help='rifa solo l\'audio usando il video gia\' disegnato')
    a = ap.parse_args()
    pdir = os.path.dirname(os.path.abspath(a.progetto))
    P = json.load(open(a.progetto, encoding='utf-8'))
    for k in ('voce', 'musica'):
        if P.get(k): P[k] = os.path.join(pdir, P[k])
    for s in P['scene']: s['img'] = os.path.join(pdir, s['img'])
    if P.get('sezioni'):   # voce in piu' file: si uniscono con una pausa e ogni frase si cerca dentro la sua sezione
        for z in P['sezioni']: z['voce'] = os.path.join(pdir, z['voce'])
    viste = {}
    for k, s in enumerate(P['scene']):
        key = (s['img'], s.get('bordo', P.get('bordo', 0.03)))
        viste.setdefault(key, f'img/i{len(viste)}.jpg'); s['_img'] = viste[key]
    nome = P.get('nome', 'video')
    out = os.path.abspath(a.out or os.path.join(pdir, 'uscita')); os.makedirs(out, exist_ok=True)
    build = os.path.join(out, f'.build_{nome}'); os.makedirs(os.path.join(build, 'img'), exist_ok=True)
    for f in ('index.html', 'lib.js', 'world.js', 'film.js', 'LICENSE-opuscar.txt'): shutil.copy(os.path.join(MOTORE, f), build)
    scarica_font(os.path.join(build, 'fonts'))
    if P.get('sezioni'):
        pausa, frasi, tempi, off = P.get('pausa', 0.5), [], [], 0.0
        for z in P['sezioni']:
            dz = durata(z['voce']); fz = [re.sub(r'\[[^\]]*\]\s*', '', f).strip() for f in z['frasi']]
            tz = allinea(fz, tratti_voce(z['voce'], dz, P.get('soglia_silenzio', -35)))
            frasi += fz; tempi += [[round(a + off, 3), round(b + off, 3)] for a, b in tz]; off += dz + pausa
        voce_fino = round(off - pausa, 3)
        unita = os.path.join(build, 'voce_unita.wav'); n = len(P['sezioni']); ing, fil = [], ''
        for i, z in enumerate(P['sezioni']):
            ing += ['-i', z['voce']]; fil += f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo" + (f",apad=pad_dur={pausa}" if i < n - 1 else '') + f"[a{i}];"
        fil += ''.join(f'[a{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1[o]'
        run(['ffmpeg', '-v', 'error', '-y'] + ing + ['-filter_complex', fil, '-map', '[o]', unita])
        P.update({'voce': unita, 'frasi': frasi, 'tempi': tempi})
    else:
        P['frasi'] = [re.sub(r'\[[^\]]*\]\s*', '', f).strip() for f in P['frasi']]
    voce_fino = P.get('voce_fino_a') or (voce_fino if P.get('sezioni') else durata(P['voce']))
    cfg, T = costruisci(P, build, voce_fino)
    print('frasi e tempi (s, nel video):')
    for (x, y), f in zip(T, P['frasi']): print(f'  {x:6.2f}-{y:6.2f}  {f}')
    print('scene:', ', '.join(f"{s['t0']:.2f}" for s in cfg['scene']), '| durata', cfg['dur'], 's')
    for (src, bordo), rel in viste.items():
        d = os.path.join(build, rel)
        if not os.path.exists(d): prepara_immagine(src, d, bordo)
    formati = ['16:9', '9:16'] if a.formato == 'entrambi' else [a.formato]
    srv, base = servi(build)
    try:
        for fm in formati:
            w, h = (1920, 1080) if fm == '16:9' else (1080, 1920)
            c = json.loads(json.dumps(cfg))
            if fm == '9:16':
                for s in c['scene']: s['c'] = s['c_v']
            json.dump(c, open(os.path.join(build, 'film.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            tag = 'orizzontale' if fm == '16:9' else 'verticale'
            if a.anteprima:
                script = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:%d,height:%d}});"
                          "p.on('pageerror',e=>{console.error(e.message);process.exit(1)});await p.goto('%s/index.html?w=%d&h=%d&t=0.01');"
                          "await p.waitForFunction(()=>window.READY===true,null,{timeout:180000});for(const t of %s){await p.evaluate(t=>window.render(t),t);"
                          "await p.screenshot({path:'%s/anteprima_%s_'+t+'.jpg',type:'jpeg',quality:85});}await b.close();})();") % (
                    w, h, base, w, h, json.dumps([float(x) for x in a.anteprima.split(',')]), out, tag)
                subprocess.run(['node', '-e', script], check=True, env=node_env(), cwd=QUI)
                print('anteprime in', out); continue
            video = os.path.join(build, f'video_{tag}.mp4')
            if not (a.riusa_video and os.path.exists(video)):
                subprocess.run(['node', os.path.join(QUI, 'render.js'), base, video, str(a.fps), str(a.workers), str(w), str(h)], check=True, env=node_env(), cwd=QUI)
            fin = os.path.join(out, f'{nome}_{tag}.mp4')
            I, pk = mixa(P, video, fin, voce_fino, cfg['dur'], build)
            print(f'pronto: {fin}  ({cfg["dur"]} s, {w}x{h}, {I} LUFS, picco {pk} dBFS)')
    finally:
        srv.shutdown()


if __name__ == '__main__':
    main()
