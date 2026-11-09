/* Pompe : la courbe de chaque pompe vendue croise celle de votre circuit. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h, S = U.svg;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { usage: 'bassin', V: 6000, Hg: 1, Lt: 5, D: 25, n: 2, C: 140, h: 24, prix: 0.2001, Qlibre: 2000 };
  var st = U.State.read(DEF), sel = null;
  var POMPES = (U.DATA.pompes || []);

  var big = h('p', { class: 'big tnum', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' }), stats = h('dl', { class: 'stats' });
  var res = h('div', null, h('span', { class: 'k' }, 'Débit à obtenir'), big, sub, stats);
  var chart = S('svg', { class: 'chart', role: 'img', 'aria-label': 'Courbes des pompes et de votre circuit' });
  var inst = S('svg', { class: 'inst', role: 'img', 'aria-label': 'Votre installation : hauteur à monter et hauteur perdue dans le tuyau' });
  var legend = h('p', { class: 'note' });
  var viz = [['Installation', h('div', { class: 'inst-box' }, inst)], ['Courbes', h('div', null, chart, legend)]];
  var IC = {
    aquaponie: '<svg viewBox="0 0 60 34"><path class="w" d="M14 22h32v8H14z"/><path class="l" d="M14 22h32v8H14zM12 15h36M30 15V7M30 10c-2-3-6-3-8-1M30 10c2-3 6-3 8-1"/></svg>',
    bassin: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50L42 28H18Z"/><path class="l" d="M2 7H10L18 28H42L50 7H58"/><path class="l" d="M25 17c3-3 7-3 10 0-3 3-7 3-10 0zM35 17l3-2v4z"/></svg>',
    koi: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50L42 28H18Z"/><path class="l" d="M2 7H10L18 28H42L50 7H58"/><path class="l" d="M20 17c5-5 13-5 18 0-5 5-13 5-18 0zM38 17l5-3v6z"/></svg>',
    libre: '<svg viewBox="0 0 60 34"><path class="w" d="M8 28h44v2H8z"/><path class="l" d="M8 6h14v8h12v8h18M24 14v12M36 22v6"/></svg>'
  };

  function set(k) { return function (v) { st[k] = v; sel = null; update(); }; }
  var usage = U.tiles({ label: 'Usage', value: st.usage, options: [['bassin', 'Bassin', IC.bassin], ['koi', 'Koïs', IC.koi], ['aquaponie', 'Aquaponie', IC.aquaponie], ['libre', 'Cascade, filtre', IC.libre]], onChange: function (v) { st.usage = v; sel = null; fQ.style.display = v === 'libre' ? '' : 'none'; fV.style.display = v === 'libre' ? 'none' : ''; update(); } });
  var fV = U.numField({ id: 'V', label: 'Volume d’eau', unit: 'L', value: st.V, min: 50, max: 100000, step: 50, onChange: set('V') });
  var fQ = U.numField({ id: 'Q', label: 'Débit voulu', unit: 'L/h', value: st.Qlibre, min: 100, max: 20000, step: 100, onChange: set('Qlibre'),  });
  var fH = U.numField({ id: 'Hg', label: 'Hauteur à monter', unit: 'm', value: st.Hg, min: 0, max: 8, step: 0.1, onChange: set('Hg') });
  var fL = U.numField({ id: 'Lt', label: 'Longueur de tuyau', unit: 'm', value: st.Lt, min: 0, max: 100, step: 1, onChange: set('Lt') });
  var diam = U.seg({ label: 'Diamètre du tuyau', small: true, value: String(st.D), options: [['16', '16 mm'], ['19', '19 mm'], ['25', '25 mm'], ['32', '32 mm'], ['40', '40 mm']], onChange: function (v) { st.D = +v; sel = null; update(); } });
  fQ.style.display = st.usage === 'libre' ? '' : 'none'; fV.style.display = st.usage === 'libre' ? 'none' : '';
  var fn = U.numField({ id: 'n', label: 'Coudes et raccords', value: st.n, min: 0, max: 30, step: 1, onChange: set('n') });
  var fh = U.numField({ id: 'h', label: 'Heures par jour', unit: 'h', value: st.h, min: 1, max: 24, step: 1, onChange: set('h') });
  var fp = U.numField({ id: 'prix', label: 'Prix du kWh', unit: '€', value: st.prix, min: 0.05, max: 1, step: 0.01, onChange: set('prix'), hint: 'Tarif réglementé Base au 1er août 2026.' });
  var tuyau = U.seg({ label: 'Tuyau', small: true, value: String(st.C), options: [['140', 'Lisse'], ['120', 'Annelé']], onChange: function (v) { st.C = +v; update(); } });

  var inp = h('div', null, usage, h('div', { class: 'fields two', style: 'margin-top:20px' }, fV, fQ, fH, fL), h('div', { style: 'margin-top:18px' }, diam));
  var prodBox = h('div'), tip = h('p', { class: 'tip' }), detail = h('div');
  var adv = h('div', null, h('div', { class: 'fields two' }, fn, fh, fp), h('div', { style: 'margin-top:16px' }, tuyau));
  var out = h('div', null, prodBox, tip,
    h('div', { class: 'chain' }, h('a', { class: 'go', href: U.url('calculateur-bache-bassin', 1) }, 'Calculer le volume du bassin'), h('a', { class: 'go', href: U.url('combien-de-poissons-bassin', 1) }, 'Filtre et UV-C pour ce bassin')),
    U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, adv: adv, viz: viz, detail: detail, out: out, vizFirst: true }));
  U.onResize(update);

  function lh(v) { return U.nf(U.round(v, v >= 1000 ? 50 : 10), 0) + ' L/h'; }

  function draw(r, shown, rec) {
    while (chart.firstChild) chart.removeChild(chart.firstChild);
    var W = Math.max(300, Math.round(chart.parentNode.clientWidth || 640)), H = Math.round(Math.min(380, Math.max(260, W * 0.62)));
    var mL = 40, mB = 30, mT = 14, mR = 12;
    var xMax = Math.max(r.vise.Q * 2.2, rec ? rec.p.q * 1.05 : 0), yMax = Math.max(r.Hmt * 1.8, rec ? rec.p.hm * 1.1 : 0, 1.5);
    shown.forEach(function (c) { xMax = Math.max(xMax, Math.min(c.p.q, r.vise.Q * 4)); });
    var sx = function (q) { return mL + q / xMax * (W - mL - mR); }, sy = function (hh) { return H - mB - hh / yMax * (H - mB - mT); };
    chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var g = S('g', { class: 'grid' });
    var stepX = niceStep(xMax / 4), stepY = niceStep(yMax / 4);
    for (var x = 0; x <= xMax; x += stepX) { g.appendChild(S('line', { x1: sx(x), y1: mT, x2: sx(x), y2: H - mB })); if (sx(x) < W - mR - 26) if (sx(x) < W - mR - 26) g.appendChild(S('text', { x: sx(x), y: H - 10, class: 'ax', 'text-anchor': 'middle' }, x ? U.nf(x, 0) : '0')); }
    for (var y = 0; y <= yMax; y += stepY) { g.appendChild(S('line', { x1: mL, y1: sy(y), x2: W - mR, y2: sy(y) })); g.appendChild(S('text', { x: mL - 6, y: sy(y) + 4, class: 'ax', 'text-anchor': 'end' }, U.nfa(y))); }
    chart.appendChild(S('rect', { x: sx(r.vise.Q), y: mT, width: Math.max(0, Math.min(sx(r.vise.Q * 1.8), W - mR) - sx(r.vise.Q)), height: H - mB - mT, class: 'band' }));
    chart.appendChild(g);
    chart.appendChild(S('text', { x: W - mR, y: H - mB - 6, class: 'ax', 'text-anchor': 'end' }, 'L/h'));
    chart.appendChild(S('text', { x: mL + 4, y: mT + 12, class: 'ax' }, 'm'));
    /* Courbe du circuit */
    var d = '', N = 40;
    for (var k = 0; k <= N; k++) { var q = xMax * k / N, hs = r.sys(q); if (hs > yMax) break; d += (k ? 'L' : 'M') + sx(q).toFixed(1) + ' ' + sy(hs).toFixed(1); }
    chart.appendChild(S('path', { d: d, class: 'sys' }));
    /* Pompes */
    var labels = null;
    shown.forEach(function (c) {
      var on = rec && c.p.vid === rec.p.vid;
      var x2 = Math.min(c.p.q, xMax), y2 = C.hPompe(c.p, x2);
      var line = 'M' + sx(0) + ' ' + sy(Math.min(c.p.hm, yMax)) + ' L' + sx(x2) + ' ' + sy(y2);
      if (c.p.hm > yMax) line = 'M' + sx(c.p.q * (1 - yMax / c.p.hm)) + ' ' + sy(yMax) + ' L' + sx(x2) + ' ' + sy(y2);
      var gp = S('g', { 'data-v': c.p.vid });
      gp.appendChild(S('path', { d: line, class: 'pc' + (on ? ' on' : '') }));
      gp.appendChild(S('path', { d: line, class: 'hit' }));
      if (c.Q > 0) gp.appendChild(S('circle', { cx: sx(c.Q), cy: sy(c.H), r: on ? 7 : 4.5, class: 'op' + (on ? ' on' : '') }));
      gp.addEventListener('click', function () { sel = c.p.vid; update(); });
      chart.appendChild(gp);
      if (on && c.Q > 0) labels = [c.Q, c.H, c.p.nom];
    });
    /* Étiquette de la pompe choisie, posée par-dessus tous les tracés */
    if (labels) {
      var tx = sx(labels[0]), right = tx < W * 0.62, ty = sy(labels[1]);
      chart.appendChild(S('text', { x: tx + (right ? 14 : -14), y: ty - 16, class: 'tag', 'text-anchor': right ? 'start' : 'end' }, labels[2]));
      chart.appendChild(S('text', { x: tx + (right ? 14 : -14), y: ty + 26, class: 'tag2', 'text-anchor': right ? 'start' : 'end' }, lh(labels[0]) + ' à ' + U.nfa(labels[1]) + ' m'));
    }
  }
  /* Votre installation : la hauteur à monter, puis la hauteur perdue dans le tuyau, empilées */
  function drawInst(r) {
    while (inst.firstChild) inst.removeChild(inst.firstChild);
    var W = Math.max(300, Math.round(inst.parentNode.clientWidth || 640)), H = 210, surf = 140, bot = 190, ground = 134;
    var px1 = 8, px2 = Math.round(W * 0.36), bx = W - 128, ox = Math.round(px2 + (bx - px2) / 2 - 6);
    var sc = Math.min(70, (surf - 30) / Math.max(r.Hmt, 0.3)), yOut = surf - st.Hg * sc, yTot = surf - r.Hmt * sc;
    inst.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    inst.appendChild(S('path', { d: 'M0 ' + ground + ' H' + px1 + ' L' + (px1 + 14) + ' ' + bot + ' H' + (px2 - 14) + ' L' + px2 + ' ' + ground + ' H' + W + ' V' + H + ' H0 Z', class: 'i-terre' }));
    inst.appendChild(S('path', { d: 'M' + (px1 + 2) + ' ' + surf + ' H' + (px2 - 2) + ' L' + (px2 - 14) + ' ' + bot + ' H' + (px1 + 14) + ' Z', class: 'i-eau' }));
    inst.appendChild(S('line', { x1: px1, y1: surf, x2: px2, y2: surf, class: 'i-surf' }));
    /* Sortie : lit de culture, filtre ou cascade, posée à la hauteur à monter */
    var ow = 70, oh = 22, oy = Math.min(yOut, ground - oh);
    inst.appendChild(S('rect', { x: ox - ow / 2, y: oy, width: ow, height: oh, rx: 5, class: 'i-out' }));
    inst.appendChild(S('text', { x: ox, y: oy - 8, class: 'lbl sm', 'text-anchor': 'middle' }, { aquaponie: 'Lit de culture', bassin: 'Filtre', koi: 'Filtre', libre: 'Sortie' }[st.usage]));
    if (oy + oh < ground) inst.appendChild(S('line', { x1: ox, y1: oy + oh, x2: ox, y2: ground, class: 'i-pied' }));
    /* Pompe et tuyau */
    var pmx = (px1 + px2) / 2, pmy = bot - 16;
    inst.appendChild(S('path', { d: 'M' + (pmx + 14) + ' ' + (pmy + 4) + ' H' + (px2 - 30) + ' L' + (px2 - 6) + ' ' + (ground - 6) + ' H' + (ox - ow / 2 - 14) + ' V' + (oy + oh / 2) + ' H' + (ox - ow / 2), class: 'i-pipe' }));
    inst.appendChild(S('rect', { x: pmx - 16, y: pmy - 6, width: 32, height: 20, rx: 6, class: 'i-pump' }));
    inst.appendChild(S('text', { x: pmx, y: bot - 30, class: 'lbl sm', 'text-anchor': 'middle' }, 'Pompe'));
    inst.appendChild(S('text', { x: px2 + 10, y: ground + 24, class: 'lbl sm', 'text-anchor': 'start' }, U.nfa(st.Lt) + ' m de tuyau, ' + st.D + ' mm'));
    /* Retour de l'eau */
    inst.appendChild(S('path', { d: 'M' + (ox - ow / 2 + 6) + ' ' + (oy + oh + 2) + ' Q' + (px2 + 30) + ' ' + (oy + 6) + ' ' + (px2 - 8) + ' ' + (surf - 6), class: 'i-ret' }));
    /* Hauteurs empilées */
    inst.appendChild(S('line', { x1: px2 - 2, y1: surf, x2: bx + 14, y2: surf, class: 'i-ref' }));
    inst.appendChild(S('rect', { x: bx, y: yOut, width: 14, height: surf - yOut, class: 'i-hg' }));
    inst.appendChild(S('rect', { x: bx, y: yTot, width: 14, height: Math.max(0, yOut - yTot), class: 'i-hf' }));
    inst.appendChild(S('text', { x: bx + 22, y: (surf + yOut) / 2 + 5, class: 'lbl sm' }, U.nfa(st.Hg) + ' m à monter'));
    if (yOut - yTot > 10) inst.appendChild(S('text', { x: bx + 22, y: (yOut + yTot) / 2 + 5, class: 'lbl sm hf' }, '+ ' + U.nfa(r.Hf) + ' m perdus'));
    inst.appendChild(S('text', { x: bx + 7, y: yTot - 10, class: 'lbl tot', 'text-anchor': 'middle' }, U.nfa(r.Hmt) + ' m'));
  }
  function niceStep(v) { var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }

  function update() {
    var r = C.pompe(st, POMPES);
    var cand = r.ok.slice(0, 5);
    if (cand.length < 3) cand = cand.concat(r.trop.slice(0, 3 - cand.length));
    if (!cand.length) cand = r.court.slice(0, 3);
    var rec = (sel && r.ok.concat(r.trop, r.court).filter(function (c) { return c.p.vid === sel; })[0]) || cand[0] || null;
    var shown = cand.slice(); if (rec && shown.indexOf(rec) < 0) shown.unshift(rec);
    U.tween(big, r.vise.Q, lh);
    sub.textContent = ({ bassin: 'Pour brasser ' + U.nf(st.V, 0) + ' L en deux heures.', koi: 'Pour brasser ' + U.nf(st.V, 0) + ' L en une heure, comme le demandent les koïs.', aquaponie: 'Le débit de la FAO pour un bassin de ' + U.nf(st.V, 0) + ' L.', libre: 'Le débit demandé par votre filtre, votre UV-C ou votre cascade.' })[st.usage];
    stats.innerHTML = '';
    [['Hauteur réelle', U.nfa(r.Hmt) + ' m'], ['Vitesse de l’eau', U.nfa(r.vitesse) + ' m/s'], ['Électricité', rec ? (rec.p.sol ? 'solaire' : U.nf(rec.eur, 0) + ' € par an') : '']].forEach(function (x) {
      stats.appendChild(h('div', null, h('dt', null, x[0]), h('dd', { class: x[0] === 'Vitesse de l’eau' && r.vitesse > 1.5 ? 'warn' : '' }, x[1])));
    });
    drawInst(r);
    draw(r, shown, rec);
    legend.textContent = 'Trait épais : votre circuit. Touchez une pompe pour la comparer.';

    prodBox.innerHTML = '';
    if (!r.ok.length && !r.trop.length) prodBox.appendChild(h('div', { class: 'prods' }, h('h3', null, 'Aucune pompe vendue n’atteint ce débit à cette hauteur'), h('p', { class: 'note' }, 'Réduisez la hauteur, élargissez le tuyau, ou partagez le débit entre deux pompes.')));
    var list = (rec ? [rec] : []).concat(cand.filter(function (c) { return c !== rec; })).slice(0, 4);
    prodBox.appendChild(U.prodList(r.ok.length ? 'Les pompes au bon point' : 'Les plus proches', list.map(function (c) {
      return { h: c.p.h, vid: c.p.vid, title: c.p.nom, why: lh(c.Q) + ' à ' + U.nfa(c.H) + ' m, ' + U.nfa(c.p.w) + ' W, ' + (c.p.sol ? 'solaire' : U.nf(c.eur, 0) + ' € par an') };
    }), { top: true }));

    var gain = r.Hf - r.Hf2;
    tip.style.display = gain > 0.15 && r.D2 !== st.D ? '' : 'none';
    tip.textContent = 'En ' + r.D2 + ' mm au lieu de ' + st.D + ' mm, vous gagnez ' + U.nfa(gain) + ' m de hauteur.' + (r.vitesse > 1.5 ? ' L’eau circule à ' + U.nfa(r.vitesse) + ' m/s dans votre tuyau, au-delà de 1,5 m/s les pertes grimpent vite.' : '');

    detail.innerHTML = '';
    detail.appendChild(U.trace([
      ['Débit visé', lh(r.vise.Q)], { f: ({ fao: 'FAO 589, table 8.1, interpolée sur ' + U.nf(st.V, 0) + ' L' + (r.vise.extra ? ' (hors table, extrapolé)' : ''), bassin: U.nf(st.V, 0) + ' L / 2 h', koi: U.nf(st.V, 0) + ' L / 1 h', libre: 'saisi' })[r.vise.src] },
      ['Longueur équivalente', U.nfa(st.Lt + r.Le) + ' m'], { f: U.nfa(st.Lt) + ' m + ' + st.n + ' × ' + (st.D <= 32 ? '0,5' : '1') + ' m' },
      ['Pertes dans le tuyau', U.nf(r.Hf, 2) + ' m'], { f: '10,67 × ' + U.nfa(st.Lt + r.Le) + ' × Q^1,852 / (' + st.C + '^1,852 × ' + U.nf(st.D / 1000, 3) + '^4,8704)' },
      ['Hauteur réelle', U.nf(r.Hmt, 2) + ' m'], ['Vitesse dans le tuyau', U.nf(r.vitesse, 2) + ' m/s']
    ].concat(rec ? [['Point de fonctionnement', lh(rec.Q) + ' à ' + U.nf(rec.H, 2) + ' m'], { f: rec.p.nom + ' : droite de ' + U.nf(rec.p.q, 0) + ' L/h à ' + U.nfa(rec.p.hm) + ' m (estimation prudente)' }, ['Consommation', U.nf(rec.kwh, 0) + ' kWh, ' + U.nf(rec.eur, 0) + ' € par an']] : [])));
    U.State.write(st, DEF);
  }
  update();
});
