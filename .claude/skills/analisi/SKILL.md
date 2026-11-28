---
name: analisi
description: Analizza per Mattia video e reel da link (Instagram, TikTok, Facebook, YouTube). Controlla i doppioni, fa "guardare" i video tramite la pipeline GitHub (fotogrammi e trascrizione), verifica le affermazioni e restituisce in italiano una tabella con concetti principali, se e come attuarli e un riassunto breve. Usala quando Mattia manda uno o più link di video da analizzare o scrive /analisi.
---

# Analisi di video da link

## Regole fisse

- Non toccare mai gli account di Mattia: niente like, commenti, follow o modifiche.
- Niente crediti a pagamento senza il suo via esplicito: prima il costo, poi si aspetta l'ok.
- Rispondere in italiano, con date esplicite (mai "oggi" o "ieri") e unità di misura internazionali. Non dire "hai ragione".
- Prima rispondere esattamente a ciò che chiede, poi chiedere il permesso per aggiungere altro.
- Non dare nulla per scontato: verificare numeri, nomi, repository, prezzi e date. Dire chiaramente cosa non si è riusciti a verificare.

## 1. Controllo dei doppioni (sempre per primo)

1. Leggere `video-queue/queue.txt` nel repository `starteria12/Consegna-elaborati`, ramo `claude/video-analysis-nrjf3u`. Un link identico è già stato analizzato: i risultati sono in `video-results/<id>/`.
2. Link di condivisione diversi possono portare allo stesso video. Dopo il download confrontare `webpage_url` (l'ID del video), autore, titolo e durata in `meta.json` con i video già presenti in `video-results/`. Se coincidono, è un doppione: dirlo a Mattia e richiamare l'analisi precedente invece di rifarla.
3. Se disponibili, cercare anche nella memoria Notion (voce "Analisi di video e reel tramite GitHub") e nel Palazzo degli Agenti.

## 2. Far "guardare" i video

### Via principale: pipeline GitHub (sessione Claude Code con il repository)

1. `git pull` sul ramo, aggiungere i link nuovi (uno per riga) in fondo a `video-queue/queue.txt`, commit e push. Se il push fallisce per la rete, riprovare fino a 4 volte con attese crescenti (2, 4, 8, 16 s).
2. Il workflow `.github/workflows/watch-video.yml` parte da solo quando cambia `video-queue/**`. Per ogni link nuovo `tools/process_queue.py`:
   - scarica il video con yt-dlp (massimo 1080p);
   - estrae 30 fotogrammi, o 60 se il video dura più di 120 s, larghi 720 px;
   - trascrive l'audio con faster-whisper (modello "small").
   Il bot fa poi un commit "watch-video: risultati analisi [skip ci]" con `video-results/<id>/meta.json`, `transcript.txt`, `frames/` e `log.txt`.
3. Aspettare il commit del bot controllando `git ls-remote origin refs/heads/claude/video-analysis-nrjf3u` ogni 15 s, poi `git pull`.
4. Per ogni video:
   - leggere `meta.json` e `transcript.txt`;
   - guardare i fotogrammi in due fogli 5×3 (`ffmpeg -start_number N -i frames/f_%03d.jpg -frames:v 1 -vf "scale=300:-2,tile=5x3:padding=4" foglio.jpg`);
   - se `ok` è false, leggere `log.txt` e riportare il motivo del fallimento.
5. Più link si possono accodare in un solo commit: la pipeline li elabora uno dopo l'altro. Non servono pause tra un video e l'altro: la pausa di 3 minuti valeva solo per l'analisi fatta dentro il suo account Instagram.

### Via di riserva (chat senza il repository)

- Se c'è il connettore vidIQ, provare `vidiq_watch_shortform_content` sul link.
- Altrimenti dire onestamente che da quella chat non si può guardare il video e proporre di usare una sessione Claude Code sul repository. Non inventare il contenuto di un video non visto.

## 3. Verifica

- Controllare ogni affermazione verificabile:
  - i repository GitHub citati: esistono? che licenza hanno? quante stelle?
  - i numeri detti a voce rispetto a quelli scritti a schermo;
  - prezzi, piani e date.
- Segnalare:
  - promozioni non dichiarate, come "commenta X per ricevere la guida";
  - esagerazioni;
  - rischi: sicurezza, termini d'uso, scraping, costi.
- Collegare ogni idea ai progetti di Mattia: canale "Dietro il perché", metodo video "fusione miniatura dorata", Palazzo degli Agenti, prodotti digitali. Dire se l'idea è già in uso.

## 4. Risultato per Mattia

Introduzione breve:
- quanti link sono arrivati, quanti sono nuovi e quanti doppioni;
- come sono stati guardati (fotogrammi e trascrizione);
- conferma che il suo account non è stato toccato.

Poi la tabella:

| # | Video | Concetti principali | Si può fare? Come | In breve |
|---|---|---|---|---|

- **Video:** piattaforma, @autore, lingua se non è l'italiano, durata e, se utili, i numeri di pubblico con la data.
- **Concetti principali:** cosa dice e mostra il video, con strumenti e nomi precisi.
- **Si può fare? Come:** iniziare con **Sì**, **Sì, con cautela**, **In parte** o **No**, in grassetto. Poi come si fa, costi e rischi, cosa è verificato e cosa no.
- **In breve:** una sola frase.

Dopo la tabella:
- doppioni in una sezione a parte, con il rimando all'analisi precedente;
- video non riusciti, con il motivo.

Alla fine chiedere il permesso prima di proporre cosa applicare.

## 5. Registrare

- Nel Palazzo degli Agenti (artefatto https://claude.ai/artifact/AVWCdSD2vURGWvNM2L35kb, collezione `agenti`) creare o aggiornare la scheda del gruppo di analisi:
  - stanza "ricerca";
  - stato "lavora" durante l'analisi e "fatto" alla fine;
  - nota con data e numero di video.
  Ogni modifica va fatta con la versione letta (`if_version`).
- Se Mattia decide di applicare qualcosa, salvare la decisione, con la data, nella memoria Notion.
