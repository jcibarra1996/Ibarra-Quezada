// Legal Hackers México: menú móvil, búsqueda, pestañas y "volver arriba".
(function () {
  "use strict";

  // Índice de búsqueda: el sitio es estático, así que buscamos sobre esta lista.
  var PAGES = [
    { url: "index.html", title: "Inicio", text: "legal hackers méxico movimiento global abogados tecnología meetups hackatones talleres" },
    { url: "nuestra-historia.html", title: "Nuestra historia", text: "quiénes somos cómo empezamos qué hacemos brooklyn 2012 hackathon legal hacking eventos" },
    { url: "blog.html", title: "Blog", text: "blog publicaciones artículos noticias" },
    { url: "capitulos.html", title: "Capítulos", text: "capítulos méxico latinoamérica ciudad de méxico cdmx monterrey guadalajara puebla querétaro aguascalientes baja tepic comunidades slack linkedin únete" },
    { url: "prensa.html", title: "Prensa", text: "prensa medios notas entrevistas" },
    { url: "videos.html", title: "Videos", text: "videos youtube charlas" },
    { url: "gobernanza.html", title: "Gobernanza", text: "gobernanza consejo directivo operativo organizadores nuevo capítulo" },
    { url: "eventos.html", title: "Eventos", text: "eventos cumbre summit meetup hackatón taller" },
    { url: "aviso-de-privacidad.html", title: "Aviso de privacidad", text: "aviso de privacidad datos personales" }
  ];

  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Menú móvil
  var toggle = document.querySelector(".x-btn-navbar");
  var mobileNav = document.querySelector(".x-nav-wrap.mobile");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("in");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Búsqueda
  var overlay = document.querySelector(".x-searchform-overlay");
  var input = overlay && overlay.querySelector("input");
  var results = overlay && overlay.querySelector(".x-search-results");
  var lastFocus = null;

  function openSearch(e) {
    e.preventDefault();
    lastFocus = document.activeElement;
    overlay.classList.add("in");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { input.focus(); }, 50);
  }

  function closeSearch() {
    overlay.classList.remove("in");
    overlay.setAttribute("aria-hidden", "true");
    input.value = "";
    results.innerHTML = "";
    if (lastFocus) lastFocus.focus();
  }

  if (overlay) {
    document.querySelectorAll(".x-btn-navbar-search").forEach(function (btn) {
      btn.addEventListener("click", openSearch);
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSearch();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("in")) closeSearch();
    });
    overlay.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = normalize(input.value.trim());
      results.innerHTML = "";
      if (!q) return;
      var terms = q.split(/\s+/);
      var hits = PAGES.filter(function (p) {
        var hay = normalize(p.title + " " + p.text);
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      if (!hits.length) {
        results.innerHTML = '<li class="x-search-empty">Sin resultados.</li>';
        return;
      }
      hits.forEach(function (p) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = p.url;
        a.textContent = p.title;
        li.appendChild(a);
        results.appendChild(li);
      });
    });
  }

  // Pestañas
  document.querySelectorAll(".su-tabs").forEach(function (tabs) {
    var buttons = tabs.querySelectorAll('[role="tab"]');
    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          var selected = b === btn;
          b.setAttribute("aria-selected", selected ? "true" : "false");
          b.tabIndex = selected ? 0 : -1;
          document.getElementById(b.getAttribute("aria-controls")).hidden = !selected;
        });
      });
      btn.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = buttons[(i + 1) % buttons.length];
        if (e.key === "ArrowLeft") next = buttons[(i - 1 + buttons.length) % buttons.length];
        if (next) { next.focus(); next.click(); }
      });
    });
  });

  // Volver arriba
  var top = document.querySelector(".x-scroll-top");
  if (top) {
    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      top.classList.toggle("in", max > 0 && window.scrollY > max * 0.75);
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    top.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
