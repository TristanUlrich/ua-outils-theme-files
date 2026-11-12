/* Univers Aquaponie, rubrique Outils : moteurs de calcul (v2, 09/11/2026).
   Chargé par les pages et par les tests Node. Aucune donnée ne sort du navigateur.
   Chaque règle porte sa source ; une règle empirique est signalée comme telle. */
(function (root) {
  'use strict';
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function interp(T, x) {
    if (x <= T[0][0]) return T[0][1] * x / T[0][0];
    for (var i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0]) return T[i][1] + (x - T[i][0]) * (T[i + 1][1] - T[i][1]) / (T[i + 1][0] - T[i][0]);
    var L = T[T.length - 1]; return L[1] * x / L[0];
  }

  /* ---------- 1. Bâche et volume ---------- */
  /* Profondeur moyenne : parois droites 1 ; paliers 0,75 (calculover) ; pente douce 0,85 (rechner-portal). Règles empiriques. */
  var PROFILS = { droit: 1, paliers: 0.75, pente: 0.85 };
  function bache(i) {
    var L = clamp(i.L, 0.5, 30), l = clamp(i.l, 0.5, 30);
    if (l > L) { var t = L; L = l; l = t; }
    var P = clamp(i.P, 0.2, 3), R = clamp(i.R == null ? 0.3 : i.R, 0, 1);
    var coef = PROFILS[i.profil] || PROFILS.paliers;
    var Pm = i.Pm > 0 ? Math.min(i.Pm, P) : P * coef;
    var Lb = L + 2 * P + 2 * R, lb = l + 2 * P + 2 * R;
    var surf = i.forme === 'ovale' ? Math.PI / 4 * L * l : L * l;
    var al = [];
    if (P > Math.min(L, l) / 2) al.push('profond');
    if (R < 0.15) al.push('rebord');
    return { L: L, l: l, P: P, R: R, Pm: Pm, coef: coef, Lb: Lb, lb: lb, Sb: Lb * lb, surfEau: surf, V: surf * Pm * 1000, alertes: al, forme: i.forme || 'rect' };
  }
  function dimsVariante(txt) {
    var m = String(txt).replace(/,/g, '.').match(/([0-9.]+)\s*[x×]\s*([0-9.]+)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  }
  function choisirBache(Lb, lb, variantes) {
    var ok = [], max = null;
    variantes.forEach(function (v) {
      var d = dimsVariante(v.t); if (!d) return;
      var a = Math.max(d[0], d[1]), b = Math.min(d[0], d[1]), s = a * b;
      if (!max || s > max.s) max = { v: v, a: a, b: b, s: s };
      if (a >= Lb - 1e-9 && b >= lb - 1e-9) ok.push({ v: v, a: a, b: b, s: s, tourne: d[0] < d[1] });
    });
    ok.sort(function (x, y) { return (x.s - y.s) || (x.v.p - y.v.p); });
    return { best: ok[0] || null, all: ok, max: max };
  }

  /* ---------- 2. Pompe ---------- */
  /* FAO 589 (Somerville et al., 2014), table 8.1 : volume du bassin (L) -> débit (L/h). */
  var FAO_POMPE = [[200, 800], [500, 1200], [1000, 2000], [1500, 2500], [2000, 3200], [3000, 4500]];
  function debitVise(usage, V, Qlibre) {
    if (usage === 'aquaponie') return { Q: interp(FAO_POMPE, V), src: 'fao', extra: V > 3000 || V < 200 };
    if (usage === 'koi') return { Q: V, src: 'koi' };
    if (usage === 'libre') return { Q: Qlibre || 1000, src: 'libre' };
    return { Q: V / 2, src: 'bassin' };
  }
  /* Hazen-Williams, unités SI : Hf = 10,67 L Q^1,852 / (C^1,852 D^4,8704) */
  function hazen(Lm, Qlh, Dmm, C) {
    if (!(Lm > 0 && Qlh > 0 && Dmm > 0)) return 0;
    return 10.67 * Lm * Math.pow(Qlh / 3600000, 1.852) / (Math.pow(C || 140, 1.852) * Math.pow(Dmm / 1000, 4.8704));
  }
  function reseau(i) { var Le = i.n * (i.D <= 32 ? 0.5 : 1); return { Le: Le, H: function (Q) { return i.Hg + hazen(i.Lt + Le, Q, i.D, i.C); } }; }
  /* Courbe de pompe faute de courbe fabricant : droite (0 ; Hmax) -> (Qmax ; 0). Estimation prudente. */
  function hPompe(p, Q) { return p.hm * (1 - Q / p.q); }
  function pointFonctionnement(p, sys) {
    if (hPompe(p, 0) <= sys(0)) return { Q: 0, H: sys(0) };
    var a = 0, b = p.q;
    for (var k = 0; k < 50; k++) { var m = (a + b) / 2; if (hPompe(p, m) - sys(m) > 0) a = m; else b = m; }
    return { Q: a, H: sys(a) };
  }
  function energie(W, h, prix) { var kwh = W * h * 365 / 1000; return { kwh: kwh, eur: kwh * prix }; }
  function pompe(i, pompes) {
    var vis = debitVise(i.usage, i.V, i.Qlibre), r = reseau(i), dehors = i.usage !== 'aquaponie';
    var c = pompes.filter(function (p) { return !(dehors && p.lieu === 'interieur'); }).map(function (p) {
      var op = pointFonctionnement(p, r.H), e = p.sol ? { kwh: 0, eur: 0 } : energie(p.w, i.h, i.prix);
      return { p: p, Q: op.Q, H: op.H, kwh: e.kwh, eur: e.eur };
    });
    var ok = c.filter(function (x) { return x.Q >= vis.Q && x.Q <= 1.8 * vis.Q; }).sort(function (a, b) { return a.p.w - b.p.w || a.Q - b.Q; });
    var trop = c.filter(function (x) { return x.Q > 1.8 * vis.Q; }).sort(function (a, b) { return a.Q - b.Q; });
    var court = c.filter(function (x) { return x.Q < vis.Q; }).sort(function (a, b) { return b.Q - a.Q; });
    var D2 = [13, 16, 19, 25, 32, 40, 50].filter(function (d) { return d > i.D; })[0] || i.D;
    return { vise: vis, Le: r.Le, Hf: r.H(vis.Q) - i.Hg, Hmt: r.H(vis.Q), sys: r.H, ok: ok, trop: trop, court: court,
      vitesse: (vis.Q / 3600000) / (Math.PI * Math.pow(i.D / 1000, 2) / 4),
      D2: D2, Hf2: hazen(i.Lt + r.Le, vis.Q, D2, i.C) };
  }

  /* ---------- 3. Combien de poissons ---------- */
  /* AllPondSolutions (22/08/2023) : koï 35 gallons par pouce, poisson rouge 20 gallons par pouce ;
     1 pied carré de surface par pouce, 10 pieds carrés par koï. Converti : 52,2 L/cm, 29,8 L/cm, 0,0366 m²/cm, 0,93 m² par koï. Règles empiriques. */
  /* Règles de peuplement. Koï et poissons rouges : AllPondSolutions (35 et 20 gallons par pouce, 1 pied carré par pouce,
     10 pieds carrés par koï). Ide et tanche : aucune règle publiée, repère du koï appliqué par prudence.
     Sterlet : 10 000 L par poisson, chiffre retenu par l'article Univers Aquaponie sur l'esturgeon en bassin. */
  var LKOI = 132.489 / 2.54, LROUGE = 75.708 / 2.54;
  var POP = {
    koi: { lcm: LKOI, regle: 'koi', nom: 'Koï' },
    rouge: { lcm: LROUGE, regle: 'rouge', nom: 'Poisson rouge' },
    shubunkin: { lcm: LROUGE, regle: 'rouge', nom: 'Shubunkin ou comète' },
    ide: { lcm: LKOI, regle: 'prudence', nom: 'Ide' },
    tanche: { lcm: LKOI, regle: 'prudence', nom: 'Tanche' },
    sterlet: { parPoisson: 10000, regle: 'sterlet', nom: 'Sterlet' }
  };
  var M2CM = 0.092903 / 2.54, M2KOI = 0.92903;
  function litres(sp, n, cm) { var r = POP[sp]; return r ? (r.parPoisson ? n * r.parPoisson : n * cm * r.lcm) : 0; }
  function peuplement(i) {
    var usedL = 0, usedS = 0, koi = 0, n = 0, part = {};
    i.poissons.forEach(function (f) {
      var r = POP[f.sp]; if (!r || !(f.n > 0)) return;
      var l = litres(f.sp, f.n, f.cm); usedL += l; part[f.sp] = l; n += f.n;
      if (!r.parPoisson) usedS += f.n * f.cm * M2CM;
      if (f.sp === 'koi') koi += f.n;
    });
    var chargeV = usedL / i.V;
    var chargeS = i.S > 0 ? Math.max(usedS / i.S, koi * M2KOI / i.S) : 0;
    var charge = Math.max(chargeV, chargeS);
    function place(sp, cm) {
      var r = POP[sp], libreV = i.V - usedL;
      var nV = Math.floor(libreV / litres(sp, 1, cm));
      if (i.S > 0 && !r.parPoisson) {
        var nS = Math.floor((i.S - usedS) / (cm * M2CM));
        if (sp === 'koi') nS = Math.min(nS, Math.floor((i.S - koi * M2KOI) / M2KOI));
        nV = Math.min(nV, nS);
      }
      return Math.max(0, nV);
    }
    return { usedL: usedL, part: part, chargeV: chargeV, chargeS: chargeS, charge: charge, limite: chargeS > chargeV ? 'surface' : 'volume', koi: koi, n: n, place: place,
      categorie: koi > 0 || part.sterlet ? 'koi' : (n > 0 ? 'avec' : 'sans') };
  }
  function choisirUV(V, cat, uvs, h) {
    return uvs.filter(function (u) { return (!h || u.h === h) && (u[cat] || 0) >= V; }).sort(function (a, b) { return a.w - b.w; })[0] || null;
  }

  /* ---------- 4. Nourrir selon la température ---------- */
  /* Repères des fiches aliments de la boutique (koï et poissons rouges, d'après la FAO pour Cyprinus carpio) :
     5-10 °C 0,5 % de la biomasse 2 à 3 fois par semaine ; 10-15 °C 0,5 %/j en un repas ; 15-18 °C 1 %/j ;
     18-21 °C 1,5 %/j en 3 ou 4 repas ; 21 °C et plus 2 %/j. Sous 5 °C, aucun aliment vendu n'annonce d'emploi. */
  var ZONES = [
    { a: -5, b: 5, id: 'stop', pct: 0, repas: 'aucun repas', titre: 'On ne nourrit plus' },
    { a: 5, b: 10, id: 'veille', pct: 0.5, repas: '2 à 3 fois par semaine', titre: 'Germe de blé, très peu' },
    { a: 10, b: 15, id: 'frais', pct: 0.5, repas: 'en un seul repas', titre: 'Germe de blé, un repas' },
    { a: 15, b: 18, id: 'reprise', pct: 1, repas: 'en plusieurs petits repas', titre: 'Aliment complet' },
    { a: 18, b: 21, id: 'croissance', pct: 1.5, repas: 'en 3 ou 4 petits repas', titre: 'Aliment de croissance' },
    { a: 21, b: 30, id: 'plein', pct: 2, repas: 'en plusieurs petits repas', titre: 'Pleine saison' },
    { a: 30, b: 40, id: 'chaud', pct: 1, repas: 'en 1 ou 2 petits repas', titre: 'Trop chaud, on réduit' }
  ];
  function zone(T) { for (var k = 0; k < ZONES.length; k++) if (T < ZONES[k].b) return ZONES[k]; return ZONES[ZONES.length - 1]; }
  function nourrir(T, kg, aliments) {
    var z = zone(T);
    return { zone: z, gJour: kg * 1000 * z.pct / 100, foods: aliments.filter(function (a) { return T >= a.tmin && T <= a.tmax; }), o2: o2sat(T, 0) };
  }

  /* ---------- 5. Analyse d'eau ---------- */
  /* Emerson et al. (1975) : pKa = 0,09018 + 2729,92 / T(K) ; fraction NH3 = 1 / (1 + 10^(pKa - pH)) */
  function nh3(nh4, pH, T) {
    var pKa = 0.09018 + 2729.92 / (T + 273.15), f = 1 / (1 + Math.pow(10, pKa - pH));
    var tan = nh4 * 14 / 18;
    return { pKa: pKa, f: f, tan: tan, nh3: tan * f * 17 / 14 };
  }
  /* Harned et Davis (1943) : pK1 = 3404,71 / T + 0,032786 T - 14,8435 ; 1 °dH = 0,3566 mmol/L de HCO3- */
  function co2(kh, pH, T) {
    var Tk = T + 273.15, pK1 = 3404.71 / Tk + 0.032786 * Tk - 14.8435;
    return { pK1: pK1, co2: kh * 0.3566 * 44.01 * Math.pow(10, pK1 - pH) };
  }
  /* Benson et Krause (1980, 1984), forme USGS, eau douce ; altitude par la pression de l'atmosphère standard (approximation). */
  function o2sat(T, alt) {
    var Tk = T + 273.15;
    var ln = -139.34411 + 1.575701e5 / Tk - 6.642308e7 / (Tk * Tk) + 1.2438e10 / (Tk * Tk * Tk) - 8.621949e11 / (Tk * Tk * Tk * Tk);
    var P = Math.pow(1 - 2.25577e-5 * (alt || 0), 5.25588);
    return Math.exp(ln) * P;
  }
  /* Seuils. Aquaponie : FAO 589 (pH 6 à 7, azote ammoniacal < 1, nitrites < 1, nitrates 5 à 150, KH 60 à 140 mg/L de CaCO3, O2 > 5).
     Bassin et eau froide : fiches des tests vendus (NH4 < 0,25 ; NO2 danger dès 0,5 ; NO3 au plus 30 ; KH jamais sous 5 ; O2 5 à 8). */
  var SEUILS = {
    aquaponie: { ph: [6, 7, 5.5, 7.6], nh4: [0, 1, 0, 2], no2: [0, 0.25, 0, 1], no3: [5, 150, 0, 300], kh: [3.4, 7.8, 2, 12], o2: [5, 99, 4, 99] },
    bassin: { ph: [6.5, 8.5, 6, 9], nh4: [0, 0.25, 0, 1], no2: [0, 0.25, 0, 0.5], no3: [0, 30, 0, 80], kh: [5, 12, 3, 20], o2: [5, 99, 4, 99] }
  };
  function niveau(v, s) { if (v == null || isNaN(v)) return null; if (v >= s[0] && v <= s[1]) return 'ok'; if (v >= s[2] && v <= s[3]) return 'warn'; return 'bad'; }
  function eau(i) {
    var S = SEUILS[i.milieu] || SEUILS.bassin, r = { st: {}, calc: {}, causes: [] };
    ['ph', 'nh4', 'no2', 'no3', 'kh', 'o2'].forEach(function (k) { r.st[k] = niveau(i[k], S[k]); });
    if (i.nh4 != null && i.ph != null) { r.calc.nh3 = nh3(i.nh4, i.ph, i.T); r.st.nh3 = r.calc.nh3.nh3 < 0.02 ? 'ok' : r.calc.nh3.nh3 < 0.05 ? 'warn' : 'bad'; }
    if (i.kh != null && i.ph != null) { r.calc.co2 = co2(i.kh, i.ph, i.T); r.st.co2 = r.calc.co2.co2 <= 20 ? 'ok' : r.calc.co2.co2 <= 30 ? 'warn' : 'bad'; }
    r.calc.o2sat = o2sat(i.T, i.alt || 0);
    if (i.o2 != null) r.calc.o2pct = i.o2 / r.calc.o2sat * 100;
    var c = r.causes, st = r.st;
    if (st.nh3 === 'bad' || (st.nh4 === 'bad' && st.no2 !== 'ok')) c.push('cycle');
    else if (st.no2 === 'bad' || st.no2 === 'warn') c.push('nitrites');
    if (st.nh3 && st.nh3 !== 'ok' && i.ph > 7.5) c.push('phAmmo');
    if (st.kh === 'bad' || (st.kh === 'warn' && i.kh < S.kh[0])) c.push('kh');
    if (st.o2 && st.o2 !== 'ok') c.push('o2');
    if (st.no3 && st.no3 !== 'ok' && i.no3 > S.no3[1]) c.push('no3haut');
    if (i.milieu === 'aquaponie' && i.no3 != null && i.no3 < 5) c.push('no3bas');
    if (i.milieu === 'aquaponie' && i.ph > 7) c.push('phFer');
    if (st.co2 === 'bad') c.push('co2');
    return r;
  }

  /* ---------- 6. Quel poisson ---------- */
  /* FAO 589, tableau 7.1 et §7.4 ; perche : Policar et al. (2015) ; tanche : FishBase (réf. 13614) ; poisson rouge : Ontario Freshwater Fishes. */
  var ESPECES = [
    { id: 'truite', nom: 'Truite arc-en-ciel', lat: 'Oncorhynchus mykiss', opt: [14, 16], chaud: 18, mortel: 21, froidOk: true, usage: 'manger',
      croissance: 'Eau froide et très oxygénée. Au-delà de 21 °C, sa croissance chute nettement.', o2: 6, tan: 0.5, no2: 0.3, src: 'FAO 589, tableau 7.1' },
    { id: 'perche', nom: 'Perche commune', lat: 'Perca fluviatilis', opt: [22, 24], chaud: 27, mortel: null, froidOk: true, usage: 'manger',
      croissance: '130 à 150 g en 14 mois environ à 22-24 °C.', o2: 5, src: 'Policar et al., 2015 ; Ekström et al., 2016, cité par Pichaud et al., 2019' },
    { id: 'tanche', nom: 'Tanche', lat: 'Tinca tinca', opt: null, plage: [4, 24], chaud: 24, mortel: null, froidOk: true, usage: 'manger',
      croissance: 'Poisson de fond paisible, relevé entre 4 et 24 °C dans la nature. Ses jeunes poussent bien à 24 °C, au mieux vers 28 °C.', src: 'Wolnicki et al., 2004 ; FishBase, réf. 13614' },
    { id: 'carpe', nom: 'Carpe commune', lat: 'Cyprinus carpio', opt: [25, 30], chaud: 30, mortel: 34, froidOk: true, froid: 4, usage: 'manger',
      croissance: '500 à 600 g en 10 mois environ. Sous 12 °C, elle ne grandit presque plus.', o2: 4, tan: 1, no2: 1, src: 'FAO 589, tableau 7.1' },
    { id: 'tilapia', nom: 'Tilapia du Nil', lat: 'Oreochromis niloticus', opt: [27, 30], chaud: 30, mortel: 36, froidOk: false, froid: 12, jeune: 17, usage: 'manger',
      croissance: 'De 50 à 500 g en 6 mois environ à 27-30 °C. Ne mange plus sous 17 °C, meurt sous 12 °C.', o2: 4, tan: 2, no2: 1, src: 'FAO 589, tableau 7.1 et §7.4' },
    { id: 'koi', nom: 'Carpe koï', lat: 'Cyprinus rubrofuscus', opt: [25, 30], chaud: 30, mortel: 34, froidOk: true, froid: 4, usage: 'ornement',
      croissance: 'Variété d’ornement de la carpe : mêmes plages que la carpe commune.', src: 'FAO 589, tableau 7.1 (carpe commune)' },
    { id: 'rouge', nom: 'Poisson rouge', lat: 'Carassius auratus', opt: null, pref: 27.9, chaud: 34, mortel: 41, froidOk: true, usage: 'ornement',
      croissance: 'Préfère une eau de 27,9 °C et supporte jusqu’à 41 °C. Passe l’hiver en bassin extérieur.', src: 'Ontario Freshwater Fishes ; repères d’alimentation des fabricants (pleine saison de 21 à 30 °C)' },
    { id: 'omble', nom: 'Omble de fontaine', lat: 'Salvelinus fontinalis', opt: [11, 16], chaud: 22, mortel: 23.4, froidOk: true, usage: 'manger',
      croissance: 'Le « saumon de fontaine » des pisciculteurs. Pousse le mieux de 11 à 16 °C, de moins en moins au-delà, et plus du tout à 23,4 °C.', o2: 6, src: 'Chadwick et McCormick, 2017 ; Goble et al., 2018' },
    { id: 'sterlet', nom: 'Sterlet', lat: 'Acipenser ruthenus', opt: [19, 22.5], chaud: 25, mortel: 32.8, froidOk: true, froid: 4, usage: 'ornement',
      croissance: 'Petit esturgeon de bassin, qui vit et mange au fond. Laissés libres, les jeunes sterlets choisissent une eau de 19 ou 22,5 °C selon leur élevage. Il vit de 4 à 25 °C.', o2: 6, src: 'LfL Bayern ; Vestnik ASTU' }
  ];
  /* L'année en paliers : jusqu'à cette température (incluse), tel état.
     top : pousse bien ; lent : vit, pousse peu ; souffre : stress, croissance qui baisse ou ne mange plus ; danger : croissance arrêtée ou mortalité.
     Seuils : ceux des sources de chaque espèce (voir la méthode de la page). */
  var PALIERS = {
    truite: [[14, 'lent'], [16, 'top'], [18, 'lent'], [21, 'souffre'], [99, 'danger']],
    omble: [[11, 'lent'], [16, 'top'], [22, 'lent'], [23.4, 'souffre'], [99, 'danger']],
    perche: [[22, 'lent'], [24, 'top'], [27, 'lent'], [29.8, 'souffre'], [99, 'danger']],
    sterlet: [[3.99, 'souffre'], [19, 'lent'], [22.5, 'top'], [25, 'lent'], [32.8, 'souffre'], [99, 'danger']],
    tanche: [[24, 'lent'], [28, 'top'], [99, 'lent']],
    carpe: [[25, 'lent'], [30, 'top'], [34, 'souffre'], [99, 'danger']],
    koi: [[25, 'lent'], [30, 'top'], [34, 'souffre'], [99, 'danger']],
    tilapia: [[11.99, 'danger'], [17, 'souffre'], [27, 'lent'], [30, 'top'], [36, 'souffre'], [99, 'danger']],
    rouge: [[21, 'lent'], [30, 'top'], [34, 'lent'], [41, 'souffre'], [99, 'danger']]
  };
  function etat(id, T) { var p = PALIERS[id]; for (var k = 0; k < p.length; k++) if (T <= p[k][0]) return p[k][1]; return p[p.length - 1][1]; }
  /* Température de l'eau mois par mois : une courbe douce entre la plus froide (fin janvier) et la plus chaude (fin juillet).
     Arrondie au degré : c'est le chiffre affiché, et celui que l'on compare aux seuils. */
  function moisEau(tmin, tmax) {
    var mid = (tmin + tmax) / 2, amp = (tmax - tmin) / 2, out = [];
    for (var m = 0; m < 12; m++) out.push(Math.round(mid - amp * Math.cos(2 * Math.PI * (m - 0.5) / 12)));
    return out;
  }
  function annee(e, tmin, tmax) {
    var T = moisEau(tmin, tmax), mois = T.map(function (t) { return etat(e.id, t); }), n = { top: 0, lent: 0, souffre: 0, danger: 0 };
    mois.forEach(function (s) { n[s]++; });
    return { T: T, mois: mois, n: n, score: n.top * 3 + n.lent - n.souffre * 2 - n.danger * 8 };
  }
  function evalEspece(e, tmin, tmax) {
    var raisons = [];
    if (e.mortel != null && tmax > e.mortel) return { st: 'bad', txt: 'Trop chaud l’été (au-delà de ' + e.mortel + ' °C)' };
    if (!e.froidOk && tmin < e.froid) return { st: 'bad', txt: 'Trop froid l’hiver (meurt sous ' + e.froid + ' °C)' };
    if (e.froid && e.froidOk && tmin < e.froid) raisons.push('hiver sous ' + e.froid + ' °C');
    if (tmax > e.chaud) raisons.push('été au-dessus de ' + e.chaud + ' °C');
    if (e.jeune && tmin < e.jeune) raisons.push('ne mange plus sous ' + e.jeune + ' °C');
    if (e.opt && tmax < e.opt[0]) raisons.push('n’atteint jamais ' + e.opt[0] + ' °C');
    if (e.plage && (tmin < e.plage[0] || tmax > e.plage[1])) raisons.push('hors de ' + e.plage[0] + '-' + e.plage[1] + ' °C');
    if (raisons.length) return { st: 'warn', txt: raisons.join(', ') };
    return { st: 'ok', txt: e.opt ? 'Atteint sa plage idéale de ' + e.opt[0] + ' à ' + e.opt[1] + ' °C' : 'Dans sa plage' };
  }

  /* ---------- 7. Dimensionnement aquaponique (FAO 589, chapitre 8) ---------- */
  var FRR = { feuilles: 50, fruits: 65 }, PLANTS = { feuilles: [20, 25], fruits: [4, 8] };
  function aquaponie(i) {
    var frr = i.frr || FRR[i.culture], S, A, V;
    if (i.mode === 'bassin') { V = i.V; A = V / 5; S = A / frr; } else { S = i.S; A = S * frr; V = A * 5; }
    var t = i.taux || 1.5;
    return { S: S, A: A, V: V, B: A / (t * 10), Bmin: A / 20, Bmax: A / 10, frr: frr, taux: t,
      bio: { gravier: A, bioballs: A * 0.5 }, decanteur: [V * 0.1, V * 0.2], plants: [Math.floor(S * PLANTS[i.culture][0]), Math.floor(S * PLANTS[i.culture][1])],
      debit: interp(FAO_POMPE, V), substrat: S * 0.3 * 1000, froid: !!i.froid };
  }

  /* ---------- 8. Carences ---------- */
  /* Clé de diagnostic : nutriments mobiles (symptômes sur les feuilles âgées : N, P, K, Mg) et peu mobiles (jeunes feuilles : Fe, Ca).
     FAO 589, chapitre 6 ; doses : fiches de la boutique. */
  var CARENCES = {
    N: { nom: 'Azote', ou: 'vieilles', sym: 'pale' }, P: { nom: 'Phosphore', ou: 'vieilles', sym: 'violet' },
    K: { nom: 'Potassium', ou: 'vieilles', sym: 'bords' }, Mg: { nom: 'Magnésium', ou: 'vieilles', sym: 'nervures' },
    Fe: { nom: 'Fer', ou: 'jeunes', sym: 'nervures' }, Ca: { nom: 'Calcium', ou: 'jeunes', sym: 'pointes' }
  };
  function carence(ou, sym) {
    for (var k in CARENCES) if (CARENCES[k].ou === ou && CARENCES[k].sym === sym) return k;
    return null;
  }

  /* ---------- 9. Calendrier ---------- */
  function decaleMois(m, semaines) { return ((m - 1) + semaines / 4.345 + 1200) % 12; }

  var API = { clamp: clamp, interp: interp, PROFILS: PROFILS, bache: bache, dimsVariante: dimsVariante, choisirBache: choisirBache,
    FAO_POMPE: FAO_POMPE, debitVise: debitVise, hazen: hazen, reseau: reseau, hPompe: hPompe, pointFonctionnement: pointFonctionnement, energie: energie, pompe: pompe,
    POP: POP, litres: litres, peuplement: peuplement, choisirUV: choisirUV, ZONES: ZONES, zone: zone, nourrir: nourrir,
    nh3: nh3, co2: co2, o2sat: o2sat, SEUILS: SEUILS, eau: eau, ESPECES: ESPECES, evalEspece: evalEspece, PALIERS: PALIERS, etat: etat, moisEau: moisEau, annee: annee,
    FRR: FRR, PLANTS: PLANTS, aquaponie: aquaponie, CARENCES: CARENCES, carence: carence, decaleMois: decaleMois };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.UACalc = API;
})(typeof window !== 'undefined' ? window : this);
