/* Calendrier des semis : douze mois, le mois en cours surligné, export dans l'agenda. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { vue: 'mois', dec: 0, sel: '' };
  var st = U.State.read(DEF);
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var now = new Date().getMonth() + 1;
  var SEEDS = (U.DATA.semences || []).map(function (s) {
    var p = U.product(s.h), nom = p ? p.title.replace(/^Graines? (de |d’|d')?/i, '') : s.h;
    nom = nom.charAt(0).toUpperCase() + nom.slice(1);
    return { h: s.h, nom: nom, img: p && p.img ? p.img + (p.img.indexOf('?') > -1 ? '&' : '?') + 'width=120' : '', bands: s.c.bands.map(function (b) { return { label: b.label, kind: kind(b.label), months: b.months, note: b.note }; }), notes: s.c.month_notes || {} };
  }).sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
  var picked = st.sel ? st.sel.split('.').filter(Boolean) : [];
  function kind(l) { l = l.toLowerCase(); if (l.indexOf('semis') === 0) return l.indexOf('abri') > -1 ? 'abri' : 'semis'; if (/repiquage|mise en place|installation/.test(l)) return 'plant'; if (/récolte|séchage/.test(l)) return 'recolte'; return 'soin'; }
  function has(s, m, k) { return s.bands.some(function (b) { return (!k || k.indexOf(b.kind) > -1) && b.months.indexOf(m) > -1; }); }

  var big = h('p', { class: 'big', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' });
  var res = h('div', null, h('span', { class: 'k' }, 'Ce mois-ci'), big, sub);
  var vue = U.seg({ label: 'Afficher', value: st.vue, options: [['mois', 'Ce mois-ci'], ['tout', 'Les 21 cultures'], ['moi', 'Ma sélection']], onChange: function (v) { st.vue = v; update(); } });
  var dec = U.seg({ label: 'Votre région', small: true, value: String(st.dec), options: [['-2', 'Plus tôt'], ['0', 'Repères nationaux'], ['2', 'Plus tard']], onChange: function (v) { st.dec = +v; update(); } });
  var inp = h('div', null, vue, h('div', { style: 'margin-top:16px' }, dec), h('p', { class: 'note' }, 'Plus tôt sur les littoraux, plus tard en altitude et dans le Nord-Est.'));
  var head = h('div', { class: 'cal-head', 'aria-hidden': 'true' }), list = h('div', { class: 'cal' });
  var legend = h('div', { class: 'cal-leg' }, h('span', { class: 'lg c-abri' }, 'Semis sous abri'), h('span', { class: 'lg c-semis' }, 'Semis en place'), h('span', { class: 'lg c-plant' }, 'Repiquage'), h('span', { class: 'lg c-recolte' }, 'Récolte'));
  var viz = h('div', null, legend, head, list);
  var prodBox = h('div'), ics = h('button', { type: 'button', class: 'btn' }, 'Ajouter à mon agenda');
  ics.addEventListener('click', exportIcs);
  var out = h('div', null, prodBox, U.actions(ics));
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: viz, out: out }));

  for (var m = 1; m <= 12; m++) head.appendChild(h('span', { class: m === now ? 'now' : '' }, MOIS[m - 1].slice(0, m === 6 || m === 7 ? 4 : 3).replace(/\.$/, '')));

  function row(s) {
    var on = picked.indexOf(s.h) > -1;
    var bar = h('div', { class: 'cal-bar' });
    var lanes = ['abri', 'semis', 'plant', 'recolte'].filter(function (k) { return s.bands.some(function (b) { return b.kind === k; }); });
    lanes.forEach(function (k) {
      var lane = h('div', { class: 'lane' });
      s.bands.filter(function (b) { return b.kind === k; }).forEach(function (b) {
        b.months.forEach(function (mm) {
          var left = ((mm - 1) * 2 + st.dec / 2 * 1) / 24 * 100;
          lane.appendChild(h('i', { class: 'k-' + k, style: 'left:' + ((left + 100) % 100) + '%;width:' + (100 / 12) + '%', title: b.label + ', ' + MOIS[mm - 1] }));
        });
      });
      bar.appendChild(lane);
    });
    bar.appendChild(h('b', { class: 'today', style: 'left:' + (((now - 1) + (new Date().getDate() - 1) / 30) / 12 * 100) + '%' }));
    var nowTxt = s.bands.filter(function (b) { return b.months.indexOf(now) > -1 && b.kind !== 'soin'; }).map(function (b) { return b.label.toLowerCase(); });
    var r = h('button', { type: 'button', class: 'cal-row' + (on ? ' on' : ''), 'aria-pressed': String(on) },
      h('span', { class: 'cal-nm' }, s.img ? h('img', { class: 'cal-im', src: s.img, alt: '', width: 44, height: 44, loading: 'lazy' }) : h('span', { class: 'cal-im' }), h('strong', null, s.nom), h('span', { class: 'cal-now' }, nowTxt.length ? 'En ' + MOIS[now - 1] + ' : ' + nowTxt.join(', ') : ''), h('span', { class: 'pick' }, on ? 'Choisi' : 'Choisir')), bar);
    r.addEventListener('click', function () { var i = picked.indexOf(s.h); if (i > -1) picked.splice(i, 1); else picked.push(s.h); update(); });
    return r;
  }

  function update() {
    var sow = SEEDS.filter(function (s) { return has(s, now, ['abri', 'semis']); }), har = SEEDS.filter(function (s) { return has(s, now, ['recolte']); });
    big.textContent = MOIS[now - 1].charAt(0).toUpperCase() + MOIS[now - 1].slice(1);
    sub.textContent = (sow.length ? sow.length + ' culture' + (sow.length > 1 ? 's' : '') + ' à semer' : 'Rien à semer') + ' et ' + (har.length ? har.length + ' à récolter' : 'rien à récolter') + ' parmi les 21 du calendrier.';
    var shown = st.vue === 'mois' ? SEEDS.filter(function (s) { return has(s, now, ['abri', 'semis', 'plant', 'recolte']); }) : st.vue === 'moi' ? SEEDS.filter(function (s) { return picked.indexOf(s.h) > -1; }) : SEEDS;
    list.innerHTML = '';
    if (!shown.length) list.appendChild(h('p', { class: 'note' }, st.vue === 'moi' ? 'Touchez une culture pour la choisir.' : 'Rien ce mois-ci : passez à « Les 21 cultures ».'));
    shown.forEach(function (s) { list.appendChild(row(s)); });
    prodBox.innerHTML = '';
    var items = (picked.length ? picked : sow.map(function (s) { return s.h; })).slice(0, 5).map(function (hh) { return { h: hh }; });
    if (items.length) prodBox.appendChild(U.prodList(picked.length ? 'Vos graines' : 'À semer en ' + MOIS[now - 1], items));
    ics.style.display = picked.length ? '' : 'none'; ics.textContent = 'Ajouter ' + picked.length + ' culture' + (picked.length > 1 ? 's' : '') + ' à mon agenda';
    st.sel = picked.join('.');
    U.State.write(st, DEF);
  }

  function exportIcs() {
    var y = new Date().getFullYear(), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Univers Aquaponie//Calendrier des semis//FR', 'CALSCALE:GREGORIAN'], n = 0;
    picked.forEach(function (hh) {
      var s = SEEDS.filter(function (x) { return x.h === hh; })[0]; if (!s) return;
      s.bands.forEach(function (b) {
        if (b.kind === 'soin' || !b.months.length) return;
        var today = new Date(), dt = new Date(y, b.months[0] - 1, 1);
        dt.setDate(dt.getDate() + st.dec * 7);
        if (dt < today) dt.setFullYear(dt.getFullYear() + 1);
        var d = '' + dt.getFullYear() + String(dt.getMonth() + 1).padStart(2, '0') + String(dt.getDate()).padStart(2, '0');
        L.push('BEGIN:VEVENT', 'UID:ua-' + hh + '-' + (n++) + '@univers-aquaponie.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;VALUE=DATE:' + d,
          'SUMMARY:' + b.label + ' : ' + s.nom, 'DESCRIPTION:' + (b.note || '').replace(/[,;]/g, ' ').slice(0, 300), 'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:' + b.label, 'END:VALARM', 'END:VEVENT');
      });
    });
    L.push('END:VCALENDAR');
    var blob = new Blob([L.join('\r\n')], { type: 'text/calendar' }), a = h('a', { href: URL.createObjectURL(blob), download: 'calendrier-semis.ics' });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  update();
});
