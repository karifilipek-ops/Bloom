// Home hero: the figure fades in, then one stat at a time a dot lights up on his body,
// a dotted line draws out to the side, and the stat fades in at the end of it. Then it all stays put.
(function () {
  var svg = document.querySelector(".hero-stage");
  if (!svg) return;

  // Phones: the banner is taller (640 x 635 canvas) and everything spreads out to use it:
  // a bigger figure, stat columns pushed further out, rows further apart (bigger type is in the CSS).
  // The markup holds the desktop layout; this swaps the coordinates in, and back if the screen widens.
  var PHONE = {
    w: 640, h: 635, scale: 0.37, ty: 165, leftX: 182, rightX: 458,
    // [row centre y, body point x, body point y] in the order of the stats in the markup:
    // TDEE, body fat, 1RM squat (left column), VO2 max, protein (right column)
    stats: [[262, -50, 330], [380, -70, 560], [498, -85, 900], [321, 45, 330], [439, 175, 560]]
  };
  PHONE.view = "0 0 " + PHONE.w + " " + PHONE.h;
  PHONE.fig = "translate(320 " + PHONE.ty + ") scale(" + PHONE.scale + ") translate(0 -58)";
  var useEl = svg.querySelector(".hm-fig use"), lineEls = svg.querySelectorAll(".hl"), maskEls = svg.querySelectorAll(".hlm");
  var maskBoxes = svg.querySelectorAll("mask[id^='hl-m']"), dotEls = svg.querySelectorAll(".hd"), statEls = svg.querySelectorAll(".hs");
  var desk = {
    view: svg.getAttribute("viewBox"), fig: useEl.getAttribute("transform"),
    d: Array.prototype.map.call(lineEls, function (l) { return l.getAttribute("d"); }),
    dots: Array.prototype.map.call(dotEls, function (g) { return [g.firstChild.getAttribute("cx"), g.firstChild.getAttribute("cy")]; }),
    text: Array.prototype.map.call(statEls, function (g) {
      return Array.prototype.map.call(g.querySelectorAll("text"), function (t) { return [t.getAttribute("x"), t.getAttribute("y")]; });
    })
  };
  function applyLayout(phone) {
    svg.setAttribute("viewBox", phone ? PHONE.view : desk.view);
    useEl.setAttribute("transform", phone ? PHONE.fig : desk.fig);
    Array.prototype.forEach.call(maskBoxes, function (m) { m.setAttribute("height", phone ? PHONE.h : 480); });
    Array.prototype.forEach.call(statEls, function (g, i) {
      var texts = g.querySelectorAll("text"), d, ax, ay;
      if (phone) {
        var st = PHONE.stats[i], left = i < 3, row = st[0], tx = left ? PHONE.leftX : PHONE.rightX;
        ax = (320 + PHONE.scale * st[1]).toFixed(1); ay = (PHONE.ty + PHONE.scale * (st[2] - 58)).toFixed(1);
        d = "M" + ax + "," + ay + (left ? " L" + (tx + 32) + "," + row + " L" + (tx + 12) + "," + row
                                        : " L" + (tx - 32) + "," + row + " L" + (tx - 12) + "," + row);
        texts[0].setAttribute("x", tx); texts[0].setAttribute("y", row - 12);
        texts[1].setAttribute("x", tx); texts[1].setAttribute("y", row + 30);
      } else {
        d = desk.d[i]; ax = desk.dots[i][0]; ay = desk.dots[i][1];
        texts[0].setAttribute("x", desk.text[i][0][0]); texts[0].setAttribute("y", desk.text[i][0][1]);
        texts[1].setAttribute("x", desk.text[i][1][0]); texts[1].setAttribute("y", desk.text[i][1][1]);
      }
      lineEls[i].setAttribute("d", d); maskEls[i].setAttribute("d", d);
      Array.prototype.forEach.call(dotEls[i].querySelectorAll("circle"), function (c) { c.setAttribute("cx", ax); c.setAttribute("cy", ay); });
    });
  }
  var phoneMq = window.matchMedia ? matchMedia("(max-width: 640px)") : { matches: false };
  applyLayout(phoneMq.matches);

  if (!window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (phoneMq.addEventListener) phoneMq.addEventListener("change", function (e) { applyLayout(e.matches); });
    return;                                              // markup is the finished frame
  }

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
  if (phoneMq.addEventListener) phoneMq.addEventListener("change", function (e) {   // e.g. rotating a tablet
    applyLayout(e.matches); pinUnits();
    for (var i = 0; i < masks.length; i++) { lens[i] = masks[i].getTotalLength(); masks[i].style.strokeDasharray = lens[i]; }
  });

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
