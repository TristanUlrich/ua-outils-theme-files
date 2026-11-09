/* Lire une analyse d'eau : on touche la valeur lue sur le nuancier, le bulletin se remplit. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { milieu: 'aquaponie', T: 22, ph: 7, nh4: 0.25, no2: 0.5, no3: '', kh: '', o2: '' };
  var st = U.State.read(DEF);
  ['ph', 'nh4', 'no2', 'no3', 'kh', 'o2'].forEach(function (k) { st[k] = st[k] === '' || st[k] == null ? null : +st[k]; });
  var P = [
    ['ph', 'pH', '', [6, 6.5, 7, 7.5, 8, 8.5, 9]],
    ['nh4', 'Ammonium NH₄', 'mg/L', [0, 0.25, 0.5, 1, 2, 5]],
    ['no2', 'Nitrites NO₂', 'mg/L', [0, 0.05, 0.1, 0.25, 0.5, 1]],
    ['no3', 'Nitrates NO₃', 'mg/L', [0, 5, 10, 25, 50, 100, 200]],
    ['kh', 'KH', '°dH', [1, 2, 3, 4, 5, 6, 8, 10, 12]],
    ['o2', 'Oxygène O₂', 'mg/L', [2, 4, 6, 8, 10]]
  ];
  var CAUSES = {
    cycle: ['Cycle de l’azote débordé', 'Les bactéries du filtre ne suivent pas. Arrêtez de nourrir deux jours, changez une partie de l’eau, ajoutez des bactéries et remesurez demain.', ['activateur-bacterien-easy-start']],
    nitrites: ['Pic de nitrites', 'Les bactéries qui transforment les nitrites sont en retard sur les autres. Nourrissez moins, aérez et remesurez dans 24 heures.', ['activateur-bacterien-easy-start']],
    phAmmo: ['Le pH rend l’ammoniac plus toxique', 'Au-dessus de pH 7,5, chaque dixième de pH en plus augmente la part toxique. Ne remontez pas le pH tant que l’ammonium n’est pas retombé.', []],
    kh: ['Réserve alcaline trop basse', 'Sous ce KH, le pH peut chuter d’un coup, souvent la nuit. Relevez le KH d’un ou deux degrés, pas plus par jour.', ['bicarbonate-de-potassium']],
    o2: ['Oxygène insuffisant', 'Les poissons viennent respirer en surface. Ajoutez un bulleur, surtout la nuit et par forte chaleur.', ['pompe-air-hailea-aco-80-3600-lh']],
    no3haut: ['Nitrates élevés', 'Changez une partie de l’eau. En aquaponie, ajoutez des plantes ou réduisez la ration : il y a plus de poissons que de cultures.', []],
    no3bas: ['Plantes à court d’azote', 'Sous 5 mg/L, augmentez doucement la ration des poissons si les autres valeurs sont bonnes.', []],
    phFer: ['Le fer se bloque au-dessus de pH 7', 'Les jeunes feuilles jaunissent entre les nervures. Le chélate EDDHA reste disponible à ce pH.', ['fer-chelate-eddha-6']],
    co2: ['CO2 élevé', 'Le CO2 calculé dépasse 30 mg/L. Aérez : le bulleur chasse le CO2 en même temps qu’il apporte de l’oxygène.', ['pompe-air-hailea-aco-80-3600-lh']]
  };

  var verdict = h('p', { class: 'verdict', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' }), calc = h('div', { class: 'calcs' });
  var res = h('div', null, h('span', { class: 'k' }, 'Diagnostic'), verdict, sub, calc);

  var IC = {
    aquaponie: '<svg viewBox="0 0 60 34"><path class="w" d="M14 22h32v8H14z"/><path class="l" d="M14 22h32v8H14zM12 15h36M30 15V7M30 10c-2-3-6-3-8-1M30 10c2-3 6-3 8-1"/></svg>',
    bassin: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50L42 28H18Z"/><path class="l" d="M2 7H10L18 28H42L50 7H58"/><path class="l" d="M25 17c3-3 7-3 10 0-3 3-7 3-10 0zM35 17l3-2v4z"/></svg>'
  };
  var milieu = U.tiles({ label: 'Votre eau', value: st.milieu, options: [['aquaponie', 'Aquaponie', IC.aquaponie], ['bassin', 'Bassin, aquarium froid', IC.bassin]], onChange: function (v) { st.milieu = v; update(); } });
  /* L'ammoniac toxique selon le pH, pour l'ammonium mesuré : où passe la limite */
  var curve = U.svg('svg', { class: 'nh3c', role: 'img', 'aria-label': 'Ammoniac toxique selon le pH pour votre ammonium' }), curveNote = h('p', { class: 'note' });
  /* Votre eau d'un coup d'œil : chaque valeur sur sa jauge, zones bonne, à surveiller, danger */
  var gauges = h('div', { class: 'gauges' });
  var viz = [['Votre eau', gauges], ['Ammoniac', h('div', null, h('div', { class: 'nh3-box' }, curve), curveNote)]];
  var fT = U.numField({ id: 'T', label: 'Température', unit: '°C', value: st.T, min: 0, max: 35, step: 0.5, onChange: function (v) { st.T = v; update(); } });
  var rows = h('div', { class: 'bulletin' });
  P.forEach(function (p) {
    var chips = h('div', { class: 'chips', role: 'group', 'aria-label': p[1] });
    p[3].forEach(function (v) {
      var b = h('button', { type: 'button', 'data-v': v, 'aria-pressed': 'false' }, U.nfa(v));
      b.addEventListener('click', function () { st[p[0]] = st[p[0]] === v ? null : v; update(); });
      chips.appendChild(b);
    });
    var row = h('div', { class: 'brow' }, h('div', { class: 'bhead' }, h('strong', null, p[1]), h('span', { class: 'unit' }, p[2]), h('span', { class: 'bst' })), chips);
    row._p = p; rows.appendChild(row);
  });
  var inp = h('div', null, milieu, h('div', { style: 'margin:18px 0 6px;max-width:220px' }, fT), h('span', { class: 'k', style: 'margin-top:18px' }, 'Touchez la valeur lue'), rows);

  var causesBox = h('div', { class: 'causes' }), missBox = h('div'), hist = h('div', { class: 'hist' }), detail = h('div');
  var save = h('button', { type: 'button', class: 'btn' }, 'Garder cette analyse');
  save.addEventListener('click', function () {
    var list = U.Store.get('analyses', []);
    list.unshift({ d: new Date().toISOString().slice(0, 10), m: st.milieu, v: verdict.textContent, s: location.search });
    U.Store.set('analyses', list.slice(0, 12)); save.textContent = 'Analyse gardée sur cet appareil'; renderHist();
    setTimeout(function () { save.textContent = 'Garder cette analyse'; }, 2000);
  });
  var out = h('div', null, causesBox, missBox, U.actions(save));
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: viz, adv: hist, advLabel: 'Mes analyses enregistrées', detail: detail, out: out }));

  U.onResize(function () { update(); });
  function drawCurve() {
    var S = U.svg; while (curve.firstChild) curve.removeChild(curve.firstChild);
    var nh4 = st.nh4 == null ? 1 : Math.max(st.nh4, 0.05), T = st.T;
    var W = Math.max(300, Math.round(curve.parentNode.clientWidth || 600)), H = 230, mL = 46, mR = 10, mT = 12, mB = 30;
    var f = function (ph) { return C.nh3(nh4, ph, T).nh3; };
    var yMax = Math.max(0.08, Math.min(f(9), Math.max(0.12, (st.ph != null ? f(st.ph) : 0) * 2.2)));
    var sx = function (ph) { return mL + (ph - 6) / 3 * (W - mL - mR); }, sy = function (v) { return H - mB - v / yMax * (H - mB - mT); };
    curve.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    [[0, 0.02, 'z-ok'], [0.02, 0.05, 'z-warn'], [0.05, yMax, 'z-bad']].forEach(function (z) { if (z[0] < yMax) curve.appendChild(S('rect', { x: mL, y: sy(Math.min(z[1], yMax)), width: W - mL - mR, height: sy(z[0]) - sy(Math.min(z[1], yMax)), class: z[2] })); });
    for (var ph = 6; ph <= 9.001; ph += 0.5) { curve.appendChild(S('line', { x1: sx(ph), y1: mT, x2: sx(ph), y2: H - mB, class: 'g' })); curve.appendChild(S('text', { x: sx(ph), y: H - 10, class: 'ax', 'text-anchor': 'middle' }, U.nfa(ph))); }
    [0.02, 0.05].forEach(function (v) { if (v < yMax) curve.appendChild(S('text', { x: mL - 6, y: sy(v) + 4, class: 'ax', 'text-anchor': 'end' }, U.nfa(v))); });
    curve.appendChild(S('text', { x: mL - 6, y: H - mB + 4, class: 'ax', 'text-anchor': 'end' }, '0'));
    curve.appendChild(S('text', { x: W - mR, y: H - mB - 6, class: 'ax', 'text-anchor': 'end' }, 'pH'));
    var d = '';
    for (var k = 0; k <= 60; k++) { var p = 6 + 3 * k / 60; d += (k ? 'L' : 'M') + sx(p).toFixed(1) + ' ' + Math.max(-50, sy(f(p))).toFixed(1); }
    var cp = S('clipPath', { id: 'nh3clip' }); cp.appendChild(S('rect', { x: mL, y: mT, width: W - mL - mR, height: H - mB - mT })); var df = S('defs'); df.appendChild(cp); curve.appendChild(df);
    curve.appendChild(S('path', { d: d, class: 'cv-line', 'clip-path': 'url(#nh3clip)' }));
    /* pH où l'ammoniac atteint la limite de 0,02 mg/L */
    var a = 6, b = 9; if (f(9) > 0.02 && f(6) < 0.02) { for (var j = 0; j < 40; j++) { var m = (a + b) / 2; if (f(m) < 0.02) a = m; else b = m; } curve.appendChild(S('line', { x1: sx(a), y1: sy(0.02), x2: sx(a), y2: H - mB, class: 'lim' })); }
    if (st.ph != null && st.nh4 != null) {
      var v = f(st.ph), cx = sx(st.ph), cy = sy(v), right = cx < W * 0.6;
      curve.appendChild(S('circle', { cx: cx, cy: cy, r: 7, class: 'pt' }));
      curve.appendChild(S('text', { x: cx + (right ? 12 : -12), y: cy - 10, class: 'tag', 'text-anchor': right ? 'start' : 'end' }, U.nf(v, 3) + ' mg/L à pH ' + U.nfa(st.ph)));
    }
    curveNote.textContent = (st.nh4 == null ? 'Pour 1 mg/L d’ammonium, à ' : 'Pour ' + U.nfa(st.nh4) + ' mg/L d’ammonium, à ') + U.nfa(T) + ' °C. ' + (f(9) > 0.02 && f(6) < 0.02 ? 'Au-delà de pH ' + U.nf(a, 1) + ', l’ammoniac passe la limite de 0,02 mg/L.' : f(6) >= 0.02 ? 'L’ammoniac dépasse la limite même à pH 6 : baissez l’ammonium d’abord.' : 'L’ammoniac reste sous la limite jusqu’à pH 9.');
  }
  function renderHist() {
    var list = U.Store.get('analyses', []);
    hist.innerHTML = '';
    if (!list.length) { hist.appendChild(h('p', { class: 'note' }, 'Gardez une analyse pour suivre l’évolution. Elle reste sur cet appareil, rien n’est envoyé.')); return; }
    list.forEach(function (a) { hist.appendChild(h('a', { class: 'go', href: location.pathname + a.s }, a.d.split('-').reverse().join('/') + ', ' + a.v)); });
  }

  function update() {
    var r = C.eau(st), S = C.SEUILS[st.milieu];
    U.$$('.brow', rows).forEach(function (row) {
      var k = row._p[0], s = r.st[k];
      U.$$('button', row).forEach(function (b) {
        var v = +b.getAttribute('data-v'), on = st[k] === v;
        b.setAttribute('aria-pressed', String(on));
        b.className = on ? 'on ' + (s || '') : '';
      });
      var lbl = U.$('.bst', row);
      lbl.className = 'bst' + (s ? ' st ' + s : '');
      lbl.textContent = s ? { ok: 'Bon', warn: 'À surveiller', bad: 'Danger' }[s] : 'Non mesuré';
    });
    var order = ['cycle', 'nitrites', 'o2', 'phAmmo', 'kh', 'co2', 'phFer', 'no3haut', 'no3bas'];
    var causes = order.filter(function (c) { return r.causes.indexOf(c) > -1; });
    var measured = P.filter(function (p) { return st[p[0]] != null; }).length;
    var bad = Object.keys(r.st).some(function (k) { return r.st[k] === 'bad'; });
    if (!measured) { verdict.textContent = 'Touchez vos premiers résultats'; sub.textContent = 'Chaque valeur se lit tout de suite. Plus vous en saisissez, plus le diagnostic est sûr.'; }
    else if (causes.length) { verdict.textContent = CAUSES[causes[0]][0]; sub.textContent = CAUSES[causes[0]][1]; }
    else { verdict.textContent = 'Eau saine'; sub.textContent = 'Les ' + measured + ' valeurs saisies sont dans les plages ' + (st.milieu === 'aquaponie' ? 'de l’aquaponie.' : 'conseillées.'); }
    verdict.className = 'verdict ' + (bad ? 'is-bad' : causes.length ? 'is-warn' : measured ? 'is-ok' : '');

    drawCurve();
    gauges.innerHTML = '';
    P.forEach(function (p) {
      var k = p[0], v = st[k], sc = S[k], lo = p[3][0], hi = p[3][p[3].length - 1];
      var pos = function (x) { return (U.clamp(x, lo, hi) - lo) / (hi - lo) * 100; };
      var bar = h('div', { class: 'gb' });
      bar.appendChild(h('i', { class: 'gz bad', style: 'left:0;width:100%' }));
      bar.appendChild(h('i', { class: 'gz warn', style: 'left:' + pos(sc[2]) + '%;width:' + (pos(sc[3]) - pos(sc[2])) + '%' }));
      bar.appendChild(h('i', { class: 'gz ok', style: 'left:' + pos(sc[0]) + '%;width:' + (pos(sc[1]) - pos(sc[0])) + '%' }));
      if (v != null) bar.appendChild(h('b', { class: 'gm ' + (r.st[k] || ''), style: 'left:' + pos(v) + '%' }));
      gauges.appendChild(h('div', { class: 'gr' + (v == null ? ' off' : '') }, h('span', { class: 'gl' }, p[1].replace(/^(Ammonium|Nitrites|Nitrates|Oxygène) /, '')), bar,
        h('span', { class: 'gv tnum ' + (r.st[k] || '') }, v == null ? 'non mesuré' : U.nfa(v) + (p[2] ? ' ' + p[2] : ''))));
    });
    calc.innerHTML = '';
    function cv(lbl, val, s) { calc.appendChild(h('div', { class: 'cv' }, h('span', { class: 'k' }, lbl), h('span', { class: 'mid tnum' }, val), s ? h('span', { class: 'st ' + s }, { ok: 'Bon', warn: 'Limite', bad: 'Toxique' }[s]) : null)); }
    if (r.calc.nh3) cv('Ammoniac toxique', U.nf(r.calc.nh3.nh3, 3) + ' mg/L', r.st.nh3);
    if (r.calc.co2) cv('CO2 dissous', U.nf(r.calc.co2.co2, 0) + ' mg/L', r.st.co2);
    if (r.calc.o2pct != null) cv('Oxygène', U.nf(r.calc.o2pct, 0) + ' % de saturation', r.calc.o2pct >= 80 ? 'ok' : r.calc.o2pct >= 60 ? 'warn' : 'bad');

    causesBox.innerHTML = '';
    causes.forEach(function (c, i) {
      var k = CAUSES[c];
      var item = h('div', { class: 'cause' }, h('h3', null, i === 0 ? 'Pour corriger' : k[0]), i === 0 ? null : h('p', null, k[1]));
      if (k[2].length) item.appendChild(U.prodList(null, k[2].map(function (hh) { return { h: hh }; })));
      causesBox.appendChild(item);
    });
    missBox.innerHTML = '';
    var miss = P.filter(function (p) { return st[p[0]] == null; }).map(function (p) { return p[0]; });
    if (miss.length) {
      var T = U.DATA.tests || {};
      var items = miss.length >= 3 && T[st.milieu === 'aquaponie' ? 'pack_aquaponie' : 'mallette_bassin'] ? [{ h: T[st.milieu === 'aquaponie' ? 'pack_aquaponie' : 'mallette_bassin'], why: 'Pour tout mesurer d’un coup' }] : [];
      miss.slice(0, 3).forEach(function (k) { if (T[k]) items.push({ h: T[k] }); });
      missBox.appendChild(U.prodList('Pour compléter le diagnostic', items.slice(0, 3)));
    }
    detail.innerHTML = '';
    var t = [];
    if (r.calc.nh3) { t.push(['Part toxique de l’ammonium', U.nf(r.calc.nh3.f * 100, 2) + ' %']); t.push({ f: 'pKa = ' + U.nf(r.calc.nh3.pKa, 3) + ' à ' + U.nfa(st.T) + ' °C, pH ' + U.nfa(st.ph) }); }
    if (r.calc.co2) { t.push(['CO2', U.nf(r.calc.co2.co2, 1) + ' mg/L']); t.push({ f: 'pK1 = ' + U.nf(r.calc.co2.pK1, 3) + ' ; ' + U.nfa(st.kh) + ' × 0,3566 × 44,01 × 10^(' + U.nf(r.calc.co2.pK1, 2) + ' − ' + U.nfa(st.ph) + ')' }); }
    t.push(['Oxygène à saturation', U.nf(r.calc.o2sat, 2) + ' mg/L']);
    t.push(['Plages appliquées', st.milieu === 'aquaponie' ? 'FAO 589' : 'fiches des tests']);
    detail.appendChild(U.trace(t));
    var q = { milieu: st.milieu, T: st.T }; P.forEach(function (p) { q[p[0]] = st[p[0]] == null ? '' : st[p[0]]; });
    U.State.write(q, DEF);
  }
  update(); renderHist();
});
