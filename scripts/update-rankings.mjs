/* =================================================================
   update-rankings.mjs
   -----------------------------------------------------------------
   Holt die aktuelle ATP- & WTA-Weltrangliste, die durchsuchbare
   Spieler-Datenbank und die jüngsten Match-Ergebnisse und schreibt
   sie als kleine JSON-Dateien (data/*.json), die die App lädt.

   Quelle: „TennisCourtLog" auf GitHub
   (github.com/LuckyLoser91/TennisCourtLog) – kostenlos, ohne
   Schlüssel. Die Ranglisten/Spieler stammen ursprünglich aus Jeff
   Sackmanns Datensätzen, die laufenden Ergebnisse 2025+ werden
   unabhängig von tennis-data.co.uk eingelesen und per GitHub-Action
   (montags) aktualisiert – läuft also auch weiter, seit Sackmanns
   Original-Repos (JeffSackmann/tennis_atp & _wta) im Juni 2026
   offline gegangen sind.

   • Läuft per GitHub Action 1×/Tag automatisch (siehe
     .github/workflows/update-rankings.yml).
   • Lässt sich auch lokal ausführen:  node scripts/update-rankings.mjs
   • Braucht KEINE Installation (nur Node 18+; nutzt eingebautes fetch).

   Robust: Schlägt ein Abruf fehl, bleibt die zuletzt gute Datei stehen
   (die Datei wird nur bei Erfolg überschrieben). Abrufe werden zudem
   mehrfach versucht. Die App fällt zusätzlich auf die eingebauten
   Demo-Daten zurück.

   ▸ Wenn diese Quelle einmal ausfällt: nur die URLs in SOURCES (unten)
     auf einen neuen Anbieter umstellen – der Rest passt sich über die
     Adapter (Spalten-Zuordnung) weitgehend von selbst an.
   ================================================================= */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');

const BASE = 'https://raw.githubusercontent.com/LuckyLoser91/TennisCourtLog/main';
const SOURCES = {
  atp: {
    label: 'ATP Herren',
    rankings: `${BASE}/tennis_atp/atp_players_active_rank.csv`, // Spalten: rank,name,ioc,dob
    players:  `${BASE}/tennis_atp/atp_players.csv`,             // Spalten: player_id,name,hand,dob,ioc,height
    matches:  `${BASE}/tennis_atp/atp_matches_2026.csv`,
  },
  wta: {
    label: 'WTA Damen',
    rankings: `${BASE}/tennis_wta/wta_players_active_rank.csv`,
    players:  `${BASE}/tennis_wta/wta_players.csv`,
    matches:  `${BASE}/tennis_wta/wta_matches_2026.csv`,
  },
};
const SOURCE_LABEL = 'tennis-data.co.uk · TennisCourtLog';

const TOP_N = 20;          // so viele Plätze in die Rangliste
const GERMANS_N = 6;       // so viele Deutsche in „Deutsche im Feld"
const SEARCH_N = 600;      // so viele Spieler je Tour in die Such-Datenbank

