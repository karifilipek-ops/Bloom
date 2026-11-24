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
  footer.innerHTML = '<div class="by-wrap"><div class="peek" aria-hidden="true"></div><i class="peek-shadow" aria-hidden="true"></i><p class="by">By Trainbloom</p></div>';
  document.body.appendChild(footer);

  // Pixel me in the footer: pops up on top of "By Trainbloom", walks to the end of the word,
  // does a little jump down beside it, turns to face the text, and stays there blinking.
  (function () {
    var peek = footer.querySelector(".peek"), wrap = footer.querySelector(".by-wrap");
    var shadow = footer.querySelector(".peek-shadow");
    peek.innerHTML = '<div class="peek-guy"></div>';
    var guy = peek.firstChild;
    var STAND = 0, BLINK = 1, PAD = 50, HALF = 22, DROP = 11;   // DROP: letter tops -> baseline
    function frame(n) { guy.style.backgroundPosition = (n * 100) + "% 0"; }
    function pose(x, y, sx, sy, flip) {
      peek.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      guy.style.transform = "scale(" + ((flip ? -1 : 1) * sx).toFixed(3) + "," + sy.toFixed(3) + ")";
    }
    function blinkLoop() {
      frame(BLINK);
      setTimeout(function () { frame(STAND); }, 140);
      setTimeout(blinkLoop, 2500 + Math.random() * 2500);
    }
    function settle() { shadow.classList.add("on"); setTimeout(blinkLoop, 900); }
    var textW = function () { return wrap.offsetWidth - PAD; };
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      peek.style.opacity = 1; frame(STAND); pose(textW() + 4, DROP, 1, 1, true); settle(); return;
    }

    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function easeOutBack(x) { var c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
    function run() {
      var W = textW(), x0 = W * 0.3 - HALF, x1 = W - HALF - 4, x2 = W + 4;
      var POP = 420, WAIT = 300, WALK = Math.max(700, (x1 - x0) / 0.075), CROUCH = 120, JUMP = 420, LAND = 140, PAUSE = 380;
      var tWalk = POP + WAIT, tCrouch = tWalk + WALK, tJump = tCrouch + CROUCH, tLand = tJump + JUMP, tTurn = tLand + LAND + PAUSE;
      var start = null;
      peek.style.opacity = 1;
      (function tick(now) {
        if (start == null) start = now;
        var t = now - start;
        if (t < POP) {                                   // pop up out of nowhere, a little springy
          var s = easeOutBack(clamp(t / POP));
          frame(STAND); pose(x0, 0, s, s, false);
        } else if (t < tWalk) {
          frame(STAND); pose(x0, 0, 1, 1, false);
        } else if (t < tCrouch) {                        // walk along the letter tops: little 2px bounces, no flailing
          var w = (t - tWalk) / WALK, ph = ((t - tWalk) % 220) / 220;
          frame(STAND);
          pose(x0 + (x1 - x0) * w, -2 * Math.sin(Math.PI * ph), 1, 1, false);
        } else if (t < tJump) {                          // crouch at the edge
          frame(STAND); pose(x1, 0, 1.05, 0.92, false);
        } else if (t < tLand) {                          // the jump: an arc down to the baseline
          var j = (t - tJump) / JUMP;
          frame(STAND); pose(x1 + (x2 - x1) * j, DROP * j * j - 9 * Math.sin(Math.PI * j), 1, 1.03, false);
        } else if (t < tLand + LAND) {                   // squish on landing
          var l = (t - tLand) / LAND;
          frame(STAND); pose(x2, DROP, 1 + 0.06 * (1 - l), 1 - 0.08 * (1 - l), false);
          shadow.classList.add("on");
        } else if (t < tTurn) {
          frame(STAND); pose(x2, DROP, 1, 1, false);
        } else {                                         // turn to face the text, and stay
          frame(STAND); pose(x2, DROP, 1, 1, true); settle(); return;
        }
        requestAnimationFrame(tick);
      })(performance.now());
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { io.disconnect(); setTimeout(run, 400); }
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
