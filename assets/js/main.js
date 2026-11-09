/* ============================================================
   Sequonix — hero video (unchanged) + page motion
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";

  if (reduceMotion || !hasGSAP) document.body.classList.add("motion-off");

  /* Each block runs on its own, so one failure never takes the rest of the page down. */
  function safe(name, fn) {
    try { fn(); }
    catch (e) {
      (window.__seqErrors = window.__seqErrors || []).push(name + ": " + ((e && e.stack) || e));
      if (window.console) console.error("[sequonix] " + name + " failed", e);
    }
  }

  /* ---------- HERO VIDEO (kept exactly as before) ----------
     • Single seamless boomerang loop (forward+reverse) -> no crossfade, no dim.
     • The hands fly in once (intro), then the frozen still fades in to hold them.
     • Video pauses while the hero is off-screen (perf). */
  var video = document.getElementById("bgVideo");
  var freeze = document.querySelector(".hero-freeze");
  safe("hero-video", function () { if (!video) return;
    var frozen = false;
    var INTRO_RATE = 1.7;          // hands fly in faster…
    var STILL = "assets/img/hero-frame.jpg";
    var heroEl = document.querySelector(".vx-hero");
    /* Measure the hero's real position. iOS Safari can report it as off screen while
       the page is still settling at load; trusting that paused the video for good. */
    function heroOnScreen() {
      if (!heroEl) return true;
      var r = heroEl.getBoundingClientRect();
      var h = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 0 && r.top < h;
    }

    /* iOS only autoplays a video it knows is muted and inline, so state both in JS as well */
    video.muted = true; video.defaultMuted = true;
    video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", "");

    /* Safari resets playbackRate to defaultPlaybackRate when the media loads, so set both */
    function applyRate() {
      var r = frozen ? 1 : INTRO_RATE;
      video.defaultPlaybackRate = r;
      video.playbackRate = r;
    }
    applyRate();
    video.addEventListener("loadedmetadata", applyRate);
    video.addEventListener("play", applyRate);
    video.addEventListener("playing", function () {
      applyRate();
      /* started late (after a tap): drop the stand-in still so the intro is seen */
      if (!frozen) { if (freeze) freeze.classList.remove("show", "full"); video.removeAttribute("poster"); }
    });
    video.addEventListener("timeupdate", function () {
      /* freeze the hands once they're fully extended (~9s into the forward half) */
      if (!frozen && video.currentTime >= 9.0) {
        frozen = true;
        applyRate();                // …then the flower loops at normal speed
        if (freeze) { freeze.classList.remove("full"); freeze.classList.add("show"); }
      }
    });

    /* Autoplay refused (iPhone Low Power Mode, data saver): show the finished frame
       instead of a black hero, and start the video on the visitor's first tap. */
    function blocked() {
      if (!video.paused || frozen) return;
      video.poster = STILL;
      if (freeze) freeze.classList.add("show", "full");
    }
    function tryPlay() {
      var p = video.play();
      if (p && typeof p.catch === "function") p.catch(blocked);
    }
    function kick() { if (video.paused && heroOnScreen()) tryPlay(); }
    tryPlay();
    setTimeout(function () { if (heroOnScreen() && video.paused) blocked(); }, 2500);
    /* iPhones often refuse the very first start and accept a later one, so keep
       asking: once the video has data, on a short timer, and when the page moves */
    ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"].forEach(function (ev) { video.addEventListener(ev, kick); });
    var tries = 0;
    var retry = setInterval(function () {
      if (++tries > 24 || (!video.paused && video.currentTime > 0)) { clearInterval(retry); return; }
      kick();
    }, 250);
    ["touchstart", "touchend", "click", "keydown", "scroll", "resize"].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
    window.addEventListener("pageshow", kick);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });

    /* sequonix.com/?vdebug shows what the browser reports about the hero video (for phone testing) */
    if (/[?&]vdebug/.test(location.search)) {
      var box = document.createElement("pre");
      box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;margin:0;padding:10px;background:rgba(0,0,0,.85);color:#c084fc;font:12px/1.4 monospace;white-space:pre-wrap;border:1px solid #7c3aed;border-radius:8px";
      document.body.appendChild(box);
      var lastErr = "none";
      tryPlay = function () {
        var p = video.play();
        if (p && typeof p.catch === "function") p.catch(function (e) { lastErr = e.name + ": " + e.message; blocked(); });
      };
      var evs = [];
      ["loadstart", "loadedmetadata", "canplay", "playing", "pause", "stalled", "suspend", "waiting", "error"].forEach(function (n) {
        video.addEventListener(n, function () { evs.push(n + "@" + video.currentTime.toFixed(1)); if (evs.length > 8) evs.shift(); });
      });
      setInterval(function () {
        box.textContent = "time " + video.currentTime.toFixed(2) + "  paused " + video.paused + "  ready " + video.readyState +
          "  net " + video.networkState + "\nrate " + video.playbackRate + "  muted " + video.muted + "  frozen " + frozen +
          "\nplay error: " + lastErr + (video.error ? "  media error " + video.error.code : "") +
          "\nevents: " + evs.join(" ") + "\njs errors: " + ((window.__seqErrors || []).length) + "\n" + navigator.userAgent;
      }, 500);
      tryPlay();
    }

    if (heroEl && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          /* pause only when the hero is really gone (measured, not just reported) */
          if (en.isIntersecting || heroOnScreen()) { tryPlay(); }
          else { video.pause(); }
        });
      }, { threshold: 0.05 }).observe(heroEl);
    }
  });

  /* ---------- YEAR ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- MOBILE MENU ---------- */
  var body = document.body;
  var burger = document.getElementById("hamburger");
  var backdrop = document.getElementById("mBackdrop");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
  if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------- SMOOTH SCROLL (weighted, one rAF loop) ---------- */
  var lenis = null;
  safe("smooth-scroll", function () { if (!hasLenis || reduceMotion) return;
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, lerp: 0.09
    });
    if (hasGSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }
  });

  /* anchor links */
  safe("anchors", function () { document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      setMenu(false);
      if (lenis) lenis.scrollTo(el, { offset: id === "#top" ? 0 : -24 });
      else el.scrollIntoView({ behavior: "smooth" });
    });
  }); });

  /* ---------- REVEALS (one kind, used sparingly) ---------- */
  safe("reveals", function () {
    var els = document.querySelectorAll("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  });

  /* ---------- COUNTERS ---------- */
  safe("counters", function () {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    if (!reduceMotion) nums.forEach(function (el) { el.textContent = "0" + (el.getAttribute("data-suffix") || ""); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduceMotion) { el.textContent = target + suffix; io.unobserve(el); return; }
        var dur = 1600, start = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick); else el.textContent = target + suffix;
        })(start);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  });

  /* ---------- PROCESS: light the step nearest the middle of the viewport ---------- */
  safe("process-steps", function () {
    var steps = Array.prototype.slice.call(document.querySelectorAll("[data-steps] .step"));
    if (!steps.length) return;
    if (reduceMotion) { steps.forEach(function (s) { s.classList.add("on"); }); return; }
    var active = -1;
    function update() {
      var mid = window.innerHeight * 0.5, best = 0, bestD = Infinity;
      steps.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        var d = Math.abs((r.top + r.height / 2) - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best !== active) {
        active = best;
        steps.forEach(function (s, i) { s.classList.toggle("on", i === best); });
      }
    }
    if (lenis) lenis.on("scroll", update); else window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ============================================================
     DOT MATRIX — the hero's halftone hands, carried into the page.
     Text is rasterised at one pixel per dot, so the letterforms are
     sampled the same way the hands are. Dots light up left to right
     as you scroll, and brighten near the cursor.
     ============================================================ */
  safe("dot-matrix", function () {
    var host = document.querySelector("[data-dotmatrix]");
    if (!host) return;
    var canvas = host.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var wideLines = (host.getAttribute("data-lines") || "").split("|");
    var narrowLines = (host.getAttribute("data-lines-narrow") || host.getAttribute("data-lines") || "").split("|");
    var lines = wideLines;
    var cells = [], cols = 0, rows = 0, pitch = 8, dpr = 1, W = 0, H = 0;
    var progress = reduceMotion ? 1 : 0;
    var mouse = { x: -9999, y: -9999 }, t0 = performance.now();
    var visible = false, raf = null;

    function layout() {
      W = host.clientWidth;
      if (!W) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var narrow = W < 640;
      lines = narrow ? narrowLines : wideLines;
      pitch = narrow ? Math.max(5.5, W / 64) : Math.max(7, Math.min(16, W / 96));
      cols = Math.floor(W / pitch);
      /* size the type so the longest line spans the band (1 cell = 1 px in the sampler) */
      var probe = document.createElement("canvas").getContext("2d");
      probe.font = "500 100px Switzer, 'Helvetica Neue', Arial, sans-serif";
      var longest = 1;
      lines.forEach(function (ln) { longest = Math.max(longest, probe.measureText(ln).width); });
      var fontCells = Math.floor(100 * (cols * 0.97) / longest);
      var lineH = Math.round(fontCells * 1.04);
      rows = lineH * lines.length + 2;
      H = rows * pitch;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.height = H + "px";

      /* sample: draw the text at cell resolution, read back alpha per cell */
      var off = document.createElement("canvas");
      off.width = cols; off.height = rows;
      var o = off.getContext("2d");
      o.clearRect(0, 0, cols, rows);
      o.fillStyle = "#fff";
      o.textBaseline = "alphabetic";
      o.font = "500 " + fontCells + "px Switzer, 'Helvetica Neue', Arial, sans-serif";
      lines.forEach(function (ln, i) {
        var w = o.measureText(ln).width;
        var s = w > cols * 0.98 ? (cols * 0.98) / w : 1;
        o.save(); o.scale(s, 1);
        o.fillText(ln, 0, 1 + lineH * i + Math.round(fontCells * 0.78));
        o.restore();
      });
      var data = o.getImageData(0, 0, cols, rows).data;
      cells = [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var a = data[(r * cols + c) * 4 + 3] / 255;
        cells.push({ c: c, r: r, a: a, ph: Math.random() * 6.283 });
      }
    }

    function draw(now) {
      raf = null;
      if (!W) return;
      var time = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var sweep = progress * (cols + 6) - 3;
      var hasMouse = mouse.x > -999;
      var R = pitch * 12;
      for (var i = 0; i < cells.length; i++) {
        var d = cells[i];
        var x = d.c * pitch + pitch / 2, yy = d.r * pitch + pitch / 2;
        var isText = d.a > 0.12;
        var lit = d.c < sweep;
        var glow = 0;
        if (hasMouse) {
          var dx = x - mouse.x, dy = yy - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R) glow = 1 - dist / R;
        }
        var rad, col;
        if (isText) {
          var base = lit ? 1 : 0.16;
          var tw = lit ? 0.92 + 0.08 * Math.sin(time * 1.7 + d.ph) : 1;
          var b = Math.min(1, d.a * base * tw + glow * 0.9);
          rad = pitch * (0.14 + 0.24 * d.a + glow * 0.12);
          /* violet at the edges of letters, near-white in the solid middle: same as the crystal */
          var mix = Math.min(1, d.a * d.a);
          var rr = Math.round(168 + (244 - 168) * mix), gg = Math.round(85 + (242 - 85) * mix), bb = Math.round(247 + (248 - 247) * mix);
          col = "rgba(" + rr + "," + gg + "," + bb + "," + b.toFixed(3) + ")";
        } else {
          rad = pitch * (0.09 + glow * 0.1);
          col = "rgba(244,242,248," + (0.055 + glow * 0.35).toFixed(3) + ")";
        }
        ctx.beginPath(); ctx.arc(x, yy, rad, 0, 6.283); ctx.fillStyle = col; ctx.fill();
      }
      /* keep the idle twinkle going only while on screen and not reduced-motion */
      if (visible && !reduceMotion && progress > 0) schedule();
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

    var resizeT;
    window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { layout(); schedule(); }, 120); });
    if (window.matchMedia("(hover: hover)").matches && !reduceMotion) {
      host.addEventListener("mousemove", function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; schedule(); });
      host.addEventListener("mouseleave", function () { mouse.x = -9999; mouse.y = -9999; schedule(); });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible = en.isIntersecting; if (visible) schedule(); });
      }, { threshold: 0.05 }).observe(host);
    } else { visible = true; }

    var started = false;
    function start() {
      if (started) return;
      started = true;
      layout();
      if (hasGSAP && !reduceMotion) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.create({
          trigger: host, start: "top 92%", end: "center center", scrub: 0.4,
          onUpdate: function (self) { progress = self.progress; schedule(); }
        });
      } else { progress = 1; }
      schedule();
    }
    function safeStart() { safe("dot-matrix-start", start); }
    /* start once the sampling font is in, but never wait more than a moment for it;
       if the real font lands later, re-sample so the letterforms are right */
    if (document.fonts && document.fonts.load) {
      document.fonts.load("500 32px Switzer").then(safeStart, safeStart);
      setTimeout(safeStart, 1200);
      if (document.fonts.ready) document.fonts.ready.then(function () { if (started) { layout(); schedule(); } });
    } else { safeStart(); }
  });

  /* ---------- BOOKING (Cal.com popup) ----------
     Every [data-book] link is a plain cal.com link, so it still works with no JS.
     The embed script loads on first hover/focus or once the page is idle, and a
     click opens the calendar over the page. Ctrl/Cmd-click still opens a new tab. */
  safe("booking", function () {
    var links = document.querySelectorAll("a[data-book]");
    if (!links.length) return;
    var NS = "discovery";
    var calLink = links[0].getAttribute("href").split("cal.com/")[1];
    var ready = false;
    function load() {
      if (ready) return; ready = true;
      (function (C, A, L) {
        var p = function (a, ar) { a.q.push(ar); }; var d = C.document;
        C.Cal = C.Cal || function () {
          var cal = C.Cal; var ar = arguments;
          if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; }
          if (ar[0] === L) {
            var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || [];
            if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); }
            else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
      })(window, "https://app.cal.com/embed/embed.js", "init");
      Cal("init", NS, { origin: "https://cal.com" });
      Cal.ns[NS]("ui", { theme: "dark", cssVarsPerTheme: { dark: { "cal-brand": "#a855f7" } }, hideEventTypeDetails: false, layout: "month_view" });
    }
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener("pointerenter", load, { once: true });
      a.addEventListener("focus", load, { once: true });
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setMenu(false);
        load();
        Cal.ns[NS]("modal", { calLink: calLink, config: { layout: "month_view", theme: "dark" } });
      });
    });
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 2500); };
    window.addEventListener("load", function () { idle(load, { timeout: 4000 }); });
  });

  if (hasGSAP && !reduceMotion) safe("refresh", function () { ScrollTrigger.refresh(); });
})();
