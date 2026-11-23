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

  // Result numbers count up to their value instead of appearing: every number in the matched
  // elements eases from where it was (or from 0) to what the calculator just wrote, keeping its
  // format (commas, decimals, units and surrounding words). Runs whenever results are shown.
  var COUNT_SEL = ".v, .tl-v, .note, .gauge-pin, .gauge-tick, .legend strong, .stack > div, .tbl tbody td:not(:first-child)";
  var NUM_RE = /\d[\d,]*(?:\.\d+)?/g, countAnim = null;
  function countUp(root) {
    if (countAnim) countAnim.finish();
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var jobs = [];
    $$(COUNT_SEL, root).forEach(function (el) {
      if (el.closest(".goal")) return; // the TDEE goal picker animates itself
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node, i = 0;
      var prev = el.__counted || {};
      el.__counted = {};
      while ((node = walker.nextNode())) {
        var text = node.nodeValue, nums = text.match(NUM_RE);
        if (!nums) continue;
        var tpl = text.replace(NUM_RE, "#"), key = i++;
        var to = nums.map(function (n) {
          return { v: parseFloat(n.replace(/,/g, "")), dec: (n.split(".")[1] || "").length, comma: n.indexOf(",") > -1 };
        });
        var p = prev[key], from = p && p.tpl === tpl ? p.vals : to.map(function () { return 0; });
        el.__counted[key] = { tpl: tpl, vals: to.map(function (n) { return n.v; }) };
        jobs.push({ node: node, tpl: tpl, to: to, from: from, text: text });
      }
    });
    if (!jobs.length) return;
    // Recalculating with the same inputs: nothing would move, so count up from zero again.
    var same = jobs.every(function (j) { return j.from.every(function (v, n) { return v === j.to[n].v; }); });
    if (same) jobs.forEach(function (j) { j.from = j.to.map(function () { return 0; }); });
    function paint(k) {
      jobs.forEach(function (j) {
        var n = 0;
        j.node.nodeValue = k >= 1 ? j.text : j.tpl.replace(/#/g, function () {
          var t = j.to[n], v = j.from[n] + (t.v - j.from[n]) * k; n++;
          return t.comma ? v.toLocaleString("en-US", { minimumFractionDigits: t.dec, maximumFractionDigits: t.dec }) : v.toFixed(t.dec);
        });
      });
    }
    var t0 = null, raf, DUR = 900;
    function step(now) {
      if (t0 == null) t0 = now;
      var k = Math.min(1, (now - t0) / DUR);
      paint(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step); else countAnim = null;
    }
    paint(0);
    raf = requestAnimationFrame(step);
    countAnim = { finish: function () { cancelAnimationFrame(raf); paint(1); countAnim = null; } };
  }

  // "What's this?" buttons: <button class="info" aria-controls="id"> opens the .info-pop with that id.
  // One open at a time; clicking elsewhere or pressing Escape closes it.
  function closeInfo(except) {
    $$(".info[aria-expanded='true']").forEach(function (b) {
      if (b === except) return;
      b.setAttribute("aria-expanded", "false");
      document.getElementById(b.getAttribute("aria-controls")).hidden = true;
    });
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".info") : null;
    if (btn) {
      e.preventDefault();
      var open = btn.getAttribute("aria-expanded") !== "true";
      closeInfo(btn);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      document.getElementById(btn.getAttribute("aria-controls")).hidden = !open;
    } else closeInfo(); // a tap anywhere else, including on the explanation, closes it
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeInfo(); });

  function show(el) {
    el.hidden = false;
    countUp(el);
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
    f: [[12, "10–13%"], [16, "14–17%"], [20, "18–23%"], [26, "24–28%"], [31, "29–33%"], [35, "34–37%"], [40, "38–42%"], [46, "43–49%"], [52, "50%+"]]
  };

  function bodyFat() {
    var bf = document.getElementById("bf"), bfOut = document.getElementById("bf-out");
    function renderGuide(s) {
      var wrap = document.getElementById("bf-cards");
      wrap.innerHTML = BF_LEVELS[s].map(function (g) {
        // illustrations live in assets/img/bodyfat/<m|f>-<value>.webp
        var art = '<img src="/assets/img/bodyfat/' + s + "-" + g[0] + '.webp" alt="" width="360" height="360" loading="lazy">';
        return '<button type="button" class="bf-card photo round" data-val="' + g[0] + '" aria-label="' + g[1] + ' body fat">' +
          art + '<span class="r">' + g[1] + "</span></button>";
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
