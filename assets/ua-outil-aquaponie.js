/* Dimensionner l'aquaponie : la chaîne FAO, des plantes à l'eau, dans les deux sens. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { mode: 'surface', S: 4, V: 1000, culture: 'feuilles', tech: 'substrat', frr: 0, taux: 1.5, froid: 0 };
  var st = U.State.read(DEF);

  var nodes = {}, chain = h('div', { class: 'fchain', 'aria-live': 'polite' });
  [['S', 'Cultures', 'm²'], ['A', 'Aliment', 'g par jour'], ['B', 'Poissons', 'kg'], ['V', 'Bassin', 'litres']].forEach(function (n, i) {
    var v = h('span', { class: 'fv tnum' });
    var node = h('div', { class: 'fn' + (n[0] === 'B' ? ' main' : '') }, h('span', { class: 'k' }, n[1]), v, h('span', { class: 'fu' }, n[2]));
    nodes[n[0]] = v; chain.appendChild(node);
    if (i < 3) { var link = h('span', { class: 'fl' }); nodes['l' + i] = link; chain.appendChild(link); }
  });
  var res = h('div', null, h('span', { class: 'k' }, 'La chaîne de votre système'), chain);
  var sys = U.svg('svg', { class: 'sys-svg', role: 'img', 'aria-label': 'Schéma de votre système aquaponique' });
  var viz = h('div', null, h('div', { class: 'sys-box' }, sys));
  var IC = {
    feuilles: '<svg viewBox="0 0 60 34"><path class="w" d="M30 29c-9-2-13-9-11-19 7 1 11 6 11 12 0-6 4-11 11-12 2 10-2 17-11 19z"/><path class="l" d="M30 29c-9-2-13-9-11-19 7 1 11 6 11 12 0-6 4-11 11-12 2 10-2 17-11 19zM30 29V18"/></svg>',
    fruits: '<svg viewBox="0 0 60 34"><circle class="w" cx="30" cy="19" r="10"/><circle class="l" cx="30" cy="19" r="10"/><path class="l" d="M30 9c-2-3-6-3-7-1M30 9c2-3 6-3 7-1M30 9V5"/></svg>',
    substrat: '<svg viewBox="0 0 60 34"><path class="w" d="M10 14h40v12H10z"/><path class="l" d="M10 14h40v12H10zM18 14V8M30 14V6M42 14V8"/></svg>',
    nft: '<svg viewBox="0 0 60 34"><path class="l" d="M8 10h44M8 18h44M8 26h44M18 10V5M34 18v-5M26 26v-5M44 26v-5"/></svg>',
    dwc: '<svg viewBox="0 0 60 34"><path class="w" d="M8 16h44v12H8z"/><path class="l" d="M8 12v16h44V12M12 14h36M20 14V7M30 14V6M40 14V7"/></svg>'
  };

  var mode = U.seg({ label: 'Je pars de', value: st.mode, options: [['surface', 'Mes cultures'], ['bassin', 'Mon bassin']], onChange: function (v) { st.mode = v; sync(); update(); } });
  var tech = U.tiles({ label: 'Technique', value: st.tech, options: [['substrat', 'Lit de substrat', IC.substrat], ['nft', 'Gouttières NFT', IC.nft], ['dwc', 'Radeaux', IC.dwc]], onChange: function (v) { st.tech = v; update(); } });
  var fS = U.numField({ id: 'S', label: 'Surface de culture', unit: 'm²', value: st.S, min: 0.5, max: 500, step: 0.5, onChange: function (v) { st.S = v; rS.set(Math.min(v, 30)); update(); } });
  var rS = U.range({ id: 'rS', label: 'Surface de culture', min: 0.5, max: 30, step: 0.5, value: Math.min(st.S, 30), onChange: function (v) { st.S = v; fS.set(v); update(); } });
  var fV = U.numField({ id: 'V', label: 'Volume du bassin', unit: 'L', value: st.V, min: 100, max: 100000, step: 50, onChange: function (v) { st.V = v; rV.set(Math.min(v, 5000)); update(); } });
  var rV = U.range({ id: 'rV', label: 'Volume du bassin', min: 100, max: 5000, step: 50, value: Math.min(st.V, 5000), onChange: function (v) { st.V = v; fV.set(v); update(); } });
  var boxS = h('div', null, fS, rS), boxV = h('div', null, fV, rV);
  var culture = U.tiles({ label: 'Cultures', value: st.culture, options: [['feuilles', 'Salades, aromates', IC.feuilles], ['fruits', 'Légumes-fruits', IC.fruits]], onChange: function (v) { st.culture = v; st.frr = 0; update(); } });
  var inp = h('div', null, mode, h('div', { style: 'margin-top:18px' }, boxS, boxV), h('div', { style: 'margin-top:20px' }, culture), h('div', { style: 'margin-top:20px' }, tech));
  function sync() { boxS.style.display = st.mode === 'surface' ? '' : 'none'; boxV.style.display = st.mode === 'bassin' ? '' : 'none'; }
  sync();

  var ffr = U.numField({ id: 'frr', label: 'Ratio d’alimentation', unit: 'g/m²/j', value: C.FRR[st.culture], min: 20, max: 120, step: 5, onChange: function (v) { st.frr = v; update(); }, hint: 'FAO : 40 à 50 pour les feuilles, 50 à 80 pour les fruits.' });
  var ftx = U.numField({ id: 'taux', label: 'Taux de ration', unit: '%/j', value: st.taux, min: 0.5, max: 3, step: 0.1, onChange: function (v) { st.taux = v; update(); }, hint: 'FAO : 1 à 2 % du poids des poissons par jour.' });
  var froid = U.seg({ label: 'Eau froide (truite, saumon de fontaine)', small: true, value: String(st.froid), options: [['0', 'Non'], ['1', 'Oui']], onChange: function (v) { st.froid = +v; update(); } });

  var sheet = h('div', { class: 'sheet' }), kitBox = h('div'), detail = h('div');
  var out = h('div', null, h('h3', { class: 'sheet-t' }, 'Le matériel'), sheet, kitBox,

    h('div', { class: 'chain' }, h('a', { class: 'go', id: 'go-p', href: '#' }, 'Choisir la pompe'), h('a', { class: 'go', href: U.url('quel-poisson-aquaponie', 1) }, 'Quel poisson pour votre eau')), U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: viz, vizLabel: 'Votre système', adv: h('div', null, h('div', { class: 'fields two', style: 'margin-bottom:16px' }, ffr, ftx), froid), detail: detail, out: out }));

  U.onResize(function () { update(); });
  /* Schéma : bassin, pompe, filtration si besoin, cultures, retour. Largeurs qui suivent le volume et la surface. */
  function plant(g, x, y, k) {
    var S = U.svg;
    g.appendChild(S('path', { d: 'M' + x + ' ' + y + 'v-' + (8 * k) + 'M' + x + ' ' + (y - 5 * k) + 'c-4-1-7-4-7-8 4 0 7 3 7 8M' + x + ' ' + (y - 6 * k) + 'c4-1 7-4 7-8-4 0-7 3-7 8', class: 's-plant' }));
  }
  function drawSys(r) {
    var S = U.svg; while (sys.firstChild) sys.removeChild(sys.firstChild);
    var W = Math.max(300, Math.round(sys.parentNode.clientWidth || 600)), H = 280, base = H - 14, filt = st.tech !== 'substrat', narrow = W < 460;
    sys.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var k = Math.sqrt(r.V / 1000), tw = U.clamp(100 + 44 * k, 110, W * (filt ? 0.26 : 0.34)), th = U.clamp(74 + 26 * k, 84, 126);
    var tx = 6, ty = base - th;
    sys.appendChild(S('line', { x1: 0, y1: base, x2: W, y2: base, class: 's-sol' }));
    /* Bassin et poissons */
    sys.appendChild(S('rect', { x: tx, y: ty, width: tw, height: th, rx: 8, class: 's-tank' }));
    sys.appendChild(S('rect', { x: tx + 4, y: ty + 12, width: tw - 8, height: th - 16, rx: 5, class: 's-eau' }));
    var nf = Math.max(2, Math.min(8, Math.round(r.Bmax / 5)));
    for (var i = 0; i < nf; i++) { var fx = tx + 14 + (i * 41 % Math.max(20, tw - 44)), fy = ty + 28 + (i * 23 % Math.max(10, th - 50)); sys.appendChild(S('path', { d: 'M' + fx + ' ' + fy + 'c5-5 13-5 18 0-5 5-13 5-18 0zm18 0l6-4v8z', class: 's-fish' })); }
    var lx = tx + tw / 2;
    var ta = narrow ? 'start' : 'middle', tlx = narrow ? tx : Math.max(lx, 70);
    sys.appendChild(S('text', { x: tlx, y: ty - 26, class: 'lbl in2', 'text-anchor': ta }, 'Bassin ' + L(r.V) + ' L'));
    sys.appendChild(S('text', { x: tlx, y: ty - 9, class: 'lbl xs2', 'text-anchor': ta }, U.nf(r.Bmin, 0) + ' à ' + U.nf(r.Bmax, 0) + ' kg de poissons'));
    /* Filtration séparée pour le NFT et les radeaux */
    var x = tx + tw + 16, upx = tx + tw - 20, upy = base - 22;
    if (filt) {
      var bw = narrow ? 34 : 46, gap = narrow ? 14 : 26;
      [['Décanteur', L(r.decanteur[0]) + ' à ' + L(r.decanteur[1]) + ' L'], ['Biofiltre', U.nf(r.bio.bioballs * (st.froid ? 1.5 : 1), 0) + ' L']].forEach(function (b, j) {
        var bh = 58, bx = x + j * (bw + gap);
        sys.appendChild(S('path', { d: 'M' + (j ? bx - gap : tx + tw) + ' ' + (base - 24) + 'H' + bx, class: 's-flow' }));
        sys.appendChild(S('rect', { x: bx, y: base - bh, width: bw, height: bh, rx: 10, class: 's-box' }));
        if (!narrow) { sys.appendChild(S('text', { x: bx + bw / 2, y: base - bh - 22, class: 'lbl xs2 b', 'text-anchor': 'middle' }, b[0])); sys.appendChild(S('text', { x: bx + bw / 2, y: base - bh - 8, class: 'lbl xs2', 'text-anchor': 'middle' }, b[1])); }
        if (j === 1) { upx = bx + bw / 2; upy = base - bh; }
      });
      x += 2 * bw + gap + 16;
    }
    /* Cultures, surélevées */
    var avail = W - 8 - x, bwid = Math.min(avail, U.clamp(140 + 46 * Math.sqrt(r.S), 150, avail)), bx2 = W - 8 - bwid, by = 78;
    var g = S('g'), top = by, bottom;
    if (st.tech === 'substrat') {
      g.appendChild(S('rect', { x: bx2, y: by, width: bwid, height: 42, rx: 5, class: 's-bed' }));
      for (var rr = 0; rr < 3; rr++) for (var c = bx2 + 9 + (rr % 2) * 5; c < bx2 + bwid - 7; c += 10) g.appendChild(S('circle', { cx: c, cy: by + 11 + rr * 10, r: 3.4, class: 's-bille' }));
      bottom = by + 42;
    } else if (st.tech === 'nft') {
      [0, 1, 2].forEach(function (q) { g.appendChild(S('rect', { x: bx2, y: by + q * 30, width: bwid, height: 11, rx: 5.5, class: 's-gut' })); });
      bottom = by + 71;
    } else {
      g.appendChild(S('rect', { x: bx2, y: by, width: bwid, height: 50, rx: 6, class: 's-tank' }));
      g.appendChild(S('rect', { x: bx2 + 4, y: by + 12, width: bwid - 8, height: 34, rx: 4, class: 's-eau' }));
      g.appendChild(S('rect', { x: bx2 + 8, y: by + 7, width: bwid - 16, height: 9, rx: 3, class: 's-raft' }));
      bottom = by + 50;
    }
    g.appendChild(S('line', { x1: bx2 + 16, y1: bottom, x2: bx2 + 16, y2: base, class: 's-pied' }));
    g.appendChild(S('line', { x1: bx2 + bwid - 16, y1: bottom, x2: bx2 + bwid - 16, y2: base, class: 's-pied' }));
    var np = Math.max(3, Math.min(10, Math.round(bwid / (st.culture === 'fruits' ? 40 : 28)))), rowsP = st.tech === 'nft' ? [0, 1, 2] : [0];
    rowsP.forEach(function (q) { for (var j = 0; j < np; j++) plant(g, bx2 + 14 + j * (bwid - 28) / Math.max(1, np - 1), by + q * 30 + (st.tech === 'dwc' ? 7 : 0), st.culture === 'fruits' ? 1.9 : 1.3); });
    sys.appendChild(g);
    var ba = narrow ? 'end' : 'middle', blx = narrow ? W - 4 : bx2 + bwid / 2;
    sys.appendChild(S('text', { x: blx, y: 24, class: 'lbl in2', 'text-anchor': ba }, ({ substrat: 'Lit de substrat', nft: 'Gouttières', dwc: 'Radeaux' })[st.tech] + ' ' + U.nfa(r.S) + ' m²'));
    sys.appendChild(S('text', { x: blx, y: 41, class: 'lbl xs2', 'text-anchor': ba }, r.plants[0] + ' à ' + r.plants[1] + (st.culture === 'feuilles' ? (narrow ? ' salades' : ' salades ou aromates') : ' plants')));
    /* Pompe vers les cultures, retour par gravité */
    var py = by - 16, start = 'M' + upx + ' ' + upy;
    if (!filt) { sys.appendChild(S('rect', { x: upx - 11, y: upy, width: 22, height: 14, rx: 4, class: 's-pump' })); start = 'M' + (upx + 11) + ' ' + (upy + 7) + 'H' + (tx + tw + 12); upx = tx + tw + 12; }
    sys.appendChild(S('path', { d: start + 'V' + py + 'H' + (bx2 + 20) + 'V' + (by - 2), class: 's-pipe' }));
    sys.appendChild(narrow ? S('text', { x: upx - 7, y: py + 16, class: 'lbl xs2 b', 'text-anchor': 'end' }, L(r.debit) + ' L/h') : S('text', { x: upx + 8, y: py - 7, class: 'lbl xs2 b' }, 'Pompe ' + L(r.debit) + ' L/h'));
    sys.appendChild(S('path', { d: 'M' + (bx2 + 26) + ' ' + bottom + 'C' + (bx2 + 10) + ' ' + (ty + 4) + ' ' + (tx + tw * 0.8) + ' ' + (ty - 4) + ' ' + (tx + tw * 0.62) + ' ' + (ty + 10), class: 's-ret' }));
  }
  function L(v) { return U.nf(U.round(v, v > 1000 ? 50 : 10), 0); }

  function update() {
    var r = C.aquaponie({ mode: st.mode, S: st.S, V: st.V, culture: st.culture, frr: st.frr || 0, taux: st.taux, froid: st.froid });
    if (!st.frr) ffr.set(C.FRR[st.culture]);
    U.tween(nodes.S, r.S, function (v) { return U.nfa(v); });
    U.tween(nodes.A, r.A, function (v) { return U.nf(v, 0); });
    nodes.B.textContent = U.nf(r.Bmin, 0) + ' à ' + U.nf(r.Bmax, 0);
    U.tween(nodes.V, r.V, L);
    nodes.l0.textContent = '× ' + r.frr + ' g/m²'; nodes.l1.textContent = '1 à 2 % de leur poids'; nodes.l2.textContent = '20 kg pour 1 000 L';
    chain.classList.toggle('rev', st.mode === 'bassin');
    drawSys(r);

    sheet.innerHTML = '';
    var bio = st.tech === 'substrat' ? 'Le lit de substrat sert de biofiltre' : U.nf(r.bio.gravier * (st.froid ? 1.5 : 1), 0) + ' L de gravier ou ' + U.nf(r.bio.bioballs * (st.froid ? 1.5 : 1), 0) + ' L de billes';
    var rows = [
      ['Pompe', L(r.debit) + ' L/h'],
      ['Biofiltre', bio],
      ['Décanteur', st.tech === 'substrat' && r.Bmax / r.V * 1000 <= 20 ? 'Facultatif à cette densité' : L(r.decanteur[0]) + ' à ' + L(r.decanteur[1]) + ' L'],
      ['Plants', r.plants[0] + ' à ' + r.plants[1] + (st.culture === 'feuilles' ? ' salades ou aromates' : ' plants fruitiers')]
    ];
    if (st.tech === 'substrat') rows.push(['Substrat sur 30 cm', L(r.substrat) + ' L de billes d’argile']);
    rows.forEach(function (x) { sheet.appendChild(h('div', { class: 'srow' }, h('span', null, x[0]), h('strong', null, x[1]))); });
    if (st.froid) sheet.appendChild(h('p', { class: 'note' }, 'Eau froide : biofiltre majoré de moitié par prudence, la FAO conseille de le surdimensionner sans chiffrer.'));

    kitBox.innerHTML = '';
    var kits = (U.DATA.kits || []).slice().sort(function (a, b) { return Math.abs(a.vol - r.V) - Math.abs(b.vol - r.V); }).slice(0, 2);
    var items = kits.map(function (k) { return { h: k.h, vid: k.vid, why: (k.vt ? k.vt + '. ' : '') + 'Bassin de ' + U.nf(k.vol, 0) + ' L' + (k.s ? ', ' + k.s + ' m² de culture' : '') + (k.f ? '. ' + k.f : '') }; });
    if (st.tech === 'substrat') items.push({ h: 'billes-argile-grorox-8-20-terra-aquatica', why: 'Substrat du lit de culture' });
    else items.push({ h: 'bioballs', why: 'Support des bactéries du biofiltre' });
    items.push({ h: 'pack-test-eau-aquaponie-analyses-essentielles-nh4-no2-ph-kh', why: 'Pour suivre le démarrage du cycle' });
    kitBox.appendChild(U.prodList('Les kits les plus proches', items, { top: true }));
    U.$('#go-p').href = U.url('calculateur-pompe-bassin') + 'usage=aquaponie&V=' + Math.round(r.V);

    detail.innerHTML = '';
    detail.appendChild(U.trace([
      ['Aliment', U.nf(r.A, 0) + ' g/j'], { f: U.nfa(r.S) + ' m² × ' + r.frr + ' g/m²/j' },
      ['Poissons au taux choisi', U.nf(r.B, 1) + ' kg'], { f: U.nf(r.A, 0) + ' / (10 × ' + U.nfa(st.taux) + ')' },
      ['Bassin', U.nf(r.V, 0) + ' L'], { f: U.nf(r.Bmax, 0) + ' kg au plus / 20 kg × 1 000 L' },
      ['Pompe', U.nf(r.debit, 0) + ' L/h'], { f: 'FAO 589, table 8.1, interpolée' }
    ]));
    U.State.write(st, DEF);
  }
  update();
});
