/* Carences : deux questions, une réponse, la dose exacte pour votre volume. */
window.UA.ready(function () {
  'use strict';
  var U = window.UA, C = window.UACalc, h = U.h;
  var root = U.$('#tool'); if (!root) return;
  var DEF = { ou: '', sym: '', V: 1000, ph: 7 };
  var st = U.State.read(DEF);
  var Q1 = [['vieilles', 'Sur les vieilles feuilles, en bas de la plante'], ['jeunes', 'Sur les jeunes feuilles, en haut'], ['fruits', 'Sur les fruits, au bout des tomates ou des poivrons']];
  var Q2 = {
    vieilles: [['pale', 'La feuille entière pâlit, puis jaunit'], ['nervures', 'Jaune entre les nervures, qui restent vertes'], ['bords', 'Les bords jaunissent puis brunissent, comme brûlés'], ['violet', 'Teinte violacée, plante chétive']],
    jeunes: [['nervures', 'Jaune entre les nervures, qui restent vertes'], ['pointes', 'Pointes brûlées, feuilles tordues']],
    fruits: [['pointes', 'Tache brune ou noire au bout du fruit']]
  };
  var TXT = {
    Fe: ['Le fer devient vite indisponible en aquaponie, surtout au-dessus de pH 7. Les poissons en rejettent très peu.', 'Toutes les 3 semaines environ. Coupez le stérilisateur UV 6 à 12 heures après l’apport.'],
    K: ['Le potassium manque presque toujours en aquaponie : l’aliment des poissons en contient peu par rapport aux besoins des fruits.', 'Par petits apports, en mesurant le potassium avant et après.'],
    Mg: ['Le magnésium manque surtout avec une eau très douce, ou quand le potassium a été apporté en excès.', 'En pulvérisation sur les feuilles, le soir.'],
    Ca: ['Le calcium voyage mal dans la plante : la carence apparaît aux extrémités, jeunes feuilles et fruits, même quand l’eau en contient.', 'Suivez la dose de la notice, et gardez une circulation d’eau régulière.'],
    N: ['L’azote vient des poissons. S’il manque, ils sont trop peu nourris pour la surface cultivée, ou le système est encore jeune.', 'Augmentez doucement la ration des poissons et mesurez les nitrates : la FAO vise 5 à 150 mg/L.'],
    P: ['Plus rare en aquaponie. Vérifiez que les poissons mangent normalement et que le pH ne dépasse pas 7.', 'Mesurez avant d’ajouter quoi que ce soit.']
  };

  var big = h('p', { class: 'big', 'aria-live': 'polite' }), sub = h('p', { class: 'lede' }), doseBox = h('div', { class: 'dose' });
  var res = h('div', null, h('span', { class: 'k' }, 'Carence probable'), big, sub, doseBox);
  var steps = h('div', { class: 'steps' });
  var fV = U.numField({ id: 'V', label: 'Volume d’eau', unit: 'L', value: st.V, min: 20, max: 50000, step: 50, onChange: function (v) { st.V = v; update(); } });
  var ph = U.seg({ label: 'pH de l’eau', small: true, value: String(st.ph), options: [['6', '6'], ['6.5', '6,5'], ['7', '7'], ['7.5', '7,5'], ['8', '8']], onChange: function (v) { st.ph = +v; update(); } });
  var inp = h('div', null, steps, h('div', { class: 'fields two', style: 'margin-top:22px;align-items:end' }, fV, ph));
  var prodBox = h('div'), warnBox = h('p', { class: 'tip' });
  var out = h('div', null, prodBox, warnBox, h('div', { class: 'chain' }, h('a', { class: 'go', href: U.url('diagnostic-analyse-eau', 1) }, 'Lire votre analyse d’eau'), h('a', { class: 'go', href: U.url('calculateur-aquaponie', 1) }, 'Équilibrer poissons et plantes')), U.actions());
  /* La clé des carences : où, à quoi ça ressemble, quel élément. Un clic remplit les deux questions. */
  var ROWS = [['pale', 'Feuille entière pâle, puis jaune'], ['nervures', 'Jaune entre les nervures, restées vertes'], ['bords', 'Bords jaunis puis brûlés'], ['violet', 'Teinte violacée, plante chétive'], ['pointes', 'Pointes brûlées, ou fruit taché au bout']];
  var key = h('table', { class: 'ckey' });
  var thead = h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span', { class: 'sr' }, 'Symptôme')), h('th', { scope: 'col' }, 'Feuilles du bas'), h('th', { scope: 'col' }, 'Feuilles du haut, fruits')));
  var tbody = h('tbody');
  ROWS.forEach(function (r) {
    var tr = h('tr', null, h('th', { scope: 'row' }, r[1]));
    ['vieilles', 'jeunes'].forEach(function (ou) {
      var k = C.carence(ou, r[0]);
      tr.appendChild(h('td', null, k ? h('button', { type: 'button', class: 'ck', 'data-k': k, onclick: function () { st.ou = ou; st.sym = r[0]; update(); } }, C.CARENCES[k].nom) : h('span', { class: 'ck-no', 'aria-label': 'Aucune carence courante' }, '')));
    });
    tbody.appendChild(tr);
  });
  key.appendChild(thead); key.appendChild(tbody);
  var viz = h('div', null, key);
  root.innerHTML = '';
  root.appendChild(U.layout({ res: res, inp: inp, viz: viz, vizLabel: 'Les six carences', out: out }));

  function choice(list, cur, on) {
    var box = h('div', { class: 'choices' });
    list.forEach(function (o) {
      var b = h('button', { type: 'button', class: 'choice' + (cur === o[0] ? ' on' : ''), 'aria-pressed': String(cur === o[0]) }, o[1]);
      b.addEventListener('click', function () { on(o[0]); });
      box.appendChild(b);
    });
    return box;
  }
  function dose(key, f) { var d = (U.DATA.compDose || {})[key]; return d ? d.factor * st.V : null; }
  function g(v, unit) { return U.nf(v >= 100 ? U.round(v, 1) : v, v >= 100 ? 0 : 1).replace(/,0$/, '') + ' ' + (unit || 'g'); }

  function update() {
    steps.innerHTML = '';
    steps.appendChild(h('p', { class: 'qn' }, '1. Où apparaît le problème ?'));
    steps.appendChild(choice(Q1, st.ou, function (v) { st.ou = v; st.sym = v === 'fruits' ? 'pointes' : ''; update(); }));
    if (st.ou) {
      steps.appendChild(h('p', { class: 'qn' }, '2. À quoi ça ressemble ?'));
      steps.appendChild(choice(Q2[st.ou], st.sym, function (v) { st.sym = v; update(); }));
    }
    var k = st.ou && st.sym ? C.carence(st.ou === 'fruits' ? 'jeunes' : st.ou, st.sym) : null;
    doseBox.innerHTML = ''; prodBox.innerHTML = ''; warnBox.style.display = 'none';
    U.$$('.ck', key).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === k)); });
    if (!k) {
      big.textContent = st.ou ? 'Encore une question' : 'Où regarder ?'; big.className = 'verdict muted-v';
      sub.textContent = st.ou ? 'Dites à quoi ressemblent les feuilles, à droite.' : 'Répondez aux deux questions, ou touchez une case de la clé ci-dessous.';
    } else {
      var nom = C.CARENCES[k].nom; big.textContent = nom; big.className = 'big';
      sub.textContent = TXT[k][0];
      var CP = U.DATA.complements || {}, items = [], dl = [];
      if (k === 'Fe') {
        var fe = st.ph > 7 ? 'fe_eddha' : 'fe_dtpa';
        dl.push([g(dose(fe)), st.ph > 7 ? 'de fer chélaté EDDHA 6 %' : 'de fer chélaté DTPA 11 %']);
        items.push({ h: CP[fe], why: st.ph > 7 ? 'Reste disponible au-dessus de pH 7' : 'Suffit tant que le pH reste sous 7' });
        items.push({ h: CP.fe_liq, why: 'Liquide, ' + g(dose('fe_liq'), 'mL') + ' pour votre volume' });
        items.push({ h: 'test-fer', why: 'Pour viser 2 mg/L sans dépasser' });
      } else if (k === 'K') {
        if (st.ph < 7) { dl.push([g(dose('khco3')), 'de bicarbonate de potassium, soit 1 °dH de KH en plus']); items.push({ h: CP.khco3, why: 'Apporte le potassium et soutient le pH' }); }
        dl.push([g(dose('k2so4')), 'de sulfate de potassium, soit 10 mg/L de potassium']);
        items.push({ h: CP.k2so4, why: 'Potassium seul, sans toucher au pH' });
        items.push({ h: 'test-potassium' });
      } else if (k === 'Mg') {
        dl.push(['50 g par litre', 'de sel d’Epsom dans le pulvérisateur']);
        items.push({ h: CP.mgso4, why: 'Sulfate de magnésium soluble' });
      } else if (k === 'Ca') {
        items.push({ h: CP.calmag, why: 'Calcium et magnésium liquides' });
      } else { items.push({ h: 'test-potentiel-hydrogene', why: 'Le pH bloque souvent l’absorption' }); }
      dl.forEach(function (d) { doseBox.appendChild(h('p', { class: 'dl' }, h('strong', { class: 'mid tnum' }, d[0]), h('span', null, ' ' + d[1]))); });
      if (dl.length && k !== 'Mg') { doseBox.appendChild(h('p', { class: 'note' }, 'Pour ' + U.nf(st.V, 0) + ' litres.')); doseBox.appendChild(h('p', { class: 'dose-safe' }, TXT[k][1])); }
      else doseBox.appendChild(h('p', { class: 'note' }, TXT[k][1]));
      prodBox.appendChild(U.prodList('Pour corriger', items, { top: true }));
      if (st.ph >= 7.5) { warnBox.style.display = ''; warnBox.textContent = 'À pH ' + U.nfa(st.ph) + ', plusieurs nutriments se bloquent en même temps. Ramenez le pH vers 6,5 à 7 avant de multiplier les apports.'; }
    }
    U.State.write(st, DEF);
  }
  update();
});
