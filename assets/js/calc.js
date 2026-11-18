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

  // Geometric line-art figure (head to upper thigh). i = level 0 (leanest) … 8 (highest body fat).
  function torsoSVG(sex, i) {
    var f = i / 8, INK = "#242424", FILL = "#ffffff", SOFT = "#ececf1";
    var fade = function (from, to) { return i <= from ? 1 : i >= to ? 0 : 1 - (i - from) / (to - from); };
    var P = function (pts) { return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); };
    var mirror = function (pts) { return pts.map(function (p) { return [120 - p[0], p[1]]; }); };
    var shape = function (pts, fill) { return '<polygon points="' + P(pts) + '" fill="' + (fill || FILL) + '" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>'; };
    var both = function (pts, fill) { return shape(pts, fill) + shape(mirror(pts), fill); };
    var ln = function (pts, op, w) { return op <= 0 ? "" : '<polyline points="' + P(pts) + '" fill="none" stroke="' + INK + '" stroke-width="' + (w || 1.3) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + op.toFixed(2) + '"/>'; };
    var lnBoth = function (pts, op, w) { return ln(pts, op, w) + ln(mirror(pts), op, w); };
    var m = sex === "m", s = "";

    // proportions (half-widths from the centre line x = 60)
    var sh = m ? 30 : 26;                       // shoulder
    var ch = (m ? 24 : 21) + 3 * f;             // chest at the armpit
    var bw = (m ? 17 : 14) + (m ? 17 : 14) * f; // belly
    var ww = (m ? 16 : 12) + (m ? 14 : 12) * f; // waist
    var hw = (m ? 19 : 23) + (m ? 9 : 10) * f;  // hips
    var arm = (m ? 9 : 7) + 3 * f;              // arm thickness
    var head = m ? 1 : 0.9;

    // legs (upper thigh, cropped)
    var thigh = [[60 - hw, 110], [60 - hw - 1 + 2 * f, 148], [61 - 3, 148], [59, 124]];
    s += both(thigh);

    // torso
    var torso = [[60 - 5, 30], [60 - sh + 6, 36], [60 - ch - 2, 46], [60 - ch, 60], [60 - bw, 80], [60 - ww, 96], [60 - hw, 110]];
    s += shape(torso.concat(mirror(torso).reverse()));

    // briefs / bottoms
    var briefs = [[60 - hw + 1, 108], [60 + hw - 1, 108], [60 + 4, 126], [60 - 4, 126]];
    s += shape(briefs, SOFT);

    // arms: deltoid, upper arm, forearm, hand
    var ax = 60 - sh - 6 * f;                   // shoulder edge (arms move out as the torso widens)
    var delt = [[60 - sh + 6, 35], [ax - 3, 38], [ax - 6 - f, 47], [ax - 5 - f, 58], [ax + 3, 61], [60 - ch, 58], [60 - ch - 2, 46]];
    var upper = [[ax - 5 - f, 56], [ax - 6 - f, 79], [ax - 6 - f + arm, 81], [ax - 5 - f + arm + 1, 60]];
    var fore = [[ax - 6 - f, 79], [ax - 7 - f, 101], [ax - 7 - f + arm - 2, 102], [ax - 6 - f + arm, 81]];
    var hand = [[ax - 8 - f, 101], [ax - 8 - f + arm - 1, 101], [ax - 7 - f + arm - 1, 111], [ax - 4 - f + arm / 2, 114], [ax - 8 - f, 110]];
    s += both(upper) + both(fore) + both(delt) + both(hand);

    // neck + head (octagon)
    s += shape([[55, 20], [65, 20], [65, 32], [55, 32]]);
    var hx = 9 * head, hy = 11 * head, cy = 13;
    s += shape([[60 - hx * .55, cy - hy], [60 + hx * .55, cy - hy], [60 + hx, cy - hy * .45], [60 + hx, cy + hy * .3], [60 + hx * .5, cy + hy], [60 - hx * .5, cy + hy], [60 - hx, cy + hy * .3], [60 - hx, cy - hy * .45]]);

    // ---- muscle definition (fades as body fat rises) ----
    // collarbone / trap lines
    // chest: sternum + lower pec line (drops and rounds as fat rises)
    var py = 56 + 9 * f;
    if (m) {
      s += ln([[60, 36], [60, py]], fade(4, 7));
      s += lnBoth([[60 - ch + 2, 50 + 2 * f], [60 - 13, py + 1], [60, py - 3 - f]], i >= 7 ? .8 : 1, 1.5);
    } else {
      // sports bra
      var bra = [[60 - ch + 1, 44], [60 - ch + 3, py - 4], [60 - 9, py + 1], [60, py - 4], [60 + 9, py + 1], [60 + ch - 3, py - 4], [60 + ch - 1, 44], [60 + 8, 40], [60, 46], [60 - 8, 40]];
      s += shape(bra, SOFT);
    }
    // abs: linea alba, rows, outer edges
    var top = py + 2;
    s += ln([[60, top], [60, 104]], fade(m ? 3 : 2, m ? 6 : 4.5));
    var rows = m ? [[top + 10, 3.5], [top + 20, 2.5], [top + 30, 1.5]] : [[top + 12, 1.5], [top + 23, .8]];
    rows.forEach(function (r) { s += lnBoth([[60 - 11, r[0] + 1], [60, r[0]]], fade(r[1], r[1] + 1.5)); });
    s += lnBoth([[60 - 12, top], [60 - 13, 92], [60 - 9, 106]], fade(m ? 2 : 1.5, m ? 4.5 : 3.5));
    // obliques (diagonal from the ribs to the hip) + V
    s += lnBoth([[60 - ch + 1, 64], [60 - ww + 3, 96], [60 - 10, 108]], fade(m ? 3 : 2, m ? 5.5 : 4.5));
    // arm lines: biceps split + deltoid
    s += lnBoth([[ax - 5 - f + arm / 2, 63], [ax - 5 - f + arm / 2, 77]], fade(m ? 3 : 1.5, m ? 5 : 3.5));
    // thigh line
    s += lnBoth([[60 - hw + 4, 114], [60 - hw + 8, 148]], fade(3, 6));

    // ---- fat features ----
    if (i >= 5) s += ln([[60 - bw + 3, 90 + 2 * f], [60 - bw / 2, 98 + 3 * f], [60, 99 + 3 * f], [60 + bw / 2, 98 + 3 * f], [60 + bw - 3, 90 + 2 * f]], Math.min(1, (i - 4) / 3), 1.5);
    if (i >= 6) s += lnBoth([[60 - bw, 80], [60 - bw + 6, 83]], Math.min(1, (i - 5) / 2), 1.4);
    if (m && i >= 6) s += lnBoth([[60 - 6, py - 2], [60 - 14, py + 2]], .6);
    // navel
    var ny = 88 + 4 * f;
    s += '<polygon points="' + P([[60, ny - 1.8 - f], [61.3, ny], [60, ny + 1.8 + f], [58.7, ny]]) + '" fill="' + INK + '"/>';

    return '<svg viewBox="11 2 98 140" aria-hidden="true">' + s + "</svg>";
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
