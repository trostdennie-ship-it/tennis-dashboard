/* =================================================================
   Tennis-Daten  ·  Demo-Stand 8. Juni 2026 (nach den French Open)
   -----------------------------------------------------------------
   Das hier sind die mitgelieferten BEISPIELDATEN. Die App funktioniert
   damit sofort – auch ganz ohne API-Schlüssel.
   Sobald ein API-Schlüssel in config.js hinterlegt ist, werden diese
   Werte (Rangliste, Spielplan, Live) durch echte Daten ersetzt.

   ▸ Du darfst hier alles gefahrlos anpassen: Termine, Übertragung,
     Namen, Punkte. Die Oberfläche aktualisiert sich automatisch.
   ================================================================= */
(function () {
  // ── Übertragungs-Anbieter (Deutschland) ─────────────────────────
  // tone = Markenfarbe (für die kleine Pille), kind = Art, note = Hinweis
  const BROADCASTERS = {
    prime: { name: 'Prime Video',         kind: 'Stream · exklusiv', tone: '#00A8E1', note: 'Im Amazon-Prime-Abo enthalten' },
    sky:   { name: 'Sky Sport',           kind: 'Pay-TV & Stream',   tone: '#E10A8E', note: 'Sky Q / Sky Stream / WOW' },
    sdtv:  { name: 'Sportdeutschland.TV', kind: 'Stream',            tone: '#00C46A', note: 'Turnierpass oder Tagesticket' },
    euro:  { name: 'Eurosport',           kind: 'Free-TV & Stream',  tone: '#FF6B00', note: 'Auch über Joyn, DAZN, discovery+' },
  };

  // ── Die vier Grand Slams (2026 / 2027) ──────────────────────────
  // surface: grass | clay | hard   ·   Status wird zur Laufzeit berechnet.
  // tz/playNote: Zeitzone & typische deutsche Anstoßzeiten.
  const SLAMS = [
    {
      id: 'rg26', name: 'French Open', city: 'Paris', venue: 'Stade Roland-Garros',
      country: 'Frankreich', surface: 'clay', surfaceLabel: 'Sand',
      start: '2026-05-18', end: '2026-06-07',
      tz: 'Paris · gleiche Zeit wie Deutschland (MESZ)',
      playNote: 'Tagsessions ab 11:00, Abendsession ab ca. 20:15 (deutsche Zeit).',
      broadcasters: ['euro'],
      done: true,
      championM: 'Alexander Zverev', championNote: 'Erster Grand-Slam-Titel, 3:2-Sieg im Finale gegen Flavio Cobolli.',
      championW: 'Aryna Sabalenka', championWNote: 'Souveräner Finalsieg – zweiter Titel in Paris.',
    },
    {
      id: 'wim26', name: 'Wimbledon', city: 'London', venue: 'All England Lawn Tennis Club',
      country: 'England', surface: 'grass', surfaceLabel: 'Rasen',
      start: '2026-06-29', end: '2026-07-12',
      tz: 'London · 1 Stunde hinter Deutschland',
      playNote: 'Centre Court ab 14:30, Außenplätze ab 12:00 (deutsche Zeit).',
      broadcasters: ['prime'],
      edition: '139. Ausgabe · das einzige Rasen-Grand-Slam',
      rounds: [
        { d: '2026-06-29', label: '1. Runde', note: 'Auftakt · Mo & Di' },
        { d: '2026-07-01', label: '2. Runde', note: 'Mi & Do' },
        { d: '2026-07-03', label: '3. Runde', note: 'Fr & Sa' },
        { d: '2026-07-05', label: 'Achtelfinale', note: '„Manic Monday" · So & Mo' },
        { d: '2026-07-07', label: 'Viertelfinale', note: 'Di & Mi' },
        { d: '2026-07-09', label: 'Halbfinale Damen', note: 'Donnerstag' },
        { d: '2026-07-10', label: 'Halbfinale Herren', note: 'Freitag' },
        { d: '2026-07-11', label: 'Finale Damen', note: 'Centre Court · Samstag, 15:00' },
        { d: '2026-07-12', label: 'Finale Herren', note: 'Centre Court · Sonntag, 15:00' },
      ],
      favourites: ['Jannik Sinner', 'Carlos Alcaraz', 'Alexander Zverev', 'Aryna Sabalenka'],
    },
    {
      id: 'uso26', name: 'US Open', city: 'New York', venue: 'USTA Billie Jean King Center',
      country: 'USA', surface: 'hard', surfaceLabel: 'Hartplatz',
      start: '2026-08-30', end: '2026-09-13',
      tz: 'New York · 6 Stunden hinter Deutschland',
      playNote: 'Tagsession ab 17:00, Nightsession ab ca. 01:00 (deutsche Zeit).',
      broadcasters: ['sky', 'sdtv'],
      edition: '146. Ausgabe · höchstdotiertes Turnier der Welt',
      rounds: [
        { d: '2026-08-30', label: '1. Runde', note: 'So–Di' },
        { d: '2026-09-02', label: '2. Runde', note: 'Mi & Do' },
        { d: '2026-09-04', label: '3. Runde', note: 'Fr & Sa' },
        { d: '2026-09-06', label: 'Achtelfinale', note: 'So & Mo' },
        { d: '2026-09-08', label: 'Viertelfinale', note: 'Di & Mi' },
        { d: '2026-09-10', label: 'Halbfinale', note: 'Do & Fr' },
        { d: '2026-09-12', label: 'Finale Damen', note: 'Arthur Ashe · Samstag' },
        { d: '2026-09-13', label: 'Finale Herren', note: 'Arthur Ashe · Sonntag' },
      ],
      favourites: ['Carlos Alcaraz', 'Jannik Sinner', 'Coco Gauff', 'Aryna Sabalenka'],
    },
    {
      id: 'ao27', name: 'Australian Open', city: 'Melbourne', venue: 'Melbourne Park',
      country: 'Australien', surface: 'hard', surfaceLabel: 'Hartplatz',
      start: '2027-01-18', end: '2027-01-31',
      tz: 'Melbourne · 9–10 Stunden vor Deutschland',
      playNote: 'Spiele oft schon ab 01:00 vormittags (deutsche Zeit) – Frühaufsteher-Tennis.',
      broadcasters: ['euro'],
      edition: 'Auftakt der Saison 2027',
      rounds: [
        { d: '2027-01-18', label: '1. Runde', note: 'So–Di' },
        { d: '2027-01-20', label: '2. Runde', note: 'Mi & Do' },
        { d: '2027-01-22', label: '3. Runde', note: 'Fr & Sa' },
        { d: '2027-01-24', label: 'Achtelfinale', note: 'So & Mo' },
        { d: '2027-01-26', label: 'Viertelfinale', note: 'Di & Mi' },
        { d: '2027-01-28', label: 'Halbfinale', note: 'Do & Fr' },
        { d: '2027-01-30', label: 'Finale Damen', note: 'Rod Laver Arena · Samstag' },
        { d: '2027-01-31', label: 'Finale Herren', note: 'Rod Laver Arena · Sonntag' },
      ],
      favourites: ['Carlos Alcaraz', 'Jannik Sinner', 'Aryna Sabalenka', 'Iga Świątek'],
    },
  ];

  // ── Weltrangliste ───────────────────────────────────────────────
  // de:true  → deutsche/r Aktive/r (wird hervorgehoben)
  // move     → Veränderung der Platzierung (0 = unverändert)
  const RANKINGS = {
    atp: {
      label: 'ATP Herren', updated: '2026-06-08',
      list: [
        { rank: 1,  name: 'Jannik Sinner',         country: 'ITA', points: 13500, move: 0 },
        { rank: 2,  name: 'Carlos Alcaraz',        country: 'ESP', points: 9960,  move: 0 },
        { rank: 3,  name: 'Alexander Zverev',      country: 'GER', points: 7305,  move: 0, de: true },
        { rank: 4,  name: 'Félix Auger-Aliassime', country: 'CAN', points: 4440,  move: 2 },
        { rank: 5,  name: 'Ben Shelton',           country: 'USA', points: 3920,  move: 0 },
        { rank: 6,  name: 'Alex de Minaur',        country: 'AUS', points: 3905,  move: 1 },
        { rank: 7,  name: 'Novak Djokovic',        country: 'SRB', points: 3760,  move: -3 },
        { rank: 8,  name: 'Daniil Medvedev',       country: 'RUS', points: 3760,  move: 0 },
        { rank: 9,  name: 'Taylor Fritz',          country: 'USA', points: 3720,  move: 0 },
        { rank: 10, name: 'Flavio Cobolli',        country: 'ITA', points: 3540,  move: 4 },
        { rank: 11, name: 'Alexander Bublik',      country: 'KAZ', points: 2930,  move: -1 },
        { rank: 12, name: 'Jiří Lehečka',          country: 'CZE', points: 2575,  move: 0 },
        { rank: 13, name: 'Andrey Rublev',         country: 'RUS', points: 2460,  move: 0 },
        { rank: 14, name: 'Casper Ruud',           country: 'NOR', points: 2425,  move: 2 },
        { rank: 15, name: 'Karen Khachanov',       country: 'RUS', points: 2320,  move: 0 },
        { rank: 16, name: 'Lorenzo Musetti',       country: 'ITA', points: 2315,  move: -5 },
        { rank: 17, name: 'Jakub Menšík',          country: 'CZE', points: 2300,  move: 10 },
        { rank: 18, name: 'Luciano Darderi',       country: 'ITA', points: 2300,  move: -1 },
        { rank: 19, name: 'Learner Tien',          country: 'USA', points: 2270,  move: -1 },
        { rank: 20, name: 'Valentin Vacherot',     country: 'MON', points: 2145,  move: -1 },
      ],
    },
    wta: {
      label: 'WTA Damen', updated: '2026-06-08',
      list: [
        { rank: 1,  name: 'Aryna Sabalenka',     country: 'BLR', points: 10250, move: 0 },
        { rank: 2,  name: 'Iga Świątek',         country: 'POL', points: 8100,  move: 0 },
        { rank: 3,  name: 'Coco Gauff',          country: 'USA', points: 7800,  move: 0 },
        { rank: 4,  name: 'Jessica Pegula',      country: 'USA', points: 5400,  move: 1 },
        { rank: 5,  name: 'Mirra Andreeva',      country: 'RUS', points: 5110,  move: 2 },
        { rank: 6,  name: 'Elena Rybakina',      country: 'KAZ', points: 4980,  move: -2 },
        { rank: 7,  name: 'Jasmine Paolini',     country: 'ITA', points: 4630,  move: 0 },
        { rank: 8,  name: 'Qinwen Zheng',        country: 'CHN', points: 4120,  move: -1 },
        { rank: 9,  name: 'Madison Keys',        country: 'USA', points: 4010,  move: 0 },
        { rank: 10, name: 'Paula Badosa',        country: 'ESP', points: 3580,  move: 3 },
        { rank: 11, name: 'Emma Navarro',        country: 'USA', points: 3470,  move: -1 },
        { rank: 12, name: 'Daria Kasatkina',     country: 'AUS', points: 3120,  move: 0 },
        { rank: 13, name: 'Diana Shnaider',      country: 'RUS', points: 3010,  move: 2 },
        { rank: 14, name: 'Barbora Krejčíková',  country: 'CZE', points: 2820,  move: -2 },
        { rank: 15, name: 'Beatriz Haddad Maia', country: 'BRA', points: 2640,  move: 1 },
        { rank: 16, name: 'Elina Svitolina',     country: 'UKR', points: 2520,  move: 0 },
        { rank: 17, name: 'Liudmila Samsonova',  country: 'RUS', points: 2410,  move: 0 },
        { rank: 18, name: 'Donna Vekić',         country: 'CRO', points: 2300,  move: -2 },
        { rank: 19, name: 'Karolína Muchová',    country: 'CZE', points: 2260,  move: 1 },
        { rank: 20, name: 'Linda Nosková',       country: 'CZE', points: 2095,  move: 3 },
      ],
    },
  };

  // ── Deutsche im Feld (auch außerhalb der Top 20) ────────────────
  // Eigener Abschnitt, damit Mama „ihre" Deutschen immer schnell findet.
  const GERMANS = {
    atp: [
      { rank: 3,   name: 'Alexander Zverev',   country: 'GER', note: 'Frischgebackener French-Open-Sieger.' },
      { rank: 43,  name: 'Jan-Lennard Struff', country: 'GER', note: 'Routinier mit Wucht-Aufschlag.' },
      { rank: 49,  name: 'Daniel Altmaier',    country: 'GER', note: 'Sandplatz-Spezialist mit starker Rückhand.' },
      { rank: 92,  name: 'Yannick Hanfmann',   country: 'GER', note: 'Kämpfernatur, gefährlich auf Sand.' },
    ],
    wta: [
      { rank: 58,  name: 'Eva Lys',           country: 'GER', note: 'Jung, mutig – Deutschlands große Hoffnung.' },
      { rank: 79,  name: 'Tatjana Maria',     country: 'GER', note: 'Slice-Künstlerin, Mutter & Wimbledon-Halbfinalistin.' },
      { rank: 86,  name: 'Laura Siegemund',   country: 'GER', note: 'Clevere Allrounderin, stark im Doppel.' },
      { rank: 112, name: 'Jule Niemeier',     country: 'GER', note: 'Kraftvolles Spiel, Viertelfinalistin in Wimbledon.' },
    ],
  };

  // ── Junge Talente zum Verfolgen (ATP & WTA) ─────────────────────
  // tour: 'atp' | 'wta'  ·  de:true → deutsch  ·  Reihenfolge = Vorschlag
  const PLAYERS = [
    { id: 'alcaraz',  tour: 'atp', name: 'Carlos Alcaraz',  country: 'ESP', age: 23, rank: 2,  initials: 'CA',
      tag: 'Der Superstar', note: 'Vollendete in Melbourne den Karriere-Grand-Slam – jüngster Spieler überhaupt.' },
    { id: 'sinner',   tour: 'atp', name: 'Jannik Sinner',   country: 'ITA', age: 24, rank: 1,  initials: 'JS',
      tag: 'Die Nummer 1', note: 'Holte sich nach Monte Carlo die Spitze zurück und führt seither souverän.' },
    { id: 'fonseca',  tour: 'atp', name: 'João Fonseca',    country: 'BRA', age: 19, rank: 25, initials: 'JF',
      tag: 'Senkrechtstarter', note: 'Mit 19 in Paris ins Achtelfinale – neue Bestmarke und Liebling der Fans.' },
    { id: 'andreeva', tour: 'wta', name: 'Mirra Andreeva',  country: 'RUS', age: 19, rank: 5,  initials: 'MA',
      tag: 'Wunderkind', note: 'Mit 19 schon in den Top 5 – abgeklärtes Spiel weit über ihr Alter hinaus.' },
    { id: 'mensik',   tour: 'atp', name: 'Jakub Menšík',    country: 'CZE', age: 20, rank: 17, initials: 'JM',
      tag: 'Größter Aufsteiger', note: 'Sprang nach starken French Open zehn Plätze nach vorn.' },
    { id: 'lys',      tour: 'wta', name: 'Eva Lys',         country: 'GER', age: 24, rank: 58, initials: 'EL', de: true,
      tag: 'Deutsche Hoffnung', note: 'Mutiges, offensives Spiel – Deutschlands spannendste junge Spielerin.' },
    { id: 'fils',     tour: 'atp', name: 'Arthur Fils',     country: 'FRA', age: 22, rank: 24, initials: 'AF',
      tag: 'Frankreichs Zukunft', note: 'Aktuell Vierter im „Race to Turin" – bärenstarke Saison.' },
    { id: 'shelton',  tour: 'atp', name: 'Ben Shelton',     country: 'USA', age: 23, rank: 5,  initials: 'BS',
      tag: 'Power-Aufschlag', note: 'Erstmals fest in den Top 5 – gewann zuletzt das Turnier in München.' },
    { id: 'mboko',    tour: 'wta', name: 'Victoria Mboko',  country: 'CAN', age: 19, rank: 22, initials: 'VM',
      tag: 'Newcomerin', note: 'Explosive Athletin – einer der größten Sprünge der Damen-Saison.' },
    { id: 'jodar',    tour: 'atp', name: 'Rafael Jódar',    country: 'ESP', age: 19, rank: 23, initials: 'RJ',
      tag: 'Teenager-Hoffnung', note: 'Mit 19 auf Karrierehoch – hielt sein Sand-Hoch in Paris.' },
    { id: 'noskova',  tour: 'wta', name: 'Linda Nosková',   country: 'CZE', age: 21, rank: 20, initials: 'LN',
      tag: 'Erstmals Top 20', note: 'Druckvolle Grundlinie – klopft an die erweiterte Weltspitze an.' },
    { id: 'tien',     tour: 'atp', name: 'Learner Tien',    country: 'USA', age: 20, rank: 19, initials: 'LT',
      tag: 'US-Talent', note: 'Linkshänder mit cleverem Spiel, erstmals in den Top 20.' },
    { id: 'cobolli',  tour: 'atp', name: 'Flavio Cobolli',  country: 'ITA', age: 24, rank: 10, initials: 'FC',
      tag: 'Paris-Finalist', note: 'Erstes Grand-Slam-Finale in Roland Garros – Karrierehoch Platz 10.' },
    { id: 'musetti',  tour: 'atp', name: 'Lorenzo Musetti',  country: 'ITA', age: 24, rank: 16, initials: 'LM',
      tag: 'Eleganz am Netz', note: 'Die schönste Einhand-Rückhand der Tour.' },
  ];

  // Standardmäßig aufs Dashboard: bunte Mischung Herren/Damen, inkl. Deutsche.
  const DEFAULT_FEATURED = ['alcaraz', 'sinner', 'fonseca', 'mensik', 'andreeva', 'lys'];

  // Bis zu diesem Alter gilt ein/e Spieler/in als „JUNG" (NextGen).
  const NEXTGEN_MAX_AGE = 23;

  // ── Helfer (Datum & Formatierung, deutsch) ──────────────────────
  const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const DAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  function parse(d) { const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day); }
  function startOfDay(dt) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }

  const helpers = {
    parse, startOfDay, MONTHS, DAYS, DAYS_SHORT, NEXTGEN_MAX_AGE,

    fmtDate(d, opts = {}) {
      const dt = typeof d === 'string' ? parse(d) : d;
      const wd = opts.weekday ? DAYS_SHORT[dt.getDay()] + ', ' : '';
      const yr = opts.year ? ' ' + dt.getFullYear() : '';
      return `${wd}${dt.getDate()}. ${MONTHS[dt.getMonth()]}${yr}`;
    },
    fmtRange(a, b) {
      const da = parse(a), db = parse(b);
      if (da.getMonth() === db.getMonth())
        return `${da.getDate()}.–${db.getDate()}. ${MONTHS[db.getMonth()]} ${db.getFullYear()}`;
      return `${da.getDate()}. ${MONTHS[da.getMonth()]} – ${db.getDate()}. ${MONTHS[db.getMonth()]} ${db.getFullYear()}`;
    },
    daysUntil(d) {
      const today = startOfDay(new Date());
      const target = startOfDay(typeof d === 'string' ? parse(d) : d);
      return Math.round((target - today) / 86400000);
    },
    // Nächstes anstehendes (oder gerade laufendes) Turnier.
    nextSlam(slams) {
      const today = startOfDay(new Date());
      const upcoming = slams
        .filter(s => startOfDay(parse(s.end)) >= today)
        .sort((a, b) => parse(a.start) - parse(b.start));
      return upcoming[0] || slams[slams.length - 1];
    },
    // Status eines Turniers relativ zu heute.
    slamStatus(s) {
      const today = startOfDay(new Date());
      const start = startOfDay(parse(s.start));
      const end = startOfDay(parse(s.end));
      if (today > end) return 'done';
      if (today >= start) return 'live';
      return 'upcoming';
    },
    // Ist dieser Name ein junges Talent (für die „JUNG"-Markierung)?
    isYoung(name) {
      return PLAYERS.some(p => p.name === name && p.age <= NEXTGEN_MAX_AGE);
    },
    // Initialen aus einem Namen (max. 2 Buchstaben).
    initialsOf(name) {
      return name.split(' ').map(w => w[0]).slice(0, 2).join('');
    },
  };

  // Global verfügbar machen (alle Skripte greifen auf window.TENNIS zu)
  window.TENNIS = {
    BROADCASTERS, SLAMS, RANKINGS, GERMANS, PLAYERS,
    DEFAULT_FEATURED, NEXTGEN_MAX_AGE, helpers,
  };
})();
