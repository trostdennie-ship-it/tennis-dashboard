/* =================================================================
   Icon-Set · schlanke Linien-Icons (SVG, nutzen currentColor)
   Jede Funktion liefert einen SVG-String zurück.
   Aufruf z. B.: Ic.ball({ size: 20 })
   ================================================================= */
(function () {
  // Grund-Hülle für ein 24×24-Icon
  function svg(inner, o = {}) {
    const size = o.size || 24;
    const sw = o.sw || 1.7;
    const fill = o.fill || 'none';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" `
      + `stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" `
      + `aria-hidden="true">${inner}</svg>`;
  }

  const Ic = {
    // Navigation
    today:    (p) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>', p),
    ranking:  (p) => svg('<path d="M7 21V10M12 21V4M17 21v-7"/>', p),
    schedule: (p) => svg('<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>', p),
    players:  (p) => svg('<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>', p),
    // Live: konzentrische „Funk"-Bögen
    live: (p) => svg(
      '<circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>'
      + '<path d="M7 7.5a6.4 6.4 0 0 0 0 9M17 7.5a6.4 6.4 0 0 1 0 9M4 4.5a10.5 10.5 0 0 0 0 15M20 4.5a10.5 10.5 0 0 1 0 15"/>', p),

    // Inhalte
    tv:       (p) => svg('<rect x="3" y="6.5" width="18" height="12" rx="2"/><path d="M8 3.5l4 3 4-3"/>', p),
    trophy:   (p) => svg('<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5v1A3.5 3.5 0 0 0 8 10.5M17 6h2.5v1A3.5 3.5 0 0 1 16 10.5M9.5 14.5l-.5 4h6l-.5-4M8 20.5h8"/>', p),
    pin:      (p) => svg('<path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>', p),
    clock:    (p) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>', p),
    calendar: (p) => svg('<rect x="4" y="5" width="16" height="15" rx="2.4"/><path d="M4 9.5h16M9 3v4M15 3v4"/>', p),
    globe:    (p) => svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z"/>', p),

    // Pfeile & Steuerung
    arrowUp:   (p) => svg('<path d="M12 19V6M6 12l6-6 6 6"/>', p),
    arrowDown: (p) => svg('<path d="M12 5v13M6 12l6 6 6-6"/>', p),
    chevron:   (p) => svg('<path d="M9 6l6 6-6 6"/>', p),
    check:     (p) => svg('<path d="M5 12.5l4.5 4.5L19 7"/>', p),
    refresh:   (p) => svg('<path d="M3.5 12a8.5 8.5 0 0 1 14.5-6M20.5 12a8.5 8.5 0 0 1-14.5 6"/><path d="M17 3v3.5h-3.5M7 21v-3.5h3.5"/>', p),
    plus:      (p) => svg('<path d="M12 5v14M5 12h14"/>', p),
    search:    (p) => svg('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16.5 16.5"/>', p),
    x:         (p) => svg('<path d="M6 6l12 12M18 6L6 18"/>', p),
    gear:      (p) => svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5l1.4 2.3 2.7-.3 .6 2.6 2.4 1.2-.9 2.6.9 2.6-2.4 1.2-.6 2.6-2.7-.3L12 20.5l-1.4-2.3-2.7.3-.6-2.6-2.4-1.2.9-2.6-.9-2.6 2.4-1.2 .6-2.6 2.7.3Z"/>', p),
    sun:       (p) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>', p),
    moon:      (p) => svg('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>', p),
    star: (p = {}) => svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
      { ...p, fill: p.filled ? 'currentColor' : 'none' }),

    // Tennisball (Wortmarke)
    ball: (p = {}) => {
      const size = p.size || 24, sw = p.sw || 1.6;
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
        + `stroke-width="${sw}" stroke-linecap="round" aria-hidden="true">`
        + '<circle cx="12" cy="12" r="9"/><path d="M5 5c3 2.5 3 9.5 0 14M19 5c-3 2.5-3 9.5 0 14"/></svg>';
    },
  };

  window.Ic = Ic;
})();
