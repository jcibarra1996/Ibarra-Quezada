/* Ibarra Quezada Abogados · Home: interacción y animación.
   Sin dependencias. Todo respeta prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ─── Menú móvil (funciones globales: las usan los onclick del HTML) ─── */
  window.openMobileNav = function () {
    $('#mobileNav').classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeMobileNav = function () {
    $('#mobileNav').classList.remove('open');
    document.body.style.overflow = '';
  };

  /* ─── Titulares partidos por palabra ─── */
  $$('.split').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      $$(':scope > *', node).forEach(walk);
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
          w.appendChild(s); frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      });
    })(el);
  });

  /* ─── Revelado al entrar en pantalla ─── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .split, .decl-item, #socioPhoto, #firma').forEach(function (el) { io.observe(el); });

  /* ─── Nav: superficie, ocultar al bajar, progreso de lectura, indicador de cláusula ─── */
  var nav = $('#mainNav'), bar = $('#readProgress'), ci = $('#clauseIndicator'), ciText = $('#ciText');
  var sections = $$('main section[data-clause]');
  var lastY = window.scrollY, ticking = false;

  function surfaceAt(y) {
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) return sections[i];
    }
    return null;
  }
  function onScroll() {
    ticking = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hide', y > 500 && y > lastY + 4 && !document.body.style.overflow);
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;

    var under = surfaceAt(nav.offsetHeight / 2);
    var footerTop = $('footer').getBoundingClientRect().top;
    var negro = footerTop < nav.offsetHeight || (under ? under.classList.contains('s-negro') : true);
    nav.classList.toggle('on-negro', negro);
    nav.classList.toggle('on-crema', !negro);

    var mid = surfaceAt(window.innerHeight * 0.55);
    if (mid && ciText.textContent !== mid.dataset.clause) ciText.textContent = mid.dataset.clause;
    ci.classList.toggle('show', y > window.innerHeight * 0.6 && footerTop > window.innerHeight * 0.7);

    parallax();
    metodo();
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ─── Parallax suave en fotografía ─── */
  var plx = $$('[data-parallax]');
  function parallax() {
    if (reduce) return;
    plx.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      img.style.transform = 'translate3d(0,' + (p * parseFloat(img.dataset.parallax) * -100) + '%,0)';
    });
  }

  /* ─── Método IQ: bloques apilados que se activan con cada paso ─── */
  var steps = $$('.step'), slabs = $$('.slab'), current = -1;
  function metodo() {
    if (!steps.length) return;
    var line = window.innerHeight * 0.55, idx = -1;
    steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) idx = i; });
    if (idx === current) return;
    current = idx;
    steps.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
    slabs.forEach(function (s, i) {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('done', i < idx);
    });
  }

  /* ─── Etapas: paneles que se expanden ─── */
  var etapas = $$('.etapa');
  function activar(el) {
    etapas.forEach(function (e) { var on = e === el; e.classList.toggle('active', on); e.setAttribute('aria-selected', on); });
  }
  etapas.forEach(function (el) {
    el.addEventListener('click', function () { activar(el); });
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activar(el); } });
    if (finePointer) el.addEventListener('mouseenter', function () { activar(el); });
  });

  /* ─── FAQ ─── */
  $$('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentElement, open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      q.setAttribute('aria-expanded', open);
    });
  });

  /* ─── Servicios: imagen que sigue al cursor ─── */
  var flo = $('#servFloat');
  if (flo && finePointer && !reduce) {
    var imgs = $$('img', flo), fx = 0, fy = 0, tx = 0, ty = 0, running = false;
    function loop() {
      fx += (tx - fx) * 0.14; fy += (ty - fy) * 0.14;
      flo.style.transform = 'translate3d(' + fx + 'px,' + fy + 'px,0) translate(-50%,-50%) scale(' + (flo.classList.contains('show') ? 1 : .85) + ')';
      if (running) requestAnimationFrame(loop);
    }
    $$('.serv-row').forEach(function (row) {
      row.addEventListener('mouseenter', function (e) {
        imgs.forEach(function (im, i) { im.classList.toggle('on', i === +row.dataset.img); });
        tx = fx = e.clientX + 180; ty = fy = e.clientY;
        flo.classList.add('show');
        if (!running) { running = true; loop(); }
      });
      row.addEventListener('mousemove', function (e) { tx = e.clientX + 180; ty = e.clientY; });
      row.addEventListener('mouseleave', function () { flo.classList.remove('show'); setTimeout(function () { if (!flo.classList.contains('show')) running = false; }, 500); });
    });
  }

  /* ═══ Lente de revisión sobre el contrato ═══ */
  var doc = $('#doc'), base = $('#docBase');
  if (doc && base) {
    var rev = base.cloneNode(true);
    rev.id = ''; rev.className = 'doc-layer rev'; rev.setAttribute('aria-hidden', 'true');
    doc.insertBefore(rev, $('#lens'));
    var lens = $('#lens'), label = $('#lensLabel'), tally = $('#tally'), hint = $('#docHint');
    var flagsBase = $$('.flag', base), flagsRev = $$('.flag', rev);
    var seen = {}, lw, lh, W, H, x = 0, y = 0, gx = 0, gy = 0, userActive = false, idleTimer, tourIdx = 0, tourTimer;

    if (!finePointer) hint.textContent = 'Ejemplo ilustrativo · Toque el documento para revisar';

    function measure() {
      W = doc.clientWidth; H = doc.clientHeight;
      lw = Math.round(Math.min(Math.max(W * 0.5, 180), 300));
      lh = Math.round(Math.max(H * 0.085, 54));
      doc.style.setProperty('--lw', lw + 'px'); doc.style.setProperty('--lh', lh + 'px');
    }
    function apply() {
      var l = Math.max(0, Math.min(W - lw, x)), t = Math.max(0, Math.min(H - lh, y));
      lens.style.setProperty('--lx', l + 'px'); lens.style.setProperty('--ly', t + 'px');
      rev.style.clipPath = 'inset(' + t + 'px ' + (W - l - lw) + 'px ' + (H - t - lh) + 'px ' + l + 'px)';
      // ¿Qué cláusula señalada está bajo la lente?
      var hit = -1, best = 0;
      flagsBase.forEach(function (f, i) {
        var rects = f.getClientRects(), d = doc.getBoundingClientRect();
        for (var k = 0; k < rects.length; k++) {
          var r = rects[k];
          var ox = Math.min(l + lw, r.right - d.left) - Math.max(l, r.left - d.left);
          var oy = Math.min(t + lh, r.bottom - d.top) - Math.max(t, r.top - d.top);
          if (ox > 0 && oy > 0 && ox * oy > best) { best = ox * oy; hit = i; }
        }
      });
      flagsRev.forEach(function (f, i) { f.classList.toggle('on', i === hit); });
      var note = hit >= 0 ? flagsBase[hit].dataset.note : '';
      if (label.dataset.note !== note) {
        label.dataset.note = note;
        label.innerHTML = note ? '<b>' + romano(hit) + '</b>' + note : '';
      }
      // La etiqueta nunca se sale del documento
      label.style.left = Math.min(-1, W - l - label.offsetWidth) + 'px';
      if (hit >= 0 && !seen[hit]) { seen[hit] = 1; tally.textContent = Object.keys(seen).length; }
    }
    function romano(i) { return ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SÉPTIMA'][i] || ''; }

    // Movimiento con inercia hacia el objetivo
    var raf = null;
    function animate() {
      x += (gx - x) * (reduce ? 1 : 0.16); y += (gy - y) * (reduce ? 1 : 0.16);
      apply();
      if (Math.abs(gx - x) > 0.4 || Math.abs(gy - y) > 0.4) raf = requestAnimationFrame(animate); else raf = null;
    }
    function goTo(nx, ny) { gx = nx; gy = ny; if (!raf) raf = requestAnimationFrame(animate); }

    // Recorrido automático entre las cláusulas señaladas
    function tour() {
      clearTimeout(tourTimer);
      if (userActive) return;
      var f = flagsBase[tourIdx % flagsBase.length], d = doc.getBoundingClientRect(), r = f.getClientRects()[0];
      if (r) goTo(r.left - d.left - 14, r.top - d.top - (lh - r.height) / 2);
      tourIdx++;
      tourTimer = setTimeout(tour, reduce ? 3800 : 2600);
    }
    function pointer(e) {
      var d = doc.getBoundingClientRect();
      userActive = true; clearTimeout(tourTimer); clearTimeout(idleTimer);
      goTo(e.clientX - d.left - lw / 2, e.clientY - d.top - lh / 2);
      idleTimer = setTimeout(function () { userActive = false; tour(); }, 3500);
    }
    doc.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') pointer(e); });
    doc.addEventListener('pointerdown', pointer);
    doc.addEventListener('mouseleave', function () { clearTimeout(idleTimer); idleTimer = setTimeout(function () { userActive = false; tour(); }, 900); });

    function init() { measure(); x = gx = W * 0.08; y = gy = H * 0.1; apply(); setTimeout(tour, 1400); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else window.addEventListener('load', init);
    window.addEventListener('resize', function () { measure(); apply(); });
    // Pausar el recorrido cuando el hero no está a la vista
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!userActive) tour(); } else clearTimeout(tourTimer);
    }).observe(doc);
  }

  onScroll();
})();
