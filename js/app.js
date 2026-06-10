/* =================================================================
   App  ·  baut alle Bildschirme, die Tab-Leiste und die Einstellungen
   -----------------------------------------------------------------
   Reines Vanilla-JavaScript – kein Framework, kein Build-Schritt.
   Daten kommen aus  window.TennisData  (Live/Cache/Demo), Icons aus
   window.Ic. Beläge, Farben & Abstände stecken in css/styles.css.
   ================================================================= */
(function () {
  const T = window.TENNIS;
  const H = T.helpers;

  // ── kleiner DOM-Helfer ────────────────────────────────────────
  // el('div', {class:'x', onClick:fn}, kind1, kind2, [liste, ...])
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else n.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return n;
  }
  function ic(name, opts, cls) {
    const s = el('span', cls ? { class: cls } : null);
    s.style.display = 'inline-flex';
    s.innerHTML = Ic[name](opts || {});
    return s;
  }
  function withAlpha(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const isDark = () => settings.theme === 'dark';
  const gradClass = (s) => 'surf-' + s;     // surf-grass | surf-clay | surf-hard
  const dotClass = (s) => 'dot-' + s;
  const flagDE = (country) => country === 'GER'
    ? el('span', { class: 'flag-de', title: 'Deutschland' }, '🇩🇪') : null;

  // ── Einstellungen (localStorage) ──────────────────────────────
  const SETTINGS_KEY = 'aufschlag.settings';
  const FONT_MAP = { 'Normal': 1, 'Groß': 1.08, 'Sehr groß': 1.16 };
  function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } }
  function saveSettings() { try { settings.featured = featured; localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }

  let settings = loadSettings();
  let featured = Array.isArray(settings.featured) ? settings.featured.slice() : T.DEFAULT_FEATURED.slice();
  let activeTab = 'today';
  let rankTour = 'atp';
  let scheduleSel = null;
  let liveInstance = null;
  let mainEl, tabbarEl;

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark() ? 'dark' : 'light');
    const mc = document.getElementById('meta-theme-color');
    if (mc) mc.setAttribute('content', isDark() ? '#0e1f16' : '#eef1ea');
  }
  function applyFont() {
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale || 1));
  }
  function fontLabel() { return Object.keys(FONT_MAP).find(k => FONT_MAP[k] === (settings.fontScale || 1)) || 'Normal'; }

  // ── Talente verfolgen (kuratiert + selbst gesucht) ────────────
  function trackedMeta() { return settings.trackedMeta || (settings.trackedMeta = {}); }
  function isTracked(id) { return featured.includes(id); }
  function track(p) {
    if (!featured.includes(p.id)) featured = featured.concat(p.id);
    if (!T.PLAYERS.some(c => c.id === p.id)) {  // selbst gesuchter Spieler → Basisdaten merken
      trackedMeta()[p.id] = { name: p.name, country: p.country, tour: p.tour, age: p.age || null, wd: p.wd || null, rank: p.rank || null };
    }
    saveSettings();
  }
  function untrack(id) {
    featured = featured.filter(x => x !== id);
    if (settings.trackedMeta) delete settings.trackedMeta[id];
    saveSettings();
  }
  function toggleTrack(p) { isTracked(p.id) ? untrack(p.id) : track(p); }

  const normName = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function dbByName(name) {
    const hits = window.TennisData.searchPlayers(name, 6);
    return hits.find(h => normName(h.name) === normName(name)) || null;
  }
  function wikiLink(p) {
    if (p.wd) return 'https://www.wikidata.org/wiki/Special:GoToLinkedPage/dewiki/' + p.wd;
    return 'https://de.wikipedia.org/w/index.php?search=' + encodeURIComponent(p.name + ' Tennis');
  }
  // DB-Spieler → Anzeige-Objekt
  function displayDB(p) {
    return { id: p.id, dbId: p.id, name: p.name, country: p.country, age: p.age, rank: p.rank, move: p.move,
             tour: p.tour, wd: p.wd, initials: H.initialsOf(p.name), curated: false };
  }
  // kuratiertes Talent → Anzeige-Objekt (mit Live-Daten, falls DB geladen)
  function displayCurated(c) {
    const live = dbByName(c.name);
    return { id: c.id, dbId: live ? live.id : null, name: c.name, country: c.country, age: c.age,
             rank: live ? live.rank : c.rank, move: live ? live.move : null,
             tour: c.tour, wd: live ? live.wd : null, tag: c.tag, note: c.note,
             initials: c.initials, curated: true };
  }
  // verfolgte ID → Anzeige-Objekt
  function displayTracked(id) {
    const c = T.PLAYERS.find(p => p.id === id);
    if (c) return displayCurated(c);
    const live = window.TennisData.getPlayerById(id);
    if (live) return displayDB(live);
    const m = trackedMeta()[id];
    if (m && m.name) return { id, dbId: id, name: m.name, country: m.country, age: m.age, rank: m.rank, move: null,
                              tour: m.tour, wd: m.wd, initials: H.initialsOf(m.name), curated: false };
    return null;
  }

  // ── wiederkehrende Bausteine ──────────────────────────────────
  function label(text, extra) { return el('div', { class: 'label' + (extra ? ' ' + extra : '') }, text); }

  function avatar(initials, o = {}) {
    const size = o.size || 44;
    return el('div', {
      class: 'avatar' + (o.accent ? ' avatar--accent' : ''),
      style: `width:${size}px;height:${size}px;font-size:${(size * 0.34).toFixed(1)}px`,
    }, initials);
  }
  function countryBadge(code, extra) { return el('span', { class: 'country' + (extra ? ' ' + extra : '') }, code); }

  function broadcastTag(b, full) {
    return el('span', {
      class: 'broadcast' + (full ? ' broadcast--full' : ''),
      style: `background:${withAlpha(b.tone, isDark() ? 0.16 : 0.12)};border-color:${withAlpha(b.tone, 0.4)}`,
    },
      el('span', { class: 'broadcast__dot', style: `background:${b.tone}` }),
      el('span', { class: 'broadcast__name' }, b.name),
      full ? el('span', { class: 'broadcast__kind' }, '· ' + b.kind) : null);
  }

  function moveBadge(move) {
    if (!move) return el('span', { class: 'move move--none' }, '–');
    const up = move > 0;
    return el('span', { class: 'move ' + (up ? 'move--up' : 'move--down') },
      ic(up ? 'arrowUp' : 'arrowDown', { size: 11, sw: 2.4 }), String(Math.abs(move)));
  }

  function section(title, opts, ...kids) {
    opts = opts || {};
    const head = el('div', { class: 'section__head' },
      label(title),
      opts.action ? el('button', { class: 'section__action', onClick: opts.onAction },
        opts.action, ic('chevron', { size: 14, sw: 2.2 })) : null);
    return el('div', { class: 'section', style: opts.style || null }, head, kids);
  }

  function settingsBtn() {
    return el('button', { class: 'icon-btn', 'aria-label': 'Einstellungen', onClick: openSettings }, ic('gear', { size: 22 }));
  }

  // ── „So funktioniert die App"-Kästchen (einmalig, dann ausblendbar) ──
  function dismissHelp() { settings.helpDismissed = true; saveSettings(); rerender(false); }
  function helpItem(icon, ...content) {
    return el('li', { class: 'help-item' }, ic(icon, { size: 18 }, 'help-item__icon'), el('span', null, content));
  }
  function helpCard() {
    if (settings.helpDismissed) return null;
    return el('div', { class: 'section', style: 'margin-top:18px' },
      el('div', { class: 'help-card' },
        el('div', { class: 'help-card__head' },
          el('span', { class: 'help-card__title' }, '👋 So funktioniert deine App'),
          el('button', { class: 'help-card__close', 'aria-label': 'Schließen', onClick: dismissHelp }, ic('x', { size: 18 }))),
        el('ul', { class: 'help-card__list' },
          helpItem('today', el('strong', null, 'Heute'), ' – nächstes Grand Slam, wo es läuft & deine Talente'),
          helpItem('live', el('strong', null, 'Live'), ' – Spielstände (Beispiel, gerade kein Turnier aktiv)'),
          helpItem('ranking', el('strong', null, 'Rangliste'), ' – ATP & WTA, jede Nacht aktualisiert'),
          helpItem('schedule', el('strong', null, 'Spielplan'), ' – Termine & Runden der vier Grand Slams'),
          helpItem('players', el('strong', null, 'Talente'), ' – ✨ neu: Spieler:innen ', el('strong', null, 'suchen, verfolgen'), ' & letzte Ergebnisse sehen')),
        el('button', { class: 'help-card__ok', onClick: dismissHelp }, 'Verstanden')));
  }

  // ── HERO (nächstes Turnier) ───────────────────────────────────
  function hero(slam) {
    const days = H.daysUntil(slam.start);
    const live = H.slamStatus(slam) === 'live';
    return el('div', { class: 'hero' },
      label('Nächstes Grand Slam'),
      el('div', { class: 'hero__card ' + gradClass(slam.surface) },
        el('div', { class: 'hero__top' },
          el('div', null,
            el('div', { class: 'hero__name' }, slam.name),
            el('div', { class: 'hero__venue' }, slam.venue)),
          el('div', { class: 'hero__count' },
            el('div', { class: 'hero__days' }, live ? '·' : String(days)),
            el('div', { class: 'hero__days-label' }, live ? 'live' : (days === 1 ? 'Tag' : 'Tage')))),
        el('div', { class: 'hero__meta' },
          el('span', null, ic('calendar', { size: 15 }), H.fmtRange(slam.start, slam.end)),
          el('span', null, el('span', { class: 'surface-dot' }), slam.surfaceLabel),
          slam.provisional ? el('span', { class: 'provisional-tag' }, 'Termin vorläufig') : null)));
  }

  // ── Daten-Hinweis (dezent) ────────────────────────────────────
  function dataBanner() {
    const st = window.TennisData.status();
    // Echte Daten (frisch oder aus Cache) oder gerade am Laden → kein Hinweis.
    if (st.source === 'live' || st.source === 'cache' || st.loading) return null;
    // Nur echter Demo-Fallback: Rangliste ließ sich nicht laden.
    return el('div', { class: 'data-banner' },
      el('span', null, el('strong', null, 'Daten ggf. nicht aktuell.'),
        ' Beispiel-Rangliste – echte Daten konnten gerade nicht geladen werden.'),
      el('button', { class: 'data-banner__refresh', onClick: () => doRefresh() },
        ic('refresh', { size: 14 }), 'Erneut'));
  }
  async function doRefresh() { await window.TennisData.refresh(); /* notify → re-render */ }

  // ── 1 · HEUTE ─────────────────────────────────────────────────
  function homeScreen() {
    const slams = T.SLAMS;
    const next = H.nextSlam(slams);
    const bcasts = next.broadcasters.map(k => T.BROADCASTERS[k]);
    const finished = slams.find(s => s.done);
    const talents = featured.map(displayTracked).filter(Boolean);
    const upcoming = slams.filter(s => H.slamStatus(s) !== 'done' && s.id !== next.id)
      .sort((a, b) => H.parse(a.start) - H.parse(b.start)).slice(0, 5);
    const firstRound = next.rounds && next.rounds[0];
    const final = next.rounds && next.rounds[next.rounds.length - 1];

    const head = el('div', { class: 'screen-head' },
      el('div', { class: 'screen-head__row' },
        el('div', { class: 'wordmark' },
          ic('ball', { size: 20, sw: 1.7 }, 'wordmark__icon'),
          el('span', { class: 'wordmark__text' }, 'Aufschlag')),
        el('div', { class: 'head-actions' }, settingsBtn())));

    // Wo zu sehen
    const watch = section('Wo zu sehen', null,
      el('div', { class: 'card' },
        el('div', { class: 'watch__head' },
          ic('tv', { size: 22 }, 'watch__icon'),
          el('div', { class: 'watch__text' }, 'In Deutschland überträgt ' + bcasts.map(b => b.name).join(' & '))),
        el('div', { class: 'watch__tags' }, bcasts.map(b => broadcastTag(b, true))),
        bcasts[0] ? el('div', { class: 'watch__note' }, bcasts[0].note) : null));

    // Spielplan-Vorschau
    const preview = (firstRound && final) ? section('Wie & wann gespielt wird',
      { action: 'Voller Spielplan', onAction: () => goto('schedule') },
      el('div', { class: 'card card--flush' }, [firstRound, final].map((r, i) => dateRow(r, i === 1)))) : null;

    // Meine Talente (verfolgte Spieler:innen)
    const talentsSec = section('Meine Talente', { action: 'Suchen & verwalten', onAction: () => goto('players') },
      talents.length
        ? el('div', { class: 'talent-scroll' }, talents.map(talentCard))
        : el('div', { class: 'card', style: 'color:var(--ink-soft);font-size:13.5px;line-height:1.45' },
            'Noch niemand verfolgt. Tippe unten auf „Talente" und such dir Spieler:innen aus – sie erscheinen dann hier.'));

    // Gerade beendet
    const finishedSec = finished ? section('Gerade beendet', null,
      el('div', { class: 'card finished' },
        el('div', { class: 'finished__badge ' + gradClass(finished.surface) }, ic('trophy', { size: 24 })),
        el('div', { style: 'flex:1' },
          el('div', { class: 'finished__slam' }, finished.name + ' · ' + finished.city),
          el('div', { class: 'finished__champ' }, finished.championM, ' ', flagDE('GER')),
          el('div', { class: 'finished__note' }, finished.championNote),
          finished.championW ? el('div', { class: 'finished__note', style: 'margin-top:6px' },
            'Damen-Siegerin: ' + finished.championW) : null))) : null;

    // Weitere Termine
    const moreSec = upcoming.length ? section('Weitere Termine', null,
      el('div', { class: 'card card--flush' }, upcoming.map(s =>
        el('div', { class: 'slam-row', onClick: () => goto('schedule') },
          el('span', { class: 'slam-row__dot ' + dotClass(s.surface) }),
          el('div', { class: 'slam-row__main' },
            el('div', { class: 'slam-row__name' }, s.name),
            el('div', { class: 'slam-row__sub' }, s.city + ' · ' + s.surfaceLabel + (s.provisional ? ' · vorläufig' : ''))),
          el('div', { class: 'slam-row__date' }, H.fmtDate(s.start)),
          ic('chevron', { size: 16 }, 'slam-row__chev'))))) : null;

    return screenWrap(head, hero(next), dataBanner(), helpCard(), watch, preview, talentsSec, finishedSec, moreSec);
  }

  function dateRow(r, isFinal) {
    const dt = H.parse(r.d);
    return el('div', { class: 'row' },
      el('div', { class: 'row__date' },
        el('div', { class: 'row__day' }, dt.getDate() + '.'),
        el('div', { class: 'row__mon' }, H.MONTHS[dt.getMonth()])),
      el('div', { class: 'row__vline' }),
      el('div', { class: 'row__main' },
        el('div', { class: 'row__title' }, r.label),
        el('div', { class: 'row__note' }, r.note)),
      isFinal ? ic('trophy', { size: 20 }, 'row__trophy') : null);
  }

  function talentCard(p) {
    return el('div', { class: 'card card--tap talent-card', style: 'padding:14px', onClick: () => goto('players') },
      el('div', { class: 'talent-card__top' },
        avatar(p.initials, { size: 42, accent: true }),
        p.rank ? el('span', { class: 'talent-card__rank' }, '#' + p.rank) : null),
      el('div', { class: 'talent-card__name' }, p.name),
      el('div', { class: 'talent-card__meta' },
        countryBadge(p.country), flagDE(p.country),
        p.age ? el('span', { class: 'talent-card__age' }, p.age + ' J.') : null),
      el('div', { class: 'talent-card__tag' }, p.tag || (p.move > 0 ? '↑ im Aufwind' : 'wird verfolgt')));
  }

  // ── 2 · WELTRANGLISTE (ATP & WTA) ─────────────────────────────
  function rankingScreen() {
    const data = window.TennisData.getRankings(rankTour);
    const list = data.list;
    const top = list[0].points;
    const podium = list.slice(0, 3);
    const rest = list.slice(3);
    const germans = (data.germans && data.germans.length) ? data.germans : (T.GERMANS[rankTour] || []);

    const head = el('div', { class: 'screen-head' },
      el('div', { class: 'screen-head__row' },
        el('div', null,
          el('div', { class: 'screen-title' }, 'Weltrangliste'),
          el('div', { class: 'screen-sub' }, data.label + ' · Stand ' + H.fmtDate(data.updated, { year: true }))),
        settingsBtn()),
      el('div', { class: 'segment' }, ['atp', 'wta'].map(tk =>
        el('button', { class: 'segment__btn' + (rankTour === tk ? ' is-on' : ''), onClick: () => { rankTour = tk; rerender(); } },
          T.RANKINGS[tk].label))));

    // Podest (Reihenfolge 2 · 1 · 3)
    const podHeights = [92, 116, 76];
    const podium3 = el('div', { class: 'podium' }, [1, 0, 2].map(idx => {
      const p = podium[idx]; const first = idx === 0; const de = p.de || p.country === 'GER';
      return el('div', { class: 'podium__col' },
        avatar(H.initialsOf(p.name), { size: first ? 56 : 46, accent: first }),
        el('div', { class: 'podium__name' }, p.name.split(' ').slice(-1).join(' '), de ? ' ' : null, de ? flagDE('GER') : null),
        countryBadge(p.country, 'country--podium'),
        el('div', { class: 'podium__bar' + (first ? ' podium__bar--first' : ''), style: 'height:' + podHeights[idx] + 'px' },
          el('div', { class: 'podium__rank' }, String(p.rank)),
          el('div', { class: 'podium__pts' }, p.points.toLocaleString('de-DE'))));
    }));

    const listSec = section('Plätze 4 – 20', { style: 'margin-top:22px' },
      el('div', { class: 'card card--flush' }, rest.map(p => rankRow(p, top))),
      el('div', { class: 'foot-note' },
        'Punkte aus den letzten 52 Wochen. Quelle: ' + (rankTour === 'atp' ? 'ATP Tour' : 'WTA Tour') + '. Aktualisierung jeden Montag.'));

    const deSec = germans.length ? section('🇩🇪 Deutsche im Feld', null,
      el('div', { class: 'card card--flush' }, germans.map(g =>
        el('div', { class: 'rank-row rank-row--de' },
          el('div', { class: 'rank-row__no' }, String(g.rank)),
          el('div', { class: 'rank-row__main' },
            el('div', { class: 'rank-row__nameline' },
              el('span', { class: 'rank-row__name' }, g.name), flagDE('GER')),
            el('div', { style: 'font-size:12.5px;color:var(--ink-soft);margin-top:2px' }, g.note))))),
      el('div', { class: 'foot-note' }, 'Auch außerhalb der Top 20 – damit du „deine" Deutschen immer im Blick hast.')) : null;

    return screenWrap(head, podium3, listSec, deSec);
  }

  function rankRow(p, top) {
    const young = (p.age != null && p.age <= T.NEXTGEN_MAX_AGE) || H.isYoung(p.name);
    const de = p.de || p.country === 'GER';
    return el('div', { class: 'rank-row' + (de ? ' rank-row--de' : '') },
      el('div', { class: 'rank-row__no' }, String(p.rank)),
      el('div', { class: 'rank-row__main' },
        el('div', { class: 'rank-row__nameline' },
          el('span', { class: 'rank-row__name' }, p.name),
          de ? flagDE('GER') : null,
          young ? el('span', { class: 'tag-young' }, 'JUNG') : null),
        el('div', { class: 'rank-row__metaline' },
          countryBadge(p.country),
          el('div', { class: 'rank-row__bar' }, el('span', { style: 'width:' + ((p.points / top) * 100) + '%' })))),
      el('div', { class: 'rank-row__pts' }, p.points.toLocaleString('de-DE')),
      moveBadge(p.move));
  }

  // ── 3 · SPIELPLAN ─────────────────────────────────────────────
  function scheduleScreen() {
    // Nur die aktuellen/kommenden Turniere zeigen (sonst überläuft die Tab-Leiste)
    const withRounds = T.SLAMS.filter(s => s.rounds).sort((a, b) => H.parse(a.start) - H.parse(b.start));
    let slams = withRounds.filter(s => H.daysUntil(s.end) >= -45).slice(0, 3);
    if (!slams.length) slams = withRounds.slice(-3);
    if (!scheduleSel || !slams.some(s => s.id === scheduleSel)) scheduleSel = H.nextSlam(slams).id;
    const slam = slams.find(s => s.id === scheduleSel) || slams[0];
    const bcasts = slam.broadcasters.map(k => T.BROADCASTERS[k]);

    const head = el('div', { class: 'screen-head' },
      el('div', { class: 'screen-head__row' },
        el('div', { class: 'screen-title' }, 'Spielplan'),
        settingsBtn()),
      el('div', { class: 'slam-tabs' }, slams.map(s =>
        el('button', { class: 'slam-tab' + (s.id === scheduleSel ? ' is-on' : ''), onClick: () => { scheduleSel = s.id; rerender(); } }, s.name))));

    const headerBlock = el('div', { style: 'padding:8px 20px 0' },
      el('div', { class: 'tourney-head ' + gradClass(slam.surface) },
        el('div', { class: 'tourney-head__name' }, slam.name),
        el('div', { class: 'tourney-head__venue' }, slam.venue + ' · ' + slam.city),
        el('div', { class: 'tourney-head__meta' },
          el('span', null, ic('calendar', { size: 14 }), H.fmtRange(slam.start, slam.end)),
          el('span', null, el('span', { class: 'surface-dot' }), slam.surfaceLabel),
          slam.provisional ? el('span', { class: 'provisional-tag' }, 'Termin vorläufig') : null)),
      el('div', { class: 'broadcast-line' },
        el('span', { class: 'broadcast-line__label' }, ic('tv', { size: 16 }), 'Live bei'),
        bcasts.map(b => broadcastTag(b, false))),
      el('div', { class: 'card', style: 'margin-top:14px' },
        el('div', { class: 'watch__head', style: 'margin-bottom:8px' },
          ic('globe', { size: 20 }, 'watch__icon'),
          el('div', { class: 'watch__text' }, slam.tz)),
        el('div', { class: 'watch__note' }, slam.playNote)));

    const timeline = section('Ablauf des Turniers', { style: 'margin-top:22px' },
      el('div', { class: 'timeline' }, slam.rounds.map((r, i) => {
        const dt = H.parse(r.d); const isFinal = /Finale/.test(r.label); const last = i === slam.rounds.length - 1;
        return el('div', { class: 'tl-item' },
          el('div', { class: 'tl-rail' },
            el('span', { class: 'tl-dot' + (isFinal ? ' tl-dot--final' : '') }),
            last ? null : el('span', { class: 'tl-line' })),
          el('div', { class: 'tl-body' },
            el('div', { class: 'tl-date' }, H.DAYS_SHORT[dt.getDay()] + ', ' + dt.getDate() + '. ' + H.MONTHS[dt.getMonth()],
              isFinal ? ic('trophy', { size: 15 }) : null),
            el('div', { class: 'tl-label' }, r.label),
            el('div', { class: 'tl-note' }, r.note)));
      })),
      slam.favourites ? el('div', { style: 'margin-top:8px' },
        el('div', { style: 'margin-bottom:8px' }, label('Favoriten')),
        el('div', { class: 'fav-chips' }, slam.favourites.map(f => el('span', { class: 'fav-chip' }, f)))) : null);

    return screenWrap(head, headerBlock, timeline);
  }

  // ── 4 · TALENTE: suchen, verfolgen & sehen, was sie machen ────
  function playersScreen() {
    const input = el('input', {
      class: 'search-input', type: 'search', placeholder: 'Spieler:in suchen …',
      'aria-label': 'Spieler suchen', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    });
    const results = el('div', { class: 'player-list' });

    function rowsFor(arr, mapFn) { arr.forEach(p => results.append(playerRow(mapFn(p), rebuild))); }

    function rebuild() {
      const q = input.value.trim();
      results.innerHTML = '';
      if (q) {
        if (!window.TennisData.playerDBStatus().loaded) {
          results.append(hintCard('Spielerdaten werden geladen …'));
          window.TennisData.loadPlayerDB().then(() => { if (input.value.trim() === q) rebuild(); });
          return;
        }
        const hits = window.TennisData.searchPlayers(q, 14);
        results.append(label('Suchergebnisse'));
        if (!hits.length) results.append(hintCard('Keine Spieler:in gefunden – versuch es mit dem Nachnamen.'));
        else rowsFor(hits, displayDB);
      } else {
        const mine = featured.map(displayTracked).filter(Boolean);
        results.append(label('Meine Talente'));
        if (!mine.length) results.append(hintCard('Noch niemand verfolgt. Such oben nach einem Namen oder wähle unten ein Talent aus.'));
        else mine.forEach(p => results.append(playerRow(p, rebuild, true)));
        const risers = window.TennisData.youngRisers(150, 10).filter(p => !isTracked(p.id));
        if (risers.length) { results.append(label('Junge Aufsteiger', 'section-gap')); rowsFor(risers, displayDB); }
        const recs = T.PLAYERS.filter(p => !isTracked(p.id));
        if (recs.length) { results.append(label('Empfohlene Talente', 'section-gap')); rowsFor(recs, displayCurated); }
      }
    }

    input.addEventListener('input', rebuild);
    window.TennisData.loadPlayerDB().then(() => { if (!input.value.trim()) rebuild(); });
    window.TennisData.loadResults().then(() => { if (!input.value.trim()) rebuild(); });

    const head = el('div', { class: 'screen-head' },
      el('div', { class: 'screen-head__row' },
        el('div', null,
          el('div', { class: 'screen-title' }, 'Talente'),
          el('div', { class: 'screen-sub' }, 'Suchen, verfolgen & sehen, was sie machen')),
        settingsBtn()),
      el('div', { class: 'search-wrap' }, ic('search', { size: 18 }, 'search-icon'), input));

    const body = el('div', { class: 'players-body' }, results,
      el('div', { class: 'foot-note', style: 'margin:16px 0 4px' },
        'Rang & Alter tagesaktuell · Match-Ergebnisse können ein paar Tage verzögert sein · „Mehr erfahren" öffnet Wikipedia · Quelle: Jeff Sackmann.'));

    rebuild();
    return screenWrap(head, body);
  }

  function hintCard(text) {
    return el('div', { class: 'card', style: 'color:var(--ink-soft);font-size:13.5px;line-height:1.45' }, text);
  }

  const ROUND_DE = {
    F: 'Finale', BR: 'Spiel um Platz 3', SF: 'Halbfinale', QF: 'Viertelfinale',
    R16: 'Achtelfinale', R32: '3. Runde', R64: '2. Runde', R128: '1. Runde',
    RR: 'Gruppenphase', Q1: 'Quali', Q2: 'Quali', Q3: 'Quali', ER: 'Runde',
  };
  function resultsBlock(matches) {
    return el('div', { class: 'results' },
      el('div', { class: 'results__head' }, 'Letzte Spiele'),
      matches.map(m => el('div', { class: 'result-row' },
        el('span', { class: 'result-badge ' + (m.w ? 'is-win' : 'is-loss') }, m.w ? 'S' : 'N'),
        el('div', { class: 'result-main' },
          el('div', { class: 'result-opp' }, (m.w ? 'Sieg gegen ' : 'Niederlage gegen ') + m.o),
          el('div', { class: 'result-meta' }, [m.t, ROUND_DE[m.r] || m.r].filter(Boolean).join(' · ')),
          m.sc ? el('div', { class: 'result-score' }, m.sc) : null))));
  }

  // Einheitliche Spielerzeile (kuratiert oder gesucht), mit +/✓-Knopf.
  // showResults=true → bei verfolgten Spielern die letzten Match-Ergebnisse.
  function playerRow(p, onChange, showResults) {
    const tracked = isTracked(p.id);
    const young = p.age != null && p.age <= T.NEXTGEN_MAX_AGE;
    const results = showResults ? window.TennisData.getResults(p.dbId || p.id) : null;
    return el('div', { class: 'card player' },
      el('div', { class: 'player__top' },
        avatar(p.initials, { size: 48, accent: tracked }),
        el('div', { class: 'player__main' },
          el('div', { class: 'player__nameline' },
            el('span', { class: 'player__name' }, p.name),
            flagDE(p.country),
            p.rank ? el('span', { class: 'player__rank' }, '#' + p.rank) : null,
            p.tour ? el('span', { class: 'player__tour' }, p.tour.toUpperCase()) : null,
            young ? el('span', { class: 'tag-young' }, 'JUNG') : null),
          el('div', { class: 'player__meta' },
            countryBadge(p.country),
            p.age ? el('span', { class: 'player__age' }, p.age + ' Jahre') : null,
            (p.move != null && p.move !== 0) ? moveBadge(p.move) : null),
          p.tag ? el('div', { class: 'player__tag' }, p.tag) : null),
        el('button', {
          class: 'track-btn' + (tracked ? ' is-on' : ''),
          'aria-label': tracked ? 'Nicht mehr verfolgen' : 'Verfolgen',
          onClick: () => { toggleTrack(p); if (onChange) onChange(); },
        }, ic(tracked ? 'check' : 'plus', { size: 20, sw: 2.2 }))),
      p.note ? el('div', { class: 'player__note' }, p.note) : null,
      (results && results.length) ? resultsBlock(results) : null,
      el('a', { class: 'player__wiki', href: wikiLink(p), target: '_blank', rel: 'noopener' },
        ic('globe', { size: 14 }), 'Mehr erfahren'));
  }

  // ── gemeinsame Hülle eines Screens (Kopf + scrollbarer Inhalt) ─
  function screenWrap(head) {
    const body = el('div', { class: 'screen' });
    for (let i = 1; i < arguments.length; i++) { const a = arguments[i]; if (a) body.append(a); }
    return el('div', null, head, body);
  }

  // ── Tab-Leiste ────────────────────────────────────────────────
  const TABS = [
    { id: 'today', label: 'Heute', icon: 'today' },
    { id: 'live', label: 'Live', icon: 'live' },
    { id: 'ranking', label: 'Rangliste', icon: 'ranking' },
    { id: 'schedule', label: 'Spielplan', icon: 'schedule' },
    { id: 'players', label: 'Talente', icon: 'players' },
  ];
  function paintTabbar() {
    tabbarEl.innerHTML = '';
    TABS.forEach(tab => {
      const on = tab.id === activeTab;
      tabbarEl.append(el('button', { class: 'tab' + (on ? ' is-on' : ''), onClick: () => goto(tab.id) },
        ic(tab.icon, { size: 23, sw: on ? 2.1 : 1.7 }),
        el('span', { class: 'tab__label' }, tab.label)));
    });
  }

  // ── Render-Steuerung ──────────────────────────────────────────
  function buildScreen() {
    if (activeTab === 'live') { liveInstance = window.LiveTicker.build(); return liveInstance.el; }
    if (activeTab === 'ranking') return rankingScreen();
    if (activeTab === 'schedule') return scheduleScreen();
    if (activeTab === 'players') return playersScreen();
    return homeScreen();
  }

  // resetScroll=true bei Tab-Wechsel, false bei Hintergrund-Aktualisierung
  function rerender(resetScroll) {
    const prev = mainEl.scrollTop;
    if (liveInstance) { liveInstance.stop(); liveInstance = null; }
    mainEl.innerHTML = '';
    mainEl.append(buildScreen());
    if (liveInstance) liveInstance.start();
    mainEl.scrollTop = resetScroll ? 0 : prev;
    paintTabbar();
  }
  function goto(tab) { if (tab === activeTab && tab !== 'today') { /* erneut antippen */ } activeTab = tab; rerender(true); }

  function onDataChange() {
    // Nur Screens neu zeichnen, die echte Daten zeigen (sonst Ruhe).
    if (activeTab === 'today' || activeTab === 'ranking') rerender(false);
    if (sheetState.open) refreshSheetStatus();
  }

  // ── Einstellungen (Bottom-Sheet) ──────────────────────────────
  const sheetState = { open: false, overlay: null, statusText: null, refreshBtn: null };

  function choiceRow(options, current, onPick) {
    const btns = [];
    const wrap = el('div', { class: 'choice' });
    options.forEach(opt => {
      const text = typeof opt === 'string' ? opt : opt.label;
      const b = el('button', { class: 'choice__btn' + (text === current ? ' is-on' : ''), onClick: () => {
        btns.forEach(x => x.classList.remove('is-on')); b.classList.add('is-on'); onPick(text);
      } }, opt.icon ? ic(opt.icon, { size: 16 }) : null, text);
      btns.push(b); wrap.append(b);
    });
    return wrap;
  }

  function refreshSheetStatus() {
    if (!sheetState.statusText) return;
    const st = window.TennisData.status();
    sheetState.statusText.textContent = sheetStatusLine(st);
    if (sheetState.refreshBtn) sheetState.refreshBtn.disabled = st.loading;
  }
  function sheetStatusLine(st) {
    if (st.loading) return 'Aktualisiere Rangliste …';
    const stand = st.updatedAt ? H.fmtDate(st.updatedAt, { year: true }) : 'unbekannt';
    if (st.source === 'live') return 'Aktuelle Rangliste geladen · Stand ' + stand + '.';
    if (st.source === 'cache') return 'Rangliste aus Zwischenspeicher · Stand ' + stand + '.';
    return 'Beispieldaten – echte Rangliste konnte gerade nicht geladen werden.';
  }

  function openSettings() {
    closeSettings();
    const st = window.TennisData.status();

    const overlay = el('div', { class: 'sheet-overlay', onClick: (e) => { if (e.target === overlay) closeSettings(); } });

    sheetState.statusText = el('div', { class: 'data-status__text' }, sheetStatusLine(st));
    sheetState.refreshBtn = el('button', {
      class: 'data-status__btn', disabled: st.loading,
      onClick: async () => { sheetState.refreshBtn.classList.add('is-spin'); await doRefresh(); sheetState.refreshBtn.classList.remove('is-spin'); refreshSheetStatus(); },
    }, ic('refresh', { size: 14 }), 'Aktualisieren');

    const sheet = el('div', { class: 'sheet' },
      el('div', { class: 'sheet__grip' }),
      el('div', { class: 'sheet__title' }, 'Einstellungen'),

      el('div', { class: 'sheet__group' },
        el('div', { class: 'sheet__legend' }, label('Darstellung')),
        choiceRow([{ label: 'Hell', icon: 'sun' }, { label: 'Dunkel', icon: 'moon' }], isDark() ? 'Dunkel' : 'Hell',
          (v) => { settings.theme = v === 'Dunkel' ? 'dark' : 'light'; saveSettings(); applyTheme(); rerender(false); })),

      el('div', { class: 'sheet__group' },
        el('div', { class: 'sheet__legend' }, label('Schriftgröße')),
        choiceRow(['Normal', 'Groß', 'Sehr groß'], fontLabel(),
          (v) => { settings.fontScale = FONT_MAP[v] || 1; saveSettings(); applyFont(); })),

      el('div', { class: 'sheet__group' },
        el('div', { class: 'sheet__legend' }, label('Daten')),
        el('div', { class: 'data-status' }, sheetState.statusText, sheetState.refreshBtn),
        el('div', { class: 'sheet__hint' },
          'Rangliste ATP & WTA – täglich automatisch aktualisiert, kostenlos & ohne Anmeldung (Quelle: Jeff Sackmann / GitHub). Turniertermine & Talente sind gepflegt.')),

      el('div', { class: 'sheet__group' },
        el('div', { class: 'sheet__legend' }, label('Hilfe')),
        el('button', {
          class: 'data-status__btn', style: 'width:100%;justify-content:center',
          onClick: () => { settings.helpDismissed = false; saveSettings(); closeSettings(); activeTab = 'today'; rerender(true); },
        }, ic('today', { size: 15 }), 'Anleitung „So funktioniert die App" anzeigen')),

      el('div', { class: 'sheet__group' },
        el('div', { class: 'sheet__legend' }, label('Aufs iPhone')),
        el('div', { class: 'sheet__hint' },
          'In Safari unten auf das Teilen-Symbol tippen und „Zum Home-Bildschirm" wählen – dann liegt „Aufschlag" als App-Symbol auf dem iPhone.')),

      el('button', { class: 'sheet__close', onClick: closeSettings }, 'Fertig'));

    overlay.append(sheet);
    document.body.append(overlay);
    sheetState.open = true; sheetState.overlay = overlay;
    document.addEventListener('keydown', onSheetKey);
  }
  function onSheetKey(e) { if (e.key === 'Escape') closeSettings(); }
  function closeSettings() {
    if (sheetState.overlay) sheetState.overlay.remove();
    sheetState.open = false; sheetState.overlay = null; sheetState.statusText = null; sheetState.refreshBtn = null;
    document.removeEventListener('keydown', onSheetKey);
  }

  // ── Service-Worker (für Offline & „App"-Verhalten) ────────────
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* z. B. file:// – egal */ });
    }
  }

  // ── Start ─────────────────────────────────────────────────────
  function boot() {
    const root = document.getElementById('app');
    const shell = el('div', { class: 'app-shell' });
    mainEl = el('div', { class: 'app-main' });
    tabbarEl = el('nav', { class: 'tabbar' });
    shell.append(mainEl, tabbarEl);
    root.append(shell);

    applyTheme();
    applyFont();
    rerender(true);                       // sofort mit Demo/Cache rendern

    window.TennisData.subscribe(onDataChange);
    window.TennisData.init();             // lädt Cache & ggf. Live-Daten
    registerSW();
  }

  boot();
})();
