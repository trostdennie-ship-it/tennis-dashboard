# 🎾 Aufschlag – Tennis-Dashboard

Eine kleine, hübsche Web-App fürs iPhone – gebaut als Geschenk für einen
leidenschaftlichen Tennisfan. Auf einen Blick zeigt sie:

- **Nächstes Grand Slam** mit Countdown, Ort, Belag und **wo es in Deutschland läuft**
- **Weltrangliste** (ATP Herren **und** WTA Damen) – **täglich automatisch aktualisiert**, deutsche Spieler:innen 🇩🇪 hervorgehoben
- **Talente suchen & verfolgen** – beliebige Spieler:innen über ein Suchfeld finden und „verfolgen", mit tagesaktuellem Rang, Form (↑/↓), Alter, **letzten Match-Ergebnissen** und „Mehr erfahren"-Link zur Wikipedia
- **„So funktioniert die App"-Kästchen** (auf der Heute-Seite, ausblendbar; jederzeit über Einstellungen wieder aufrufbar)
- **Spielplan** der vier Grand Slams mit Runden, Zeitzone und Anstoßzeiten
- **Liveticker** mit tickenden Satz-, Spiel- und Punkteständen (Demo, siehe Hinweis unten)

Komplett auf **Deutsch**, **mobil-zuerst**, als **PWA** aufs iPhone installierbar –
**kostenlos** und **ohne jeden API-Schlüssel**.

> Optik: helle, ruhige „Klar"-Variante mit Rasen-Grün – seniorenfreundlich, großer Kontrast,
> große Touch-Ziele. Optionaler Dunkel-Modus und drei Schriftgrößen in den Einstellungen.

---

## Inhalt

