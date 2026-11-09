/* Univers Aquaponie, rubrique Outils : noyau d'interface commun (v2, 09/11/2026).
   JavaScript natif. Aucun cookie, aucun envoi de données. */
(function (W) {
  'use strict';
  var D = document;
  /* Dans la boutique, la section pose UA_ROOT (racine de la langue), UA_LINKS (adresse de chaque outil) et UA_IMG (images du thème) */
  var IN_SHOP = !!W.UA_ROOT, ROOT = (W.UA_ROOT || '/').replace(/\/?$/, '/');
  var SHOP = IN_SHOP ? '' : 'https://www.univers-aquaponie.com';
  function url(slug, bare) { var b = (W.UA_LINKS && W.UA_LINKS[slug]) || slug + '.html'; return bare ? b : b + (b.indexOf('?') > -1 ? '&' : '?'); }
  function img(name) { return (W.UA_IMG && W.UA_IMG[name]) || 'img/' + name; }
  function cartHref(id) { return IN_SHOP ? ROOT + 'cart/add?id=' + id + '&quantity=1' : SHOP + '/cart/' + id + ':1'; }
  /* Calques posés sur la page (toast, rappel du résultat) : dans .ua-o pour garder les styles de la rubrique */
  var LAYER = null;
  function layer() { if (!LAYER) { LAYER = D.createElement('div'); LAYER.className = 'ua-o ua-o-layer'; D.body.appendChild(LAYER); } return LAYER; }

  /* Un nombre ne se sépare jamais de ses milliers ni de son unité en fin de ligne */
  var UNITS = /(\d) (?=(?:L\/h|L|€|°C|°dH|°|m²|m³|m\/s|mm|cm|m|W|kg|g\/m²|g|mg\/L|ml|mL|%|h|min|kWh|ans?|jours?|semaines?|mois|fois)(?![A-Za-zÀ-ÿ]))/g;
  function glue(t) { return String(t).replace(/(\d)[ \u202f](?=\d{3}(?!\d))/g, '$1\u00a0').replace(UNITS, '$1\u00a0'); }
  function glueTree(root) {
    var w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { var g = glue(n.nodeValue); if (g !== n.nodeValue) n.nodeValue = g; }
  }
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function h(tag, attrs) {
    var e = D.createElement(tag), i, k;
    if (attrs) for (k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    for (i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(e, x); }); return; }
    e.appendChild(typeof c === 'object' ? c : D.createTextNode(glue(c)));
  }
  function svg(tag, attrs) {
    var e = D.createElementNS('http://www.w3.org/2000/svg', tag), k;
    for (k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) e.appendChild(typeof arguments[i] === 'string' ? D.createTextNode(glue(arguments[i])) : arguments[i]);
    return e;
  }

  /* Nombres à la française */
  var NF = {};
  function nf(v, d) {
    d = d == null ? 0 : d;
    var key = d;
    if (!NF[key]) NF[key] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
    if (!isFinite(v)) return '–';
    return NF[key].format(v).replace(/ /g, ' ');
  }
  /* Nombre de décimales utiles : 1 234 · 12,5 · 0,25 */
  function nfa(v) {
    var a = Math.abs(v), t = nf(v, a >= 100 ? 0 : a >= 1 ? 1 : 2);
    if (t.indexOf(',') > -1) t = t.replace(/0+$/, '').replace(/,$/, '');
    return t;
  }
  function eur(v) { return nf(v, 2) + ' €'; }
  function parse(v) { var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : NaN; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function round(v, s) { return Math.round(v / s) * s; }

  /* Etat dans l'adresse : un résultat se partage par lien et se rouvre à l'identique */
  var State = {
    read: function (defs) {
      var q = new URLSearchParams(location.search), o = {}, k;
      for (k in defs) {
        var raw = q.get(k);
        if (raw == null) { o[k] = defs[k]; continue; }
        o[k] = typeof defs[k] === 'number' ? (isFinite(parse(raw)) ? parse(raw) : defs[k]) : raw;
      }
      return o;
    },
    write: function (st, defs) {
      var q = new URLSearchParams(), k, cur = new URLSearchParams(location.search);
      ['view', 'preview_theme_id'].forEach(function (x) { if (cur.get(x)) q.set(x, cur.get(x)); });
      for (k in st) if (st[k] !== defs[k] && st[k] !== '' && st[k] != null) q.set(k, String(st[k]));
      var s = q.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
    }
  };

  /* Mémoire de l'appareil, facultative */
  var Store = {
    get: function (k, d) { try { var v = localStorage.getItem('ua-outils:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ua-outils:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* Compteur animé : tourne seulement pendant la transition */
  function tween(el, to, fmt, ms) {
    fmt = fmt || nfa; ms = ms || 420;
    var from = parse(el.getAttribute('data-v'));
    el.setAttribute('data-v', to);
    if (!isFinite(from) || W.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    if (el._raf) cancelAnimationFrame(el._raf);
    function f(t) {
      var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(f); else el._raf = null;
    }
    el._raf = requestAnimationFrame(f);
  }

  /* Champ numérique grand format avec boutons + et - */
  var FIT = D.createElement('canvas').getContext('2d'), FITS = [];
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { FITS.forEach(function (f) { f(); }); });
  function U$(el, sel) { return el.querySelector(sel); }
  function numField(o) {
    var input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: o.id, 'aria-describedby': o.hint ? o.id + '-h' : null });
    input.value = o.empty && !o.value ? '' : nfa(o.value).split(String.fromCharCode(160)).join(' ');
    if (o.empty) input.placeholder = o.empty;
    function set(v, silent) {
      v = clamp(round(v, o.step || 1), o.min, o.max);
      input.value = nfa(v).replace(/ /g, ' ');
      fit();
      if (!silent) o.onChange(v);
    }
    function fit() {
      var t = input.value || input.placeholder || '';
      if (input.isConnected) { var cs = getComputedStyle(input); FIT.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; input.style.width = Math.ceil(FIT.measureText(t).width + 6) + 'px'; }
      else { input.style.width = Math.max(1.6, t.length + 0.4) + 'ch'; requestAnimationFrame(function () { if (input.isConnected) fit(); }); }
    }
    input.addEventListener('input', function () {
      fit();
      var v = parse(input.value);
      if (isFinite(v) && v >= o.min && v <= o.max) o.onChange(v);
    });
    input.addEventListener('blur', function () { if (o.empty && !input.value.trim()) { o.onChange(0); return; } var v = parse(input.value); set(isFinite(v) ? v : o.value); });
    input.addEventListener('change', function () { if (o.empty && !input.value.trim()) o.onChange(0); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        var v = parse(input.value); if (!isFinite(v)) v = o.value;
        set(v + (e.key === 'ArrowUp' ? 1 : -1) * (o.step || 1));
      }
    });
    function bump(d) { var v = parse(input.value); set((isFinite(v) ? v : o.value) + d * (o.step || 1)); }
    function hold(btn, d) {
      var t1, t2;
      function stop() { clearTimeout(t1); clearInterval(t2); }
      btn.addEventListener('pointerdown', function (e) { e.preventDefault(); bump(d); t1 = setTimeout(function () { t2 = setInterval(function () { bump(d); }, 70); }, 380); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
      btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(d); } });
      return btn;
    }
    var minus = o.stepper === false ? null : hold(h('button', { type: 'button', class: 'pm', 'aria-label': 'Moins' }, h('span', { 'aria-hidden': 'true' }, '−')), -1);
    var plus = o.stepper === false ? null : hold(h('button', { type: 'button', class: 'pm', 'aria-label': 'Plus' }, h('span', { 'aria-hidden': 'true' }, '+')), 1);
    var wrap = h('div', { class: 'field' + (o.stepper === false ? ' bare' : '') },
      h('label', { class: 'k', for: o.id }, o.label),
      h('span', { class: 'box' }, minus, h('span', { class: 'val' }, input, o.unit ? h('span', { class: 'u' }, o.unit) : null), plus),
      o.hint ? h('span', { class: 'note', id: o.id + '-h' }, o.hint) : null);
    wrap.set = function (v) { set(v, true); };
    fit(); FITS.push(fit);
    U$(wrap, '.val').addEventListener('click', function (e) { if (e.target !== input) input.focus(); });
    return wrap;
  }

  /* Choix exclusif */
  function seg(o) {
    var box = h('div', { class: 'seg' + (o.small ? ' small' : ''), role: 'group', 'aria-label': o.label });
    o.options.forEach(function (op) {
      var b = h('button', { type: 'button', 'aria-pressed': String(op[0] === o.value), 'data-v': op[0] }, op[1]);
      b.addEventListener('click', function () {
        $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        o.onChange(op[0]);
      });
      box.appendChild(b);
    });
    box.set = function (v) { $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-v') === String(v))); }); };
    return o.label && o.showLabel !== false ? h('div', null, h('span', { class: 'k' }, o.label), box) : box;
  }

  /* Tuiles à pictogramme : choix visuel (forme, berges, milieu) */
  function tiles(o) {
    var box = h('div', { class: 'tiles', role: 'group', 'aria-label': o.label, style: '--n:' + o.options.length });
    o.options.forEach(function (op) {
      var b = h('button', { type: 'button', class: 'tile', 'aria-pressed': String(op[0] === o.value), 'data-v': op[0] },
        h('span', { class: 'ico', 'aria-hidden': 'true', html: op[2] || '' }), h('span', { class: 'tl' }, op[1]));
      b.addEventListener('click', function () {
        $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        o.onChange(op[0]);
      });
      box.appendChild(b);
    });
    box.set = function (v) { $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-v') === String(v))); }); };
    return o.label ? h('div', { class: 'tiles-w' }, h('span', { class: 'k' }, o.label), box) : box;
  }

  /* Curseur avec remplissage */
  function range(o) {
    var r = h('input', { type: 'range', class: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value, 'aria-label': o.label, id: o.id });
    function paint() { r.style.setProperty('--p', ((r.value - o.min) / (o.max - o.min) * 100) + '%'); }
    r.addEventListener('input', function () { paint(); o.onChange(parseFloat(r.value)); });
    paint();
    r.set = function (v) { r.value = v; paint(); };
    return r;
  }

  /* Produits : données de l'instantané (dans le thème : JSON écrit par Liquid) */
  var DATA = W.UA_DATA || { produits: {} };
  function product(handle, vid) {
    var p = DATA.produits[handle];
    if (!p) return null;
    var v = vid ? p.v.filter(function (x) { return x.id === vid; })[0] : p.v.filter(function (x) { return x.ok; })[0] || p.v[0];
    return { handle: handle, title: p.t, url: p.u, img: p.img, brand: p.m, variant: v || p.v[0], all: p.v };
  }
  function prodRow(it, opts) {
    opts = opts || {};
    var p = product(it.h, it.vid);
    if (!p) return null;
    var v = p.variant, title = it.title || p.title;
    var url = p.url + (v && p.all.length > 1 ? '?variant=' + v.id : '');
    var img = p.img ? p.img + (p.img.indexOf('?') > -1 ? '&' : '?') + 'width=160' : '';
    var row = h('div', { class: 'prod' + (opts.top ? ' top' : '') },
      h('a', { class: 'ph', href: url, tabindex: '-1', 'aria-hidden': 'true' }, img ? h('img', { src: img, alt: '', loading: 'lazy', width: 64, height: 64 }) : null),
      h('div', null,
        h('a', { class: 'nm', href: url }, title),
        it.why ? h('div', { class: 'why' }, it.why) : (v && p.all.length > 1 ? h('div', { class: 'why' }, v.t) : null)),
      h('div', { class: 'pr' },
        h('span', { class: 'eur' }, v ? eur(v.p) : ''),
        v && v.ok ? h('a', { class: 'btn', href: cartHref(v.id), rel: 'nofollow', 'data-ua-cart': v.id }, 'Ajouter') : h('a', { class: 'btn ghost', href: url }, 'Voir')));
    return row;
  }
  function prodCard(handle) {
    var p = product(handle); if (!p) return null;
    var min = Math.min.apply(null, p.all.map(function (v) { return v.p; }));
    var img = p.img ? p.img + (p.img.indexOf('?') > -1 ? '&' : '?') + 'width=360' : '';
    return h('a', { class: 'pcard', href: p.url },
      h('span', { class: 'pim' }, img ? h('img', { src: img, alt: '', loading: 'lazy', width: 180, height: 180 }) : null),
      h('span', { class: 'pnm' }, p.title), h('span', { class: 'ppr' }, (p.all.length > 1 ? 'À partir de ' : '') + eur(min)));
  }
  function prodList(title, items, opts) {
    items = items.filter(Boolean);
    if (!items.length) return null;
    var box = h('div', { class: 'prods' }, title ? h('h3', null, title) : null);
    items.forEach(function (it, i) { var r = prodRow(it, { top: opts && opts.top && i === 0 }); if (r) box.appendChild(r); });
    return box;
  }

  /* Trace de calcul : libellé, valeur, formule */
  function trace(rows) {
    var dl = h('dl', { class: 'trace' });
    rows.forEach(function (r) {
      if (r.f) { dl.appendChild(h('div', { class: 'f' }, r.f)); return; }
      dl.appendChild(h('dt', null, r[0])); dl.appendChild(h('span')); dl.appendChild(h('dd', null, r[1]));
    });
    return dl;
  }

  /* Partage, impression */
  var ICO = {
    share: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function toast(msg) {
    var t = h('div', { class: 'ua-toast', role: 'status' }, msg); layer().appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 300); }, 1900);
  }
  function actions(extra) {
    var share = h('button', { type: 'button', class: 'act', html: ICO.share + '<span>Partager ce calcul</span>' });
    share.addEventListener('click', function () {
      var data = { title: D.title, text: (($('.t-res .big') || $('.t-res .verdict') || {}).textContent || '').trim(), url: location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast('Lien copié : il rouvre ce calcul à l\u2019identique'); }, function () { toast(location.href); });
    });
    var pdf = h('button', { type: 'button', class: 'act', html: ICO.pdf + '<span>Enregistrer en PDF</span>', onclick: function () { W.print(); } });
    return h('div', { class: 'bar-actions' }, extra || null, share, pdf);
  }

  /* Gabarit commun : res (résultat), inp (saisie), viz (dessin), out (produits et suite) */
  function layout(o) {
    var panes = Array.isArray(o.viz) ? o.viz : (o.viz ? [[o.vizLabel || 'Schéma', o.viz]] : []);
    var tg = h('div', { class: 'tg' + (o.vizFirst ? ' viz-first' : '') + (panes.length ? ' has-viz' : '') });
    var tabs = null, calc = null, btns = [], paneEls = [];
    if (o.detail || panes.length > 1) {
      calc = o.detail ? h('div', { class: 'calc', id: 'calc-' + Math.random().toString(36).slice(2, 7) }, o.detail) : null;
      var labels = panes.length ? panes.map(function (p) { return p[0]; }) : ['Résultat'];
      if (calc) labels.push('Le calcul');
      tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Affichage' });
      labels.forEach(function (l, i) {
        var b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(i === 0) }, l);
        b.addEventListener('click', function () { sel(i); });
        btns.push(b); tabs.appendChild(b);
      });
    }
    function sel(i) {
      var isCalc = calc && i === btns.length - 1;
      tg.classList.toggle('calc-on', !!isCalc);
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', String(j === i)); });
      paneEls.forEach(function (p, j) { p.hidden = isCalc ? true : j !== i; });
      W.dispatchEvent(new Event('ua:redraw'));
    }
    var left = h('div', { class: 'col left' });
    if (panes.length) {
      left.appendChild(h('div', { class: 't-res res' }, o.res));
      var vz = h('div', { class: 't-viz' }, tabs || h('p', { class: 'viz-t' }, panes[0][0]));
      panes.forEach(function (p, j) { var el = h('div', { class: 'pane' }, p[1]); el.hidden = j > 0; paneEls.push(el); vz.appendChild(el); });
      if (calc) vz.appendChild(calc);
      left.appendChild(vz);
    } else {
      var pr = h('div', { class: 'pane' }, o.res); paneEls.push(pr);
      left.appendChild(h('div', { class: 't-res res' }, tabs, pr, calc));
    }
    tg.appendChild(left);
    tg.appendChild(h('div', { class: 'col right' }, h('div', { class: 't-in' }, o.inp,
      o.adv ? h('details', { class: 'adv' }, h('summary', null, o.advLabel || 'Réglages avancés'), h('div', { class: 'in' }, o.adv)) : null),
      h('div', { class: 't-out' }, o.out)));
    requestAnimationFrame(function () {
      peek(tg);
      /* La colonne de gauche ne suit la lecture que si elle tient dans l'écran */
      function fit() { left.classList.toggle('stick', left.offsetHeight < W.innerHeight - (IN_SHOP ? 136 : 48)); }
      if ('ResizeObserver' in W) new ResizeObserver(fit).observe(left); W.addEventListener('resize', fit); fit();
      glueTree(tg);
      new MutationObserver(function () { glueTree(tg); }).observe(tg, { childList: true, characterData: true, subtree: true });
    });
    return tg;
  }
  /* Sur téléphone, le résultat reste visible en bas de l'écran quand on règle plus bas */
  function peek(tg) {
    var src = $('.t-res .big', tg) || $('.t-res .verdict', tg) || $('.t-res .mid', tg);
    if (!src || !('IntersectionObserver' in W)) return;
    var k = $('.t-res .k', tg);
    var bar = h('button', { type: 'button', class: 'peek', 'aria-label': 'Revenir au résultat' }, h('span', { class: 'pk-k' }, k ? k.textContent : 'Résultat'), h('span', { class: 'pk-v' }));
    layer().appendChild(bar);
    var mq = W.matchMedia('(max-width: 979px)'), srcOut = false, toolIn = false;
    function sync() { $('.pk-v', bar).textContent = src.textContent; if (k) $('.pk-k', bar).textContent = k.textContent; }
    function show() { bar.classList.toggle('in', mq.matches && srcOut && toolIn); }
    new IntersectionObserver(function (e) { srcOut = !e[0].isIntersecting && e[0].boundingClientRect.top < (IN_SHOP ? 100 : 0); show(); }, { rootMargin: IN_SHOP ? '-100px 0px 0px 0px' : '0px' }).observe(src);
    new IntersectionObserver(function (e) { toolIn = e[0].isIntersecting; show(); }, { rootMargin: '0px 0px -30% 0px' }).observe(tg);
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
    bar.addEventListener('click', function () { (tg.closest('.ua-stage') || tg).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    sync();
  }
  /* Prix et stocks en direct : dans la boutique, chaque produit est relu avant d'afficher l'outil */
  function refresh() {
    var hs = Object.keys(DATA.produits || {});
    if (!IN_SHOP || !hs.length || !W.fetch) return Promise.resolve();
    var all = Promise.all(hs.map(function (hd) {
      return fetch(ROOT + 'products/' + hd + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j || !j.variants) return;
        var p = DATA.produits[hd], names = (j.options || []).map(function (o) { return typeof o === 'string' ? o : o.name; });
        p.t = j.title; p.u = j.url || ROOT + 'products/' + hd; if (j.featured_image) p.img = j.featured_image;
        p.v = j.variants.map(function (v) { var o = {}; names.forEach(function (n, i) { o[n] = v['option' + (i + 1)]; }); return { id: v.id, t: v.title, p: v.price / 100, ok: v.available, o: o }; });
      }).catch(function () {});
    }));
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 2500); })]);
  }
  var READY = null;
  function ready(fn) { if (!READY) READY = refresh(); READY.then(function () { try { fn(); } catch (e) { if (W.console) console.error(e); } }); }
  /* Ajout au panier : celui du thème (Liquid Ajax Cart), sinon la page panier */
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-ua-cart]');
    if (!a || !IN_SHOP) return;
    var lac = W.liquidAjaxCart, id = +a.getAttribute('data-ua-cart');
    if (!lac || !lac.add) return;
    e.preventDefault();
    a.setAttribute('aria-busy', 'true');
    Promise.resolve(lac.add({ items: [{ id: id, quantity: 1 }] })).then(function () { var open = D.querySelector('[data-option-target="Cart"][data-option-effect="target.open()"]'); if (open) open.click(); else toast('Ajouté au panier'); }).catch(function () { location.href = cartHref(id); }).then(function () { a.removeAttribute('aria-busy'); });
  });
  function onResize(fn) { window.addEventListener('ua:redraw', function () { fn(); }); var w = window.innerWidth; window.addEventListener('resize', debounce(function () { if (window.innerWidth !== w) { w = window.innerWidth; fn(); } }, 120)); }

  function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }

  W.UA = { $: $, $$: $$, h: h, svg: svg, nf: nf, nfa: nfa, eur: eur, parse: parse, clamp: clamp, round: round, State: State, Store: Store,
    tween: tween, numField: numField, seg: seg, tiles: tiles, glue: glue, range: range, product: product, prodRow: prodRow, prodList: prodList, trace: trace,
    actions: actions, toast: toast, prodCard: prodCard, debounce: debounce, layout: layout, onResize: onResize, DATA: DATA, SHOP: SHOP, url: url, img: img, ready: ready, cartHref: cartHref, layer: layer };
})(window);
