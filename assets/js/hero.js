// Home hero, phone layout: the callouts draw out of the male figure and the numbers count up,
// then he slides out, the female figure slides in and the numbers recount to hers. Loops.
// Stats are in the order of the SVG: TDEE, body fat, 1RM squat, VO2 max, protein.
(function () {
  var svg = document.querySelector(".hero-callouts-m");
  if (!svg || !window.requestAnimationFrame) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // the markup already shows the finished male frame

  var ROWS = [247, 347, 447, 247, 347];
  // Callout anchor points on each body (canvas units) and the numbers for each frame.
  var FRAMES = [
    { fig: svg.querySelector(".hm-fig-m"), dots: [[306, 253.2], [296.8, 309], [298.9, 406.7], [332.4, 247], [366.5, 284.2]], vals: [2640, 12, 315, 46.2, 140] },
    { fig: svg.querySelector(".hm-fig-f"), dots: [[309.5, 263.2], [299.9, 313.7], [300.6, 406.6], [329.1, 258], [352.2, 290.4]], vals: [2050, 21, 185, 41.5, 115] }
  ];
  var FMT = [
    function (v) { return Math.round(v).toLocaleString("en-US") + " CAL"; },
    function (v) { return Math.round(v) + "%"; },
    function (v) { return Math.round(v) + " LB"; },
    function (v) { return v.toFixed(1); },
    function (v) { return Math.round(v) + " G"; }
  ];
  function pathFor(i, a) {
    var ry = ROWS[i];
    if (i < 3) return "M" + a[0] + "," + a[1] + " L262," + a[1] + " L250," + ry + " L238," + ry;
    if (i === 3) return "M" + a[0] + "," + a[1] + " L378," + a[1] + " L392," + ry + " L402," + ry;
    return "M" + a[0] + "," + a[1] + " L392," + ry + " L402," + ry;
  }

  var lines = svg.querySelectorAll(".hl"), masks = svg.querySelectorAll(".hm");
  var dots = svg.querySelectorAll(".hc-dots circle"), values = svg.querySelectorAll(".hs-v");
  var lens = [];

  function anchor(frame) {
    FRAMES[frame].dots.forEach(function (a, i) {
      var d = pathFor(i, a);
      lines[i].setAttribute("d", d); masks[i].setAttribute("d", d);
      dots[i].setAttribute("cx", a[0]); dots[i].setAttribute("cy", a[1]);
      lens[i] = masks[i].getTotalLength();
      masks[i].style.strokeDasharray = lens[i];
    });
  }
  // p: 0 = hidden, 1 = fully drawn. Each line starts a little after the one before it.
  function draw(p) {
    for (var i = 0; i < lines.length; i++) {
      var q = clamp(p * 1.4 - i * 0.1);
      masks[i].style.strokeDashoffset = lens[i] * (1 - ease(q));
      dots[i].style.opacity = clamp(q * 5);
    }
  }
  function show(vals) { for (var i = 0; i < values.length; i++) values[i].textContent = FMT[i](vals[i]); }
  function slide(from, to, p) { // figure `from` exits left, `to` enters from the right
    var e = ease(p);
    FRAMES[from].fig.setAttribute("transform", "translate(" + (-110 * e) + " 0)");
    FRAMES[from].fig.setAttribute("opacity", 1 - e);
    FRAMES[to].fig.setAttribute("transform", "translate(" + (110 * (1 - e)) + " 0)");
    FRAMES[to].fig.setAttribute("opacity", e);
  }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerp(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }

  // Timeline for one frame, in ms: draw + count, hold, retract, slide.
  var DRAW = 900, COUNT = 1300, HOLD = 3600, RETRACT = 450, SLIDE = 800;
  var CYCLE = HOLD + RETRACT + SLIDE;
  var zeros = [0, 0, 0, 0, 0];
  var cur = 0, t = 0, last = null, first = true;
  anchor(0); draw(0); show(zeros);
  FRAMES[1].fig.setAttribute("opacity", 0);

  var phone = window.matchMedia ? matchMedia("(max-width: 640px)") : { matches: true };
  function tick(now) {
    if (!phone.matches) { last = null; requestAnimationFrame(tick); return; } // desktop layout is showing
    var dt = last == null ? 0 : Math.min(now - last, 50); // cap so a background tab doesn't skip ahead
    last = now; t += dt;
    var next = 1 - cur, from = first ? zeros : FRAMES[next].vals, to = FRAMES[cur].vals;
    if (t < HOLD) {
      draw(clamp(t / DRAW));
      show(lerp(from, to, ease(clamp((t - 150) / COUNT))));
    } else if (t < HOLD + RETRACT) {
      draw(1 - clamp((t - HOLD) / RETRACT)); show(to);
    } else if (t < CYCLE) {
      draw(0); slide(cur, next, clamp((t - HOLD - RETRACT) / SLIDE));
    } else {
      slide(cur, next, 1);
      cur = next; t = 0; first = false; anchor(cur);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
