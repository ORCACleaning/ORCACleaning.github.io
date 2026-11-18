/* Western Host - web edition. One small script: theme, menu, reading progress, share, search. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function effective() {
    var a = root.getAttribute("data-theme");
    return a === "dark" || a === "light" ? a : (mq.matches ? "dark" : "light");
  }
  function reflect() {
    var dark = effective() === "dark";
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.setAttribute("aria-pressed", dark ? "true" : "false");
    });
  }
  function toggleTheme() {
    var next = effective() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("wh-theme", next); } catch (e) {}
    reflect();
  }
  document.querySelectorAll(".theme-toggle").forEach(function (b) {
    b.addEventListener("click", toggleTheme);
  });
  if (mq.addEventListener) mq.addEventListener("change", reflect);
  reflect();

  /* mobile menu */
  var navBtn = document.querySelector(".nav-toggle"), nav = document.getElementById("nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* reading progress (article pages only) */
  var bar = document.querySelector(".progress span");
  if (bar) {
    var tick = function () {
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.width = Math.max(0, Math.min(1, p)) * 100 + "%";
    };
    addEventListener("scroll", tick, { passive: true });
    addEventListener("resize", tick, { passive: true });
    tick();
  }

  /* share */
  var share = document.querySelector(".share");
  if (share) {
    share.addEventListener("click", function () {
      var data = { title: share.getAttribute("data-title") || document.title, url: location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      var done = function () {
        var s = share.querySelector("span"); if (!s) return;
        var old = s.textContent; s.textContent = "Link copied"; share.classList.add("copied");
        setTimeout(function () { s.textContent = old; share.classList.remove("copied"); }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, done);
      else done();
    });
  }

  /* search */
  var q = document.getElementById("q"), out = document.getElementById("results");
  if (q && out) {
    var data = null, esc = function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    };
    var hl = function (s, re) { return esc(s).replace(re, "<mark>$1</mark>"); };
    var snip = function (text, terms) {
      var low = text.toLowerCase(), at = -1, i;
      for (i = 0; i < terms.length; i++) { at = low.indexOf(terms[i]); if (at >= 0) break; }
      var start = at > 60 ? at - 60 : 0;
      var s = (start ? "…" : "") + text.slice(start, start + 180).trim() + "…";
      return s;
    };
    var render = function (items, terms) {
      if (!terms.length) { out.innerHTML = '<p class="sr-empty">Type to search ' + (data ? data.length : "") + " articles in this issue.</p>"; return; }
      if (!items.length) { out.innerHTML = '<p class="sr-empty">No articles match that search.</p>'; return; }
      var re = new RegExp("(" + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "ig");
      out.innerHTML = items.map(function (m) {
        return '<a class="sr-item" href="' + m.u + '"><span class="sr-kicker">' + esc(m.d) +
          (m.rt ? " · " + m.rt + " min read" : "") + '</span>' +
          '<span class="sr-title">' + hl(m.t, re) + '</span>' +
          '<span class="sr-snip">' + hl(snip(m.s + " " + m.x, terms), re) + "</span></a>";
      }).join("");
    };
    var run = function () {
      var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      if (!data) { render([], terms); return; }
      var hits = !terms.length ? [] : data.filter(function (m) {
        var hay = (m.t + " " + m.d + " " + m.s + " " + m.x).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) >= 0; });
      });
      render(hits, terms);
    };
    fetch("/wh-preview/search-index.json").then(function (r) { return r.json(); }).then(function (j) { data = j; run(); }).catch(function () {
      out.innerHTML = '<p class="sr-empty">Search is unavailable right now.</p>';
    });
    q.addEventListener("input", run);
    var pre = new URLSearchParams(location.search).get("q"); if (pre) { q.value = pre; }
    run(); q.focus();
  }
})();
