"""Scarica i video elencati in video-queue/*.txt, estrae fotogrammi e trascrizione.

Ogni riga di un file in video-queue/ e' un URL. I risultati vanno in
video-results/<id>/ (frames/*.jpg, transcript.txt, meta.json, log.txt).
Un URL gia' elaborato con successo viene saltato.
"""
import hashlib, json, re, subprocess, sys, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
QUEUE = ROOT / "video-queue"
OUT = ROOT / "video-results"


def slug(url: str) -> str:
    m = re.search(r"/(?:reel|reels|p|tv|video|shorts)/([A-Za-z0-9_-]+)", url)
    base = m.group(1) if m else re.sub(r"\W+", "-", url)[-40:]
    return base.strip("-") or hashlib.sha1(url.encode()).hexdigest()[:10]


def run(cmd, log):
    log.write("$ " + " ".join(cmd) + "\n")
    p = subprocess.run(cmd, capture_output=True, text=True)
    log.write(p.stdout[-4000:] + p.stderr[-4000:] + "\n")
    return p


def duration(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return 0.0


def process(url):
    d = OUT / slug(url)
    if (d / "meta.json").exists() and json.loads((d / "meta.json").read_text()).get("ok"):
        print("skip", url); return
    if d.exists():
        shutil.rmtree(d)
    (d / "frames").mkdir(parents=True)
    meta = {"url": url, "ok": False}
    with open(d / "log.txt", "w") as log:
        work = pathlib.Path("/tmp") / d.name
        work.mkdir(exist_ok=True)
        p = run(["yt-dlp", "--no-playlist", "-f", "best[height<=1080]/best",
                 "--write-info-json", "--write-subs", "--write-auto-subs", "--sub-langs", "all",
                 "-o", str(work / "video.%(ext)s"), url], log)
        vids = [f for f in work.iterdir() if f.name.startswith("video.") and f.suffix in (".mp4", ".webm", ".mkv", ".mov")]
        if p.returncode != 0 or not vids:
            meta["error"] = "download fallito (vedi log.txt)"
            (d / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False)); return
        video = vids[0]
        info_f = work / "video.info.json"
        if info_f.exists():
            info = json.loads(info_f.read_text())
            for k in ("title", "description", "uploader", "channel", "upload_date", "like_count",
                      "comment_count", "view_count", "duration", "webpage_url"):
                if info.get(k) is not None:
                    meta[k] = info[k]
        dur = duration(video)
        meta["duration_s"] = dur
        n = 30 if dur <= 120 else 60
        fps = min(2.0, max(0.05, n / max(dur, 1)))
        run(["ffmpeg", "-loglevel", "error", "-i", str(video), "-vf", f"fps={fps:.4f},scale=720:-2",
             "-q:v", "4", str(d / "frames" / "f_%03d.jpg")], log)
        frames = sorted((d / "frames").glob("*.jpg"))
        meta["frames"] = {f.name: round(i / fps, 2) for i, f in enumerate(frames)}
        # audio + trascrizione
        wav = work / "audio.wav"
        a = run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", str(wav)], log)
        if a.returncode == 0 and wav.exists() and wav.stat().st_size > 1000:
            from faster_whisper import WhisperModel
            model = WhisperModel("small", device="cpu", compute_type="int8")
            segs, inf = model.transcribe(str(wav), vad_filter=True, beam_size=5)
            lines = [f"[{int(s.start//60):02d}:{s.start%60:05.2f} - {int(s.end//60):02d}:{s.end%60:05.2f}] {s.text.strip()}" for s in segs]
            (d / "transcript.txt").write_text("\n".join(lines) + "\n")
            meta["language"] = inf.language
            meta["language_probability"] = round(inf.language_probability, 3)
        else:
            meta["transcript"] = "nessun audio"
        meta["ok"] = True
    (d / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    print("done", url)


def main():
    urls = []
    for f in sorted(QUEUE.glob("*.txt")):
        for line in f.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and line not in urls:
                urls.append(line)
    OUT.mkdir(exist_ok=True)
    for u in urls:
        try:
            process(u)
        except Exception as e:  # continua con gli altri
            print("errore", u, e, file=sys.stderr)


if __name__ == "__main__":
    main()
