// Home hero, phone layout: the male figure fades in and his numbers count up; after a few seconds
// he eases out to the left while the female figure eases in from the right, and the numbers
// recount to hers. Then back again, forever.
// Stats, in order: TDEE, body fat, 1RM squat, VO2 max, protein, potential.
(function () {
  var svg = document.querySelector(".hero-callouts-m");
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
  // The numbers (with their units) and the potential bar fill move together; labels stay put.
  var movers = Array.prototype.slice.call(svg.querySelectorAll(".hs-v")).concat([bar]);
  var SHIFT = 190; // canvas units a figure travels while sliding
  var NUDGE = 22;  // canvas units the numbers travel as they slide in/out

  function show(v) {
    for (var i = 0; i < nums.length; i++) nums[i].textContent = FMT[i](v[i]);
    bar.setAttribute("width", (BAR_W * v[5] / 100).toFixed(1));
  }
  function shift(x, o) {
    for (var i = 0; i < movers.length; i++) {
      movers[i].setAttribute("transform", "translate(" + x.toFixed(2) + " 0)");
      movers[i].setAttribute("opacity", o.toFixed(3));
    }
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

  // One cycle (ms): hold the current figure, then slide to the other one. During the slide the
  // numbers drift out to the left in the first part, and the new ones drift in over the second.
  var FADE = 700, IN = 700, COUNT = 1500, HOLD = 4200, SLIDE = 1700, OUT_END = 0.4, IN_START = 0.5;
  var zeros = [0, 0, 0, 0, 0, 0];
  var cur = 0, t = 0, last = null, first = true, head = -250; // head: how far the numbers' entrance already got
  place(0, 0, 0); place(1, SHIFT, 0); show(zeros); shift(NUDGE, 0);

  var phone = window.matchMedia ? matchMedia("(max-width: 640px)") : { matches: true };
  function tick(now) {
    requestAnimationFrame(tick);
    if (!phone.matches) { last = null; return; } // the desktop layout is showing
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
      if (s < OUT_END) { var o = easeIn(s / OUT_END); show(FRAMES[cur].vals); shift(-NUDGE * o, 1 - o); }
      else if (s < IN_START) shift(NUDGE, 0);
      else enter((s - IN_START) * SLIDE, FRAMES[cur].vals, FRAMES[next].vals);
    } else {
      place(cur, SHIFT, 0); place(next, 0, 1); // parked on the right, ready to come back in
      head = (1 - IN_START) * SLIDE; // the new numbers' entrance carries on from here
      cur = next; t = 0; first = false;
    }
  }
  requestAnimationFrame(tick);
})();
