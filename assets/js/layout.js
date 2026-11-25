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
  var TREADMILL = here === "/calorie-calculator-tdee/";   // the TDEE page gets me on a treadmill instead
  var SHAKE = here === "/protein-calculator-1/";          // the protein page: me with a protein shake
  var DONUT = here === "/how-long-should-i-diet-calculator/";   // diet length page: me lying on the text eating a donut
  var MONSTER = here === "/1-rep-max-calculator/";        // 1RM page: me sitting on the text sipping a white Monster
  footer.innerHTML = MONSTER
    ? '<div class="by-wrap mo-wrap"><div class="mo" aria-hidden="true"></div><p class="by"><span class="by-name">Built by Tony</span><a class="by-ig" href="https://www.instagram.com/trainbloom" target="_blank" rel="noopener"><span class="by-ig-text">@trainbloom</span><span class="by-arrow" aria-hidden="true">↗</span></a></p></div>'
    : DONUT
    ? '<div class="by-wrap dn-wrap"><div class="dn" aria-hidden="true"></div><p class="by"><span class="by-name">Built by Tony</span><a class="by-ig" href="https://www.instagram.com/trainbloom" target="_blank" rel="noopener"><span class="by-ig-text">@trainbloom</span><span class="by-arrow" aria-hidden="true">↗</span></a></p></div>'
    : SHAKE
    ? '<div class="by-wrap sp-wrap"><div class="sp" aria-hidden="true"></div><p class="by"><span class="by-name">Built by Tony</span><a class="by-ig" href="https://www.instagram.com/trainbloom" target="_blank" rel="noopener"><span class="by-ig-text">@trainbloom</span><span class="by-arrow" aria-hidden="true">↗</span></a></p></div>'
    : TREADMILL
    ? '<div class="by-wrap tm-wrap"><div class="tm" aria-hidden="true"></div><div class="tm-guy" aria-hidden="true"></div><p class="by"><span class="by-name">Built by Tony</span><a class="by-ig" href="https://www.instagram.com/trainbloom" target="_blank" rel="noopener"><span class="by-ig-text">@trainbloom</span><span class="by-arrow" aria-hidden="true">↗</span></a></p></div>'
    : '<div class="by-wrap"><i class="peek-hole" aria-hidden="true"></i><div class="peek-clip" aria-hidden="true"><div class="peek"></div></div><i class="peek-shadow" aria-hidden="true"></i><p class="by"><span class="by-name">Built by Tony</span><a class="by-ig" href="https://www.instagram.com/trainbloom" target="_blank" rel="noopener"><span class="by-ig-text">@trainbloom</span><span class="by-arrow" aria-hidden="true">↗</span></a></p></div>';
  document.body.appendChild(footer);

  // TDEE page: pixel me and a treadmill beside the text. The first time the footer comes into view he's
  // standing on the ground next to it: he hops on, presses start (the screen lights up), and runs for a
  // few seconds, then slows down, stops and bends over to catch his breath, wipes his brow, and starts
  // running again, on a loop. He and the treadmill are separate sprites (35x35 frames drawn at 2x) and he
  // only ever moves in whole 2px steps at 15fps, so everything stays crisp.
  if (TREADMILL) (function () {
    var tm = footer.querySelector(".tm"), guy = footer.querySelector(".tm-guy"), wrap = footer.querySelector(".by-wrap");
    var ig = footer.querySelector(".by-ig-text");
    function frame(n) { guy.style.backgroundPosition = ((n - 1) * 100 / 23) + "% 0"; }
    function pos(dx, dy) { guy.style.transform = "translate(" + dx * 2 + "px," + dy * 2 + "px)"; }
    function screen(on) { tm.style.backgroundPosition = on ? "100% 0" : "0 0"; }
    function place() {                                   // wheels on the baseline of "@trainbloom"
      var mark = document.createElement("span");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      ig.insertBefore(mark, ig.firstChild);
      var base = mark.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
      ig.removeChild(mark);
      tm.style.top = guy.style.top = Math.round(base - 70) + "px";
    }
    place();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    window.addEventListener("resize", place);
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { frame(14); screen(true); return; }
    var GROUND = [-22, 6];                               // standing on the ground just left of the treadmill
    frame(14); pos(GROUND[0], GROUND[1]); screen(false);
    var TICK = 1000 / 15, RUN = [], i;
    for (i = 1; i <= 12; i++) RUN.push([i, 90]);
    var LOOP = [[23, 110], [24, 110]].concat(RUN, RUN, RUN, [[13, 120], [14, 260], [15, 160], [16, 260], [17, 260],
      [18, 260], [17, 260], [18, 260], [19, 220], [20, 420], [21, 450], [22, 320]]);
    function play(seq, k, done) {
      if (k >= seq.length) return done();
      var s = seq[k]; frame(s[0]); if (s[2]) s[2]();
      setTimeout(function () { play(seq, k + 1, done); }, s[1]);
    }
    function loop() { play(LOOP, 0, loop); }
    function hop() {                                     // [dx, dy] in sprite pixels, one per 15fps tick
      var path = [[-19, 3], [-16, 0], [-13, -2], [-10, -3], [-7, -3], [-4, -2], [-2, -1]], k = 0;
      frame(5);
      (function step() {
        if (k < path.length) { pos(path[k][0], path[k][1]); k++; setTimeout(step, TICK); return; }
        pos(0, 0);
        play([[13, TICK], [14, 450], [20, 380, function () { setTimeout(function () { screen(true); }, 120); }], [14, 300]], 0, loop);
      })();
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); setTimeout(hop, 900); } });
      io.observe(footer);
    } else setTimeout(hop, 900);
  })();

  // Pixel me in the footer: he pops up out of the ground beside "Built by Tony / @trainbloom" (like
  // popping out of a hole), lands, turns to face the text, and idles there breathing and blinking.
  // Animated the 8-bit way: positions move on his own 2px pixel grid and update at 15fps, and the
  // landing / breathing are separate pose frames rather than any smooth scaling, so he always stays crisp.
  // Protein page: pixel me beside the text with a protein shake. Once the footer comes into view he
  // shakes it hard, looks at you, takes a long drink, lowers it, and waits a moment before going again.
  if (SHAKE) (function () {
    var sp = footer.querySelector(".sp"), wrap = footer.querySelector(".by-wrap"), ig = footer.querySelector(".by-ig-text");
    function frame(n) { sp.style.backgroundPosition = ((n - 1) * 100 / 15) + "% 0"; }
    function place() {                                   // feet on the baseline of "@trainbloom"
      var mark = document.createElement("span");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      ig.insertBefore(mark, ig.firstChild);
      var base = mark.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
      ig.removeChild(mark);
      sp.style.top = Math.round(base - 66) + "px";
    }
    place();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    window.addEventListener("resize", place);
    frame(1);
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Shake: only the shaker in his hand pumps up and down (frames 1-3 are the same pose with the shaker
    // 0, 2 and 1 sprite pixels higher); his body stays still.
    var SHAKES = [], i;
    for (i = 0; i < 6; i++) SHAKES.push([3, 55], [2, 55], [3, 55], [1, 55]);
    var SEQ = SHAKES.concat([[1, 350], [8, 320], [10, 300], [11, 150], [12, 200], [13, 900], [12, 160],
      [13, 700], [14, 200], [15, 200], [1, 1600]]);
    var k = 0;
    function step() { var s = SEQ[k]; frame(s[0]); k = (k + 1) % SEQ.length; setTimeout(step, s[1]); }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); step(); } }, { threshold: 0.6 });
      io.observe(sp);                                    // start the moment he's actually on screen
    } else step();
  })();

  // Diet length page: pixel me lying on top of "Built by Tony", taking his time with a donut. His body
  // stays still; only his arm and the donut move (resting, half way up, at his mouth), with a blink now
  // and then while he rests.
  if (DONUT) (function () {
    var dn = footer.querySelector(".dn"), wrap = footer.querySelector(".by-wrap"), name = footer.querySelector(".by-name");
    var REST = 0, BLINK = 1, MID = 2, UP = 3;
    function frame(n) { dn.style.backgroundPosition = (n * 100 / 3) + "% 0"; }
    function place() {                                   // lying right on top of the letters of "Built by Tony"
      var mark = document.createElement("span");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      name.insertBefore(mark, name.firstChild);
      var w = wrap.getBoundingClientRect(), base = mark.getBoundingClientRect().top - w.top;
      name.removeChild(mark);
      var cs = getComputedStyle(name), c = document.createElement("canvas").getContext("2d");
      c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      var top = base - c.measureText("B").actualBoundingBoxAscent;
      // A bit smaller than 2x: the scale is picked so each sprite pixel is a whole number of screen
      // pixels (5 on most phones, 3 on most laptops), so he stays crisp.
      var dpr = window.devicePixelRatio || 1, sc = Math.max(1, Math.round(dpr * 1.6)) / dpr;
      var W = 41 * sc, H = 28 * sc, snap = function (v) { return Math.round(v * dpr) / dpr; };
      dn.style.width = W + "px"; dn.style.height = H + "px";
      var nr = name.getBoundingClientRect();
      dn.style.top = snap(top - H) + "px";
      dn.style.left = snap(nr.right - w.left - W - 6) + "px";     // over the right end of the words
    }
    place();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    window.addEventListener("resize", place);
    frame(REST);
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var SEQ = [[MID, 180], [UP, 650], [MID, 180], [REST, 900], [BLINK, 140], [REST, 1400], [MID, 180], [UP, 650], [MID, 180],
      [REST, 2200], [BLINK, 140], [REST, 1200]];
    var k = 0;
    function step() { var s = SEQ[k]; frame(s[0]); k = (k + 1) % SEQ.length; setTimeout(step, s[1]); }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); setTimeout(step, 400); } }, { threshold: 0.6 });
      io.observe(dn);
    } else step();
  })();

  // 1RM page: pixel me sitting on the right end of "Built by Tony", legs hanging off past the end of
  // the word, sipping a white Monster. His body stays still; only the can and his arm move (resting on
  // his leg, half way up, at his mouth), with a blink now and then and a content eyes-closed "ahh".
  if (MONSTER) (function () {
    var mo = footer.querySelector(".mo"), wrap = footer.querySelector(".by-wrap"), name = footer.querySelector(".by-name");
    var REST = 0, BLINK = 1, MID = 2, UP = 3, SIP = 4, AHH = 5;
    function frame(n) { mo.style.backgroundPosition = (n * 100 / 5) + "% 0"; }
    function place() {
      var mark = document.createElement("span");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      name.insertBefore(mark, name.firstChild);
      var w = wrap.getBoundingClientRect(), base = mark.getBoundingClientRect().top - w.top;
      name.removeChild(mark);
      var cs = getComputedStyle(name), c = document.createElement("canvas").getContext("2d");
      c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      var top = base - c.measureText("B").actualBoundingBoxAscent;
      // 1.5 CSS px per sprite pixel (3 screen pixels on most laptops; 4.5 on most phones, which still reads crisp)
      var dpr = window.devicePixelRatio || 1, sc = dpr >= 1.5 ? 1.5 : 2;
      var snap = function (v) { return Math.round(v * dpr) / dpr; };
      mo.style.width = 23 * sc + "px"; mo.style.height = 38 * sc + "px";
      var nr = name.getBoundingClientRect();
      mo.style.top = snap(top - 30 * sc) + "px";                       // his seat (sprite row 30) on the letter tops
      mo.style.left = snap(nr.right - w.left - 8 * sc + sc) + "px";      // legs (from sprite column 8) just past the word
    }
    place();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    window.addEventListener("resize", place);
    frame(REST);
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var SEQ = [[MID, 180], [UP, 450], [SIP, 1000], [UP, 250], [MID, 180], [AHH, 800], [REST, 1300], [BLINK, 140],
      [REST, 1500], [MID, 180], [UP, 450], [SIP, 800], [UP, 250], [MID, 180], [REST, 1800], [BLINK, 140], [REST, 900]];
    var k = 0;
    function step() { var s = SEQ[k]; frame(s[0]); k = (k + 1) % SEQ.length; setTimeout(step, s[1]); }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); setTimeout(step, 300); } }, { threshold: 0.6 });
      io.observe(mo);
    } else step();
  })();

  if (!TREADMILL && !SHAKE && !DONUT && !MONSTER) (function () {
    var clip = footer.querySelector(".peek-clip"), peek = footer.querySelector(".peek");
    var wrap = footer.querySelector(".by-wrap"), shadow = footer.querySelector(".peek-shadow");
    var hole = footer.querySelector(".peek-hole");
    function holeSize(n) {                               // 0 = gone, 1..3 = opening sizes
      hole.style.display = n ? "block" : "none";
      if (n) hole.style.backgroundPosition = ((n - 1) * 50) + "% 0";
    }
    peek.innerHTML = '<div class="peek-guy"></div>';
    var guy = peek.firstChild;
    var STAND = 0, BLINK = 1, BREATHE = 2, CROUCH = 3, WAVE_A = 4, WAVE_B = 5;
    var PAD = 50, H = 54, TICK = 1000 / 15;
    // Where the text's ink actually sits (from the font metrics), relative to the top of .by-wrap:
    // he pops out from behind the top line ("Built by Tony") and lands on the bottom line's baseline.
    var ig = footer.querySelector(".by-ig-text");
    var DROP = 0;
    function inkBox(el, sample) {
      // a zero-size marker sitting on the text's baseline gives the exact baseline position
      var mark = document.createElement("span");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      el.insertBefore(mark, el.firstChild);
      var w = wrap.getBoundingClientRect(), base = mark.getBoundingClientRect().top - w.top;
      el.removeChild(mark);
      var cs = getComputedStyle(el), c = document.createElement("canvas").getContext("2d");
      c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      return { top: base - c.measureText(sample).actualBoundingBoxAscent, base: base, right: el.getBoundingClientRect().right - w.left };
    }
    function geometry() {
      var b = inkBox(ig, "t");
      clip.style.bottom = "auto";
      clip.style.top = Math.round(b.base - 140) + "px";              // clip edge = the ground line beside the text
      DROP = 0;
      shadow.style.bottom = "auto"; shadow.style.top = Math.round(b.base - 1) + "px";
    }
    function frame(n) { guy.style.backgroundPosition = (n * 20) + "% 0"; }
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
    function wave() {                                    // arm up, wiggle the hand twice, arm down
      var seq = [WAVE_A, WAVE_B, WAVE_A, WAVE_B, WAVE_A, STAND], i = 0;
      (function next() {
        frame(seq[i]);
        if (++i < seq.length) setTimeout(next, 170); else setTimeout(idle, 500);
      })();
    }
    function land(x2, quick) {
      clip.classList.add("free"); peek.style.opacity = 1; pose(x2, DROP); shadow.classList.add("on");
      if (quick) { guy.classList.add("flip"); idle(); return; }
      frame(CROUCH);
      setTimeout(function () { frame(BREATHE); }, TICK);                      // soak up the landing...
      setTimeout(function () { frame(STAND); }, TICK * 2);                    // ...and stand
      setTimeout(function () { guy.classList.add("flip"); }, TICK * 2 + 300); // turn to face the text
      setTimeout(wave, TICK * 2 + 1300);                                      // a second later, a little wave
    }
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame(STAND); geometry(); measure(); land(textW() + 4, true); return;
    }
    function run() {
      geometry(); measure();
      var x2 = textW() + 4;
      var wr = wrap.getBoundingClientRect();              // centred under his feet, on the ground line (pixel-snapped)
      hole.style.left = snap(x2 + 22 - 22, wr.left) + "px";
      hole.style.top = snap(parseFloat(clip.style.top) + 140 - 7, wr.top) + "px";
      // 15fps frames, [x, y]: y = 0 is the ground line (the bottom text line's baseline) right beside
      // the words. He shoots up out of the ground (hidden below that line), hops, and drops back down.
      var path = [[x2, 36], [x2, 14], [x2, -4], [x2, -10], [x2, -12], [x2, -10], [x2, -5]];
      frame(STAND);
      pose(x2, H + 4);                                   // park him out of sight below the ground first
      // (measure() clears his transform, which would otherwise flash him at the left edge of the text)
      // A hole opens in the ground, he shoots up out of it, and it closes behind him while he's in the air.
      var holeAt = { 0: 1, 1: 2, 2: 3, 6: 2, 7: 1, 8: 0 }, LEAD = 3;   // path frame -> hole size
      var f = -LEAD;
      (function step() {
        var hf = f + LEAD;
        if (f < 0) { holeSize(holeAt[hf]); f++; setTimeout(step, TICK); return; }
        if (hf in holeAt) holeSize(holeAt[hf]);
        if (f >= path.length) { holeSize(0); land(x2); return; }
        var pt = path[f++];
        peek.style.opacity = 1;
        if (pt[1] <= 0) clip.classList.add("free");      // fully out of the ground
        pose(pt[0], pt[1]);
        setTimeout(step, TICK);
      })();
    }
    pose(0, H + 2);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { io.disconnect(); setTimeout(run, 950); }
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
      st.style.setProperty("--s", (5.2 + rnd() * 3.4).toFixed(1) + "s");        // sparkle beat (slow)
      if (k % 4 === 0) st.classList.add("spark");                          // 10 of the 40 sparkle
      st.style.setProperty("--d", (-rnd() * 10).toFixed(1) + "s");
      st.style.setProperty("--dx", ((rnd() - 0.5) * 12).toFixed(1) + "px");
      st.style.setProperty("--dy", (-4 - rnd() * 7).toFixed(1) + "px");
      st.style.setProperty("--o", (0.4 + rnd() * 0.4).toFixed(2));
      stars.appendChild(st);
    }
    hero.insertBefore(stars, hero.firstChild);
    hero.classList.add("has-stars");

    // Every 7 seconds a tiny comet streaks across a random patch of the sky.
    if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      setInterval(function () {
        if (document.hidden) return;
        var c = document.createElement("i"), right = Math.random() < 0.5;
        var ang = 14 + Math.random() * 20;                                   // degrees below horizontal
        c.className = "comet";
        c.style.left = (right ? 8 + Math.random() * 45 : 45 + Math.random() * 45) + "%";
        c.style.top = (6 + Math.random() * 40) + "%";
        c.style.setProperty("--a", (right ? ang : 180 - ang).toFixed(1) + "deg");
        c.style.setProperty("--len", (90 + Math.random() * 70).toFixed(0) + "px");
        c.addEventListener("animationend", function () { c.remove(); });
        stars.appendChild(c);
      }, 7000);
    }
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
