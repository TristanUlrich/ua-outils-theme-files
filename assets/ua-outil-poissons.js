/* Combien de poissons : le bassin vu en coupe, rempli par la place que prend chaque espèce, puis l'UV-C et le filtre qui suivent. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h, S = U.svg;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { V: 6000, S: 0, koi: 2, koiCm: 30, rouge: 5, rougeCm: 12, shub: 0, shubCm: 15, ide: 0, ideCm: 30, tanche: 0, tancheCm: 20, sterlet: 0 };
  var st = U.State.read(DEF);
  /* clé d'état, espèce du moteur, nom, pluriel, photo, taille par défaut */
  var SP = [
    { k: 'koi', sp: 'koi', nom: 'Koï', pl: 'koïs', img: 'poisson-koi.jpg' },
    { k: 'rouge', sp: 'rouge', nom: 'Poisson rouge', pl: 'poissons rouges', img: 'poisson-rouge.jpg' },
    { k: 'shub', sp: 'shubunkin', nom: 'Shubunkin ou comète', pl: 'shubunkins ou comètes', img: 'poisson-shubunkin.jpg' },
    { k: 'ide', sp: 'ide', nom: 'Ide', pl: 'ides', img: 'poisson-ide.jpg' },
    { k: 'tanche', sp: 'tanche', nom: 'Tanche', pl: 'tanches', img: 'poisson-tanche.jpg' },
    { k: 'sterlet', sp: 'sterlet', nom: 'Sterlet', pl: 'sterlets', img: 'poisson-sterlet.jpg', note: '1 m de fond au moins, et un bulleur en continu.' }
  ];
  var shown = {}; SP.forEach(function (s) { shown[s.k] = st[s.k] > 0 || s.k === 'koi' || s.k === 'rouge'; });

  /* Résultat */
  var big = h('p', { class: 'big tnum', 'aria-live': 'polite' }), verdict = h('p', { class: 'lede' });
  var cuve = S('svg', { class: 'cuve', role: 'img', 'aria-label': 'Le bassin en coupe, rempli par la place que prend chaque espèce' });
  var leg = h('ul', { class: 'cuve-l' }), place = h('p', { class: 'place-l' });
  var res = h('div', null, h('span', { class: 'k' }, 'Charge du bassin'), big, verdict, h('div', { class: 'cuve-box' }, cuve), leg, place);

  /* Saisie */
  var fV = U.numField({ id: 'V', label: 'Volume', unit: 'L', value: st.V, min: 100, max: 200000, step: 100, onChange: function (v) { st.V = v; update(); } });
  var fS = U.numField({ id: 'S', label: 'Surface d’eau', unit: 'm²', value: st.S, min: 0, max: 2000, step: 0.5, empty: '0', onChange: function (v) { st.S = v; update(); },
    hint: 'Pour un bassin profond et étroit : l’oxygène entre par la surface, la règle la plus stricte s’applique. Laissez 0 pour l’ignorer.' });
  var rows = h('div', { class: 'fish' }), addBox = h('div', { class: 'fish-add' });
  var rowEls = {};
  SP.forEach(function (s) {
    var n = h('output', { class: 'n tnum' });
    function setN(v) { st[s.k] = U.clamp(v, 0, 200); update(); }
    var size = s.sp === 'sterlet' ? h('span', { class: 'fish-rule' }, '10 000 L chacun')
      : U.numField({ id: s.k + 'Cm', label: 'Taille adulte', unit: 'cm', value: st[s.k + 'Cm'], min: 3, max: 100, step: 1, stepper: false, onChange: function (v) { st[s.k + 'Cm'] = v; update(); } });
    var row = h('div', { class: 'fish-row', 'data-k': s.k },
      h('img', { src: U.img(s.img), alt: '', width: 92, height: 62, loading: 'lazy' }),
      h('div', { class: 'fish-nm' }, h('strong', null, s.nom), size, s.note ? h('span', { class: 'fish-note' }, s.note) : null),
      h('div', { class: 'cnt', role: 'group', 'aria-label': 'Nombre de ' + s.pl },
        h('button', { type: 'button', 'aria-label': 'Un ' + s.nom.toLowerCase() + ' de moins', onclick: function () { setN(st[s.k] - 1); } }, '−'), n,
        h('button', { type: 'button', 'aria-label': 'Un ' + s.nom.toLowerCase() + ' de plus', onclick: function () { setN(st[s.k] + 1); } }, '+')));
    rowEls[s.k] = { row: row, n: n };
    rows.appendChild(row);
    var chip = h('button', { type: 'button', class: 'fchip', 'data-k': s.k }, h('img', { src: U.img(s.img), alt: '', width: 28, height: 28, loading: 'lazy' }), s.nom);
    chip.addEventListener('click', function () { shown[s.k] = true; if (!st[s.k]) st[s.k] = 1; update(); var b = U.$('.cnt button:last-child', row); if (b) b.focus(); });
    addBox.appendChild(chip);
  });
  var inp = h('div', null, h('div', { style: 'max-width:300px' }, fV), h('span', { class: 'k', style: 'margin-top:22px' }, 'Vos poissons'), rows, h('span', { class: 'k add-k' }, 'Ajouter une espèce'), addBox);
  var prodBox = h('div'), detail = h('div');
  var out = h('div', null, prodBox,
    h('div', { class: 'chain' }, h('a', { class: 'go', id: 'go-pompe', href: '#' }, 'La pompe qui alimente l’UV-C'), h('a', { class: 'go', href: U.url('nourrir-poissons-bassin', 1) }, 'Combien les nourrir aujourd’hui')),
    U.actions());
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, adv: fS, advLabel: 'Affiner avec la surface d’eau', detail: detail, out: out }));
  U.onResize(update);

  function nom(s, n) { return n + ' ' + (n > 1 ? s.pl : s.nom.toLowerCase()); }
  function L(v) { return U.nf(U.round(v, 10), 0) + ' L'; }

  /* Le bassin en coupe : une couche par espèce, la place libre au-dessus, le trop-plein déborde */
  function drawCuve(r, fish, pct) {
    while (cuve.firstChild) cuve.removeChild(cuve.firstChild);
    var W = Math.max(300, Math.round(cuve.parentNode.clientWidth || 600)), Hb0 = Math.min(230, Math.max(170, W * 0.32));
    var scale = pct > 100 ? Math.min(Hb0 / 100, Hb0 * 1.9 / pct) : Hb0 / 100, Hb = 100 * scale, Ho = Math.max(0, (pct - 100) * scale);
    var top = 40, rim = top + Ho, H = rim + Hb + 10;
    var x0 = 10, x1 = W - 10, bw = x1 - x0, rad = 26;
    cuve.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var defs = S('defs');
    var basin = 'M' + x0 + ' ' + rim + ' L' + x0 + ' ' + (rim + Hb - rad) + ' Q' + x0 + ' ' + (rim + Hb) + ' ' + (x0 + rad) + ' ' + (rim + Hb) + ' L' + (x1 - rad) + ' ' + (rim + Hb) + ' Q' + x1 + ' ' + (rim + Hb) + ' ' + x1 + ' ' + (rim + Hb - rad) + ' L' + x1 + ' ' + rim;
    var cb = S('clipPath', { id: 'cuve-in' }); cb.appendChild(S('path', { d: basin + ' Z' })); defs.appendChild(cb);
    var spill = S('clipPath', { id: 'cuve-up' }); spill.appendChild(S('rect', { x: x0, y: 0, width: bw, height: rim, rx: 10 })); defs.appendChild(spill);
    cuve.appendChild(defs);
    cuve.appendChild(S('path', { d: basin + ' Z', class: 'c-eau' }));
    var y = rim + Hb, total = 0;
    fish.forEach(function (f) { total += f.l; });
    var unit = total > 0 ? pct / total : 0; /* % par litre, pour que la pile vaille la charge retenue */
    var gIn = S('g', { 'clip-path': 'url(#cuve-in)' }), gUp = S('g', { 'clip-path': 'url(#cuve-up)' });
    fish.forEach(function (f, i) {
      var hgt = f.l * unit * scale, yt = y - hgt;
      [[gIn, Math.max(yt, rim), y], [gUp, yt, Math.min(y, rim)]].forEach(function (z) {
        if (z[2] - z[1] <= 0.5) return;
        var id = 'b' + i + (z[0] === gIn ? 'i' : 'u');
        var cp = S('clipPath', { id: id }); cp.appendChild(S('rect', { x: x0, y: z[1], width: bw, height: z[2] - z[1] })); defs.appendChild(cp);
        z[0].appendChild(S('image', { href: U.img(f.s.img), x: x0, y: z[1] - 40, width: bw, height: z[2] - z[1] + 80, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#' + id + ')' }));
        z[0].appendChild(S('rect', { x: x0, y: z[1], width: bw, height: z[2] - z[1], class: z[0] === gUp ? 'c-over' : 'c-shade' }));
      });
      if (i < fish.length) gIn.appendChild(S('line', { x1: x0, y1: Math.max(yt, rim), x2: x1, y2: Math.max(yt, rim), class: 'c-sep' }));
      if (hgt > 26) {
        var ty = (Math.max(yt, 2) + y) / 2 + 6;
        cuve.__labels = cuve.__labels || [];
        cuve.__labels.push(S('text', { x: x0 + 18, y: ty, class: 'c-t' }, nom(f.s, f.n)));
        cuve.__labels.push(S('text', { x: x1 - 18, y: ty, class: 'c-t r', 'text-anchor': 'end' }, L(f.l)));
      }
      y = yt;
    });
    cuve.appendChild(gIn); cuve.appendChild(gUp);
    /* Place libre */
    if (pct < 100) {
      var free = (100 - pct) * scale;
      if (free > 24) cuve.appendChild(S('text', { x: (x0 + x1) / 2, y: rim + free / 2 + 6, class: 'c-free', 'text-anchor': 'middle' }, 'Place libre : ' + L(Math.max(0, st.V - r.usedL))));
    }
    (cuve.__labels || []).forEach(function (t) { cuve.appendChild(t); }); cuve.__labels = [];
    cuve.appendChild(S('path', { d: basin, class: 'c-wall' }));
    cuve.appendChild(S('line', { x1: x0 - 6, y1: rim, x2: x1 + 6, y2: rim, class: 'c-rim' }));
    cuve.appendChild(S('text', { x: x1, y: pct > 100 ? 24 : rim - 10, class: 'c-lim' + (pct > 100 ? ' bad' : ''), 'text-anchor': 'end' }, pct > 100 ? 'Déborde de ' + U.nf(pct - 100, 0) + ' % au-dessus de la limite' : 'Limite du bassin'));
  }

  function update() {
    var fish = [];
    SP.forEach(function (s) {
      var n = st[s.k] || 0, cm = st[s.k + 'Cm'] || 0;
      rowEls[s.k].n.textContent = n;
      rowEls[s.k].row.hidden = !shown[s.k];
      rowEls[s.k].row.classList.toggle('zero', !n);
      U.$('.fchip[data-k="' + s.k + '"]', addBox).hidden = shown[s.k];
      if (n) fish.push({ s: s, n: n, cm: cm, l: C.litres(s.sp, n, cm) });
    });
    addBox.previousSibling.hidden = SP.every(function (s) { return shown[s.k]; });
    var r = C.peuplement({ V: st.V, S: st.S, poissons: fish.map(function (f) { return { sp: f.s.sp, n: f.n, cm: f.cm }; }) });
    var pct = r.charge * 100;
    U.tween(big, pct, function (v) { return U.nf(v, 0) + ' %'; });
    big.style.color = pct > 100 ? 'var(--bad)' : '';
    verdict.textContent = r.n === 0 ? 'Aucun poisson pour l’instant.' : pct <= 70 ? 'De la marge : l’eau restera plus facile à tenir.' : pct <= 100 ? 'Bassin bien rempli. Pas de nouveau poisson sans filtre plus fort.' : 'Surpeuplé. Agrandissez le bassin, renforcez la filtration ou confiez des poissons.';
    if (r.limite === 'surface' && st.S > 0 && r.n) verdict.textContent += ' La surface d’eau limite plus que le volume.';
    drawCuve(r, fish, pct);

    leg.innerHTML = '';
    fish.forEach(function (f) {
      leg.appendChild(h('li', null, h('img', { src: U.img(f.s.img), alt: '', width: 22, height: 22 }), h('span', null, nom(f.s, f.n) + (f.s.sp === 'sterlet' ? '' : ' de ' + f.cm + ' cm')), h('b', null, L(f.l))));
    });

    /* Place qui reste, pour les espèces du bassin */
    var cands = fish.length ? fish.map(function (f) { return f; }) : [{ s: SP[0], cm: 30 }, { s: SP[1], cm: 12 }];
    var opts = [];
    cands.slice(0, 3).forEach(function (f) { var cm = Math.max(f.cm || 0, 8), k = r.place(f.s.sp, cm); if (k > 0) opts.push(nom(f.s, k) + (f.s.sp === 'sterlet' ? '' : ' de ' + cm + ' cm')); });
    place.textContent = opts.length ? 'Il reste de la place pour ' + opts.join(', ou ') + '.' : 'Plus de place pour un poisson de plus.';

    prodBox.innerHTML = '';
    var cat = r.categorie, uv = C.choisirUV(st.V, cat, U.DATA.uv, 'sterilisateur-uv-clear');
    var lab = { koi: r.part.sterlet && !r.koi ? 'avec koïs, la catégorie la plus exigeante' : 'avec koïs', avec: 'avec poissons', sans: 'sans poissons' }[cat];
    var items = [];
    if (uv) items.push({ h: uv.h, vid: uv.vid, title: 'EHEIM Clear UVC ' + uv.w + ' W', why: 'Traite ' + U.nf(uv[cat], 0) + ' L ' + lab + '. Se monte après la pompe.' });
    ['pompe-filtre-loop-eheim', 'pompe-filtre-looppro-eheim-l-h', 'filtre-bassin-immerge-uv-c-sicce-filtrapond'].forEach(function (hh) {
      var f = C.choisirUV(st.V, cat === 'koi' && hh.indexOf('sicce') > -1 ? 'avec' : cat, U.DATA.uv, hh);
      if (f && !(cat === 'koi' && hh.indexOf('sicce') > -1) && items.length < 3) items.push({ h: f.h, vid: f.vid, title: f.vt.indexOf('L/h') > -1 ? 'Sicce Filtrapond ' + f.vt : 'Filtre EHEIM ' + f.vt + ' avec UV-C', why: 'Filtre et UV-C ' + f.w + ' W, jusqu’à ' + U.nf(f[cat], 0) + ' L ' + (cat === 'koi' ? 'avec koïs' : lab) + '.' });
    });
    if (items.length) prodBox.appendChild(U.prodList('Pour une eau claire', items, { top: true }));
    else prodBox.appendChild(h('div', { class: 'prods' }, h('h3', null, 'Bassin au-delà des modèles vendus'), h('p', { class: 'note' }, 'Combinez deux appareils, ou écrivez à la boutique.')));
    if (r.part.sterlet) prodBox.appendChild(U.prodList('Pour l’oxygène des esturgeons', [{ h: 'pompe-air-hailea-aco-80-3600-lh', why: 'Bulleur en continu, jour et nuit, diffuseurs près du fond' }]));
    U.$('#go-pompe').href = U.url('calculateur-pompe-bassin') + 'usage=' + (cat === 'koi' ? 'koi' : 'bassin') + '&V=' + st.V;

    detail.innerHTML = '';
    var t = [];
    fish.forEach(function (f) {
      var P = C.POP[f.s.sp];
      t.push([f.s.nom, L(f.l)]);
      t.push({ f: P.parPoisson ? f.n + ' × 10 000 L (article Univers Aquaponie sur l’esturgeon)' : f.n + ' × ' + f.cm + ' cm × ' + U.nf(P.lcm, 1) + ' L/cm' + (P.regle === 'prudence' ? ' (repère du koï, par prudence)' : '') });
    });
    t.push(['Volume occupé', U.nf(r.usedL, 0) + ' L sur ' + U.nf(st.V, 0) + ' L']);
    t.push(['Charge en volume', U.nf(r.chargeV * 100, 0) + ' %']);
    if (st.S > 0) t.push(['Charge en surface', U.nf(r.chargeS * 100, 0) + ' %'], { f: '0,037 m² par cm de poisson, et 0,93 m² par koï' });
    t.push(['UV-C, catégorie retenue', lab]);
    detail.appendChild(U.trace(t));
    detail.appendChild(h('p', { class: 'note' }, 'Repères empiriques pour un bassin filtré. Comptez avec la taille adulte, pas avec celle du jour de l’achat.'));
    U.State.write(st, DEF);
  }
  update();
});
