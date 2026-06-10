/* =================================================================
   Liveticker  ·  window.LiveTicker
   -----------------------------------------------------------------
   Da außerhalb der Grand Slams keine echten Spiele laufen, zeigt der
   Ticker klar gekennzeichnete BEISPIEL-Spiele mit einer kleinen
   Tennis-Zähl-Engine (15/30/40/Vorteil, Spiele, Sätze, Tie-Break).
   Alle paar Sekunden fällt ein Punkt – so sieht Mama sofort, wie es
   während der Turniere aussieht.

   Während eines echten Grand Slams würden hier die Live-Daten der API
   stehen (siehe README). Die Anzeige bliebe identisch.
   ================================================================= */
(function () {
  // ── kleiner DOM-Helfer (lokal, damit dieses Modul eigenständig ist) ──
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style') n.setAttribute('style', v);
      else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return n;
  }
  function ic(name, opts) {
    const span = document.createElement('span');
    span.style.display = 'inline-flex';
    span.innerHTML = Ic[name](opts || {});
    return span;
  }
  function flagDE(country) {
    return country === 'GER' ? el('span', { class: 'flag-de', title: 'Deutschland' }, '🇩🇪') : null;
  }

  // ── Zähl-Logik ────────────────────────────────────────────────
  const PT = ['0', '15', '30', '40'];
  function pointLabels(pa, pb, tb) {
    if (tb) return [String(pa), String(pb)];          // Tie-Break: echte Zählung
    if (pa >= 3 && pb >= 3) {
      if (pa === pb) return ['40', '40'];
      return pa > pb ? ['Vt', '40'] : ['40', 'Vt'];   // Vt = Vorteil
    }
    return [PT[Math.min(pa, 3)], PT[Math.min(pb, 3)]];
  }

  // Demo-Spiele (Wimbledon · Rasen) – inkl. Alexander Zverev (GER)
  function seed() {
    return [
      { id: 'm1', court: 'Centre Court', round: 'Achtelfinale', status: 'live',
        a: { name: 'Carlos Alcaraz', country: 'ESP' }, b: { name: 'João Fonseca', country: 'BRA' },
        sets: [[6, 4]], games: [3, 2], points: [2, 1], server: 0, tb: false },
      { id: 'm2', court: 'No. 1 Court', round: 'Achtelfinale', status: 'live',
        a: { name: 'Jannik Sinner', country: 'ITA' }, b: { name: 'Jakub Menšík', country: 'CZE' },
        sets: [[7, 6]], games: [4, 5], points: [3, 3], server: 1, tb: false },
      { id: 'm3', court: 'No. 2 Court', round: 'Achtelfinale', status: 'live',
        a: { name: 'Ben Shelton', country: 'USA' }, b: { name: 'Arthur Fils', country: 'FRA' },
        sets: [[6, 3]], games: [1, 1], points: [0, 0], server: 0, tb: false },
      { id: 'm4', court: 'No. 3 Court', round: 'Achtelfinale', status: 'done',
        a: { name: 'Alexander Zverev', country: 'GER' }, b: { name: 'Learner Tien', country: 'USA' },
        sets: [[6, 4], [3, 6], [6, 2], [6, 4]], games: [0, 0], points: [0, 0], server: 0, tb: false, winner: 0 },
      { id: 'm5', court: 'Centre Court', round: 'Achtelfinale', status: 'upcoming', startTime: '15:00 Uhr',
        a: { name: 'Lorenzo Musetti', country: 'ITA' }, b: { name: 'Rafael Jódar', country: 'ESP' },
        sets: [], games: [0, 0], points: [0, 0], server: 0, tb: false },
    ];
  }

  // Einen Punkt an Spieler w (0|1) vergeben → neues Match-Objekt
  function awardPoint(m, w) {
    const n = { ...m, sets: m.sets.map(s => [...s]), games: [...m.games], points: [...m.points] };
    const o = w === 0 ? 1 : 0;

    if (n.tb) {
      n.points[w]++;
      const hi = Math.max(n.points[0], n.points[1]);
      if (hi >= 7 && Math.abs(n.points[0] - n.points[1]) >= 2) {
        n.sets.push(w === 0 ? [7, 6] : [6, 7]);
        n.games = [0, 0]; n.points = [0, 0]; n.tb = false; n.server = o;
        return checkMatch(n);
      }
      if ((n.points[0] + n.points[1]) % 2 === 1) n.server = n.server === 0 ? 1 : 0;
      return n;
    }

    n.points[w]++;
    const won = (n.points[w] >= 4 && n.points[w] - n.points[o] >= 2);
    if (!won) return n;

    n.games[w]++; n.points = [0, 0]; n.server = o;
    if (n.games[0] === 6 && n.games[1] === 6) { n.tb = true; return n; }
    if (n.games[w] >= 6 && n.games[w] - n.games[o] >= 2) {
      n.sets.push([n.games[0], n.games[1]]);
      n.games = [0, 0];
      return checkMatch(n);
    }
    return n;
  }

  function checkMatch(n) {
    let sa = 0, sb = 0;
    n.sets.forEach(([x, y]) => { if (x > y) sa++; else sb++; });
    if (sa === 3 || sb === 3) { n.status = 'done'; n.winner = sa === 3 ? 0 : 1; }
    return n;
  }

  // ── Darstellung ───────────────────────────────────────────────
  function scoreRow(p, idx, m, flashIdx) {
    const live = m.status === 'live';
    const done = m.status === 'done';
    const winner = done && m.winner === idx;
    const serving = live && m.server === idx;
    const pl = pointLabels(m.points[0], m.points[1], m.tb);

    const name = el('span', { class: 'score-row__name' + (winner ? ' is-winner' : '') },
      el('span', { class: 'score-row__nametext' }, p.name),
      el('span', { class: 'country' }, p.country),
      flagDE(p.country),
      winner ? (() => { const s = ic('trophy', { size: 15 }); s.className = 'match__trophy'; return s; })() : null
    );

    const cells = [];
    m.sets.forEach(s => cells.push(el('span', { class: 'score-cell' + (winner ? ' score-cell--winner' : '') }, String(s[idx]))));
    if (live) {
      cells.push(el('span', { class: 'score-cell' }, String(m.games[idx])));
      cells.push(el('span', {
        class: 'score-cell score-cell--point' + (flashIdx === idx ? ' score-cell--flash' : ''),
      }, pl[idx]));
    }

    return el('div', { class: 'score-row' },
      el('span', { class: 'score-row__serve' + (serving ? ' is-serving' : '') }),
      name,
      cells
    );
  }

  function matchCard(m, flashIdx) {
    const live = m.status === 'live';
    let state;
    if (live) {
      state = el('span', { class: 'match__state match__state--live' },
        el('span', { class: 'live-dot live-dot--sm live-dot--anim' }), 'LIVE');
    } else if (m.status === 'done') {
      state = el('span', { class: 'match__state match__state--done' }, 'BEENDET');
    } else {
      state = el('span', { class: 'match__state match__state--soon' }, ic('clock', { size: 14 }), 'ab ' + m.startTime);
    }

    return el('div', { class: 'card', 'data-id': m.id },
      el('div', { class: 'match__head' },
        el('span', { class: 'match__meta' }, m.round + ' · ' + m.court),
        state),
      scoreRow(m.a, 0, m, flashIdx),
      el('div', { class: 'match__divider' }),
      scoreRow(m.b, 1, m, flashIdx)
    );
  }

  // ── Bildschirm + Engine ───────────────────────────────────────
  let matches = seed();           // bleibt über Tab-Wechsel erhalten
  const ORDER = { live: 0, upcoming: 1, done: 2 };

  function build() {
    const listEl = el('div', { class: 'live-list' });
    const cards = {};             // id → Karten-Element
    const countEl = el('span', null, '0 live');

    function paintList() {
      const sorted = [...matches].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
      listEl.innerHTML = '';
      sorted.forEach(m => { const c = matchCard(m); cards[m.id] = c; listEl.append(c); });
      updateCount();
    }
    function updateCount() {
      countEl.textContent = matches.filter(m => m.status === 'live').length + ' live';
    }

    const head = el('div', { class: 'screen-head' },
      el('div', { class: 'live-head' },
        el('div', null,
          el('div', { class: 'screen-title' }, 'Liveticker'),
          el('div', { class: 'screen-sub' }, 'Wimbledon · Herren-Einzel')),
        el('span', { class: 'live-count' },
          el('span', { class: 'live-dot live-dot--anim' }), countEl)
      )
    );

    const body = el('div', { class: 'screen' },
      el('div', { style: 'padding:4px 20px 0' },
        el('div', { class: 'live-intro' },
          el('strong', null, 'Beispiel-Spiele'),
          ' zur Veranschaulichung. Während der Grand Slams erscheinen hier die echten Begegnungen mit live tickenden Ständen.'),
        listEl,
        el('div', { class: 'foot-note' }, '● = Aufschlag · Sätze, Spiele und Punkte aktualisieren sich automatisch.')
      )
    );

    paintList();

    const root = el('div', null, head, body);

    // Engine: alle 2,3 s einen Punkt in einem zufälligen Live-Spiel
    let timer = null;
    function tick() {
      const liveIdx = matches.map((m, i) => m.status === 'live' ? i : -1).filter(i => i >= 0);
      if (!liveIdx.length) return;
      const pick = liveIdx[Math.floor(Math.random() * liveIdx.length)];
      const m = matches[pick];
      const w = Math.random() < 0.58 ? m.server : (m.server === 0 ? 1 : 0); // Aufschläger leicht bevorzugt
      const before = m.status;
      const next = awardPoint(m, w);
      matches[pick] = next;

      if (next.status !== before) {
        paintList();                  // Status-Wechsel → neu sortieren
      } else if (cards[next.id]) {
        const fresh = matchCard(next, w); // nur diese Karte, Scorer blinkt
        cards[next.id].replaceWith(fresh);
        cards[next.id] = fresh;
      }
    }

    return {
      el: root,
      start() { if (!timer) timer = setInterval(tick, 2300); },
      stop() { if (timer) { clearInterval(timer); timer = null; } },
    };
  }

  window.LiveTicker = { build };
})();
