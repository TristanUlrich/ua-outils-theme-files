/* Bâche et volume de bassin : la bâche à plat, avec ses zones (fond, parois, rebord), et la coupe du bassin. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h, S = U.svg;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { forme: 'rect', L: 3, l: 2, P: 0.6, profil: 'paliers', R: 0.3, Pm: 0, deb: 15 };
  var st = U.State.read(DEF);
  var epdm = U.product('bache-epdm-pour-bassin'), hdpe = U.product('bache-hdpe-bassin'), cond = U.product('conditionneur-eau-robinet-easy-life-aquamaker');

  /* Pictogrammes des tuiles */
  var IC = {
    rect: '<svg viewBox="0 0 60 34"><rect class="w" x="10" y="5" width="40" height="24" rx="2"/><rect class="l" x="10" y="5" width="40" height="24" rx="2"/></svg>',
    ovale: '<svg viewBox="0 0 60 34"><ellipse class="w" cx="30" cy="17" rx="21" ry="12"/><ellipse class="l" cx="30" cy="17" rx="21" ry="12"/></svg>',
    libre: '<svg viewBox="0 0 60 34"><path class="w" d="M12 18c-2-8 6-13 14-11 5 1 7-3 13-2 8 1 12 8 9 15-3 8-12 10-19 8-7-2-15 0-17-10z"/><path class="l" d="M12 18c-2-8 6-13 14-11 5 1 7-3 13-2 8 1 12 8 9 15-3 8-12 10-19 8-7-2-15 0-17-10z"/></svg>',
    droit: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50V28H10Z"/><path class="l" d="M2 7H10V28H50V7H58"/></svg>',
    paliers: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50V16H42V28H18V16H10Z"/><path class="l" d="M2 7H10V16H18V28H42V16H50V7H58"/></svg>',
    pente: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50L40 28H20Z"/><path class="l" d="M2 7H10L20 28H40L50 7H58"/></svg>'
  };

  /* Résultat */
  var big = h('p', { class: 'big tnum', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' }), stats = h('dl', { class: 'stats' });
  var res = h('div', null, h('span', { class: 'k' }, 'Bâche à prévoir'), big, sub, stats);
  var plan = S('svg', { class: 'plan', role: 'img', 'aria-label': 'La bâche à plat, avec le fond, les parois et le rebord' });
  var coupe = S('svg', { class: 'coupe', role: 'img', 'aria-label': 'Coupe du bassin' });
  var legend = h('ul', { class: 'legend' });
  var viz = [['Bâche à plat', h('div', { class: 'viz' }, h('div', { class: 'plan-box' }, plan), legend)], ['Coupe', h('div', { class: 'viz' }, h('div', { class: 'coupe-box' }, coupe))]];

  /* Saisie */
  function set(k) { return function (v) { st[k] = v; update(); }; }
  var fL = U.numField({ id: 'L', label: 'Longueur', unit: 'm', value: st.L, min: 0.5, max: 30, step: 0.1, onChange: set('L') });
  var fl = U.numField({ id: 'l', label: 'Largeur', unit: 'm', value: st.l, min: 0.5, max: 30, step: 0.1, onChange: set('l') });
  var fP = U.numField({ id: 'P', label: 'Profondeur', unit: 'm', value: st.P, min: 0.2, max: 3, step: 0.05, onChange: set('P') });
  var forme = U.tiles({ label: 'Forme du bassin', value: st.forme, options: [['rect', 'Rectangle', IC.rect], ['ovale', 'Ovale ou rond', IC.ovale], ['libre', 'Forme libre', IC.libre]], onChange: set('forme') });
  var profil = U.tiles({ label: 'Berges', value: st.profil, options: [['droit', 'Parois droites', IC.droit], ['paliers', 'Paliers', IC.paliers], ['pente', 'Pente douce', IC.pente]], onChange: set('profil') });
  var fR = U.numField({ id: 'R', label: 'Rebord', unit: 'cm', value: st.R * 100, min: 0, max: 100, step: 5, onChange: function (v) { st.R = v / 100; update(); }, hint: '30 cm de chaque côté, 45 cm sous de grosses pierres.' });
  var fPm = U.numField({ id: 'Pm', label: 'Profondeur moyenne', unit: 'm', value: st.Pm || 0, min: 0, max: 3, step: 0.05, onChange: set('Pm'), hint: '0 : coefficient de vos berges.' });
  var fD = U.numField({ id: 'deb', label: 'Débit du robinet', unit: 'L/min', value: st.deb, min: 1, max: 100, step: 1, onChange: set('deb'), hint: 'Un seau de 10 L rempli en 40 s : 15 L/min.' });
  var adv = h('div', { class: 'fields two' }, fR, fPm, fD);
  var inp = h('div', { class: 'ctrl' }, forme, h('div', { class: 'fields three', style: 'margin-top:22px' }, fL, fl, fP), h('div', { style: 'margin-top:22px' }, profil));
  var prodBox = h('div'), eauBox = h('div'), chain = h('div', { class: 'chain' }), detail = h('div');
  var out = h('div', { class: 'ctrl' }, prodBox, eauBox, chain, U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, adv: adv, viz: viz, detail: detail, out: out, vizFirst: true }));
  U.onResize(update);

  function m(v) { return U.nfa(v) + ' m'; }
  function cm(v) { return U.nf(v * 100, 0) + ' cm'; }
  function dur(min) { if (min < 60) return U.nf(Math.max(1, Math.round(min)), 0) + ' min'; var hh = Math.floor(min / 60), mm = Math.round(min % 60 / 5) * 5; if (mm === 60) { hh++; mm = 0; } return hh + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') : ''); }

  /* La bâche à plat : rebord, parois, fond, et la taille en stock */
  function drawPlan(r, best) {
    while (plan.firstChild) plan.removeChild(plan.firstChild);
    var W = Math.max(300, Math.round(plan.parentNode.clientWidth || 640)), mL = 34, mT = 34, mR = 8, mB = best ? 30 : 8;
    var Wm = Math.max(r.Lb, best ? best.a : 0), Hm = Math.max(r.lb, best ? best.b : 0);
    var s = (W - mL - mR) / Wm, Hmax = Math.min(460, window.innerHeight * 0.55);
    if (Hm * s + mT + mB > Hmax) s = (Hmax - mT - mB) / Hm;
    var H = Hm * s + mT + mB;
    plan.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var x0 = mL, y0 = mT, lw = r.Lb * s, lh = r.lb * s, R = r.R * s, P = r.P * s;
    var defs = S('defs'), pat = S('pattern', { id: 'pierres', width: 14, height: 14, patternUnits: 'userSpaceOnUse' });
    pat.appendChild(S('circle', { cx: 4, cy: 4, r: 2.2, class: 'pi' })); pat.appendChild(S('circle', { cx: 11, cy: 10, r: 1.6, class: 'pi' }));
    defs.appendChild(pat); plan.appendChild(defs);
    plan.appendChild(S('rect', { x: x0, y: y0, width: lw, height: lh, rx: 3, class: 'z-rebord' }));
    plan.appendChild(S('rect', { x: x0, y: y0, width: lw, height: lh, rx: 3, fill: 'url(#pierres)' }));
    plan.appendChild(S('rect', { x: x0 + R, y: y0 + R, width: lw - 2 * R, height: lh - 2 * R, rx: 2, class: 'z-paroi' }));
    var px = x0 + R + P, py = y0 + R + P, pw = r.L * s, ph = r.l * s;
    var fond = r.forme === 'ovale' ? S('ellipse', { cx: px + pw / 2, cy: py + ph / 2, rx: pw / 2, ry: ph / 2, class: 'z-fond' })
      : S('rect', { x: px, y: py, width: pw, height: ph, rx: r.forme === 'libre' ? Math.min(pw, ph) * 0.42 : 2, class: 'z-fond' });
    plan.appendChild(fond);
    /* Zone profonde, au-delà des paliers ou de la pente */
    if (st.profil !== 'droit') {
      var k = st.profil === 'paliers' ? 0.3 : 0.55, ix = pw / 2 * k, iy = ph / 2 * k;
      plan.appendChild(r.forme === 'ovale' ? S('ellipse', { cx: px + pw / 2, cy: py + ph / 2, rx: pw / 2 - ix, ry: ph / 2 - iy, class: 'z-deep' })
        : S('rect', { x: px + ix, y: py + iy, width: pw - 2 * ix, height: ph - 2 * iy, rx: r.forme === 'libre' ? Math.min(pw, ph) * 0.3 : 2, class: 'z-deep' }));
    } else fond.setAttribute('class', 'z-fond z-deep');
    /* Plis d'angle : la bâche se replie le long des parois */
    if (r.forme === 'rect') [[x0 + R, y0 + R, 1, 1], [x0 + lw - R, y0 + R, -1, 1], [x0 + R, y0 + lh - R, 1, -1], [x0 + lw - R, y0 + lh - R, -1, -1]].forEach(function (c) {
      plan.appendChild(S('line', { x1: c[0], y1: c[1], x2: c[0] + c[2] * P, y2: c[1] + c[3] * P, class: 'pli' }));
    });
    plan.appendChild(S('text', { x: px + pw / 2, y: py + ph / 2 + 5, class: 'lbl in', 'text-anchor': 'middle' }, U.nfa(r.L) + ' × ' + U.nfa(r.l) + ' m'));
    if (best) {
      plan.appendChild(S('rect', { x: x0, y: y0, width: best.a * s, height: best.b * s, rx: 3, class: 'stock' }));
      plan.appendChild(S('text', { x: x0 + best.a * s, y: y0 + best.b * s + 20, class: 'lbl stock-l', 'text-anchor': 'end' }, 'En stock : ' + U.nfa(best.a) + ' × ' + U.nfa(best.b) + ' m'));
    }
    function cote(xa, ya, xb, yb, txt, vert) {
      var g = S('g', { class: 'cote' }), t = 5;
      g.appendChild(S('line', { x1: xa, y1: ya, x2: xb, y2: yb }));
      if (vert) { g.appendChild(S('line', { x1: xa - t, y1: ya, x2: xa + t, y2: ya })); g.appendChild(S('line', { x1: xb - t, y1: yb, x2: xb + t, y2: yb })); }
      else { g.appendChild(S('line', { x1: xa, y1: ya - t, x2: xa, y2: ya + t })); g.appendChild(S('line', { x1: xb, y1: yb - t, x2: xb, y2: yb + t })); }
      var cx = (xa + xb) / 2, cy = (ya + yb) / 2;
      g.appendChild(S('text', { x: vert ? cx - 10 : cx, y: vert ? cy : cy - 8, class: 'lbl', 'text-anchor': 'middle', transform: vert ? 'rotate(-90 ' + (cx - 10) + ' ' + cy + ')' : null }, txt));
      plan.appendChild(g);
    }
    cote(x0, y0 - 16, x0 + lw, y0 - 16, m(r.Lb));
    cote(x0 - 16, y0, x0 - 16, y0 + lh, m(r.lb), true);
  }

  /* Coupe : terre, feutre, bâche, eau, pierres du rebord */
  function drawCoupe(r) {
    while (coupe.firstChild) coupe.removeChild(coupe.firstChild);
    var W = Math.max(300, Math.round(coupe.parentNode.clientWidth || 640)), H = 170, g = 34, mx = 16;
    var sx = (W - 2 * mx - 76) / (r.L + 2 * r.R), sy = Math.min((H - g - 26) / r.P, Math.max(sx, 72 / r.P)), exag = sy > sx * 1.05;
    var R = r.R * sx, half = r.L * sx / 2, d = r.P * sy, cx = mx + R + half, x1 = cx - half, x2 = cx + half, pts;
    coupe.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    if (st.profil === 'droit') pts = [[x1, g], [x1, g + d], [x2, g + d], [x2, g]];
    else if (st.profil === 'pente') pts = [[x1, g], [x1 + half * 0.55, g + d], [x2 - half * 0.55, g + d], [x2, g]];
    else { var p1 = half * 0.3; pts = [[x1, g], [x1, g + d * 0.4], [x1 + p1, g + d * 0.4], [x1 + p1, g + d], [x2 - p1, g + d], [x2 - p1, g + d * 0.4], [x2, g + d * 0.4], [x2, g]]; }
    var hole = pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L');
    coupe.appendChild(S('path', { d: 'M0 ' + g + ' L' + hole + ' L' + W + ' ' + g + ' L' + W + ' ' + H + ' L0 ' + H + ' Z', class: 'terre' }));
    var defs = S('defs'), clip = S('clipPath', { id: 'trou' }); clip.appendChild(S('path', { d: 'M' + hole + ' Z' })); defs.appendChild(clip); coupe.appendChild(defs);
    var wl = g + Math.max(5, 0.05 * sy);
    coupe.appendChild(S('rect', { x: x1, y: wl, width: x2 - x1, height: d + 4, class: 'eau', 'clip-path': 'url(#trou)' }));
    coupe.appendChild(S('line', { x1: x1 + 2, y1: wl, x2: x2 - 2, y2: wl, class: 'surface' }));
    var full = 'M' + (x1 - R) + ' ' + g + ' L' + hole + ' L' + (x2 + R) + ' ' + g;
    coupe.appendChild(S('path', { d: full, class: 'feutre', transform: 'translate(0 3)' }));
    coupe.appendChild(S('path', { d: full, class: 'liner-l' }));
    [[x1 - R, x1], [x2, x2 + R]].forEach(function (z) {
      var n = Math.max(1, Math.round((z[1] - z[0]) / 22)), w = (z[1] - z[0] - (n - 1) * 3) / n;
      for (var i = 0; i < n; i++) coupe.appendChild(S('rect', { x: z[0] + i * (w + 3), y: g - 9, width: w, height: 9, rx: 4, class: 'pierre' }));
    });
    var xa = x2 + R + 16;
    coupe.appendChild(S('line', { x1: xa, y1: g, x2: xa, y2: g + d, class: 'cl' }));
    coupe.appendChild(S('line', { x1: xa - 4, y1: g, x2: xa + 4, y2: g, class: 'cl' })); coupe.appendChild(S('line', { x1: xa - 4, y1: g + d, x2: xa + 4, y2: g + d, class: 'cl' }));
    coupe.appendChild(S('text', { x: xa + 8, y: g + d / 2 + 5, class: 'lbl' }, cm(r.P)));
    coupe.appendChild(S('text', { x: x1 - R / 2, y: g - 16, class: 'lbl sm', 'text-anchor': 'start' }, 'rebord ' + cm(r.R)));
    if (st.profil === 'paliers' && half * 0.3 > 44) coupe.appendChild(S('text', { x: x2 - half * 0.15, y: g + d * 0.4 - 6, class: 'lbl sm', 'text-anchor': 'middle' }, 'palier'));
    if (exag) coupe.appendChild(S('text', { x: W - 4, y: H - 6, class: 'lbl xs', 'text-anchor': 'end' }, 'hauteurs exagérées pour la lecture'));
  }

  function update() {
    var r = C.bache(st);
    var vars = epdm ? epdm.all.filter(function (v) { return v.ok; }) : [];
    var ch = C.choisirBache(r.Lb, r.lb, vars);
    var V = r.V, terre = V / 1000, fill = V / Math.max(1, st.deb);
    big.textContent = U.nfa(r.Lb) + ' × ' + U.nfa(r.lb) + ' m';
    sub.textContent = U.nf(r.Sb, 1) + ' m² de bâche, et autant de feutre dessous.';
    stats.innerHTML = '';
    [['Eau', U.nf(U.round(V, 10), 0) + ' L' + (st.forme === 'libre' ? ' au plus' : '')], ['Terre à sortir', U.nf(terre, 1) + ' m³'], ['Remplissage', dur(fill)]].forEach(function (x) {
      stats.appendChild(h('div', null, h('dt', null, x[0]), h('dd', null, x[1])));
    });
    drawPlan(r, ch.best); drawCoupe(r);
    legend.innerHTML = '';
    [['z-fond', 'Fond'], ['z-paroi', 'Parois, ' + cm(r.P)], ['z-rebord', 'Rebord, ' + cm(r.R)]].concat(ch.best ? [['stock', 'Bâche en stock']] : []).forEach(function (x) {
      legend.appendChild(h('li', null, h('i', { class: x[0] }), x[1]));
    });

    prodBox.innerHTML = '';
    var items = [];
    if (ch.best) items.push({ h: 'bache-epdm-pour-bassin', vid: ch.best.v.id, why: 'EPDM 1 mm, ' + U.nfa(ch.best.a) + ' × ' + U.nfa(ch.best.b) + ' m' + (ch.best.tourne ? ', posée dans l’autre sens' : '') });
    if (hdpe) hdpe.all.forEach(function (v) { var dd = C.dimsVariante(v.t); if (v.ok && dd && Math.max(dd[0], dd[1]) >= r.Lb && Math.min(dd[0], dd[1]) >= r.lb && items.length < 3) items.push({ h: 'bache-hdpe-bassin', vid: v.id, why: 'Film HDPE ' + v.t + ', pour un petit bac aux formes simples' }); });
    if (items.length) prodBox.appendChild(U.prodList('La bâche qui couvre', items, { top: true }));
    else prodBox.appendChild(h('div', { class: 'prods' }, h('h3', null, 'Aucune taille en stock ne couvre ce bassin'),
      h('p', { class: 'note' }, 'La plus grande bâche vendue mesure ' + (ch.max ? U.nfa(ch.max.a) + ' × ' + U.nfa(ch.max.b) + ' m' : '7 × 5 m') + '. Réduisez le rebord dans les réglages avancés, ou écrivez à la boutique pour une découpe sur mesure.')));

    /* Mise en eau : conditionneur d'eau du robinet, 10 ml pour 50 L d'après sa fiche */
    eauBox.innerHTML = '';
    if (cond) {
      var ml = V / 50 * 10, pick = null;
      cond.all.forEach(function (v) { if (!v.ok) return; var mm = String(v.t).match(/traite ([0-9\s  ]+) L/); var cap = mm ? parseFloat(mm[1].replace(/[\s  ]/g, '')) : 0; if (cap >= V && (!pick || cap < pick.cap)) pick = { v: v, cap: cap }; });
      eauBox.appendChild(U.prodList('Pour la mise en eau', [{ h: 'conditionneur-eau-robinet-easy-life-aquamaker', vid: pick ? pick.v.id : null, why: (ml >= 1000 ? U.nf(ml / 1000, 1) + ' L' : U.nf(U.round(ml, 10), 0) + ' ml') + ' pour traiter ' + U.nf(U.round(V, 10), 0) + ' L d’eau du robinet' + (pick ? '' : ', en plusieurs flacons') }]));
    }

    chain.innerHTML = '';
    var Vr = Math.round(V / 10) * 10;
    chain.appendChild(h('a', { class: 'go', href: U.url('calculateur-pompe-bassin') + 'usage=bassin&V=' + Vr }, 'Choisir la pompe pour ' + U.nf(Vr, 0) + ' L'));
    chain.appendChild(h('a', { class: 'go', href: U.url('combien-de-poissons-bassin') + 'V=' + Vr + '&S=' + U.round(r.surfEau, 0.1).toFixed(1) }, 'Combien de poissons dans ce bassin'));

    detail.innerHTML = '';
    detail.appendChild(U.trace([
      ['Longueur de bâche', m(r.Lb)], { f: U.nfa(r.L) + ' + 2 × ' + U.nfa(r.P) + ' (parois) + 2 × ' + U.nfa(r.R) + ' (rebord) = ' + U.nfa(r.Lb) + ' m' },
      ['Largeur de bâche', m(r.lb)], { f: U.nfa(r.l) + ' + 2 × ' + U.nfa(r.P) + ' + 2 × ' + U.nfa(r.R) + ' = ' + U.nfa(r.lb) + ' m' },
      ['Surface de bâche et de feutre', U.nf(r.Sb, 2) + ' m²'],
      ['Profondeur moyenne retenue', U.nf(r.Pm, 2) + ' m'], { f: st.Pm > 0 ? 'saisie' : U.nfa(r.P) + ' × ' + U.nf(r.coef, 2) + ' (' + ({ droit: 'parois droites', paliers: 'paliers, repère empirique', pente: 'pente douce, repère empirique' })[st.profil] + ')' },
      ['Volume', U.nf(V, 0) + ' L'], { f: (st.forme === 'ovale' ? 'π / 4 × ' : '') + U.nfa(r.L) + ' × ' + U.nfa(r.l) + ' × ' + U.nf(r.Pm, 2) + ' × 1 000' },
      ['Terre à sortir', U.nf(terre, 2) + ' m³'], { f: U.nf(V, 0) + ' L ÷ 1 000, avant foisonnement' },
      ['Remplissage', dur(fill)], { f: U.nf(V, 0) + ' L ÷ ' + U.nf(st.deb, 0) + ' L/min' },
      ['Conditionneur', U.nf(V / 50 * 10, 0) + ' ml'], { f: '10 ml pour 50 L, fiche Easy-Life AquaMaker' }
    ]));
    if (r.alertes.indexOf('profond') > -1) detail.appendChild(h('p', { class: 'note' }, 'Bassin très profond pour sa taille : vérifiez la tenue des berges.'));
    U.State.write(st, DEF);
  }
  update();
});
