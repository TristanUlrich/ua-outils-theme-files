/* Quel poisson : l'année de chaque espèce, mois par mois, dans l'eau de votre installation. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { tmin: 4, tmax: 22, but: 'tout', sp: '' };
  var st = U.State.read(DEF);
  var open = st.sp || null;
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var LET = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  var NOM = { top: 'Pousse bien', lent: 'Pousse peu', souffre: 'Souffre', danger: 'Danger' };
  var NOW = new Date().getMonth();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PH = { truite: 'poisson-truite.jpg', omble: 'poisson-omble.jpg', perche: 'poisson-perche.jpg', sterlet: 'poisson-sterlet.jpg', tanche: 'poisson-tanche.jpg', carpe: 'poisson-carpe.jpg', tilapia: 'poisson-tilapia.jpg', koi: 'poisson-koi.jpg', rouge: 'poisson-rouge.jpg' };
  /* Pour aller plus loin, espèce par espèce : un article de la boutique, parfois un produit */
  var LIRE = {
    truite: ['salmoponie-elever-des-truites-en-aquaponie-cest-possible', 'La salmoponie, l’aquaponie en eau froide'],
    omble: ['salmoponie-elever-des-truites-en-aquaponie-cest-possible', 'La salmoponie, l’aquaponie en eau froide'],
    perche: ['elever-perche-aquaponie-guide-temperature-tri-croissance', 'Élever la perche en aquaponie'],
    sterlet: ['esturgeon-bassin-de-jardin-especes-oxygenation-nourriture-guide', 'Esturgeon en bassin de jardin'],
    tanche: ['quels-poissons-elever-en-aquaponie', 'Quels poissons choisir en aquaponie'],
    carpe: ['quels-poissons-elever-en-aquaponie', 'Quels poissons choisir en aquaponie'],
    koi: ['carpe-koi-en-aquaponie-guide-complet-pour-reussir', 'Carpe koï en aquaponie'],
    tilapia: ['elever-tilapia-aquaponie-guide-complet', 'Élever le tilapia en aquaponie'],
    rouge: ['poisson-rouge-aquaponie-guide-elevage-debutant', 'Poisson rouge en aquaponie']
  };
  var IC = {
    tout: '<svg viewBox="0 0 60 34"><path class="l" d="M9 12c4-4 10-4 14 0-4 4-10 4-14 0zM23 12l4-2.5v5zM27 23c5-5 13-5 18 0-5 5-13 5-18 0zM45 23l5-3v6z"/></svg>',
    manger: '<svg viewBox="0 0 60 34"><path class="w" d="M8 25c8 5 36 5 44 0z"/><path class="l" d="M6 25h48M8 25c8 5 36 5 44 0M18 16c6-6 16-6 22 0-6 6-16 6-22 0zM40 16l5-3v6z"/></svg>',
    ornement: '<svg viewBox="0 0 60 34"><path class="w" d="M10 9H50L42 28H18Z"/><path class="l" d="M2 7H10L18 28H42L50 7H58"/><path class="l" d="M20 17c5-5 13-5 18 0-5 5-13 5-18 0zM38 17l5-3v6z"/></svg>'
  };

  /* ---------- Résultat ---------- */
  var kTitle = h('span', { class: 'k' }), big = h('p', { class: 'verdict', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' });
  var winImg = h('img', { alt: '', width: 640, height: 480 }), win = h('div', { class: 'qp-win', hidden: '' }, winImg);
  var res = h('div', { class: 'qp-res' }, win, h('div', null, kTitle, big, sub));

  /* ---------- Réglages ---------- */
  var rMin = U.range({ id: 'tmin', label: 'Eau la plus froide', min: 0, max: 28, value: st.tmin, onChange: function (v) { st.tmin = v; if (st.tmax < v + 2) { st.tmax = v + 2; rMax.set(st.tmax); } update(); } });
  var rMax = U.range({ id: 'tmax', label: 'Eau la plus chaude', min: 6, max: 34, value: st.tmax, onChange: function (v) { st.tmax = v; if (st.tmin > v - 2) { st.tmin = v - 2; rMin.set(st.tmin); } update(); } });
  var vMin = h('output', { class: 'rv tnum' }), vMax = h('output', { class: 'rv tnum' });
  var but = U.tiles({ label: 'Usage', value: st.but, options: [['tout', 'Tous', IC.tout], ['manger', 'À manger', IC.manger], ['ornement', 'Ornement', IC.ornement]], onChange: function (v) { st.but = v; update(true); } });
  var inp = h('div', null,
    h('label', { class: 'rl', for: 'tmin' }, h('span', { class: 'k' }, 'L’eau la plus froide de l’année'), vMin), rMin,
    h('label', { class: 'rl', for: 'tmax', style: 'margin-top:14px' }, h('span', { class: 'k' }, 'La plus chaude'), vMax), rMax,
    h('p', { class: 'note' }, 'Mesurez l’eau du bassin, pas l’air, en plein hiver et en plein été.'),
    h('div', { style: 'margin-top:18px' }, but));

  /* ---------- L'année : une ligne par espèce, douze mois ---------- */
  var head = h('div', { class: 'yr-head', 'aria-hidden': 'true' }, h('span', { class: 'yr-n' }));
  var heads = LET.map(function (l, m) { var c = h('span', { class: 'yr-m' + (m === NOW ? ' now' : '') }, h('b', null, l), h('i', { class: 'tnum' })); head.appendChild(c); return c; });
  var body = h('div', { class: 'yr-body' });
  var legend = h('p', { class: 'yr-key' }, ['top', 'lent', 'souffre', 'danger'].map(function (s) { return h('span', null, h('i', { class: 'sw c-' + s }), NOM[s]); }));
  var card = h('div', { class: 'sp-card', hidden: '' });
  var year = h('div', { class: 'yr' }, legend, head, body);
  var viz = h('div', null, year);

  var rows = {};
  C.ESPECES.forEach(function (e) {
    var cells = [], cnt = h('span', { class: 'yr-c tnum' });
    var name = h('span', { class: 'yr-n' }, h('strong', null, e.nom), cnt);
    var b = h('button', { type: 'button', class: 'yr-row', 'aria-expanded': 'false', 'data-sp': e.id }, name);
    for (var m = 0; m < 12; m++) { var c = h('span', { class: 'yr-cell' + (m === NOW ? ' now' : '') }); cells.push(c); b.appendChild(c); }
    b.addEventListener('click', function () { open = open === e.id ? null : e.id; st.sp = open || ''; update(); if (open && card.scrollIntoView) setTimeout(function () { card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); }, 30); });
    rows[e.id] = { e: e, el: b, cells: cells, cnt: cnt };
  });

  /* ---------- Le calcul ---------- */
  var detail = h('div');

  var prodBox = h('div');
  var out = h('div', null, prodBox, h('div', { class: 'chain' }, h('a', { class: 'go', href: U.url('calculateur-aquaponie', 1) }, 'Combien de poissons pour vos plantes'), h('a', { class: 'go', href: U.url('combien-de-poissons-bassin', 1) }, 'Combien de poissons dans votre bassin')), U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: [['Votre année', viz]], detail: detail, out: out }));

  /* Mois consécutifs en texte : « de mai à juin et en octobre » */
  function plages(list) {
    if (!list.length) return '';
    if (list.length === 12) return 'toute l’année';
    var on = []; for (var m = 0; m < 12; m++) on.push(list.indexOf(m) > -1);
    var start = on.indexOf(false), runs = [], cur = null;
    for (var k = 1; k <= 12; k++) { var i = (start + k) % 12; if (on[i]) { if (!cur) { cur = [i, i]; runs.push(cur); } else cur[1] = i; } else cur = null; }
    return runs.map(function (r) { return r[0] === r[1] ? 'en ' + MOIS[r[0]] : 'de ' + MOIS[r[0]] + ' à ' + MOIS[r[1]]; }).join(' et ').replace(/de (avril|août|octobre)/g, 'd’$1');
  }
  function mois(arr, s) { var o = []; arr.forEach(function (x, m) { if (x === s) o.push(m); }); return o; }
  /* Les seuils d'une espèce, écrits pour la fiche */
  function seuils(id) {
    var p = C.PALIERS[id], lo = -99, o = { top: [], souffre: [], danger: [] };
    p.forEach(function (q) { if (o[q[1]]) o[q[1]].push([lo, q[0]]); lo = q[0]; });
    function t(v) { return U.nfa(Math.round(v * 10) / 10); }
    function rng(r) { return r[0] < -50 ? 'sous ' + t(r[1] + 0.01) + ' °C' : r[1] > 90 ? 'au-dessus de ' + t(r[0]) + ' °C' : t(r[0]) + ' à ' + t(r[1]) + ' °C'; }
    return { top: o.top.map(rng).join(' et '), souffre: o.souffre.map(rng).join(' et '), danger: o.danger.map(rng).join(' et ') };
  }

  var order = [];
  function reorder(ids, animate) {
    var first = {};
    if (animate && !reduce) ids.forEach(function (id) { first[id] = rows[id].el.getBoundingClientRect().top; });
    ids.forEach(function (id) { body.appendChild(rows[id].el); });
    placeCard();
    if (!animate || reduce) return;
    var moved = [];
    ids.forEach(function (id) { var el = rows[id].el, d = first[id] - el.getBoundingClientRect().top; if (Math.abs(d) > 1) { el.style.transition = 'none'; el.style.transform = 'translateY(' + d + 'px)'; moved.push(el); } });
    if (!moved.length) return;
    body.getBoundingClientRect();
    requestAnimationFrame(function () { moved.forEach(function (el) { el.style.transition = 'transform .45s var(--ease)'; el.style.transform = ''; }); });
  }
  var sortLater = U.debounce(function () { reorder(order, true); }, 260);
  /* La fiche s'ouvre juste sous la ligne touchée */
  function placeCard() { if (open && rows[open]) body.insertBefore(card, rows[open].el.nextSibling); else if (card.parentNode) card.parentNode.removeChild(card); }

  function update(now) {
    vMin.textContent = st.tmin + ' °C'; vMax.textContent = st.tmax + ' °C';
    kTitle.textContent = 'Pour une eau de ' + st.tmin + ' à ' + st.tmax + ' °C';
    var T = C.moisEau(st.tmin, st.tmax);
    heads.forEach(function (c, m) { c.lastChild.textContent = Math.round(T[m]) + '°'; });

    var list = C.ESPECES.map(function (e) { return { e: e, a: C.annee(e, st.tmin, st.tmax), on: st.but === 'tout' || e.usage === st.but }; });
    list.forEach(function (x) {
      var r = rows[x.e.id];
      r.el.hidden = !x.on;
      x.a.mois.forEach(function (s, m) { r.cells[m].className = 'yr-cell c-' + s + (m === NOW ? ' now' : ''); });
      r.cnt.textContent = x.a.n.danger ? x.a.n.danger + ' mois à risque' : x.a.n.top ? 'pousse bien ' + x.a.n.top + ' mois' : 'pousse peu';
      r.cnt.className = 'yr-c tnum' + (x.a.n.danger ? ' bad' : x.a.n.top ? '' : ' low');
      var parts = ['top', 'souffre', 'danger'].map(function (s) { var p = plages(mois(x.a.mois, s)); return p ? NOM[s].toLowerCase() + ' ' + p : ''; }).filter(Boolean);
      r.el.setAttribute('aria-label', x.e.nom + ' : ' + (parts.join(', ') || 'pousse peu toute l’année') + '. Voir la fiche.');
      r.el.setAttribute('aria-expanded', String(open === x.e.id));
      r.el.classList.toggle('open', open === x.e.id);
    });

    var shown = list.filter(function (x) { return x.on; });
    shown.sort(function (a, b) { return b.a.score - a.a.score || b.a.n.top - a.a.n.top; });
    var ids = shown.map(function (x) { return x.e.id; }).concat(list.filter(function (x) { return !x.on; }).map(function (x) { return x.e.id; }));
    var changed = ids.join() !== order.join(); order = ids;
    if (changed) { if (!body.firstChild || now === true) reorder(order, false); else sortLater(); }

    /* Le verdict : l'espèce qui pousse le plus de mois sans aucun mois à risque */
    var sure = shown.filter(function (x) { return !x.a.n.danger && x.a.n.top; });
    var alive = shown.filter(function (x) { return !x.a.n.danger; });
    win.hidden = !sure.length;
    if (sure.length) {
      var a = sure[0], b2 = sure[1];
      kTitle.textContent = 'Pousse le mieux dans votre eau';
      if (winImg.getAttribute('data-sp') !== a.e.id) { winImg.src = U.img(PH[a.e.id]); winImg.setAttribute('data-sp', a.e.id); }
      big.textContent = a.e.nom;
      sub.textContent = 'Pousse bien ' + a.a.n.top + ' mois sur 12' + (a.a.n.souffre ? ', souffre ' + a.a.n.souffre + ' mois' : ', sans mois à risque') + '.' + (b2 ? ' Ensuite ' + b2.e.nom.charAt(0).toLowerCase() + b2.e.nom.slice(1) + ', ' + b2.a.n.top + ' mois.' : '');
    } else if (alive.length) {
      big.textContent = 'Aucune ne pousse vraiment';
      sub.textContent = 'Elles passent l’année mais grandissent peu : ' + alive.slice(0, 3).map(function (x) { return x.e.nom.toLowerCase(); }).join(', ') + '.';
    } else {
      big.textContent = 'Aucune espèce ne convient';
      sub.textContent = 'Rapprochez l’eau d’une plage plus douce, avec de l’ombre l’été, une serre ou un chauffage l’hiver.';
    }

    /* La fiche de l'espèce ouverte */
    card.innerHTML = '';
    var sel = list.filter(function (x) { return x.e.id === open && x.on; })[0];
    card.hidden = !sel;
    placeCard();
    if (sel) {
      var e = sel.e, s = seuils(e.id), facts = [];
      if (s.top) facts.push([NOM.top, s.top]);
      if (s.souffre) facts.push([NOM.souffre, s.souffre]);
      if (s.danger) facts.push([NOM.danger, s.danger]);
      if (e.o2) facts.push(['Oxygène', 'plus de ' + e.o2 + ' mg/L']);
      if (e.tan) facts.push(['Azote ammoniacal', 'moins de ' + U.nfa(e.tan) + ' mg/L']);
      if (e.no2) facts.push(['Nitrites', 'moins de ' + U.nfa(e.no2) + ' mg/L']);
      if (e.id === 'sterlet') facts.push(['Volume', '10 000 L par sterlet']);
      var VERBE = { top: 'pousse bien', souffre: 'souffre', danger: 'est en danger' };
      var yours = ['top', 'souffre', 'danger'].map(function (k) { var p = plages(mois(sel.a.mois, k)); return p ? VERBE[k] + ' ' + p : ''; }).filter(Boolean);
      var il = { omble: 'il', sterlet: 'il', tilapia: 'il', rouge: 'il' }[e.id] || 'elle';
      var l = LIRE[e.id];
      card.appendChild(h('div', { class: 'sp-ph' }, h('img', { src: U.img(PH[e.id]), alt: e.nom, loading: 'lazy', width: 640, height: 400 })));
      card.appendChild(h('div', { class: 'sp-tx' },
        h('h3', null, e.nom, h('em', null, ' ' + e.lat)),
        h('p', null, e.croissance),
        h('p', { class: 'sp-you' }, 'Dans votre eau, ' + il + ' ' + (yours.length ? yours.join(', ') : 'vit toute l’année mais pousse peu') + '.'),
        U.trace(facts),
        l ? h('a', { class: 'go', href: U.link('blogs/news/' + l[0]) }, l[1]) : null,
        h('p', { class: 'note' }, 'Source : ' + e.src + '.')));
    }

    /* Le calcul : la courbe de l'année et les températures retenues */
    detail.innerHTML = '';
    detail.appendChild(h('p', null, 'L’outil trace une année en courbe douce entre vos deux mesures : l’eau la plus froide fin janvier, la plus chaude fin juillet. Chaque mois est comparé aux seuils publiés pour chaque espèce.'));
    var tb = h('table', { class: 'yr-t' }), tr1 = h('tr'), tr2 = h('tr');
    var AB = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    MOIS.forEach(function (m, i) { tr1.appendChild(h('th', { scope: 'col', title: m }, AB[i])); tr2.appendChild(h('td', { class: 'tnum' }, U.nfa(T[i]) + ' °C')); });
    tb.appendChild(h('thead', null, tr1)); tb.appendChild(h('tbody', null, tr2));
    detail.appendChild(h('div', { class: 'yr-tw' }, tb));
    detail.appendChild(U.trace([
      ['Moyenne de l’année', U.nfa((st.tmin + st.tmax) / 2) + ' °C'],
      ['Écart autour de la moyenne', U.nfa((st.tmax - st.tmin) / 2) + ' °C'],
      { f: 'T(mois) = moyenne − écart × cos(2π × (mois − 0,5) / 12), janvier = 0' }
    ]));

    /* Pour démarrer : dans l'ordre du verdict, avec les espèces retenues */
    prodBox.innerHTML = '';
    var ART = { truite: 'la truite', omble: 'l’omble de fontaine', perche: 'la perche', sterlet: 'le sterlet', rouge: 'les poissons rouges' };
    var good = sure.map(function (x) { return x.e.id; });
    function pour(ids) { var n = good.filter(function (id) { return ids.indexOf(id) > -1; }).map(function (id) { return ART[id]; }); return n.length > 1 ? n.slice(0, -1).join(', ') + ' et ' + n[n.length - 1] : n[0]; }
    var P = {
      'kit-daquaponie-enterre': { sp: ['truite', 'omble', 'perche'], why: function () { return 'Prévu pour ' + pour(this.sp); } },
      'aliment-truite-aquaponie': { sp: ['truite', 'omble'], why: function () { return 'Granulés de 5,5 mm pour ' + pour(this.sp); } },
      'kit-daquaponie-naps': { sp: ['rouge'], why: function () { return '500 L, pensé pour les poissons rouges'; } },
      'pompe-air-hailea-aco-80-3600-lh': { sp: ['sterlet', 'truite', 'omble'], why: function () { return 'Plus de 6 mg/L d’oxygène pour ' + pour(this.sp); } }
    };
    var items = [], seen = {};
    good.forEach(function (id) { Object.keys(P).forEach(function (hd) { if (!seen[hd] && P[hd].sp.indexOf(id) > -1) { seen[hd] = 1; items.push({ h: hd, why: P[hd].why() }); } }); });
    items = items.slice(0, 2);
    items.push({ h: 'pack-test-eau-aquaponie-analyses-essentielles-nh4-no2-ph-kh', why: 'Les 5 mesures de base de l’aquaponie' });
    prodBox.appendChild(U.prodList('Pour démarrer', items));
    U.State.write(st, DEF);
  }
  update(true);
});
