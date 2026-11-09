/* Quel poisson : la mosaïque des espèces s'allume selon l'eau de votre année. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { tmin: 4, tmax: 22, but: 'tout', sp: '' };
  var st = U.State.read(DEF);
  var TOP = 36, open = st.sp || null;

  var big = h('p', { class: 'verdict', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' });
  var res = h('div', null, h('span', { class: 'k' }, 'Pour une eau de ' + st.tmin + ' à ' + st.tmax + ' °C'), big, sub);
  var kTitle = res.firstChild;

  var rMin = U.range({ id: 'tmin', label: 'Eau la plus froide', min: 0, max: 28, value: st.tmin, onChange: function (v) { st.tmin = v; if (st.tmax < v + 2) { st.tmax = v + 2; rMax.set(st.tmax); } update(); } });
  var rMax = U.range({ id: 'tmax', label: 'Eau la plus chaude', min: 6, max: 34, value: st.tmax, onChange: function (v) { st.tmax = v; if (st.tmin > v - 2) { st.tmin = v - 2; rMin.set(st.tmin); } update(); } });
  var vMin = h('output', { class: 'rv tnum' }), vMax = h('output', { class: 'rv tnum' });
  var but = U.seg({ label: 'Pour', value: st.but, options: [['tout', 'Tous'], ['manger', 'Manger'], ['ornement', 'Le plaisir des yeux']], onChange: function (v) { st.but = v; update(); } });
  var inp = h('div', null,
    h('label', { class: 'rl', for: 'tmin' }, h('span', { class: 'k' }, 'L’eau la plus froide de l’année'), vMin), rMin,
    h('label', { class: 'rl', for: 'tmax', style: 'margin-top:14px' }, h('span', { class: 'k' }, 'La plus chaude'), vMax), rMax,
    h('p', { class: 'note' }, 'Mesurez l’eau du bassin, pas l’air, en plein hiver et en plein été.'),
    h('div', { style: 'margin-top:18px' }, but));

  var grid = h('div', { class: 'mosaic' }), card = h('div', { class: 'sp-detail' });
  var viz = h('div', null, h('div', { class: 'tscale', 'aria-hidden': 'true' }, h('span', null, 'Barres : 0 °C'), h('span', null, '12'), h('span', null, '24'), h('span', null, '36 °C')), grid, card);
  var prodBox = h('div');
  var out = h('div', null, prodBox, h('div', { class: 'chain' }, h('a', { class: 'go', href: U.url('calculateur-aquaponie', 1) }, 'Combien de poissons pour vos plantes'), h('a', { class: 'go', href: U.url('diagnostic-analyse-eau', 1) }, 'Contrôler l’eau de vos poissons')), U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: viz, out: out }));

  var PH = { truite: 'poisson-truite.jpg', perche: 'poisson-perche.jpg', tanche: 'poisson-tanche.jpg', carpe: 'poisson-carpe.jpg', tilapia: 'poisson-tilapia.jpg', koi: 'poisson-koi.jpg', rouge: 'poisson-rouge.jpg' };
  function pc(t) { return U.clamp(t / TOP * 100, 0, 100); }
  function band(e) {
    var b = h('div', { class: 'tband', 'aria-hidden': 'true' });
    var lo = e.froidOk ? 0 : e.froid, hi = e.mortel || (e.plage ? e.plage[1] : e.chaud);
    if (e.plage) lo = e.plage[0];
    b.appendChild(h('i', { class: 'live', style: 'left:' + pc(lo) + '%;width:' + (pc(hi) - pc(lo)) + '%' }));
    if (e.opt) b.appendChild(h('i', { class: 'opt', style: 'left:' + pc(e.opt[0]) + '%;width:' + (pc(e.opt[1]) - pc(e.opt[0])) + '%' }));
    if (e.pref) b.appendChild(h('i', { class: 'opt', style: 'left:' + (pc(e.pref) - 1) + '%;width:2%' }));
    b.appendChild(h('i', { class: 'you', style: 'left:' + pc(st.tmin) + '%;width:' + (pc(st.tmax) - pc(st.tmin)) + '%' }));
    return b;
  }

  function update() {
    vMin.textContent = st.tmin + ' °C'; vMax.textContent = st.tmax + ' °C';
    kTitle.textContent = 'Pour une eau de ' + st.tmin + ' à ' + st.tmax + ' °C';
    var list = C.ESPECES.filter(function (e) { return st.but === 'tout' || e.usage === st.but; }).map(function (e) { return { e: e, r: C.evalEspece(e, st.tmin, st.tmax) }; });
    var rank = { ok: 0, warn: 1, bad: 2 };
    list.sort(function (a, b) { return rank[a.r.st] - rank[b.r.st]; });
    var ok = list.filter(function (x) { return x.r.st === 'ok'; }), warn = list.filter(function (x) { return x.r.st === 'warn'; });
    big.textContent = ok.length ? (ok.length === 1 ? ok[0].e.nom + ', et elle seule' : ok.length + ' espèces idéales') : warn.length ? 'Aucune idéale, ' + warn.length + ' possible' + (warn.length > 1 ? 's' : '') : 'Aucune espèce ne convient';
    sub.textContent = ok.length ? ok.map(function (x) { return x.e.nom; }).join(', ') + '.' + (warn.length ? ' Possibles : ' + warn.map(function (x) { return x.e.nom.toLowerCase(); }).join(', ') + '.' : '') : warn.length ? 'Elles survivent, mais grandissent mal une partie de l’année.' : 'Rapprochez l’eau d’une plage plus douce : abri, ombrage, chauffage.';

    grid.innerHTML = '';
    list.forEach(function (x) {
      var e = x.e, t = h('button', { type: 'button', class: 'sp ' + x.r.st + (open === e.id ? ' open' : ''), 'aria-expanded': String(open === e.id) },
        h('img', { src: U.img(PH[e.id]), alt: e.nom, loading: 'lazy', width: 320, height: 214 }),
        h('span', { class: 'sp-b' }, h('strong', null, e.nom), h('span', { class: 'st ' + x.r.st }, { ok: 'Idéale', warn: 'Possible', bad: 'Non' }[x.r.st]), h('span', { class: 'why' }, x.r.txt), band(e)));
      t.addEventListener('click', function () { open = open === e.id ? null : e.id; st.sp = open || ''; update(); if (open) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      grid.appendChild(t);
    });

    card.innerHTML = '';
    var sel = list.filter(function (x) { return x.e.id === open; })[0];
    if (sel) {
      var e = sel.e;
      card.appendChild(h('h3', null, e.nom, h('em', null, ' ' + e.lat)));
      card.appendChild(h('p', null, e.croissance));
      var facts = [];
      if (e.opt) facts.push(['Croissance idéale', e.opt[0] + ' à ' + e.opt[1] + ' °C']);
      if (e.mortel) facts.push(['Limite haute', e.mortel + ' °C']);
      if (e.froid && !e.froidOk) facts.push(['Limite basse', e.froid + ' °C']);
      if (e.o2) facts.push(['Oxygène', 'plus de ' + e.o2 + ' mg/L']);
      if (e.tan) facts.push(['Azote ammoniacal', 'moins de ' + U.nfa(e.tan) + ' mg/L']);
      if (e.no2) facts.push(['Nitrites', 'moins de ' + U.nfa(e.no2) + ' mg/L']);
      card.appendChild(U.trace(facts));
      card.appendChild(h('p', { class: 'note' }, 'Source : ' + e.src + '. Dans la barre : en clair, sa plage de vie ; en foncé, sa croissance idéale ; en rose, votre eau.'));
    }

    prodBox.innerHTML = '';
    var items = [];
    var ids = ok.concat(warn).map(function (x) { return x.e.id; });
    if (ids.indexOf('truite') > -1 || ids.indexOf('perche') > -1) items.push({ h: 'kit-daquaponie-enterre', why: 'Prévu pour truites, saumons de fontaine ou perches' });
    if (ids.indexOf('truite') > -1) items.push({ h: 'aliment-truite-aquaponie', why: 'Granulés de 5,5 mm pour truite' });
    if (ids.indexOf('rouge') > -1) items.push({ h: 'kit-daquaponie-naps', why: '500 L, pensé pour des poissons rouges' });
    items.push({ h: 'pack-test-eau-aquaponie-analyses-essentielles-nh4-no2-ph-kh', why: 'Les 5 mesures de base de l’aquaponie' });
    prodBox.appendChild(U.prodList('Pour démarrer', items.slice(0, 4)));
    U.State.write(st, DEF);
  }
  update();
});
