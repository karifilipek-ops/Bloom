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

  // Original torso illustration. i = level 0 (leanest) … 8 (highest body fat).
  function torsoSVG(sex, i) {
    var f = i / 8, BODY = "#a3a3ab", LINE = "#5d5d66", DARK = "#7a7a83";
    var line = function (d, op, w) { return '<path d="' + d + '" fill="none" stroke="' + LINE + '" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + op + '"/>'; };
    var fade = function (from, to) { return i <= from ? 1 : i >= to ? 0 : 1 - (i - from) / (to - from); };
    var s = "";
    if (sex === "m") {
      var wW = 22 + 12 * f, b = 9 * f * f, arm = 3 * f;              // waist half-width, belly bulge, arm thickness
      s += '<path d="M51 0 L69 0 L70 8 Q86 9 98 16 Q108 22 105 40 L92 42 C' + (92 + b * .4) + ' 66 ' + (60 + wW + b) + ' 84 ' + (60 + wW) + ' 112 L' + (60 - wW) + ' 112 C' + (60 - wW - b) + ' 84 ' + (28 - b * .4) + ' 66 28 42 L15 40 Q12 22 22 16 Q34 9 50 8 Z" fill="' + BODY + '"/>';
      s += '<path d="M17 38 Q' + (11 - arm) + ' 66 ' + (8 - arm) + ' 104 L' + (21 + arm) + ' 106 Q' + (24 + arm) + ' 72 29 46 Z" fill="' + BODY + '" stroke="#1c1c21" stroke-width="2.2"/>';
      s += '<path d="M103 38 Q' + (109 + arm) + ' 66 ' + (112 + arm) + ' 104 L' + (99 - arm) + ' 106 Q' + (96 - arm) + ' 72 91 46 Z" fill="' + BODY + '" stroke="#1c1c21" stroke-width="2.2"/>';
      // torso
      // clavicles + deltoid separation
      s += line("M38 17 Q48 20 56 17 M64 17 Q72 20 82 17", fade(5, 8), 1.4);
      s += line("M20 24 Q24 34 28 42 M100 24 Q96 34 92 42", fade(3, 6), 1.4);
      // pecs: tight lines when lean, lower and rounder as fat rises
      var py = 48 + i * 1.6, pd = 4 + i * 1.2;
      s += line("M33 " + (py - 6) + " Q46 " + (py + pd) + " 59 " + (py - 1) + " M87 " + (py - 6) + " Q74 " + (py + pd) + " 61 " + (py - 1), i >= 7 ? .7 : 1);
      s += line("M60 22 L60 " + (py - 2), fade(4, 6), 1.4);
      // abs
      var rows = [[62, 0, 3], [72, 0, 3], [82, 0, 2], [92, 0, 1]];
      rows.forEach(function (r) {
        var op = fade(r[2], r[2] + 1.5);
        if (op > 0) s += line("M47 " + r[0] + " Q53 " + (r[0] + 2.5) + " 58 " + r[0] + " M73 " + r[0] + " Q67 " + (r[0] + 2.5) + " 62 " + r[0], op, 1.6);
      });
      s += line("M60 54 L60 98", fade(3, 6), 1.5);
      s += line("M46 56 Q42 78 48 100 M74 56 Q78 78 72 100", fade(2, 4), 1.5);
      // serratus / obliques
      s += line("M34 50 l6 3 l-5 2 l6 3 l-5 2 l6 3 M86 50 l-6 3 l5 2 l-6 3 l5 2 l-6 3", fade(1, 3), 1.3);
      // V lines + a vein
      s += line("M42 92 Q50 102 55 112 M78 92 Q70 102 65 112", fade(2, 4), 1.5);
      s += line("M53 100 Q51 106 52 112", fade(0, 2), 1);
      // biceps line
      s += line("M14 60 Q17 70 18 80 M106 60 Q103 70 102 80", fade(3, 5), 1.3);
      // belly fold + love handles
      if (i >= 5) s += line("M" + (60 - wW + 5) + " " + (106 - i) + " Q60 " + (114 - i * .2) + " " + (60 + wW - 5) + " " + (106 - i), Math.min(1, (i - 4) / 3));
      if (i >= 6) s += line("M" + (60 - wW - b + 3) + " 86 q5 3 9 1 M" + (60 + wW + b - 3) + " 86 q-5 3 -9 1", .8, 1.5);
      // navel
      s += '<ellipse cx="60" cy="' + (90 + i * .6) + '" rx="1.6" ry="' + (1.6 + f * 1.2) + '" fill="' + LINE + '"/>';
    } else {
      var wa = 17 + 13 * f, hp = 25 + 10 * f, bb = 7 * f * f, ar = 2.5 * f;
      s += '<path d="M53 0 L67 0 L68 8 Q82 9 93 16 Q102 22 99 40 L89 42 C' + (89 + bb * .3) + ' 60 ' + (60 + wa + bb) + ' 72 ' + (60 + wa + bb) + ' 84 Q' + (60 + hp) + ' 96 ' + (60 + hp) + ' 112 L' + (60 - hp) + ' 112 Q' + (60 - hp) + ' 96 ' + (60 - wa - bb) + ' 84 C' + (60 - wa - bb) + ' 72 ' + (31 - bb * .3) + ' 60 31 42 L21 40 Q18 22 27 16 Q38 9 52 8 Z" fill="' + BODY + '"/>';
      s += '<path d="M21 38 Q' + (15 - ar) + ' 66 ' + (12 - ar) + ' 104 L' + (24 + ar) + ' 106 Q' + (26 + ar) + ' 72 31 46 Z" fill="' + BODY + '" stroke="#1c1c21" stroke-width="2.2"/>';
      s += '<path d="M99 38 Q' + (105 + ar) + ' 66 ' + (108 + ar) + ' 104 L' + (96 - ar) + ' 106 Q' + (94 - ar) + ' 72 89 46 Z" fill="' + BODY + '" stroke="#1c1c21" stroke-width="2.2"/>';
      // sports bra
      var by = 58 + i * 1.3;
      s += '<path d="M31 40 Q44 ' + (by + 6) + ' 60 ' + (by - 2) + ' Q76 ' + (by + 6) + ' 89 40 L86 30 Q74 34 60 40 Q46 34 34 30 Z" fill="' + DARK + '"/>';
      s += '<path d="M36 30 L42 12 M84 30 L78 12" stroke="' + DARK + '" stroke-width="3" stroke-linecap="round"/>';
      s += line("M40 17 Q48 19 55 17 M65 17 Q72 19 80 17", fade(5, 8), 1.3);
      // abs + waist lines
      [[70, 1], [80, 0]].forEach(function (r) {
        var op = fade(r[1], r[1] + 1.5);
        if (op > 0) s += line("M49 " + r[0] + " Q54 " + (r[0] + 2) + " 58 " + r[0] + " M71 " + r[0] + " Q66 " + (r[0] + 2) + " 62 " + r[0], op, 1.5);
      });
      s += line("M60 " + (by + 2) + " L60 98", fade(3, 5), 1.4);
      s += line("M47 " + (by + 4) + " Q44 80 49 100 M73 " + (by + 4) + " Q76 80 71 100", fade(2, 4), 1.4);
      s += line("M43 94 Q50 102 54 112 M77 94 Q70 102 66 112", fade(2, 4), 1.4);
      s += line("M17 60 Q20 70 21 80 M103 60 Q100 70 99 80", fade(2, 4), 1.2);
      if (i >= 4) s += line("M" + (60 - wa + 3) + " " + (106 - i * .6) + " Q60 " + (113 - i * .2) + " " + (60 + wa - 3) + " " + (106 - i * .6), Math.min(1, (i - 3) / 3));
      if (i >= 6) s += line("M" + (60 - wa - bb + 3) + " 82 q5 3 9 1 M" + (60 + wa + bb - 3) + " 82 q-5 3 -9 1", .8, 1.4);
      s += '<ellipse cx="60" cy="' + (90 + i * .5) + '" rx="1.5" ry="' + (1.5 + f) + '" fill="' + LINE + '"/>';
    }
    return '<svg viewBox="0 0 120 112" aria-hidden="true">' + s + "</svg>";
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
