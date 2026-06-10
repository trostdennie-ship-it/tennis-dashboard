/* =================================================================
   update-rankings.mjs
   -----------------------------------------------------------------
   Holt die aktuelle ATP- & WTA-Weltrangliste und schreibt sie als
   kleine JSON-Dateien (data/rankings-atp.json, data/rankings-wta.json),
   die die App dann blitzschnell lädt.

   Quelle: Jeff Sackmanns offene Tennis-Datensätze auf GitHub
   (github.com/JeffSackmann) – kostenlos, ohne Schlüssel, seit Jahren
   gepflegt, täglich aktualisiert.

   • Läuft per GitHub Action 1×/Tag automatisch (siehe
     .github/workflows/update-rankings.yml).
   • Lässt sich auch lokal ausführen:  node scripts/update-rankings.mjs
   • Braucht KEINE Installation (nur Node 18+; nutzt eingebautes fetch).

   Robust: Schlägt ein Abruf fehl, bleibt die zuletzt gute Datei stehen
   (die Datei wird nur bei Erfolg überschrieben). Die App fällt zusätzlich
   auf die eingebauten Demo-Daten zurück.
   ================================================================= */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');

const SOURCES = {
  atp: {
    label: 'ATP Herren',
    rankings: 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_rankings_current.csv',
    players:  'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv',
    matches:  'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_2026.csv',
  },
  wta: {
    label: 'WTA Damen',
    rankings: 'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_rankings_current.csv',
    players:  'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_players.csv',
    matches:  'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_matches_2026.csv',
  },
};

const TOP_N = 20;          // so viele Plätze in die Rangliste
const GERMANS_N = 6;       // so viele Deutsche in „Deutsche im Feld"
const SEARCH_N = 600;      // so viele Spieler je Tour in die Such-Datenbank

// ── kleine Helfer ─────────────────────────────────────────────
async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'aufschlag-tennis-dashboard' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
  return res.text();
}

// Sehr einfacher CSV-Parser (Sackmann-CSVs haben keine Kommas in Feldern)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

function ageFromDob(dob) {
  if (!dob || dob.length < 8) return null;
  const y = +dob.slice(0, 4), m = +dob.slice(4, 6), d = +dob.slice(6, 8);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 10 && age <= 60 ? age : null;
}

