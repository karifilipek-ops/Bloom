// Home hero: the male figure fades in and his numbers count up; after a few seconds
// he eases out to the left while the female figure eases in from the right, and the numbers
// recount to hers. Then back again, forever.
// Stats, in order: TDEE, body fat, 1RM squat, VO2 max, protein, potential.
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
  // All the numbers, units and the potential bar fill live in one group that moves as a single
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
    bar.setAttribute("width", (BAR_W * v[5] / 100).toFixed(1));
  }
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
  function lerp(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }

  // Numbers `ms` into their entrance: drift in from the right, fade up, and count from -> to.
  function enter(ms, from, to) {
    var e = easeOut(clamp(ms / IN));
    shift(NUDGE * (1 - e), e);
    show(lerp(from, to, easeOut(clamp(ms / COUNT))));
  }

  // One cycle (ms): hold the current figure, then slide to the other one. On the very first load
  // the numbers fade in and count up from zero; on every swap after that they stay put and simply
  // count from one person's values to the other's, in step with the slide.
  var FADE = 700, IN = 750, COUNT = 950, HOLD = 4200, SLIDE = 1700;
  var zeros = [0, 0, 0, 0, 0, 0];
  var cur = 0, t = 0, last = null, first = true;
  place(0, 0, 0); place(1, SHIFT, 0); show(zeros); shift(NUDGE, 0);

  function tick(now) {
    requestAnimationFrame(tick);
    var dt = last == null ? 0 : Math.min(now - last, 50); // capped so a background tab doesn't jump ahead
    last = now; t += dt;
    var next = 1 - cur;
    if (t < HOLD) {
      if (first) { place(cur, 0, easeOut(clamp(t / FADE))); enter(t - 250, zeros, FRAMES[cur].vals); }
    } else if (t < HOLD + SLIDE) {
      var e = easeInOut((t - HOLD) / SLIDE);
      place(cur, -SHIFT * e, 1 - e);
      place(next, SHIFT * (1 - e), e);
      shift(0, 1);
      show(lerp(FRAMES[cur].vals, FRAMES[next].vals, e));   // numbers glide to the new values
    } else {
      place(cur, SHIFT, 0); place(next, 0, 1);             // parked on the right, ready to come back in
      show(FRAMES[next].vals);
      cur = next; t = 0; first = false;
    }
  }
  requestAnimationFrame(tick);
})();