// ── kleine Helfer ─────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Abruf mit ein paar Wiederholungen – raw.githubusercontent.com liefert
// direkt nach einem Push gelegentlich kurz einen 404/„stale" zurück.
async function fetchText(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'aufschlag-tennis-dashboard' } });
      if (res.ok) return res.text();
      lastErr = new Error(`HTTP ${res.status} bei ${url}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < tries - 1) await sleep(700 * (i + 1));
  }
  throw lastErr;
}

// Sehr einfacher CSV-Parser (die Quell-CSVs haben keine Kommas in Feldern).
// Entfernt ein evtl. vorangestelltes BOM (die WTA-Datei hat eins).
function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

// Datum robust nach YYYYMMDD: „1998/5/5", „1997-04-20", „20260614" → „19980505" …
function toYmd(s) {
  s = (s || '').trim();
  if (/^\d{8}$/.test(s)) return s;
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (!m) return '';
  return m[1] + String(+m[2]).padStart(2, '0') + String(+m[3]).padStart(2, '0');
}

function ageFromDob(dob) {
  const ymd = toYmd(dob);
  if (ymd.length !== 8) return null;
  const y = +ymd.slice(0, 4), m = +ymd.slice(4, 6), d = +ymd.slice(6, 8);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 10 && age <= 60 ? age : null;
}

function fmtDate(v) {
  const ymd = toYmd(v);
  if (ymd.length !== 8) return v || '';
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

// Name für den Abgleich zwischen den Dateien normalisieren
// (Akzente weg, klein, nur Buchstaben/Ziffern + einfache Leerzeichen).
const norm = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Diakritika-Feinschliff fürs ANZEIGEN (die Quelle nutzt teils ASCII)
const NAME_FIX = {
  // ATP
  'Felix Auger Aliassime': 'Félix Auger-Aliassime',
  'Alex De Minaur': 'Alex de Minaur',
  'Jan Lennard Struff': 'Jan-Lennard Struff',
  'Jiri Lehecka': 'Jiří Lehečka',
  'Jakub Mensik': 'Jakub Menšík',
  // WTA
  'Iga Swiatek': 'Iga Świątek',
  'Karolina Muchova': 'Karolína Muchová',
  'Barbora Krejcikova': 'Barbora Krejčíková',
  'Linda Noskova': 'Linda Nosková',
  'Donna Vekic': 'Donna Vekić',
  'Sorana Cirstea': 'Sorana Cîrstea',
};
const fixName = (n) => NAME_FIX[n] || n;

// ── Spieler-Stammdaten → stabile ID (Sackmann-Schema, z. B. atp-100644) ─
// Die Rangliste-CSV hat keine player_id, die Match-CSV auch nicht – beide
// nennen nur Namen. players.csv liefert name → player_id (gleiche IDs wie
// früher). Bei Namensgleichheit über Geburtsdatum/Land eindeutig machen.
function buildPlayerIndex(playerCsv) {
  const idx = new Map();   // norm(name) -> [{ id, ymd, ioc }]
  for (const p of parseCSV(playerCsv)) {
    if (!p.player_id || !p.name) continue;
    const k = norm(p.name);
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push({ id: p.player_id, ymd: toYmd(p.dob), ioc: (p.ioc || '').toUpperCase() });
  }
  return idx;
}
function resolveId(idx, name, ioc, dob) {
  const cands = idx.get(norm(name));
  if (!cands || !cands.length) return 'n' + norm(name).replace(/\s+/g, '-'); // Fallback-ID aus dem Namen
  if (cands.length === 1) return cands[0].id;
  const ymd = toYmd(dob), io = (ioc || '').toUpperCase();
  let hit = ymd && cands.find((c) => c.ymd === ymd);          // exakt über Geburtsdatum
  if (hit) return hit.id;
  hit = io && cands.find((c) => c.ioc === io);                // sonst über Land
  if (hit) return hit.id;
  return cands.slice().sort((a, b) => (+b.id || 0) - (+a.id || 0))[0].id; // sonst neueste (höchste) ID
}

// ── eine Tour verarbeiten ─────────────────────────────────────
function buildTour(key, rankCsv, matchRows, playerIndex) {
  const rankRows = parseCSV(rankCsv).filter((r) => +r.rank > 0 && r.name);
  if (!rankRows.length) throw new Error('Rangliste leer');
  rankRows.sort((a, b) => +a.rank - +b.rank);

  // Daten-Stand + Punkte je RANG aus den Matches.
  // Die Rangliste-CSV selbst hat keine Punkte – die Match-CSV schon
  // (winner_rank_points / loser_rank_points). Wir ordnen die Punkte dem
  // RANG zu (nicht dem einzelnen Spieler): Rang↔Punkte ist zu jedem
  // Zeitpunkt monoton fallend, deshalb ergeben sich so saubere, glatt
  // fallende Werte – statt Ausreißern, wenn jemand zuletzt vor langer Zeit
  // (mit anderem Punktestand) gespielt hat.
  let latestMatchYmd = '';
  const rankObs = new Map();   // rank -> { points, ymd }  (jüngste Beobachtung)
  for (const r of matchRows) {
    const ymd = toYmd(r.tourney_date);
    if (ymd > latestMatchYmd) latestMatchYmd = ymd;
    for (const side of ['winner', 'loser']) {
      const rk = +r[side + '_rank'], pts = +r[side + '_rank_points'];
      if (!rk || !pts) continue;
      const prev = rankObs.get(rk);
      if (!prev || ymd >= prev.ymd) rankObs.set(rk, { points: pts, ymd });
    }
  }
  const updated = latestMatchYmd ? fmtDate(latestMatchYmd) : new Date().toISOString().slice(0, 10);
  // in eine monoton fallende Punkte-je-Rang-Tabelle gießen
  // (Lücken mit dem Wert des besseren Rangs füllen, Ausreißer kappen).
  const maxObsRank = rankObs.size ? Math.max(...rankObs.keys()) : 0;
  const pointsByRank = [];
  let carried = null;
  for (let R = 1; R <= maxObsRank; R++) {
    let v = rankObs.has(R) ? rankObs.get(R).points : carried;
    if (v == null) v = 0;
    if (carried != null && v > carried) v = carried;
    pointsByRank[R] = v;
    carried = v;
  }
  const pointsFor = (rank) => (rank > 0 && pointsByRank[rank] != null) ? pointsByRank[rank] : 0;

  const enriched = rankRows.map((r) => {
    const rawName = (r.name || '').trim();
    const country = (r.ioc || '').toUpperCase().slice(0, 3);
    return {
      rank: +r.rank,
      name: fixName(rawName),
      country,
      points: pointsFor(+r.rank),
      move: 0,                                   // wöchentliche Veränderung liefert die Quelle nicht
      age: ageFromDob(r.dob),
      de: country === 'GER',
      id: `${key}-${resolveId(playerIndex, rawName, country, r.dob)}`,
    };
  });

  const list = enriched.slice(0, TOP_N).map(({ id, ...e }) => e);   // Rangliste-Datei: ohne ID
  const germans = enriched.filter((e) => e.de).slice(0, GERMANS_N)
    .map((e) => ({ rank: e.rank, name: e.name, country: 'GER' }));
  const search = enriched.slice(0, SEARCH_N).map((e) => ({
    id: e.id, name: e.name, country: e.country, age: e.age,
    rank: e.rank, points: e.points, move: e.move, tour: key, wd: null,
  })).filter((e) => e.name && e.country);

  return { label: SOURCES[key].label, updated, source: SOURCE_LABEL, list, germans, search };
}

// ── Jüngste Match-Ergebnisse je Spieler ───────────────────────
const RESULTS_N = 3;       // so viele letzte Matches je Spieler
const ROUND_ORDER = { F: 8, BR: 7, SF: 6, QF: 5, R16: 4, RR: 4, R32: 3, R64: 2, R128: 1 };

// Turniergröße aus der Turnierkategorie ableiten (die Match-CSV hat kein
// draw_size). Damit werden die Runden-Namen korrekt – v. a. bei Grand Slams.
function drawSizeFor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('grand slam')) return 128;
  if (l.includes('1000') || l.includes('masters')) return 64;
  if (l.includes('500')) return 32;
  if (l.includes('250')) return 32;
  return 0;
}

// Deutsche Runden-Bezeichnung – RICHTIG je nach Turniergröße.
// (R32 ist bei Grand Slams die 3. Runde, bei einem 32er-Turnier die 1. Runde.)
function roundLabelDE(round, drawSize) {
  const fixed = { F: 'Finale', BR: 'Spiel um Platz 3', SF: 'Halbfinale', QF: 'Viertelfinale', RR: 'Gruppenphase' };
  if (fixed[round]) return fixed[round];
  const m = /^R(\d+)$/.exec(round || '');
  if (m) {
    const n = +m[1];                       // „Runde der letzten n"
    const ds = +drawSize || 0;
    const roundNum = ds ? Math.round(Math.log2(ds) - Math.log2(n)) + 1 : 0;
    if (n === 16 && (!ds || roundNum > 1)) return 'Achtelfinale';
    if (roundNum >= 1) return roundNum + '. Runde';
    return 'Runde';
  }
  return round || 'Runde';
}
// Ergebnis lesbar machen: W/O = kampflos, „… RET" = Aufgabe
function cleanScore(sc) {
  sc = (sc || '').trim();
  if (!sc) return '';
  if (/^w\/?o$/i.test(sc) || /walkover/i.test(sc) || /^(def|default)$/i.test(sc)) return 'kampflos';
  return sc.replace(/\s*(ret|def|default)\.?$/i, ' · Aufgabe').replace(/\s+/g, ' ');
}

function buildResults(key, search, matchRows) {
  if (!matchRows.length) return { results: {}, lastDate: null };
  // Matches nennen nur Namen → über den Namen auf die ID der Such-DB abbilden.
  const nameToId = new Map(search.map((p) => [norm(p.name), p.id]));
  const byId = {};
  for (const r of matchRows) {
    const ds = drawSizeFor(r.tourney_level);
    const ymd = toYmd(r.tourney_date);
    for (const [me, opp] of [['winner', 'loser'], ['loser', 'winner']]) {
      const id = nameToId.get(norm(r[me + '_name']));
      if (!id) continue;
      (byId[id] = byId[id] || []).push({
        d: ymd, t: (r.tourney_name || '').trim(), s: r.surface || '',
        round: r.round || '', ds, o: fixName((r[opp + '_name'] || '').trim()),
        w: me === 'winner' ? 1 : 0, sc: cleanScore(r.score),
      });
    }
  }
  const sortKey = (m) => (m.d || '') + String(ROUND_ORDER[m.round] || 0).padStart(2, '0');
  const results = {};
  let lastDate = null;
  for (const id in byId) {
    const arr = byId[id].sort((a, b) => sortKey(b).localeCompare(sortKey(a))).slice(0, RESULTS_N)
      .map((m) => ({ d: m.d, t: m.t, s: m.s, r: roundLabelDE(m.round, m.ds), o: m.o, w: m.w, sc: m.sc }));
    if (arr.length) { results[id] = arr; if (!lastDate || arr[0].d > lastDate) lastDate = arr[0].d; }
  }
  return { results, lastDate };
}

// ── Hauptlauf ─────────────────────────────────────────────────
async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  let ok = 0;
  let searchPlayers = [];
  let searchUpdated = null;
  let allResults = {};
  let resultsDate = null;
  for (const key of Object.keys(SOURCES)) {
    try {
      const src = SOURCES[key];
      const [rankCsv, playerCsv, matchCsv] = await Promise.all([
        fetchText(src.rankings),
        fetchText(src.players),
        fetchText(src.matches).catch((e) => { console.error(`  ⚠ ${key.toUpperCase()} Match-Daten nicht ladbar: ${e.message}`); return ''; }),
      ]);
      const playerIndex = buildPlayerIndex(playerCsv);
      const matchRows = matchCsv ? parseCSV(matchCsv) : [];

      const data = buildTour(key, rankCsv, matchRows, playerIndex);
      const { search, ...rankingData } = data;   // search nicht in die Rangliste-Datei
      await writeFile(join(DATA_DIR, `rankings-${key}.json`), JSON.stringify(rankingData, null, 2) + '\n', 'utf8');
      searchPlayers = searchPlayers.concat(search);
      searchUpdated = data.updated;
      console.log(`✓ ${key.toUpperCase()}: Top ${data.list.length} + Such-DB ${search.length}, Stand ${data.updated}, #1 ${data.list[0]?.name}`);
      ok++;

      // Jüngste Match-Ergebnisse (für die verfolgbaren Spieler:innen)
      const { results, lastDate } = buildResults(key, search, matchRows);
      allResults = Object.assign(allResults, results);
      if (lastDate && (!resultsDate || lastDate > resultsDate)) resultsDate = lastDate;
      console.log(`  ↳ Ergebnisse für ${Object.keys(results).length} Spieler:innen (Stand ${lastDate ? fmtDate(lastDate) : '—'})`);
    } catch (e) {
      console.error(`✗ ${key.toUpperCase()} fehlgeschlagen: ${e.message} – alte Datei bleibt erhalten.`);
    }
  }

  // Gemeinsame, durchsuchbare Spieler-Datenbank (ATP + WTA)
  if (searchPlayers.length) {
    await writeFile(
      join(DATA_DIR, 'players-search.json'),
      JSON.stringify({ updated: searchUpdated, count: searchPlayers.length, players: searchPlayers }) + '\n',
      'utf8'
    );
    console.log(`✓ Such-Datenbank: ${searchPlayers.length} Spieler:innen`);
  }

  // Jüngste Ergebnisse
  if (Object.keys(allResults).length) {
    await writeFile(
      join(DATA_DIR, 'recent-results.json'),
      JSON.stringify({ updated: resultsDate ? fmtDate(resultsDate) : null, results: allResults }) + '\n',
      'utf8'
    );
    console.log(`✓ Jüngste Ergebnisse: ${Object.keys(allResults).length} Spieler:innen, Stand ${resultsDate ? fmtDate(resultsDate) : '—'}`);
  }

  if (!ok) { console.error('Keine Tour aktualisiert.'); process.exit(1); }
}

main();
