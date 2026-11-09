/* Nourrir selon la température : une échelle verticale qu'on fait glisser. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { T: 12, kg: 10 };
  var st = U.State.read(DEF);
  var TMIN = 0, TMAX = 34;

  var big = h('p', { class: 'big tnum', 'aria-live': 'polite' }), titre = h('p', { class: 'verdict' }), sub = h('p', { class: 'lede' });
  var kT = h('span', { class: 'k' }); var res = h('div', null, kT, big, titre, sub);

  /* Echelle */
  var scale = h('div', { class: 'therm', role: 'slider', tabindex: '0', 'aria-label': 'Température de l’eau', 'aria-valuemin': TMIN, 'aria-valuemax': TMAX });
  var track = h('div', { class: 'th-track' }), thumb = h('div', { class: 'th-thumb' }, h('span'), h('i', { class: 'knob' }));
  C.ZONES.forEach(function (z) {
    var a = Math.max(z.a, TMIN), b = Math.min(z.b, TMAX); if (b <= a) return;
    track.appendChild(h('div', { class: 'th-z z-' + z.id, style: 'bottom:' + pc(a) + '%;height:' + (pc(b) - pc(a)) + '%' },
      h('span', { class: 'th-l' }, h('b', null, z.titre), h('em', null, z.pct ? U.nf(z.pct, z.pct % 1 ? 1 : 0) + ' % par jour' : 'Aucun repas'))));
  });
  for (var t = 0; t <= TMAX; t += 5) track.appendChild(h('span', { class: 'th-tick', style: 'bottom:' + pc(t) + '%' }, t + '°'));
  track.appendChild(thumb);
  scale.appendChild(track);
  function pc(t) { return (t - TMIN) / (TMAX - TMIN) * 100; }
  function fromY(y) { var r = track.getBoundingClientRect(); return U.clamp(Math.round((TMAX - (y - r.top) / r.height * (TMAX - TMIN)) * 2) / 2, TMIN, TMAX); }
  var drag = false;
  scale.addEventListener('pointerdown', function (e) { drag = true; scale.classList.add('drag'); scale.setPointerCapture(e.pointerId); setT(fromY(e.clientY)); });
  scale.addEventListener('pointermove', function (e) { if (drag) setT(fromY(e.clientY)); });
  ['pointerup', 'pointercancel'].forEach(function (ev) { scale.addEventListener(ev, function () { drag = false; scale.classList.remove('drag'); }); });
  scale.addEventListener('keydown', function (e) {
    var d = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5, PageUp: 2, PageDown: -2 }[e.key];
    if (d) { e.preventDefault(); setT(U.clamp(st.T + d, TMIN, TMAX)); }
  });
  var viz = h('div', null, scale);

  var fT = U.numField({ id: 'T', label: 'Température mesurée', unit: '°C', value: st.T, min: 0, max: 34, step: 0.5, onChange: function (v) { setT(v, true); } });
  var fkg = U.numField({ id: 'kg', label: 'Poids des poissons', unit: 'kg', value: st.kg, min: 0.1, max: 500, step: 0.5, onChange: function (v) { st.kg = v; update(); } });
  var inp = h('div', { class: 'fields two' }, fT, fkg);
  var prodBox = h('div'), nextBox = h('p', { class: 'tip' }), detail = h('div');
  var out = h('div', null, prodBox, nextBox, 
    h('div', { class: 'chain' }, h('a', { class: 'go', href: U.url('combien-de-poissons-bassin', 1) }, 'Votre bassin est-il trop chargé'), h('a', { class: 'go', href: U.url('diagnostic-analyse-eau') + 'milieu=bassin' }, 'Lire votre analyse d’eau')), U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: viz, detail: detail, vizLabel: 'Thermomètre', out: out, vizFirst: true }));

  /* Les aliments vendus, chacun sur sa plage de température, et la température du jour qui les traverse */
  var FMIN = 4, FMAX = 31, foodRows = null, foodHead = h('h3', null), foodNote = h('p', { class: 'note' });
  function fx(t) { return (U.clamp(t, FMIN, FMAX) - FMIN) / (FMAX - FMIN) * 100; }
  function drawFoods(r) {
    var list = (U.DATA.aliments || []).slice().sort(function (a, b) { return (a.tmin - b.tmin) || (a.tmax - b.tmax); });
    if (!foodRows) {
      foodRows = h('div', { class: 'foods' });
      var axis = h('div', { class: 'f-axis', 'aria-hidden': 'true' });
      [5, 10, 15, 20, 25, 30].forEach(function (t) { axis.appendChild(h('span', { style: 'left:' + fx(t) + '%' }, t + '°')); });
      foodRows.appendChild(h('div', { class: 'f-row f-head' }, h('span'), axis, h('span')));
      list.forEach(function (a) {
        var p = U.product(a.h); if (!p) return;
        var v = p.variant, img = p.img ? p.img + (p.img.indexOf('?') > -1 ? '&' : '?') + 'width=120' : '';
        var add = v && v.ok ? h('a', { class: 'btn sm', href: U.cartHref(v.id), rel: 'nofollow', 'data-ua-cart': v.id, 'aria-label': 'Ajouter ' + p.title }, 'Ajouter') : null;
        var row = h('div', { class: 'f-row', 'data-min': a.tmin, 'data-max': a.tmax },
          h('a', { class: 'f-ph', href: p.url, tabindex: '-1', 'aria-hidden': 'true' }, img ? h('img', { src: img, alt: '', loading: 'lazy', width: 40, height: 40 }) : null),
          h('div', { class: 'f-mid' }, h('a', { class: 'f-nm', href: p.url }, p.title),
            h('div', { class: 'f-bar' }, h('i', { class: 'f-rng', style: 'left:' + fx(a.tmin) + '%;width:' + (fx(a.tmax) - fx(a.tmin)) + '%' }), h('b', { class: 'f-now' })),
            h('span', { class: 'f-r' }, 'De ' + a.tmin + ' à ' + a.tmax + ' °C, dès ' + U.eur(Math.min.apply(null, p.all.map(function (x) { return x.p; }))))),
          h('div', { class: 'f-add' }, add));
        foodRows.appendChild(row);
      });
      prodBox.appendChild(h('div', { class: 'prods foodbox' }, foodHead, foodRows, foodNote));
    }
    var n = 0;
    U.$$('.f-row[data-min]', foodRows).forEach(function (row) {
      var ok = st.T >= +row.getAttribute('data-min') && st.T <= +row.getAttribute('data-max');
      row.classList.toggle('on', ok); row.classList.toggle('first', ok && !n); if (ok) n++;
      U.$('.f-now', row).style.left = fx(st.T) + '%';
    });
    foodHead.textContent = n ? (n > 1 ? n + ' aliments' : 'Un aliment') + ' pour ' + U.nfa(st.T) + ' °C' : 'Aucun aliment pour ' + U.nfa(st.T) + ' °C';
    foodNote.textContent = st.T < 5 ? 'Les aliments d’hiver vendus commencent à 5 °C. Gardez un trou dans la glace pour les échanges de gaz.' : st.T > 30 ? 'Réduisez la ration, nourrissez tôt le matin et aérez le bassin.' : '';
  }

  function setT(v, fromField) { st.T = v; if (!fromField) fT.set(v); update(); }

  function update() {
    var r = C.nourrir(st.T, st.kg, U.DATA.aliments || []), z = r.zone;
    kT.textContent = 'À ' + U.nfa(st.T) + ' °C, ration ' + (z.id === 'veille' ? 'par distribution' : 'du jour');
    big.textContent = z.pct ? U.nf(U.round(r.gJour, r.gJour > 100 ? 5 : 1), 0) + ' g' : '0 g';
    titre.textContent = z.titre;
    sub.innerHTML = '';
    if (z.pct) sub.textContent = (/repas|peu/.test(z.titre) && z.id !== 'veille' ? 'P' : (z.id === 'veille' ? '2 à 3 fois par semaine, p' : z.repas.charAt(0).toUpperCase() + z.repas.slice(1) + ', p')) + 'our ' + U.nfa(st.kg) + ' kg de poissons.';
    else sub.textContent = 'La digestion est presque arrêtée. Un aliment donné maintenant reste dans l’intestin.';
    thumb.style.bottom = pc(st.T) + '%';
    thumb.firstChild.textContent = U.nfa(st.T) + '°';
    scale.setAttribute('aria-valuenow', st.T); scale.setAttribute('aria-valuetext', U.nfa(st.T) + ' °C, ' + z.titre);
    U.$$('.th-z', track).forEach(function (el) { el.classList.toggle('on', el.classList.contains('z-' + z.id)); });

    drawFoods(r);
    var i = C.ZONES.indexOf(z), down = C.ZONES[i - 1], up = C.ZONES[i + 1];
    nextBox.textContent = (down ? 'Sous ' + z.a + ' °C : ' + down.titre.toLowerCase() + '. ' : '') + (up && z.b < 40 ? 'À partir de ' + z.b + ' °C : ' + up.titre.toLowerCase() + '.' : '');

    detail.innerHTML = '';
    detail.appendChild(U.trace([
      ['Plage retenue', z.a < 0 ? 'sous 5 °C' : z.b > 34 ? 'au-delà de 30 °C' : 'de ' + z.a + ' à ' + z.b + ' °C'],
      ['Taux de ration', U.nf(z.pct, 1) + ' % du poids par jour'],
      ['Ration', U.nf(r.gJour, 0) + ' g'], { f: U.nfa(st.kg) + ' kg × 1 000 × ' + U.nf(z.pct, 1) + ' / 100' },
      ['Oxygène à saturation', U.nf(r.o2, 1) + ' mg/L'], { f: 'Benson et Krause, eau douce, niveau de la mer, ' + U.nfa(st.T) + ' °C' }
    ]));
    U.State.write(st, DEF);
  }
  update();
});
