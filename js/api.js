/* =================================================================
   Daten-Schicht  ·  window.TennisData
   -----------------------------------------------------------------
   Liefert die Weltrangliste (ATP & WTA) an die App – aus drei Quellen,
   in dieser Reihenfolge:
     1. Tagesfrische Dateien  data/rankings-atp.json / -wta.json
        (werden 1×/Tag automatisch erzeugt – siehe scripts/ + GitHub Action)
     2. Cache  (zuletzt geladene Daten, localStorage – auch offline)
     3. Demo   (eingebaute Beispieldaten aus data.js)

   Das Beste daran: KEIN API-Schlüssel nötig. Die JSON-Dateien liegen
   direkt neben der App (gleiche Adresse) – also kein CORS, kein Login,
   keine Kosten. Und die App stürzt nie ab: Fehlt eine Datei oder ist man
   offline, greifen Cache bzw. Demo, und es erscheint der Hinweis
   „Daten ggf. nicht aktuell".
   ================================================================= */
(function () {
  const T = window.TENNIS;
  const CACHE_KEY = 'aufschlag.cache.rankings.v2';
  const FILES = { atp: 'data/rankings-atp.json', wta: 'data/rankings-wta.json' };

  // Demo-Daten aus data.js ins einheitliche Format bringen (Fallback)
  function demoFor(tour) {
    const r = T.RANKINGS[tour];
    return {
      label: r.label, updated: r.updated, source: 'Demo',
      list: r.list,
      germans: (T.GERMANS[tour] || []).map(g => ({ rank: g.rank, name: g.name, country: g.country })),
    };
  }

  const state = {
    rankings: { atp: demoFor('atp'), wta: demoFor('wta') },
    source: 'demo',        // 'demo' | 'cache' | 'live'
    updatedAt: null,       // Date des Daten-Stands
    loading: false,
    error: null,
  };

  // Durchsuchbare Spieler-Datenbank (für Suche & Verfolgen)
  let playerDB = null;        // { updated, players:[], byId:Map }
  let playerDBError = null;
  let resultsDB = null;       // { updated, results: {id:[matches]} }

  const subs = new Set();
  function notify() { subs.forEach(fn => { try { fn(status()); } catch (e) {} }); }
  function status() {
    return { source: state.source, updatedAt: state.updatedAt, loading: state.loading, error: state.error };
  }

  // ── Cache (localStorage) ──────────────────────────────────────
  function readCache() {
    try { const o = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return (o && o.savedAt && o.data) ? o : null; }
    catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data })); } catch (e) {}
  }

  // ── Abruf der JSON-Dateien ────────────────────────────────────
  function fetchJSON(url, ms = 9000) {
    const c = new AbortController();
    const id = setTimeout(() => c.abort(), ms);
    return fetch(url, { signal: c.signal, cache: 'no-store', headers: { accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(() => clearTimeout(id));
  }
  const valid = (d) => d && Array.isArray(d.list) && d.list.length > 0 && d.list[0] && d.list[0].name;

  function normalize(d, tour) {
    return {
      label: d.label || T.RANKINGS[tour].label,
      updated: d.updated,
      source: d.source || 'Live',
      list: d.list,
      germans: Array.isArray(d.germans) ? d.germans : [],
    };
  }

  async function load() {
    state.loading = true; state.error = null; notify();
    try {
      const [atp, wta] = await Promise.allSettled([fetchJSON(FILES.atp), fetchJSON(FILES.wta)]);
      const next = { atp: state.rankings.atp, wta: state.rankings.wta };
      let ok = false, newest = null;
      if (atp.status === 'fulfilled' && valid(atp.value)) { next.atp = normalize(atp.value, 'atp'); ok = true; newest = next.atp.updated || newest; }
      if (wta.status === 'fulfilled' && valid(wta.value)) { next.wta = normalize(wta.value, 'wta'); ok = true; newest = next.wta.updated || newest; }
      if (!ok) throw new Error('keine Ranglisten-Datei ladbar');
      state.rankings = next;
      state.source = 'live';
      state.updatedAt = newest ? new Date(newest + 'T00:00:00') : new Date();
      writeCache(next);
    } catch (e) {
      state.error = (e && e.message) || 'Fehler';
      // Zustand bleibt auf Cache/Demo – kein Absturz.
    } finally {
      state.loading = false; notify();
    }
    return status();
  }

  function init() {
    // 1) Cache sofort anzeigen (auch offline)
    const c = readCache();
    if (c) {
      try {
        state.rankings = c.data;
        state.source = 'cache';
        const u = (c.data.atp && c.data.atp.updated) || (c.data.wta && c.data.wta.updated);
        state.updatedAt = u ? new Date(u + 'T00:00:00') : new Date(c.savedAt);
      } catch (e) {}
    }
    // 2) Immer frisch versuchen (kostenlos, kein Schlüssel)
    load();
    loadPlayerDB();   // Spieler-Such-DB im Hintergrund laden (klein)
    notify();
  }

  // ── Spieler-Datenbank (Suche & Verfolgen) ─────────────────────
  async function loadPlayerDB() {
    if (playerDB) return playerDB;
    try {
      const d = await fetchJSON('data/players-search.json', 12000);
      if (d && Array.isArray(d.players) && d.players.length) {
        playerDB = { updated: d.updated, players: d.players, byId: new Map(d.players.map(p => [p.id, p])) };
        playerDBError = null;
        notify();
      }
    } catch (e) { playerDBError = (e && e.message) || 'Fehler'; }
    return playerDB;
  }
  // diakritik-unempfindlich: "João" == "Joao", "Świątek" == "Swiatek"
  function norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function searchPlayers(q, limit = 14) {
    if (!playerDB) return [];
    const nq = norm(String(q).trim());
    if (!nq) return [];
    return playerDB.players
      .filter(p => norm(p.name).includes(nq))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit);
  }
  function youngRisers(maxRank = 150, limit = 12) {
    if (!playerDB) return [];
    return playerDB.players
      .filter(p => p.rank <= maxRank && p.age)
      .sort((a, b) => (a.age - b.age) || (a.rank - b.rank))
      .slice(0, limit);
  }
  function getPlayerById(id) { return playerDB ? playerDB.byId.get(id) || null : null; }
  function playerDBStatus() {
    return { loaded: !!playerDB, error: playerDBError, count: playerDB ? playerDB.players.length : 0 };
  }

  // ── Jüngste Match-Ergebnisse (lazy geladen) ───────────────────
  async function loadResults() {
    if (resultsDB) return resultsDB;
    try {
      const d = await fetchJSON('data/recent-results.json', 12000);
      if (d && d.results) { resultsDB = d; notify(); }
    } catch (e) { /* still: App läuft auch ohne Ergebnisse */ }
    return resultsDB;
  }
  function getResults(id) { return resultsDB ? (resultsDB.results[id] || null) : null; }
  function resultsUpdated() { return resultsDB ? resultsDB.updated : null; }

  // Relative Zeitangabe „vor X" (deutsch)
  function timeAgo(date) {
    if (!date) return null;
    const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    if (sec < 90) return 'gerade eben';
    const min = Math.round(sec / 60);
    if (min < 60) return `vor ${min} Min.`;
    const std = Math.round(min / 60);
    if (std < 24) return `vor ${std} Std.`;
    const tg = Math.round(std / 24);
    return tg === 1 ? 'gestern' : `vor ${tg} Tagen`;
  }

  window.TennisData = {
    init,
    refresh: load,
    status,
    timeAgo,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    getRankings(tour) { return state.rankings[tour] || demoFor(tour); },
    // Spieler-Suche & Verfolgen
    loadPlayerDB,
    searchPlayers,
    youngRisers,
    getPlayerById,
    playerDBStatus,
    // Jüngste Ergebnisse
    loadResults,
    getResults,
    resultsUpdated,
  };
})();
