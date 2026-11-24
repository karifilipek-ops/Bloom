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
  var FIG = 900, FIRST = 550, GAP = 250, DOT = 220, LINE = 560, TEXT = 450, COUNT = 1100, FIG_MAX = 0.78;   // figure stays soft so the stats lead

  // Each value counts up from 0 once its line arrives. The number is the text before the unit.
  var nums = Array.prototype.map.call(stats, function (g) {
    var v = g.querySelector(".hs-v"), node = v.firstChild, raw = node.nodeValue;
    var dec = (raw.split(".")[1] || "").replace(/\D/g, "").length;
    return { node: node, to: parseFloat(raw.replace(/[^\d.]/g, "")), dec: dec, pct: /%/.test(raw), raw: raw, v: v };
  });
  function fmt(n, x) {
    var s = x.toFixed(n.dec);
    if (!n.dec) s = Math.round(x).toLocaleString("en-US");
    return s + (n.pct ? "%" : "");
  }
  // Right column: pin the unit where it ends up, so it doesn't creep sideways as the digits grow.
  function pinUnits() {
    nums.forEach(function (n) {
      var u = n.v.querySelector(".hs-u");
      if (!u || n.v.getAttribute("text-anchor") !== "start") return;
      var keep = n.node.nodeValue; n.node.nodeValue = n.raw;
      u.setAttribute("x", +n.v.getAttribute("x") + n.v.getSubStringLength(0, n.raw.length) + 5);
      u.removeAttribute("dx"); n.node.nodeValue = keep;
    });
  }
  pinUnits();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pinUnits);

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
      var c = clamp((s - DOT * 0.5 - LINE * 0.75) / COUNT), n = nums[i];
      n.node.nodeValue = c >= 1 ? n.raw : fmt(n, n.to * easeOut(c));
    });
  }
  var END = FIRST + (ORDER.length - 1) * GAP + DOT * 0.5 + LINE * 0.75 + Math.max(TEXT, COUNT);
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
