# Fusione "miniatura dorata"

Script che monta un video del canale *Dietro il perché* nello stile scelto il 28 novembre 2026: acquerelli dentro una cornice dorata, titolo e fonti con la tipografia di HyperFrames, oro in foglia che brilla, quadrilobo, neve e sottotitoli su un cartiglio (stile Gilded Illumination di Lemo-Opuscar, codice MIT: vedi `motore/LICENSE-opuscar.txt`).

Costo: 0. Usa solo immagini, voce e musica che hai già.

## Uso

```bash
python3 make_video.py esempio/canossa.json                      # orizzontale 1920×1080 (YouTube)
python3 make_video.py esempio/canossa.json --formato 9:16        # verticale 1080×1920 (Shorts, TikTok, Reels)
python3 make_video.py esempio/canossa.json --formato entrambi
python3 make_video.py esempio/canossa.json --anteprima 3,12,20  # solo alcuni fotogrammi di controllo
python3 make_video.py esempio/canossa.json --riusa-video        # rifà solo l'audio
```

Serve: Python 3, ffmpeg, Node con Playwright e Chromium (già presenti nelle sessioni cloud). I caratteri (OFL) si scaricano da soli la prima volta.

## Cosa fa da solo

1. Trova le pause nella voce e assegna a ogni frase il suo tratto (si può forzare con `tempi`).
2. Fa partire ogni scena nella pausa prima della sua frase; calcola i sottotitoli (su due righe se serve).
3. Taglia il bordo di carta delle immagini (`bordo`, predefinito 3%) e le rende più nitide.
4. Disegna il video fotogramma per fotogramma (circa 2 minuti ogni 30 s per formato).
5. Mixa voce e musica e porta il volume a circa -14 LUFS.

## progetto.json

| Campo | Cosa è |
|---|---|
| `nome` | nome dei file in uscita |
| `voce`, `voce_fino_a` | file della voce; dove tagliarla, in secondi (facoltativo, meglio in una pausa) |
| `musica`, `musica_db` | musica di sottofondo e volume (predefinito -20 dB) |
| `attacco`, `coda` | secondi di immagine prima che parta la voce e dopo che finisce |
| `titolo` | `testo` (in oro), `data`, `luogo`: compare nella prima scena |
| `frasi` | il testo della voce, una frase per elemento, nell'ordine |
| `tempi` | facoltativo: `[[inizio, fine], ...]` della voce per ogni frase, se il calcolo automatico sbaglia |
| `scene` | una per immagine, nell'ordine (sotto) |

Ogni scena:

| Campo | Cosa è |
|---|---|
| `img` | immagine (percorso relativo al file di progetto) |
| `frase` | numero della frase con cui comincia (da 0) |
| `zoom` | `[inizio, fine]`, per esempio `[1.0, 1.12]` (avvicinamento) o `[1.45, 1.0]` (allontanamento) |
| `centro`, `centro_v` | dove guarda la camera, `[[x, y] inizio, [x, y] fine]` in frazioni dell'immagine; `centro_v` per il verticale |
| `neve`, `bufera` | quantità di neve da 0 a 1; `true` per la neve di traverso |
| `quadrilobo` | righe della scritta in rosso, per esempio `["Heinricvs", "rex"]`: la cornice d'oro si chiude sull'immagine |
| `fonte` | scheda della fonte: `latino` (righe), `italiano`, `rif` |

Se `zoom` e `centro` mancano, lo script alterna da solo avvicinamenti, panoramiche e allontanamenti.