function fmtDate(yyyymmdd) {
  // 20260608 -> 2026-06-08
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

// Diakritika-Feinschliff für die wichtigsten Namen (Sackmann nutzt teils ASCII)
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

// ── eine Tour verarbeiten ─────────────────────────────────────
async function buildTour(key) {
  const src = SOURCES[key];
  const [rankCsv, playerCsv] = await Promise.all([fetchText(src.rankings), fetchText(src.players)]);

  const rankRows = parseCSV(rankCsv);
  if (!rankRows.length) throw new Error('Rangliste leer');

  // neuestes & vorheriges Datum bestimmen
  const dates = [...new Set(rankRows.map(r => r.ranking_date))].filter(Boolean).sort();
  const latest = dates[dates.length - 1];
  const prev = dates[dates.length - 2];

  const cur = rankRows.filter(r => r.ranking_date === latest);
  const prevMap = new Map(rankRows.filter(r => r.ranking_date === prev).map(r => [r.player, +r.rank]));

  // Spieler-Stammdaten als Map (nur was wir brauchen)
  const players = new Map();
  for (const p of parseCSV(playerCsv)) {
    if (p.player_id) players.set(p.player_id, p);
  }

  const toEntry = (r) => {
    const p = players.get(r.player) || {};
    const name = fixName(`${(p.name_first || '').trim()} ${(p.name_last || '').trim()}`.trim()) || `#${r.player}`;
    const country = (p.ioc || '').toUpperCase().slice(0, 3);
    const prevRank = prevMap.get(r.player);
    return {
      rank: +r.rank,
      name,
      country,
      points: +r.points || 0,
      move: prevRank ? prevRank - +r.rank : 0,
      age: ageFromDob(p.dob),
      de: country === 'GER',
    };
  };

  const sorted = [...cur].sort((a, b) => +a.rank - +b.rank);
  const list = sorted.slice(0, TOP_N).map(toEntry);

  // Deutsche im Feld (auch außerhalb Top 20)
  const germans = sorted
    .map(toEntry)
    .filter(e => e.country === 'GER')
    .slice(0, GERMANS_N)
    .map(e => ({ rank: e.rank, name: e.name, country: 'GER' }));

  // Durchsuchbare Spieler-Datenbank (Top SEARCH_N) – fürs Suchen & Verfolgen
  const search = sorted.slice(0, SEARCH_N).map((r) => {
    const p = players.get(r.player) || {};
    const name = fixName(`${(p.name_first || '').trim()} ${(p.name_last || '').trim()}`.trim());
    const prevRank = prevMap.get(r.player);
    return {
      id: `${key}-${r.player}`,           // stabile ID fürs Verfolgen
      name: name || `#${r.player}`,
      country: (p.ioc || '').toUpperCase().slice(0, 3),
      age: ageFromDob(p.dob),
      rank: +r.rank,
      points: +r.points || 0,
      move: prevRank ? prevRank - +r.rank : 0,
      tour: key,
      wd: (p.wikidata_id || '').trim() || null,   // Wikidata-ID für Wikipedia-Link
    };
  }).filter(e => e.name && e.country);

  return {
    label: src.label,
    updated: fmtDate(latest),
    source: 'Jeff Sackmann / GitHub',
    list,
    germans,
    search,
  };
}

// ── Jüngste Match-Ergebnisse je Spieler ───────────────────────
const RESULTS_N = 3;       // so viele letzte Matches je Spieler
const ROUND_ORDER = { F: 8, BR: 7, SF: 6, QF: 5, R16: 4, RR: 4, R32: 3, R64: 2, R128: 1 };

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

async function buildResults(key, search) {
  const src = SOURCES[key];
  let rows;
  try { rows = parseCSV(await fetchText(src.matches)); }
  catch (e) { console.error(`  ⚠ ${key} Match-Daten nicht ladbar: ${e.message}`); return { results: {}, lastDate: null }; }
  if (!rows.length) return { results: {}, lastDate: null };

  const want = new Set(search.map(p => p.id.split('-')[1]));   // rohe player_ids
  const byPlayer = {};
  for (const r of rows) {
    [['winner', 'loser'], ['loser', 'winner']].forEach(([me, opp]) => {
      const pid = r[me + '_id'];
      if (!pid || !want.has(pid)) return;
      (byPlayer[pid] = byPlayer[pid] || []).push({
        d: r.tourney_date, t: (r.tourney_name || '').trim(), s: r.surface || '',
        round: r.round || '', ds: r.draw_size, o: fixName((r[opp + '_name'] || '').trim()),
        w: me === 'winner' ? 1 : 0, sc: cleanScore(r.score),
      });
    });
  }
  const sortKey = (m) => (m.d || '') + String(ROUND_ORDER[m.round] || 0).padStart(2, '0');
  const results = {};
  let lastDate = null;
  for (const pid in byPlayer) {
    const arr = byPlayer[pid].sort((a, b) => sortKey(b).localeCompare(sortKey(a))).slice(0, RESULTS_N)
      .map(m => ({ d: m.d, t: m.t, s: m.s, r: roundLabelDE(m.round, m.ds), o: m.o, w: m.w, sc: m.sc }));
    if (arr.length) { results[`${key}-${pid}`] = arr; if (!lastDate || arr[0].d > lastDate) lastDate = arr[0].d; }
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
      const data = await buildTour(key);
      const { search, ...rankingData } = data;   // search nicht in die Rangliste-Datei
      await writeFile(join(DATA_DIR, `rankings-${key}.json`), JSON.stringify(rankingData, null, 2) + '\n', 'utf8');
      searchPlayers = searchPlayers.concat(search);
      searchUpdated = data.updated;
      console.log(`✓ ${key.toUpperCase()}: Top ${data.list.length} + Such-DB ${search.length}, Stand ${data.updated}, #1 ${data.list[0]?.name}`);
      ok++;
      // Jüngste Match-Ergebnisse (für die verfolgbaren Spieler)
      const { results, lastDate } = await buildResults(key, search);
      allResults = Object.assign(allResults, results);
      if (lastDate && (!resultsDate || lastDate > resultsDate)) resultsDate = lastDate;
      console.log(`  ↳ Ergebnisse für ${Object.keys(results).length} Spieler:innen (Stand ${lastDate || '—'})`);
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
