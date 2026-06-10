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
          el('span', null, el('span', { class: 'surface-dot' }), slam.surfaceLabel))));
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
    const talents = T.PLAYERS.filter(p => featured.includes(p.id));
    const upcoming = slams.filter(s => H.slamStatus(s) !== 'done' && s.id !== next.id);
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

    // Junge Talente
    const talentsSec = section('Junge Talente', { action: 'Alle ansehen', onAction: () => goto('players') },
      talents.length
        ? el('div', { class: 'talent-scroll' }, talents.map(talentCard))
        : el('div', { class: 'card', style: 'color:var(--ink-soft);font-size:13.5px;line-height:1.45' },
            'Noch keine Talente ausgewählt. Tippe unten auf „Talente" und markiere welche mit ★ – sie erscheinen dann hier.'));

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
            el('div', { class: 'slam-row__sub' }, s.city + ' · ' + s.surfaceLabel)),
          el('div', { class: 'slam-row__date' }, H.fmtDate(s.start)),
          ic('chevron', { size: 16 }, 'slam-row__chev'))))) : null;

    return screenWrap(head, hero(next), dataBanner(), watch, preview, talentsSec, finishedSec, moreSec);
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
        avatar(p.initials, { size: 42 }),
        el('span', { class: 'talent-card__rank' }, '#' + p.rank)),
      el('div', { class: 'talent-card__name' }, p.name),
      el('div', { class: 'talent-card__meta' },
        countryBadge(p.country), flagDE(p.country),
        el('span', { class: 'talent-card__age' }, p.age + ' Jahre')),
      el('div', { class: 'talent-card__tag' }, p.tag));
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
    const slams = T.SLAMS.filter(s => s.rounds);
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
          el('span', null, el('span', { class: 'surface-dot' }), slam.surfaceLabel))),
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

  // ── 4 · TALENTE ───────────────────────────────────────────────
  function playersScreen() {
    const sorted = T.PLAYERS.slice().sort((a, b) => {
      const fa = featured.includes(a.id), fb = featured.includes(b.id);
      if (fa !== fb) return fa ? -1 : 1;
      return a.rank - b.rank;
    });

    const head = el('div', { class: 'screen-head' },
      el('div', { class: 'screen-head__row' },
        el('div', null,
          el('div', { class: 'screen-title' }, 'Junge Talente'),
          el('div', { class: 'screen-sub' }, 'Tippe auf ★, um Favoriten aufs Dashboard zu holen')),
        settingsBtn()));

    const list = el('div', { class: 'player-list' },
      sorted.map(playerCard),
      el('div', { class: 'foot-note', style: 'margin:2px 0 4px' }, 'Alter & Platzierungen Stand Juni 2026 (Beispieldaten).'));

    return screenWrap(head, list);
  }

  function playerCard(p) {
    const fav = featured.includes(p.id);
    return el('div', { class: 'card player' },
      el('div', { class: 'player__top' },
        avatar(p.initials, { size: 48, accent: fav }),
        el('div', { class: 'player__main' },
          el('div', { class: 'player__nameline' },
            el('span', { class: 'player__name' }, p.name),
            flagDE(p.country),
            el('span', { class: 'player__rank' }, '#' + p.rank),
            el('span', { class: 'player__tour' }, p.tour.toUpperCase())),
          el('div', { class: 'player__meta' },
            countryBadge(p.country),
            el('span', { class: 'player__age' }, p.age + ' Jahre')),
          el('div', { class: 'player__tag' }, p.tag)),
        el('button', { class: 'star-btn' + (fav ? ' is-fav' : ''), 'aria-label': fav ? 'Favorit entfernen' : 'Als Favorit markieren', onClick: () => toggleFav(p.id) },
          ic('star', { size: 24, sw: 1.7, filled: fav }))),
      el('div', { class: 'player__note' }, p.note));
  }

  function toggleFav(id) {
    featured = featured.includes(id) ? featured.filter(x => x !== id) : featured.concat(id);
    saveSettings();
    rerender();
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
