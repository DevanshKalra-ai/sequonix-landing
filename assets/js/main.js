/* ============================================================
   Sequonix landing — video hero + ported scroll motion system
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";

  if (reduceMotion || !hasGSAP || typeof window.ScrollTrigger === "undefined") {
    document.body.classList.add("motion-off");
  }

  /* ---------- VIDEO: play once, freeze on last frame ---------- */
  /* (the central star keeps animating via CSS, so motion never fully stops) */
  /* ---------- HERO VIDEO ----------
     • Single seamless boomerang loop (forward+reverse) -> no crossfade, no dim.
     • The hands fly in once (intro), then the frozen still fades in to hold them.
     • Video pauses while the hero is off-screen (perf). */
  var video = document.getElementById("bgVideo");
  var freeze = document.querySelector(".hero-freeze");
  if (video) {
    var frozen = false;
    var INTRO_RATE = 1.7;          // hands fly in faster…
    video.playbackRate = INTRO_RATE;
    video.addEventListener("play", function () { if (!frozen) video.playbackRate = INTRO_RATE; });
    video.addEventListener("timeupdate", function () {
      /* freeze the hands once they're fully extended (~9s into the forward half) */
      if (!frozen && video.currentTime >= 9.0) {
        frozen = true;
        video.playbackRate = 1;     // …then the flower loops at normal speed
        if (freeze) freeze.classList.add("show");
      }
    });

    var heroEl = document.querySelector(".vx-hero");
    if (heroEl && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { video.play().catch(function () {}); }
          else { video.pause(); }
        });
      }, { threshold: 0.05 }).observe(heroEl);
    }
  }

  /* ---------- YEAR ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- MOBILE MENU (velorix) ---------- */
  var body = document.body;
  var burger = document.getElementById("hamburger");
  var backdrop = document.getElementById("mBackdrop");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
  if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
  document.querySelectorAll(".m-links a, .m-cta a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  var lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, lerp: 0.1
    });
    /* Drive Lenis from GSAP's single ticker (one rAF loop, not two) and turn off
       lag-smoothing -> locked, smooth 60fps for scroll + all ScrollTrigger motion. */
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  }

  /* anchor links */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      setMenu(false);
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- SCROLL REVEALS ---------- */
  (function ioReveal() {
    var els = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
    if (reduceMotion) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.matches("[data-reveal-stagger]")) {
          Array.prototype.forEach.call(el.children, function (k, idx) {
            k.style.transitionDelay = (idx * 0.09) + "s";
          });
        }
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- COUNTERS ---------- */
  (function counters() {
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
        var dur = 2000, start = performance.now();
        function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick); else el.textContent = target + suffix;
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
    nums.forEach(function (n) { io.observe(n); });
  })();

  /* ---------- MAGNETIC BUTTONS ---------- */
  (function magnetic() {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + mx * 0.25 + "px," + my * 0.35 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = "translate(0,0)"; });
    });
  })();

  /* ---------- GSAP SCROLL PIECES ---------- */
  if (hasGSAP && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    /* top scroll-progress bar */
    var bar = document.querySelector(".scroll-progress");
    if (bar) gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    /* parallax decor */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.2;
      gsap.fromTo(el, { yPercent: -speed * 50 }, {
        yPercent: speed * 50, ease: "none",
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    /* ===== HORIZONTAL PINNED SERVICE PANELS ===== */
    (function () {
      var section = document.querySelector("[data-hpanels]");
      var track = section && section.querySelector(".hpanels-track");
      if (!track) return;
      var panels = gsap.utils.toArray(".hpanel", track);
      var dots = gsap.utils.toArray(".hpanels-mob-dots span");
      var distance = function () { return track.scrollWidth - document.documentElement.clientWidth + 40; };
      function focus() {
        var cx = window.innerWidth / 2;
        panels.forEach(function (p) {
          var r = p.getBoundingClientRect();
          var d = Math.min(1, Math.abs((r.left + r.width / 2) - cx) / (window.innerWidth * 0.85));
          gsap.set(p, { scale: 1 - d * 0.15, opacity: 1 - d * 0.45, transformOrigin: "center center" });
        });
        if (dots.length) {
          var closest = 0, minD = Infinity;
          panels.forEach(function (p, i) {
            var r = p.getBoundingClientRect();
            var dd = Math.abs((r.left + r.width / 2) - cx);
            if (dd < minD) { minD = dd; closest = i; }
          });
          dots.forEach(function (d, i) { d.classList.toggle("on", i === closest); });
        }
      }
      gsap.to(track, {
        x: function () { return -distance(); }, ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top", end: function () { return "+=" + distance(); },
          pin: ".hpanels-pin", scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: focus, onRefresh: focus
        }
      });
      focus();
    }());

    /* ===== MANIFESTO word-by-word highlight ===== */
    var man = document.querySelector("[data-manifesto]");
    if (man) {
      var emphasis = ["clients", "automate", "revenue.", "sleep,", "ideas"];
      var words = man.textContent.trim().split(/\s+/);
      man.innerHTML = words.map(function (w) {
        var isEm = emphasis.indexOf(w.toLowerCase()) !== -1;
        return '<span class="w' + (isEm ? " em" : "") + '">' + w + "</span>";
      }).join(" ");
      var wEls = man.querySelectorAll(".w");
      ScrollTrigger.create({
        trigger: ".manifesto", start: "top top", end: "+=120%", pin: ".manifesto-pin", scrub: 0.3,
        onUpdate: function (self) {
          var lit = Math.round(self.progress * wEls.length);
          wEls.forEach(function (el, i) { el.classList.toggle("lit", i < lit); });
        }
      });
    }

    /* ===== SCROLLYTELLING ===== */
    var scrolly = document.querySelector("[data-scrolly]");
    if (scrolly) {
      var steps = gsap.utils.toArray(".scrolly-step");
      var sdots = gsap.utils.toArray(".scrolly-prog .dot");
      var countEl = scrolly.querySelector(".scrolly-count");
      var n = steps.length;
      function setActive(idx) {
        steps.forEach(function (s, i) { s.classList.toggle("on", i === idx); });
        sdots.forEach(function (d, i) { d.classList.toggle("on", i <= idx); });
        if (countEl) countEl.textContent = "0" + (idx + 1);
      }
      setActive(0);
      ScrollTrigger.create({
        trigger: scrolly, start: "top top", end: "+=" + (n * 90) + "%", pin: ".scrolly-pin", scrub: 0.4,
        onUpdate: function (self) { setActive(Math.min(n - 1, Math.floor(self.progress * n))); }
      });
    }

    ScrollTrigger.refresh();
  }
})();
