// Home hero: the male figure fades in and his numbers count up; after a few seconds
// he eases out to the left while the female figure eases in from the right, and the numbers
// recount to hers. Then back again, forever.
// Stats, in order: TDEE, body fat, 1RM squat, VO2 max, protein, potential.
// Title: glitch/code-in reveal. The real letters stay in place the whole time; each one flickers on
// in turn (left to right) with a split-colour glow and a tiny jitter, then settles solid.
(function () {
  var h1 = document.querySelector(".hero-art h1");
  if (!h1 || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var text = h1.textContent;
  h1.setAttribute("aria-label", text);
  h1.style.opacity = "0";                                          // hidden until the reveal starts (no flash)
  setTimeout(function () { h1.style.opacity = ""; }, 2500);        // safety net if anything goes wrong
  function start() {
    h1.innerHTML = "";
    var spans = text.split("").map(function (ch) {
      var sp = document.createElement("span");
      sp.className = "gl-ch"; sp.setAttribute("aria-hidden", "true"); sp.textContent = ch; sp.style.opacity = "0";
      h1.appendChild(sp); return sp;
    });
    h1.classList.add("glitching");
    h1.style.opacity = "";
    var t0 = null, LEAD = 150, STEP = 75, GLITCH = 280, lastTick = 0;
    function frame(now) {
      if (t0 == null) t0 = now;
      var t = now - t0, done = true, tick = now - lastTick > 45;   // re-roll the flicker ~22x a second
      if (tick) lastTick = now;
      spans.forEach(function (sp, i) {
        var r = t - (LEAD + i * STEP);
        if (r < 0) { done = false; return; }                       // not started yet: stays invisible
        if (r < GLITCH) {                                          // flickering in
          done = false;
          if (tick) {
            var on = Math.random() < 0.3 + 0.7 * r / GLITCH;       // more often visible as it settles
            sp.style.opacity = on ? (0.55 + Math.random() * 0.45).toFixed(2) : "0.15";
            sp.style.transform = "translateX(" + ((Math.random() - 0.5) * 3).toFixed(1) + "px)";
            sp.classList.add("gl-on");
          }
        } else if (sp.classList.contains("gl-on") || sp.style.opacity !== "1") {   // settled
          sp.style.opacity = "1"; sp.style.transform = ""; sp.classList.remove("gl-on");
        }
      });
      if (!done) requestAnimationFrame(frame);
      else { h1.classList.remove("glitching"); h1.textContent = text; }   // back to plain text
    }
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();

(function () {
  var svg = document.querySelector(".hero-stage");
  if (!svg || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return; // markup shows the male frame

  var FRAMES = [
    { fig: svg.querySelector(".hm-fig-m"), vals: [2640, 12, 315, 46.2, 140, 68] },
    { fig: svg.querySelector(".hm-fig-f"), vals: [2050, 21, 185, 41.5, 115, 74] }
  ];
  var FMT = [
    function (v) { return Math.round(v).toLocaleString("en-US"); },
    function (v) { return Math.round(v) + "%"; },
    function (v) { return String(Math.round(v)); },
    function (v) { return v.toFixed(1); },
    function (v) { return String(Math.round(v)); },
    function (v) { return Math.round(v) + "%"; }
  ];
  var nums = svg.querySelectorAll(".hs-n"), bar = svg.querySelector(".hp-fill");
  var BAR_W = +svg.querySelector(".hp-track").getAttribute("width");
  // All the numbers and units live in one group that moves as a single
  // composited layer (smooth sub-pixel motion); the labels above them stay put.
  var vals = svg.querySelector(".hm-vals");

  // Units sit in their own fixed spot so they never wobble while the digits count.
  // Left column (right-aligned): unit at the edge, number ends just before it.
  // Right column (left-aligned): number starts at the edge, unit after the widest value it shows.
  function layout() {
    Array.prototype.forEach.call(svg.querySelectorAll(".hs-u"), function (u) {
      var i = +u.getAttribute("data-for"), n = nums[i], gap = 6;
      if (n.getAttribute("text-anchor") === "end") {
        n.setAttribute("x", +u.getAttribute("x") - u.getComputedTextLength() - gap);
      } else {
        var keep = n.textContent, widest = 0;
        FRAMES.forEach(function (f) { n.textContent = FMT[i](f.vals[i]); widest = Math.max(widest, n.getComputedTextLength()); });
        n.textContent = keep;
        u.setAttribute("x", +n.getAttribute("x") + widest + gap);
      }
    });
  }
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);   // re-measure once the pixel font loads
  var SHIFT = 190; // canvas units a figure travels while sliding
  var NUDGE = 22;  // canvas units the numbers travel as they slide in/out

  function show(v) {
    for (var i = 0; i < nums.length; i++) nums[i].textContent = FMT[i](v[i]);
  }
  // The potential bar never fades: it stays on its track and just grows or shrinks.
  function setBar(pct) { bar.setAttribute("width", (BAR_W * pct / 100).toFixed(1)); }
  function shift(x, o) {
    vals.style.transform = "translateX(" + x.toFixed(2) + "px)";
    vals.style.opacity = o.toFixed(3);
  }
  function place(frame, x, o) {
    FRAMES[frame].fig.setAttribute("transform", "translate(" + x.toFixed(1) + " 0)");
    FRAMES[frame].fig.setAttribute("opacity", o.toFixed(3));
  }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeIn(x) { return x * x * x; }
  function easeSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }   // gentle speed-up and slow-down, for counting
  function lerp(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }

  // Numbers `ms` into their entrance: drift in from the right, fade up, and count from -> to.
  function enter(ms, from, to) {
    var e = easeOut(clamp(ms / IN));
    shift(NUDGE * (1 - e), e);
    var v = lerp(from, to, easeSine(clamp(ms / COUNT)));
    show(v);
    if (first && t < HOLD) setBar(v[5]);                             // first load only: bar fills with the count
  }

  // One cycle (ms): hold the current figure, then slide to the other one. During the slide the
  // numbers drift out to the left with the outgoing person, and the new ones drift in over the second half.
  var FADE = 700, IN = 750, COUNT = 1400, HOLD = 4200, SLIDE = 1700, OUT_END = 0.4, IN_START = 0.5;
  var zeros = [0, 0, 0, 0, 0, 0];
  var cur = 0, t = 0, last = null, first = true, head = -250; // head: how far the numbers' entrance already got
  place(0, 0, 0); place(1, SHIFT, 0); show(zeros); setBar(0); shift(NUDGE, 0);

  function tick(now) {
    requestAnimationFrame(tick);
    var dt = last == null ? 0 : Math.min(now - last, 50); // capped so a background tab doesn't jump ahead
    last = now; t += dt;
    var next = 1 - cur, prev = first ? zeros : FRAMES[next].vals;
    if (first) place(cur, 0, easeOut(clamp(t / FADE)));
    if (t < HOLD) {
      enter(t + head, prev, FRAMES[cur].vals);
    } else if (t < HOLD + SLIDE) {
      var s = (t - HOLD) / SLIDE, e = easeInOut(s);
      place(cur, -SHIFT * e, 1 - e);
      place(next, SHIFT * (1 - e), e);
      setBar(FRAMES[cur].vals[5] + (FRAMES[next].vals[5] - FRAMES[cur].vals[5]) * e);   // bar glides to the new value
      if (s < OUT_END) { var o = easeIn(s / OUT_END); show(FRAMES[cur].vals); shift(-NUDGE * o, 1 - o); }
      else if (s < IN_START) shift(NUDGE, 0);
      else enter((s - IN_START) * SLIDE, FRAMES[cur].vals, FRAMES[next].vals);
    } else {
      place(cur, SHIFT, 0); place(next, 0, 1); // parked on the right, ready to come back in
      setBar(FRAMES[next].vals[5]);
      head = (1 - IN_START) * SLIDE; // the new numbers' entrance carries on from here
      cur = next; t = 0; first = false;
    }
  }
  requestAnimationFrame(tick);
})();