1. [Schnellstart (lokal ansehen)](#1-schnellstart-lokal-ansehen)
2. [Wie die Daten aktuell bleiben (ohne Schlüssel!)](#2-wie-die-daten-aktuell-bleiben-ohne-schlüssel)
3. [Veröffentlichen & automatische Updates aktivieren (GitHub)](#3-veröffentlichen--automatische-updates-aktivieren-github)
4. [Aufs iPhone installieren (Safari)](#4-aufs-iphone-installieren-safari)
5. [Was muss ich pflegen / aktualisieren?](#5-was-muss-ich-pflegen--aktualisieren)
6. [Wie ist das Projekt aufgebaut?](#6-wie-ist-das-projekt-aufgebaut)
7. [Architektur-Entscheidungen (kurz erklärt)](#7-architektur-entscheidungen-kurz-erklärt)

---

## 1. Schnellstart (lokal ansehen)

Die App ist eine **statische Web-App** (nur HTML, CSS, JavaScript – kein Build nötig).

⚠️ Bitte **nicht** die `index.html` per Doppelklick öffnen (`file://`). Starte stattdessen
einen winzigen lokalen Server:

```bash
cd "Tennis Dashboard"
python3 -m http.server 8000
```
Dann im Browser öffnen: **http://localhost:8000**

Fertig – die App läuft sofort. Beim ersten Öffnen lädt sie die **aktuelle Rangliste**
(die Dateien `data/rankings-atp.json` / `-wta.json` liegen schon dabei) und fällt notfalls
auf eingebaute Beispieldaten zurück.

---

## 2. Wie die Daten aktuell bleiben (ohne Schlüssel!)

Das ist der Clou dieser App: **Du brauchst keinen API-Schlüssel, keine Anmeldung, nichts
zu bezahlen.**

- Die **Weltrangliste (ATP & WTA)**, die **durchsuchbare Spieler-Datenbank** und die
  **jüngsten Match-Ergebnisse** kommen aus kleinen Dateien im Ordner `data/`.
- Ein kleines Skript (`scripts/update-rankings.mjs`) holt die aktuellen Daten aus einer
  **offenen, kostenlosen Datenquelle** ([„TennisCourtLog"](https://github.com/LuckyLoser91/TennisCourtLog)
  – Ranglisten/Spieler aus Jeff Sackmanns Datensätzen, laufende Ergebnisse von
  tennis-data.co.uk, montags automatisch aktualisiert) und schreibt sie in diese Dateien.
  Das Skript rechnet die Quelle per Adapter in das App-Format um.

  > **Warum nicht mehr Jeff Sackmann direkt?** Dessen Original-Repos
  > (`JeffSackmann/tennis_atp` & `_wta`) sind im Juni 2026 offline gegangen. Falls auch
  > die jetzige Quelle einmal ausfällt: einfach die `SOURCES`-URLs oben in
  > `scripts/update-rankings.mjs` auf einen neuen Anbieter umstellen.
- Eine **GitHub Action** (`.github/workflows/update-rankings.yml`) führt dieses Skript
  **1× pro Tag automatisch** in der Cloud aus – dein Mac muss dafür **nicht** an sein.
- Die App liest dann einfach die Dateien. Schlägt mal etwas fehl (offline, Quelle kurz weg),
  zeigt sie die zuletzt geladenen bzw. die Beispieldaten und blendet dezent
  „Daten ggf. nicht aktuell" ein. **Es geht nie etwas kaputt.**

Die **Turniertermine, der Spielplan und die jungen Talente** sind bewusst fest hinterlegt
(in `js/data.js`) – die ändern sich nur 1×/Saison und werden von Hand gepflegt (siehe
Abschnitt 5).

> **Hinweis zum Liveticker:** Er zeigt klar gekennzeichnete **Beispiel-Spiele**. Echte
> Live-Spielstände sind bei allen seriösen Anbietern leider kostenpflichtig (ab ~40 $/Monat)
> – darum haben wir den echten Live-Ticker bewusst weggelassen. Die Rangliste dagegen ist
> echt und tagesaktuell.

---

## 3. Veröffentlichen & automatische Updates aktivieren (GitHub)

Damit die App (a) dauerhaft online und aufs iPhone installierbar ist und (b) sich die
Rangliste täglich von selbst aktualisiert, ist **GitHub Pages** der einfachste Weg – beides
an einem Ort, komplett kostenlos.

### Schritt für Schritt
1. **Repository anlegen:** Auf [github.com](https://github.com) ein neues Repository erstellen
   (z. B. `tennis-dashboard`). Den kompletten Ordnerinhalt hochladen
   („Add file → Upload files" oder per Git).
2. **Seite einschalten:** Im Repo **Settings → Pages → Source: „Deploy from a branch"**,
   Branch `main`, Ordner `/ (root)`, **Save**. Nach 1–2 Minuten ist die App erreichbar unter
   `https://DEIN-NAME.github.io/tennis-dashboard/`.
3. **Automatik erlauben:** **Settings → Actions → General → Workflow permissions** auf
   **„Read and write permissions"** stellen, **Save**. (Damit darf der tägliche Job die
   aktualisierte Rangliste zurückspeichern.)
4. **Einmal testen:** Tab **„Actions" → „Rangliste aktualisieren" → „Run workflow"**.
   Läuft er grün durch, ist alles eingerichtet – ab jetzt aktualisiert er sich **jede Nacht
   automatisch**.

> Alternativ kannst du die App auch bei **Netlify** oder **Vercel** hosten (Ordner per
> Drag & Drop). Die *automatische* tägliche Aktualisierung läuft aber über die GitHub Action –
> dafür ist GitHub am unkompliziertesten.

---

## 4. Aufs iPhone installieren (Safari)

So landet „Aufschlag" als **App-Symbol** auf dem Home-Bildschirm (funktioniert auch offline):

1. Die Adresse der App in **Safari** öffnen (wichtig: **Safari**, nicht Chrome).
2. Unten in der Mitte auf das **Teilen-Symbol** tippen (Quadrat mit Pfeil nach oben ⬆️).
3. Nach unten scrollen und **„Zum Home-Bildschirm"** wählen.
4. Oben rechts auf **„Hinzufügen"** tippen.
5. Das grüne **Tennisball-Symbol „Aufschlag"** erscheint auf dem Home-Bildschirm – antippen,
   und die App öffnet sich **bildschirmfüllend wie eine echte App**.

> Diesen Hinweis findet man in der App auch jederzeit unter **Einstellungen (Zahnrad)**.

---

## 5. Was muss ich pflegen / aktualisieren?

Erfreulich wenig – das meiste läuft automatisch. Alles steckt in gut kommentierten Dateien;
du musst **nichts programmieren können**, nur Werte ersetzen.

| Wie oft | Was | Wo |
|---|---|---|
| **automatisch** | **Weltrangliste ATP & WTA** (inkl. „Deutsche im Feld") | läuft täglich von selbst – nichts zu tun ✅ |
| **1× pro Jahr** | **Grand-Slam-Termine** (Start/Ende, Runden) | `js/data.js` → `SLAMS` |
| **pro Saison** | **Übertragungsrechte** (wer zeigt was in DE) – ändern sich häufig! | `js/data.js` → `SLAMS[*].broadcasters` + `BROADCASTERS` |
| bei Bedarf | **Junge Talente** (Liste, Notizen) | `js/data.js` → `PLAYERS` |
| selten | **Akzentfarbe / Beläge / Abstände** | `css/styles.css` (oben im `:root`-Block) |
| bei Datei-Änderung | **`CACHE_VERSION` hochzählen** (damit installierte Apps die neue Version laden) | `sw.js` (oben) |

**Zwei ehrliche Wartungs-Hinweise:**
- GitHub schaltet automatische Jobs nach **60 Tagen ohne Repo-Aktivität** schlafen. Falls die
  Rangliste mal „einfriert": im Tab **Actions** den Workflow einmal wieder aktivieren (ein Klick)
  oder „Run workflow" drücken.
- Sollte die Datenquelle einmal ihr Format ändern, bricht nichts – die App zeigt dann die
  letzten/Beispieldaten. Den Mapping-Code findest du gut kommentiert in
  `scripts/update-rankings.mjs`.

> Der Countdown auf der Startseite rechnet immer mit dem **echten heutigen Datum** und springt
> von selbst zum nächsten Turnier weiter.

---

## 6. Wie ist das Projekt aufgebaut?

```
Tennis Dashboard/
├── index.html                     App-Gerüst, Meta-/PWA-Tags, Schriften
├── manifest.webmanifest           PWA-Manifest (Name, Farben, Icons)
├── sw.js                          Service Worker (Offline-Fähigkeit)
├── config.js                      leer – kein Schlüssel nötig (nur Platzhalter)
├── css/styles.css                 Alle Styles + Theme-Farben (oben im :root)
├── js/
│   ├── data.js                    ★ Termine, Talente, Demo-Fallback (hier pflegst du)
│   ├── icons.js                   SVG-Icons
│   ├── api.js                     lädt data/-Dateien (Live → Cache → Demo)
│   ├── live.js                    Liveticker (Demo) + Zähl-Engine
│   └── app.js                     Bildschirme, Tabs, Einstellungen
├── data/
│   ├── rankings-atp.json          ← täglich automatisch aktualisiert
│   └── rankings-wta.json          ← täglich automatisch aktualisiert
├── scripts/
│   └── update-rankings.mjs        holt die Rangliste (kostenlos, schlüssellos)
├── .github/workflows/
│   └── update-rankings.yml        führt das Skript 1×/Tag automatisch aus
└── icons/                         App-Icons (Tennisball) + Favicon
```

Die Datei, die du am ehesten von Hand anpasst, ist **`js/data.js`** (ausführlich kommentiert).

---

## 7. Architektur-Entscheidungen (kurz erklärt)

- **Reines HTML/CSS/JS, kein Build-Schritt.** Bewusst schlank: einfach zu hosten, zu warten,
  läuft offline. Werte ändern = Datei öffnen, Wert ersetzen, speichern.
- **Daten ohne Schlüssel, einmal täglich „im Hintergrund" geholt.** Statt im Browser live
  abzufragen (was an Kosten, Anmeldung und CORS-Sperren scheitert), erzeugt eine GitHub Action
  1×/Tag fertige kleine JSON-Dateien. Vorteile: **kostenlos, kein Schlüssel im Browser,
  blitzschnell, mobilfreundlich** – und robust, weil die App jederzeit auf Cache/Demo
  zurückfallen kann.
- **Quelle: [TennisCourtLog](https://github.com/LuckyLoser91/TennisCourtLog)** – kostenlos,
  schlüssellos, montags aktualisiert; laufende Ergebnisse von tennis-data.co.uk (unabhängig,
  läuft also weiter, seit Jeff Sackmanns Original-Repos im Juni 2026 offline gingen). Der
  Abruf inkl. Format-Adapter steckt sauber gekapselt in `scripts/update-rankings.mjs`
  (leicht austauschbar – nur die `SOURCES`-URLs).
- **Live-Ticker bewusst als Demo.** Echte Live-Spielstände sind durchweg kostenpflichtig
  (ab ~40 $/Monat); für eine Geschenk-App nicht sinnvoll. Die Demo zeigt realistisch, wie es
  während der Turniere aussähe.
- **Deutsche hervorgehoben** (🇩🇪 + grüne Markierung) und ein eigener, **automatisch
  befüllter** Abschnitt „Deutsche im Feld" (auch außerhalb der Top 20).
- **PWA + Service Worker.** Manifest, eigenes App-Icon, Offline-Cache. Die Tagesdaten werden
  „network-first" geladen (immer möglichst frisch, offline aus dem Cache).
- **Design „Variante C / Klar".** Hell, ruhig, großer Kontrast – fürs entspannte Lesen.

---

Viel Freude beim Tennisschauen! 🎾
