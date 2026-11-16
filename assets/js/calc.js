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


  // Body fat slider (#bf, #bf-out) + visual guide (#bf-cards). Call render(sex) when sex changes.
  function bodyFat() {
    var bf = document.getElementById("bf"), bfOut = document.getElementById("bf-out");
    // Body fat visual guide
    var GUIDE = {
      m: [
        [8, "6–9%", "Shredded", "Veins across the abs and arms, visible muscle striations. Stage-lean, hard to hold."],
        [12, "10–14%", "Lean", "Clear six-pack outline, defined arms and shoulders, some vascularity."],
        [17, "15–19%", "Fit", "Abs faintly visible in good lighting, muscle shape still clear."],
        [22, "20–24%", "Average", "Soft midsection, no ab outline, a little fat around the waist and lower back."],
        [27, "25–29%", "Above average", "Rounder belly and love handles, little muscle definition."],
        [33, "30%+", "High", "Fat clearly stored around the belly, chest and waist; waist wider than hips."]
      ],
      f: [
        [16, "14–17%", "Athletic", "Visible abs and muscle separation in arms, legs and shoulders. Very lean."],
        [20, "18–22%", "Fit", "Flat stomach with some ab outline, toned arms and legs."],
        [25, "23–27%", "Lean-average", "Slight softness on the stomach, hips and thighs; some shape still visible."],
        [30, "28–32%", "Average", "Soft stomach, more fat on hips, thighs and arms, no ab definition."],
        [36, "33–38%", "Above average", "Rounder stomach and fuller hips, thighs and upper arms."],
        [42, "39%+", "High", "Fat clearly stored around the stomach, hips, thighs and arms."]
      ]
    };
    function renderGuide(s) {
      var wrap = document.getElementById("bf-cards");
      wrap.innerHTML = GUIDE[s].map(function (g) {
        var fill = Math.min(1, (g[0] - 5) / 40);
        return '<button type="button" class="bf-card" data-val="' + g[0] + '">' +
          '<svg viewBox="0 0 40 64" aria-hidden="true"><circle cx="20" cy="8" r="6"/><path d="M' + (12 - fill * 3) + ' 18 Q20 15 ' + (28 + fill * 3) +
          ' 18 L' + (27 + fill * 6) + ' 40 Q20 ' + (43 + fill * 3) + ' ' + (13 - fill * 6) + ' 40 Z"/><path d="M14 41 L13 62 M26 41 L27 62" stroke-width="5" stroke-linecap="round"/></svg>' +
          '<span class="r">' + g[1] + '</span><span class="n">' + g[2] + '</span><span class="d">' + g[3] + "</span></button>";
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
