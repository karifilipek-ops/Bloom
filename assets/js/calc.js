// Small helpers shared by every calculator page.
window.Bloom = (function () {
  var LB_PER_KG = 2.20462;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function num(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = parseFloat(el.value);
    return isFinite(v) ? v : NaN;
  }

  function fmt(n, dp) {
    if (!isFinite(n)) return "–";
    return n.toLocaleString("en-US", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
  }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem("bloom." + key);
      localStorage.setItem("bloom." + key, val);
    } catch (e) { return null; }
  }

  // Segmented button groups: <div class="seg" data-name="sex"><button data-value="m">…
  // Returns getter; calls onChange(value) on click.
  function seg(name, onChange) {
    var group = document.querySelector('.seg[data-name="' + name + '"]');
    var buttons = $$("button", group);
    var remembered = group.hasAttribute("data-remember") ? store("seg." + name) : null;
    function set(v) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.value === v ? "true" : "false"); });
      group.dataset.value = v;
      if (group.hasAttribute("data-remember")) store("seg." + name, v);
      if (onChange) onChange(v);
    }
    buttons.forEach(function (b) {
      b.type = "button";
      b.addEventListener("click", function () { set(b.dataset.value); });
    });
    var initial = remembered && buttons.some(function (b) { return b.dataset.value === remembered; })
      ? remembered
      : (buttons.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0] || buttons[0]).dataset.value;
    set(initial);
    return function () { return group.dataset.value; };
  }

  // Toggle visibility of [data-unit="imperial|metric"] blocks and unit labels.
  function unitSystem(onChange) {
    return seg("units", function (v) {
      $$("[data-unit]").forEach(function (el) { el.hidden = el.dataset.unit !== v; });
      $$("[data-wu]").forEach(function (el) { el.textContent = v === "metric" ? "kg" : "lb"; });
      if (onChange) onChange(v);
    });
  }

  // Read weight in kg from #<id> (value entered in lb or kg depending on units)
  function weightKg(id, units) {
    var w = num(id);
    return units === "metric" ? w : w / LB_PER_KG;
  }

  // Height in cm from #height-ft/#height-in or #height-cm
  function heightCm(units) {
    if (units === "metric") return num("height-cm");
    var ft = num("height-ft"), inch = num("height-in");
    if (!isFinite(ft)) return NaN;
    return (ft * 12 + (isFinite(inch) ? inch : 0)) * 2.54;
  }

  function show(el) {
    el.hidden = false;
    if (el.getBoundingClientRect().top > window.innerHeight * 0.75) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function error(form, msg) {
    var box = $(".form-error", form);
    if (!box) {
      box = document.createElement("p");
      box.className = "form-error callout";
      box.setAttribute("role", "alert");
      $(".actions", form).insertAdjacentElement("beforebegin", box);
    }
    box.textContent = msg;
    box.hidden = !msg;
    return !msg;
  }


  // Body fat slider (#bf, #bf-out) + illustrated visual guide (#bf-cards). Call render(sex) when sex changes.
  var BF_LEVELS = {
    m: [[4, "3–4%"], [6, "5–7%"], [10, "8–12%"], [15, "13–17%"], [20, "18–23%"], [26, "24–29%"], [32, "30–34%"], [37, "35–39%"], [42, "40%+"]],
    f: [[12, "10–13%"], [16, "14–17%"], [20, "18–22%"], [25, "23–27%"], [30, "28–32%"], [35, "33–37%"], [40, "38–42%"], [45, "43–47%"], [50, "48%+"]]
  };

  // Torso line-art figure (neck to hips, arms attached). i = level 0 (leanest) … 8 (highest body fat).
  function torsoSVG(sex, i) {
    var f = i / 8, m = sex === "m", INK = "#242424", FILL = "#ffffff", SOFT = "#ececf1";
    var fade = function (from, to) { return i <= from ? 1 : i >= to ? 0 : 1 - (i - from) / (to - from); };
    var P = function (pts) { return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); };
    var mir = function (pts) { return pts.map(function (p) { return [120 - p[0], p[1]]; }); };
    var poly = function (pts, fill) { return '<polygon points="' + P(pts) + '" fill="' + (fill || FILL) + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>'; };
    var both = function (pts, fill) { return poly(pts, fill) + poly(mir(pts), fill); };
    var ln = function (pts, op, w) { return op <= 0 ? "" : '<polyline points="' + P(pts) + '" fill="none" stroke="' + INK + '" stroke-width="' + (w || 1.6) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + op.toFixed(2) + '"/>'; };
    var lnB = function (pts, op, w) { return ln(pts, op, w) + ln(mir(pts), op, w); };

    // left torso edge: [y, x] key points (mirrored for the right side)
    var ch = m ? 31 + 4 * f : 27 + 4 * f;       // chest half-width
    var bw = m ? 24 + 13 * f : 19 + 13 * f;     // belly / waist half-width
    var hw = m ? 25 + 9 * f : 28 + 9 * f;       // hip half-width
    var edge = [[9, m ? 50 : 52], [20, m ? 30 : 33], [44, m ? 27 : 30], [64, 60 - ch], [90, 60 - bw], [112, 60 - hw], [120, 60 - hw]];
    var X = function (y) {                        // torso edge x at height y
      for (var k = 0; k < edge.length - 1; k++) if (y <= edge[k + 1][0]) {
        var a = edge[k], b = edge[k + 1]; return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
      }
      return edge[edge.length - 1][1];
    };
    var s = "";

    // torso
    var left = edge.map(function (p) { return [p[1], p[0]]; });
    s += poly(left.concat(mir(left).reverse()));

    // briefs (cropped at the bottom)
    s += poly([[X(108) + 1, 108], [120 - X(108) - 1, 108], [64, 122], [56, 122]], SOFT);

    // arms hug the torso and fan out as it widens
    var top = m ? 15 : 12, bot = m ? 13 : 10;   // arm thickness at shoulder / bottom
    var W = function (y) { return top + (bot - top) * (y - 44) / 70 + 4 * f; };
    var ys = [44, 62, 80, 98, 116];
    var inner = ys.map(function (y) { return [X(y) - 1.8, y]; });
    var outer = ys.map(function (y) { return [X(y) - 1.8 - W(y), y]; });
    var capX = X(22);
    var arm = [[capX + 2, 19], [capX - 8, 19], [outer[0][0] - 3, 27], [outer[0][0] - 3, 38]].concat(outer.slice(1)).concat(inner.slice().reverse()).concat([[capX - 1, 32]]);
    s += both(arm);
    // deltoid / upper-arm split
    s += lnB([[outer[0][0] + 1, 50], [inner[0][0] - 1, 42]], 1, 1.6);

    // neck
    s += poly([[m ? 50 : 52, 0], [m ? 70 : 68, 0], [m ? 70 : 68, 10], [m ? 50 : 52, 10]]);

    // ---- definition ----
    var py = 50 + 10 * f;                        // lower chest line
    if (m) {
      s += ln([[60, 11], [60, py - 3]], fade(4, 7));
      s += lnB([[X(30) + 2, 30], [X(44) + 3, 44], [43, py + 2 + 2 * f], [60, py - 2 - f]], i >= 7 ? .8 : 1, 1.8);
    } else {
      var bra = [[X(40) + 1, 38], [X(48) + 2, py - 3], [50, py + 2], [60, py - 4], [70, py + 2], [120 - X(48) - 2, py - 3], [120 - X(40) - 1, 38], [69, 33], [60, 40], [51, 33]];
      s += poly(bra, SOFT);
      s += lnB([[51, 33], [53, 10]], 1, 1.8);
    }
    var t = py + 2;
    s += ln([[60, t], [60, 106]], fade(m ? 3 : 2, m ? 6 : 4.5));
    var rows = m ? [[t + 11, 3.5], [t + 22, 2.5], [t + 33, 1.5]] : [[t + 13, 1.5], [t + 25, .8]];
    rows.forEach(function (r) { if (r[0] < 104) s += lnB([[47, r[0] + 1.5], [60, r[0]]], fade(r[1], r[1] + 1.5)); });
    s += lnB([[46, t], [45, 92], [50, 106]], fade(m ? 2 : 1.5, m ? 4.5 : 3.5));
    s += lnB([[X(60) + 2, 60], [X(96) + 5, 96], [X(108) + 10, 108]], fade(m ? 3 : 2, m ? 5.5 : 4.5));
    if (m) s += lnB([[X(48) + 1, 50], [X(48) + 6, 53], [X(54) + 2, 55], [X(54) + 7, 58], [X(60) + 3, 60]], fade(1, 3), 1.4);
    // biceps line
    s += lnB([[(inner[1][0] + outer[1][0]) / 2, 58], [(inner[2][0] + outer[2][0]) / 2 - .5, 82]], fade(m ? 3 : 1.5, m ? 5 : 3.5));

    // ---- fat features ----
    if (i >= 5) s += ln([[X(96) + 3, 96 + 2 * f], [60 - bw / 2, 103 + 3 * f], [60, 104 + 3 * f], [60 + bw / 2, 103 + 3 * f], [120 - X(96) - 3, 96 + 2 * f]], Math.min(1, (i - 4) / 3), 1.8);
    if (i >= 6) s += lnB([[X(84), 84], [X(84) + 7, 87]], Math.min(1, (i - 5) / 2), 1.6);
    if (m && i >= 6) s += lnB([[54, py - 3], [44, py + 3]], .55);
    var ny = 90 + 4 * f;
    s += '<polygon points="' + P([[60, ny - 2 - f], [61.6, ny], [60, ny + 2 + f], [58.4, ny]]) + '" fill="' + INK + '"/>';

    return '<svg viewBox="2 0 116 118" aria-hidden="true">' + s + "</svg>";
  }

  function bodyFat() {
    var bf = document.getElementById("bf"), bfOut = document.getElementById("bf-out");
    function renderGuide(s) {
      var wrap = document.getElementById("bf-cards");
      wrap.innerHTML = BF_LEVELS[s].map(function (g, i) {
        return '<button type="button" class="bf-card" data-val="' + g[0] + '" aria-label="' + g[1] + ' body fat">' +
          torsoSVG(s, i) + '<span class="r">' + g[1] + "</span></button>";
      }).join("");
      $$(".bf-card", wrap).forEach(function (c) {
        c.addEventListener("click", function () { bf.value = c.dataset.val; bfOut.textContent = bf.value; markGuide(); });
      });
      markGuide();
    }
    function markGuide() {
      var v = parseFloat(bf.value), cards = $$(".bf-card"), best = null, d = 1e9;
      cards.forEach(function (c) { var dd = Math.abs(c.dataset.val - v); if (dd < d) { d = dd; best = c; } });
      cards.forEach(function (c) { c.setAttribute("aria-pressed", c === best ? "true" : "false"); });
    }
    bf.addEventListener("input", function () { bfOut.textContent = bf.value; markGuide(); });
    return { render: renderGuide, value: function () { return parseFloat(bf.value); } };
  }

  return {
    bodyFat: bodyFat, LB_PER_KG: LB_PER_KG, $: $, $$: $$, num: num, fmt: fmt, seg: seg,
    unitSystem: unitSystem, weightKg: weightKg, heightCm: heightCm, show: show, error: error, store: store
  };
})();
