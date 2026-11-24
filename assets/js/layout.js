// Shared header + footer. Edit the CALCULATORS list to change the nav everywhere.
(function () {
  var CALCULATORS = [
    ["/calorie-calculator-tdee/", "Calorie (TDEE) Calculator"],
    ["/protein-calculator-1/", "Protein Calculator"],
    ["/vo2-max-calculator/", "VO2 Max Calculator"],
    ["/1-rep-max-calculator/", "One-Rep Max Calculator"],
    ["/strength-standards-calculator/", "Strength Standards"],
    ["/muscle-gain-potential-calculator/", "Muscle Gain Calculator"],
    ["/creatine-calculator/", "Creatine Calculator"],
    ["/how-long-should-i-diet-calculator/", "How Long to Diet"]
  ];

  var here = location.pathname.replace(/index\.html$/, "");
  if (here.slice(-1) !== "/") here += "/";

  // Home page: no header bar (every calculator is linked right there on the page).
  // Calculator pages: just the "Calculators" menu, with a link back to the full list first.
  var isHome = here === "/";
  if (!isHome) {
    var items = '<li class="nav-home"><a href="/">All calculators</a></li>' + CALCULATORS.map(function (c) {
      var cur = c[0] === here ? ' aria-current="page"' : "";
      return '<li><a href="' + c[0] + '"' + cur + ">" + c[1] + "</a></li>";
    }).join("");

    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="bar">' +
      '<nav class="nav" aria-label="Calculators">' +
      '<button class="nav-toggle" aria-expanded="false" aria-controls="nav-menu">Calculators</button>' +
      '<ul class="nav-menu" id="nav-menu">' + items + "</ul>" +
      "</nav></div>";
    document.body.insertBefore(header, document.body.firstChild);

    var nav = header.querySelector(".nav");
    var toggle = header.querySelector(".nav-toggle");
    var setOpen = function (open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setOpen(false); toggle.focus(); }
    });
  }

  var footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = '<div class="by-wrap"><div class="peek-clip" aria-hidden="true"><div class="peek"></div></div><i class="peek-shadow" aria-hidden="true"></i><p class="by">By Trainbloom</p></div>';
  document.body.appendChild(footer);

  // Pixel me in the footer: he springs up from behind the end of "By Trainbloom" (like popping out of
  // a hole), arcs over and lands beside the word, turns to face it, and idles there breathing and blinking.
  // Animated the 8-bit way: positions move on his own 2px pixel grid and update at 15fps, and the
  // landing / breathing are separate pose frames rather than any smooth scaling, so he always stays crisp.
  (function () {
    var clip = footer.querySelector(".peek-clip"), peek = footer.querySelector(".peek");
    var wrap = footer.querySelector(".by-wrap"), shadow = footer.querySelector(".peek-shadow");
    peek.innerHTML = '<div class="peek-guy"></div>';
    var guy = peek.firstChild;
    var STAND = 0, BLINK = 1, BREATHE = 2, CROUCH = 3;
    var PAD = 50, H = 54, DROP = 11, TICK = 1000 / 15;   // DROP: letter tops -> baseline
    function frame(n) { guy.style.backgroundPosition = (n * 100 / 3) + "% 0"; }
    var bx = 0, by = 0;
    function snap(v, base) { return Math.round((base + v) / 2) * 2 - base; }
    function pose(x, y) { peek.style.transform = "translate(" + snap(x, bx) + "px," + snap(y, by) + "px)"; }
    function measure() { peek.style.transform = "none"; var r = peek.getBoundingClientRect(); bx = r.left; by = r.top; }
    var textW = function () { return wrap.offsetWidth - PAD; };

    function idle() {                                    // breathe in/out; now and then a blink
      var n = 0, nextBlink = 6 + Math.floor(Math.random() * 6);
      (function step() {
        n++;
        if (n === nextBlink) { frame(BLINK); nextBlink = n + 6 + Math.floor(Math.random() * 6); setTimeout(function () { frame(STAND); }, 140); }
        else frame(n % 2 ? BREATHE : STAND);
        setTimeout(step, 520);
      })();
    }
    function land(x2, quick) {
      clip.classList.add("free"); peek.style.opacity = 1; pose(x2, DROP); shadow.classList.add("on");
      if (quick) { guy.classList.add("flip"); idle(); return; }
      frame(CROUCH);
      setTimeout(function () { frame(BREATHE); }, TICK);                      // soak up the landing...
      setTimeout(function () { frame(STAND); }, TICK * 2);                    // ...and stand
      setTimeout(function () { guy.classList.add("flip"); }, TICK * 2 + 300); // turn to face the text
      setTimeout(idle, TICK * 2 + 900);
    }
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame(STAND); measure(); land(textW() + 4, true); return;
    }
    function run() {
      measure();
      var W = textW(), x1 = W - 38, x2 = W + 4;
      // Each entry is one 15fps frame: [x, y]. y = 0 means his feet are level with the letter tops;
      // while y > 0 the clip hides whatever is still below that line (behind the word).
      // The pop out is fast (2 frames), then one gravity arc over and down to the baseline beside the word.
      var path = [[x1, 30], [x1, 4]];
      var N = 9, TOP = -16;                               // arc frames, apex height above the letters
      for (var i = 1; i <= N; i++) {
        var p = i / N, xa = x1 + (x2 - x1) * p;
        var ya = p < 0.4 ? TOP * Math.sin((p / 0.4) * Math.PI / 2)        // rise to the apex...
                         : TOP + (DROP - TOP) * Math.pow((p - 0.4) / 0.6, 2); // ...then fall faster
        path.push([xa, ya]);
      }
      frame(STAND); peek.style.opacity = 1;
      var f = 0;
      (function step() {
        if (f >= path.length) { land(x2); return; }
        var pt = path[f++];
        if (pt[1] <= 0) clip.classList.add("free");      // fully clear of the letters
        pose(pt[0], pt[1]);
        setTimeout(step, TICK);
      })();
    }
    pose(0, H + 2);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { io.disconnect(); setTimeout(run, 450); }
      });
      io.observe(footer);
    } else setTimeout(run, 1000);
  })();

  // Header banners (calculator pages and the home page): star dots that each drift on their own
  // small loop, a few of them sparkling.
  // A seeded random keeps the layout the same on every visit.
  var hero = document.querySelector(".hero.sm, .hero-art");
  var wide = hero && hero.classList.contains("hero-art");
  var count = wide ? Math.max(30, Math.min(56, Math.round(hero.clientWidth / 20))) : 40;   // home banner: scale to its width
  if (hero) {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var stars = document.createElement("div");
    stars.className = "stars";
    stars.setAttribute("aria-hidden", "true");
    for (var k = 0; k < count; k++) {
      var st = document.createElement("i");
      var r = rnd();
      if (r < 0.18) st.className = "s-lav"; else if (r > 0.9) st.className = "s-big";
      st.style.left = (rnd() * 98 + 1).toFixed(1) + "%";
      st.style.top = (rnd() * (wide ? 94 : 72) + 2).toFixed(1) + "%";   // calculator headers keep clear of the grid floor
      st.style.setProperty("--t", (8 + rnd() * 5).toFixed(1) + "s");          // drift loop
      st.style.setProperty("--s", (6 + rnd() * 4).toFixed(1) + "s");            // sparkle beat (slow)
      if (k % 4 === 0) st.classList.add("spark");                          // 10 of the 40 sparkle
      st.style.setProperty("--d", (-rnd() * 10).toFixed(1) + "s");
      st.style.setProperty("--dx", ((rnd() - 0.5) * 12).toFixed(1) + "px");
      st.style.setProperty("--dy", (-4 - rnd() * 7).toFixed(1) + "px");
      st.style.setProperty("--o", (0.4 + rnd() * 0.4).toFixed(2));
      stars.appendChild(st);
    }
    hero.insertBefore(stars, hero.firstChild);
    hero.classList.add("has-stars");
  }

  // Reveal: wait for the fonts and the images near the top, then fade the page in (see the <head> script).
  if (window.bloomShow) {
    // Fade the top of the page in piece by piece: hero first, then the title, then the cards one after another.
    var plainShow = window.bloomShow;
    window.bloomShow = function () {
      if (!document.documentElement.classList.contains("loading")) return;
      var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      var seq = [], vh = window.innerHeight;
      var add = function (el, d) { if (el && el.getBoundingClientRect().top < vh) seq.push([el, d]); };
      var hdr = document.querySelector(".site-header");
      if (hdr) add(hdr, 0);
      var grid = document.querySelector("main .grid");
      var d = 0;
      Array.prototype.forEach.call(document.querySelectorAll("main > *"), function (el, i) {
        if (el === grid) {
          Array.prototype.forEach.call(grid.children, function (card, j) { add(card, d + j * 90); });
        } else add(el, d);
        d = i === 0 ? 450 : d + 180;   // the hero gets a head start
      });
      seq.forEach(function (s) {
        if (!s[0].animate) return;
        s[0].animate(
          calm ? [{ opacity: 0 }, { opacity: 1 }]
               : [{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }],
          { duration: 1000, delay: s[1], easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      });
      plainShow();

      // Cards further down the page fade up the same way as they scroll into view.
      if (grid && "IntersectionObserver" in window) {
        var later = Array.prototype.filter.call(grid.children, function (c) {
          return !seq.some(function (x) { return x[0] === c; });
        });
        later.forEach(function (c) { c.style.opacity = "0"; });
        var io = new IntersectionObserver(function (entries) {
          var n = 0;
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var c = en.target;
            io.unobserve(c);
            c.style.opacity = "";
            if (c.animate) c.animate(
              calm ? [{ opacity: 0 }, { opacity: 1 }]
                   : [{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }],
              { duration: 900, delay: n++ * 90, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
          });
        }, { rootMargin: "0px 0px -8% 0px" });
        later.forEach(function (c) { io.observe(c); });
      }
    };
    var waits = [];
    if (document.fonts && document.fonts.load) {
      ['16px "Jersey 10"', "16px VT323", "16px Poppins"].forEach(function (f) { waits.push(document.fonts.load(f).catch(function () {})); });
    }
    Array.prototype.forEach.call(document.querySelectorAll("main img"), function (img) {
      if (img.getBoundingClientRect().top > window.innerHeight * 1.5) return;
      if (!img.complete) waits.push(new Promise(function (r) { img.addEventListener("load", r); img.addEventListener("error", r); }));
    });
    Promise.all(waits).then(function () { requestAnimationFrame(function () { requestAnimationFrame(window.bloomShow); }); });
  }
})();
