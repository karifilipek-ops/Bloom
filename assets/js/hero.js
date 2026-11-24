// Home hero: the figure fades in, then one stat at a time a dot lights up on his body,
// a dotted line draws out to the side, and the stat fades in at the end of it. Then it all stays put.
(function () {
  var svg = document.querySelector(".hero-stage");
  if (!svg || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return; // markup is the finished frame

  var fig = svg.querySelector(".hm-fig");
  var masks = svg.querySelectorAll(".hlm"), dots = svg.querySelectorAll(".hd"), stats = svg.querySelectorAll(".hs");
  var lens = Array.prototype.map.call(masks, function (m) { return m.getTotalLength(); });
  var ORDER = [0, 3, 1, 4, 2];             // TDEE, VO2, body fat, protein, squat: zig-zag down
  var FIG = 900, FIRST = 550, GAP = 420, DOT = 220, LINE = 560, TEXT = 450, FIG_MAX = 0.62;   // figure stays soft so the stats lead

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function render(t) {
    fig.style.opacity = FIG_MAX * easeOut(clamp(t / FIG));
    ORDER.forEach(function (i, k) {
      var s = t - FIRST - k * GAP;                                   // this stat's own clock
      dots[i].style.opacity = easeOut(clamp(s / DOT));
      masks[i].style.strokeDashoffset = lens[i] * (1 - easeInOut(clamp((s - DOT * 0.5) / LINE)));
      var tx = clamp((s - DOT * 0.5 - LINE * 0.75) / TEXT), side = i < 3 ? 1 : -1;
      stats[i].style.opacity = easeOut(tx);
      stats[i].style.transform = "translateX(" + (side * 8 * (1 - easeOut(tx))).toFixed(2) + "px)";
    });
  }
  var END = FIRST + (ORDER.length - 1) * GAP + DOT + LINE + TEXT;
  for (var i = 0; i < masks.length; i++) masks[i].style.strokeDasharray = lens[i];
  render(0);

  var start = null;
  function tick(now) {
    if (start == null) start = now;
    var t = now - start;
    render(t);
    if (t < END) requestAnimationFrame(tick);
    else Array.prototype.forEach.call(stats, function (s) { s.style.transform = ""; });
  }
  function go() { requestAnimationFrame(tick); }
  // Start once the hero card has mostly faded in, so it plays on a settled page.
  if (document.documentElement.classList.contains("loading")) {
    document.addEventListener("bloom:shown", function () { setTimeout(go, 600); }, { once: true });
  } else go();
})();
