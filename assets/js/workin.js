// Can I Work In? — daily barbell puzzle. Rules + solver live in workin-engine.js,
// the puzzle list in workin-puzzles.js. Progress is saved in localStorage ("bloom.workin.v1").
(function () {
  "use strict";
  var E = window.WorkInEngine, DATA = window.WORKIN_PUZZLES, PLATES = E.PLATES;
  var TZ = "America/Los_Angeles";
  var KEY = "bloom.workin.v1";
  var URL_SHARE = "trainbloom.com/can-i-work-in";
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- daily puzzle (midnight Pacific) ----------
  function ptParts(d) {
    var o = {};
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(d || new Date()).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function ptDate(d) { var p = ptParts(d); return p.year + "-" + p.month + "-" + p.day; }
  function dayIndex(iso) { var a = iso.split("-"), b = DATA.start.split("-"); return Math.round((Date.UTC(+a[0], a[1] - 1, +a[2]) - Date.UTC(+b[0], b[1] - 1, +b[2])) / 864e5); }
  function todayNumber() { return Math.max(1, dayIndex(ptDate()) + 1); }
  function secondsToMidnightPT() { var p = ptParts(); return 86400 - (+p.hour * 3600 + +p.minute * 60 + +p.second); }
  function pad3(n) { return String(n).padStart(3, "0"); }

  // ---------- storage ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var store = load(); store.days = store.days || {};
  if (store.sound === undefined) store.sound = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  // ---------- state ----------
  var S = {};
  function setup(n, practice) {
    var raw = DATA.puzzles[(n - 1) % DATA.puzzles.length];
    S = {
      n: n, raw: raw, pz: E.normalize(raw, DATA), stack: [], ti: 0, moves: 0, log: [], done: false, practice: !!practice,
      slide: null, lift: null, cheer: 0, sparks: [], shake: 0
    };
    var sol = E.solve(S.pz);
    S.min = sol.min; S.solution = E.describe(S.pz, sol.path);
    var rec = store.days[n];
    if (!practice && rec && rec.log) {
      rec.log.forEach(function (m) { apply(m, true); });
      if (S.done) S.cheer = 1;
    }
    $("wi-no").textContent = "#" + pad3(n);
    var note = $("wi-note"); note.hidden = !raw.note; note.textContent = raw.note || "";
    buildRack(); renderAll(true);
  }

  // m is "r" (remove) or a plate weight (add)
  function apply(m, silent) {
    var move = m === "r" ? { type: "remove" } : { type: "add", plate: E.idxOf(m) };
    var before = S.stack.slice();
    var nx = E.step(S.pz, { stack: S.stack, ti: S.ti }, move);
    if (!nx) return false;
    S.stack = nx.stack; S.moves++; S.log.push(m); S.flash = performance.now();
    var who = nx.hit ? S.pz.who[S.ti] : null;
    S.ti = nx.ti;
    if (S.ti >= S.pz.targets.length) S.done = true;
    if (!silent) {
      var now = performance.now();
      S.slide = move.type === "add"
        ? { kind: "add", plate: move.plate, idx: S.stack.length - 1, t0: now, clanked: false }
        : { kind: "remove", plate: before[before.length - 1], idx: before.length - 1, t0: now };
      if (move.type === "remove") sfx.swish();
      S.lift = who ? { who: who, t0: null, done: S.done } : null;
      if (who && reduceMotion) { S.lift = null; sfx.ding(); if (S.done) { S.cheer = now; setTimeout(showResults, 350); } }
      if (!S.practice) {
        store.days[S.n] = { log: S.log.slice(), done: S.done, moves: S.moves, min: S.min };
        if (viewing) store.days[S.n].late = true; // archive plays don't count toward the streak
        save();
      }
      if (navigator.vibrate) try { navigator.vibrate(move.type === "add" ? 12 : 6); } catch (e) {}
    }
    return true;
  }

  function act(m) {
    if (S.done) return;
    finishAnims();
    var prevTi = S.ti;
    if (!apply(m, false)) return;
    renderAll(false, prevTi);
  }

  // Jump any running animation to its end so input always feels instant.
  function finishAnims() {
    if (S.slide && S.slide.kind === "add" && !S.slide.clanked) clank(S.slide);
    S.slide = null;
    if (S.lift) { S.lift = null; if (S.done) showResults(); }
  }

  // ---------- DOM ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var LIFTERS = {
    you:  { name: "You",  hair: "#2b1d16", skin: "#f2c29b", mouth: "#c98d6a", shirt: "#9d91be", shade: "#6f6496", shorts: "#242424", shoe: "#ffffff" },
    them: { name: "Them", hair: "#d6453d", skin: "#a8704a", mouth: "#7d4f31", shirt: "#ff8a3d", shade: "#c85f1c", shorts: "#3d3a8c", shoe: "#242424" }
  };

  function renderAll(initial, prevTi) {
    var pz = S.pz, tot = E.total(pz, S.stack);
    // targets
    var ol = $("wi-targets"); ol.innerHTML = "";
    pz.targets.forEach(function (t, i) {
      var li = el("li", "wi-t" + (i < S.ti ? " done" : i === S.ti && !S.done ? " active" : ""));
      if (!initial && prevTi != null && i === prevTi && S.ti > prevTi) li.className += " pop";
      var L = LIFTERS[pz.who[i]];
      li.innerHTML = '<span class="w">' + t + '</span><span class="who"><i style="background:' + L.shirt + '"></i>' + L.name + "</span>";
      li.setAttribute("aria-label", L.name + ": " + t + " lb" + (i < S.ti ? ", done" : i === S.ti ? ", up now" : ""));
      ol.appendChild(li);
    });
    // hud
    var tb = $("wi-total");
    if (tb.textContent !== String(tot)) { tb.textContent = tot; if (!initial) { tb.classList.remove("bump"); void tb.offsetWidth; tb.classList.add("bump"); } }
    $("wi-moves").textContent = S.moves;
    var need = $("wi-need");
    if (S.done) need.innerHTML = S.practice ? "Practice run done." : "Everyone&rsquo;s lifted.";
    else {
      var d = pz.targets[S.ti] - tot, side = Math.abs(d) / 2;
      need.innerHTML = (d > 0 ? "Need <b>+" + d + "</b>" : "Need <b>&minus;" + (-d) + "</b>") + " lb<br>" + fmt(side) + " a side " + (d > 0 ? "on" : "off");
    }
    // stack readout
    var side = $("wi-side"); side.innerHTML = "";
    if (!S.stack.length) side.innerHTML = '<span class="lbl">Empty bar &middot; 45 lb</span>';
    else {
      side.appendChild(el("span", "lbl", "Inner"));
      S.stack.forEach(function (pi, k) {
        if (k) side.appendChild(el("span", "arr", "&#9656;"));
        var p = PLATES[pi], c = el("span", "chip" + (k === S.stack.length - 1 ? " outer" : ""), fmt(p.w));
        c.style.background = p.face; c.style.color = p.ink; side.appendChild(c);
      });
      side.appendChild(el("span", "lbl", "Outer"));
    }
    var pull = $("wi-pull");
    pull.disabled = !S.stack.length || S.done;
    pull.textContent = S.stack.length ? "Pull " + fmt(PLATES[S.stack[S.stack.length - 1]].w) + "s" : "Pull";
    updateRack();
    $("wi-scene").setAttribute("aria-label", "Barbell at " + tot + " lb" + (S.stack.length ? ", plates inner to outer: " + S.stack.map(function (i) { return fmt(PLATES[i].w); }).join(", ") : ", empty"));
  }
  function fmt(w) { return String(w); }

  // rack
  var rackBtns = [];
  function buildRack() {
    var rack = $("wi-rack"); rack.innerHTML = ""; rackBtns = [];
    PLATES.forEach(function (p, i) {
      var b = el("button", "wi-plate"); b.type = "button";
      b.innerHTML = '<span class="disc"><canvas width="24" height="24"></canvas><span class="lb">' + fmt(p.w) + '</span></span><span class="pips"></span><span class="why"></span>';
      drawDisc(b.querySelector("canvas"), p);
      b.addEventListener("click", function () { act(p.w); });
      rack.appendChild(b); rackBtns.push(b);
    });
  }
  function updateRack() {
    PLATES.forEach(function (p, i) {
      var b = rackBtns[i], have = S.pz.counts[i], left = have - E.used(S.stack, i);
      var why = E.blockAdd(S.pz, S.stack, i);
      b.disabled = !!why || S.done;
      b.classList.toggle("gone", have === 0);
      var pips = ""; for (var k = 0; k < have; k++) pips += '<i class="' + (k < left ? "" : "out") + '"></i>';
      b.querySelector(".pips").innerHTML = pips;
      b.querySelector(".why").textContent = have === 0 ? "none" : why === "full" ? "no room" : left === 0 ? "on bar" : "";
      b.setAttribute("aria-label", "Add a pair of " + p.w + "s" + (have === 0 ? " (none in the gym today)" : ", " + left + " of " + have + " pairs left") + (why === "full" ? ", sleeve full" : ""));
    });
  }
  // front-view pixel plate for the rack buttons
  function drawDisc(cv, p) {
    var c = cv.getContext("2d"), r = 5 + Math.round((p.h - 20) / 40 * 6.5), cx = 12, cy = 12;
    for (var y = 0; y < 24; y++) for (var x = 0; x < 24; x++) {
      var dx = x + .5 - cx, dy = y + .5 - cy, d = Math.sqrt(dx * dx + dy * dy), col = null;
      if (d <= r) col = "#111114";
      if (d <= r - 1) col = p.face;
      if (d <= r - 1 && d > r - 2 && dx + dy < -1) col = p.hi;
      if (d <= r * .62 && d > r * .62 - 1) col = p.edge;
      if (d <= 2.2) col = "#c9c9d4";
      if (d <= 1.2) col = "#111114";
      if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
    }
  }

  // ---------- scene (canvas, 200 x 150 game units) ----------
  var W = 200, H = 140, BAR_Y = 50, STOP_L = 64, STOP_R = 136, FLOOR = 96;
  var cv = $("wi-scene"), ctx = cv.getContext("2d"), s = 1;
  var spot = { you: { x: 24, y: 138 }, them: { x: 176, y: 138 }, bar: { x: 100, y: 92 } };

  function resize() {
    var w = cv.parentNode.clientWidth, dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * H / W);
    cv.style.height = (w * H / W) + "px";
    s = cv.width / W;
  }
  function R(x, y, w, h, col) { // crisp rect in game units
    var x0 = Math.round(x * s), y0 = Math.round(y * s);
    ctx.fillStyle = col; ctx.fillRect(x0, y0, Math.round((x + w) * s) - x0, Math.round((y + h) * s) - y0);
  }
  function text(str, x, y, size, col, align) {
    ctx.font = (size * s) + 'px "Jersey 10", monospace'; ctx.fillStyle = col; ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
    ctx.fillText(str, Math.round(x * s), Math.round(y * s));
  }

  // lifter sprites: 14 x 28 pixels, 2 game units per pixel
  var HEAD = ["...kkkkkkkk...", "..khhhhhhhhk..", "..khhhhhhhhk..", "..kssssssssk..", "..kssksskssk..", "..ksssmmsssk..", "...kssssssk...", "....kssssk...."];
  var LEGS = ["...ppp..ppp...", "...ksk..ksk...", "...ksk..ksk...", "...ksk..ksk...", "...ksk..ksk...", "...ksk..ksk...", "...ksk..ksk..."];
  var FEET = ["...kwk..kwk...", "..kwwk..kwwk..", "..kkkk..kkkk.."];
  var FRAMES = {
    stand: HEAD.concat([".kttttttttttk.", "kttttttttttttk", "kttttttttttttk", "kskttttttttksk", "kskttttttttksk", "kskttttttttksk", "kskTTTTTTTTksk", "kskppppppppksk", ".k.pppppppp.k.", "...pppppppp..."], LEGS, FEET),
    walkA: null, walkB: null,
    hold: HEAD.slice(0, 7).concat(["ss..kssssk..ss", "ss.kttttttk.ss", "stttttttttttts", "kttttttttttttk", ".kttttttttttk.", "..kttttttttk..", "..kttttttttk..", "..kTTTTTTTTk..", "..kppppppppk..", "...pppppppp..."], LEGS, FEET),
    squat: HEAD.slice(0, 7).concat(["ss..kssssk..ss", "ss.kttttttk.ss", "stttttttttttts", "kttttttttttttk", ".kttttttttttk.", "..kttttttttk..", "..kttttttttk..", "..kTTTTTTTTk..", "..kppppppppk..", "..pppppppppp..", ".kssk....kssk.", ".kssk....kssk.", "..ksk....ksk..", "..kwk....kwk..", ".kwwk....kwwk.", ".kkkk....kkkk."])
  };
  FRAMES.walkA = FRAMES.stand.slice(0, 25).concat(["..kwwk..kwk...", "..kkkk..kwwk..", "........kkkk.."]);
  FRAMES.walkB = FRAMES.stand.slice(0, 25).concat(["...kwk..kwwk..", "..kwwk..kkkk..", "..kkkk........"]);
  var spriteCache = {};
  function sprite(who, frame) {
    var k = who + frame; if (spriteCache[k]) return spriteCache[k];
    var rows = FRAMES[frame], L = LIFTERS[who], pal = { k: "#111114", h: L.hair, s: L.skin, m: L.mouth, t: L.shirt, T: L.shade, p: L.shorts, w: L.shoe };
    var c = document.createElement("canvas"); c.width = 14; c.height = rows.length;
    var g = c.getContext("2d");
    rows.forEach(function (row, y) { for (var x = 0; x < 14; x++) { var ch = row[x]; if (ch && ch !== "." && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } } });
    return (spriteCache[k] = c);
  }
  function drawLifter(who, frame, fx, fy) { // fx = centre x, fy = feet y (game units)
    var img = sprite(who, frame), w = 28, h = img.height * 2;
    ctx.imageSmoothingEnabled = false;
    var x0 = Math.round((fx - w / 2) * s), y0 = Math.round((fy - h) * s);
    ctx.drawImage(img, x0, y0, Math.round((fx + w / 2) * s) - x0, Math.round(fy * s) - y0);
  }

  function drawRoom() {
    R(0, 0, W, FLOOR, "#1c1a33");
    for (var y = 6; y < FLOOR; y += 10) { R(0, y, W, 1, "#232042"); for (var x = (y / 10 % 2) * 10; x < W; x += 20) R(x, y - 9, 1, 9, "#232042"); }
    // neon sign
    text("BLOOM", 100, 8, 11, "#c9c3e6"); text("BLOOM", 100, 7.5, 11, "#9d91be");
    // floor
    R(0, FLOOR, W, H - FLOOR, "#2a2742");
    for (var fx2 = 0; fx2 < W; fx2 += 25) R(fx2, FLOOR, 1, H - FLOOR, "#25223b");
    R(0, FLOOR + 20, W, 1, "#25223b");
    R(0, FLOOR, W, 1, "#111114");
    // platform
    R(52, FLOOR - 6, 96, 8, "#111114"); R(53, FLOOR - 5, 94, 6, "#a7774c"); R(53, FLOOR - 5, 94, 1, "#c99a6b"); R(76, FLOOR - 5, 48, 6, "#c99a6b");
    // rack uprights + hooks
    [72, 124].forEach(function (x) {
      R(x - 1, 14, 6, FLOOR - 19, "#111114"); R(x, 15, 4, FLOOR - 21, "#5b5f72"); R(x, 15, 1, FLOOR - 21, "#7f849a");
      for (var hy = 22; hy < 84; hy += 6) R(x + 1, hy, 2, 2, "#2f3140");
      R(x - 6, FLOOR - 8, 16, 3, "#111114");
      var hx = x === 72 ? x - 3 : x + 4; R(hx, BAR_Y + 2, 3, 3, "#111114");
    });
  }

  // wall-mounted LED boards: weight on the bar (left) and moves (right)
  function drawBoards(now) {
    var flash = S.flash && now - S.flash < 260 && Math.floor((now - S.flash) / 65) % 2 === 0;
    [[3, "ON BAR", String(E.total(S.pz, S.stack)), "LB", flash], [143, S.practice ? "PRACTICE MOVES" : "MOVES", String(S.moves), "", false]].forEach(function (b) {
      var x = b[0];
      R(x, 1, 54, 19, "#111114"); R(x + 1, 2, 52, 17, "#0b0a14");
      for (var gx = x + 2; gx < x + 53; gx += 2) for (var gy = 3; gy < 19; gy += 2) R(gx, gy, 1, 1, "#16142a");
      text(b[1], x + 27, 5.5, 6, "#6f6496");
      var col = b[4] ? "#ffffff" : "#ff5a4f";
      text(b[2] + (b[3] ? " " + b[3] : ""), x + 27.4, 13.4, 12, "#5a1612");
      text(b[2] + (b[3] ? " " + b[3] : ""), x + 27, 13, 12, col);
    });
    var msg, sub;
    if (S.done) { msg = S.practice ? "PRACTICE DONE" : "EVERYONE LIFTED"; sub = "TAP FOR RESULTS"; }
    else {
      var d = S.pz.targets[S.ti] - E.total(S.pz, S.stack);
      msg = "NEED " + (d > 0 ? "+" : "\u2212") + Math.abs(d) + " LB";
      sub = fmt(Math.abs(d) / 2) + " A SIDE " + (d > 0 ? "ON" : "OFF");
    }
    text(msg, 100, 113, 10, "#9d91be");
    text(sub, 100, 123, 7, "#6f6496");
  }

  function plateGeom(stack) { // x positions of each pair (left side) by stacking order
    var out = [], cum = 0;
    stack.forEach(function (pi) { var t = PLATES[pi].t; out.push({ pi: pi, l: STOP_L - cum - t, r: STOP_R + cum }); cum += t; });
    return out;
  }
  function drawPlate(p, x, dy, alpha, glow) {
    var top = BAR_Y - p.h / 2 + dy, t = p.t, h = p.h;
    ctx.globalAlpha = alpha;
    R(x, top + 1, t, h - 2, "#111114"); R(x + 1, top, t - 2, h, "#111114");
    R(x + 1, top + 1, t - 2, h - 2, p.face);
    R(x + 1, top + 1, t - 2, 2, p.edge); R(x + 1, top + h - 3, t - 2, 2, p.edge);
    R(x + 2, top + 4, 1, h - 8, p.hi);
    R(x + t - 2, top + 3, 1, h - 6, p.edge);
    var size = p.w === 2.5 ? 8 : 11;
    ctx.font = (size * s) + 'px "Jersey 10", monospace';
    var label = fmt(p.w), maxw = (t - 3) * s;
    while (ctx.measureText(label).width > maxw && size > 5) { size -= .5; ctx.font = (size * s) + 'px "Jersey 10", monospace'; }
    text(label, x + t / 2 + .3, BAR_Y + dy + .8, size, "#111114");
    text(label, x + t / 2, BAR_Y + dy + .3, size, p.ink);
    if (glow) { ctx.globalAlpha = alpha * glow; R(x - 1, top - 2, t + 2, 1, "#ffffff"); R(x - 1, top + h + 1, t + 2, 1, "#ffffff"); R(x - 2, top - 1, 1, h + 2, "#ffffff"); R(x + t + 1, top - 1, 1, h + 2, "#ffffff"); }
    ctx.globalAlpha = 1;
  }
  function drawBar(dy, now) {
    var y = BAR_Y + dy;
    R(2, y - 3, 62, 6, "#111114"); R(136, y - 3, 62, 6, "#111114"); // sleeves
    R(3, y - 2, 61, 4, "#c9c9d4"); R(136, y - 2, 61, 4, "#c9c9d4"); R(3, y - 2, 61, 1, "#ffffff"); R(136, y - 2, 61, 1, "#ffffff");
    R(68, y - 2, 64, 4, "#111114"); R(68, y - 1, 64, 2, "#a0a0ae"); // shaft
    for (var kx = 78; kx < 122; kx += 3) R(kx, y - 1, 1, 1, "#7a7a88");
    R(STOP_L, y - 6, 4, 12, "#111114"); R(STOP_L + 1, y - 5, 2, 10, "#e1e1ea"); // sleeve stops
    R(STOP_R - 4, y - 6, 4, 12, "#111114"); R(STOP_R - 3, y - 5, 2, 10, "#e1e1ea");

    var geo = plateGeom(S.stack), sl = S.slide, glowOuter = 0;
    if (!S.done && !sl && geo.length && !S.lift) glowOuter = .35 + .35 * Math.sin(now / 260);
    geo.forEach(function (g, k) {
      var p = PLATES[g.pi], off = 0;
      if (sl && sl.kind === "add" && k === sl.idx) {
        var e = Math.min(1, (now - sl.t0) / 190); off = (1 - easeOut(e)) * (g.l + p.t + 6);
      }
      var gl = k === geo.length - 1 ? glowOuter : 0;
      drawPlate(p, g.l - off, dy, 1, gl); drawPlate(p, g.r + off, dy, 1, gl);
    });
    if (sl && sl.kind === "remove") { // ghost pair sliding off
      var gg = plateGeom(S.stack.concat([sl.plate]))[sl.idx], pp = PLATES[sl.plate], e2 = Math.min(1, (now - sl.t0) / 170);
      var o2 = easeIn(e2) * (gg.l + pp.t + 6);
      drawPlate(pp, gg.l - o2, dy + e2 * 6, 1 - e2 * .6); drawPlate(pp, gg.r + o2, dy + e2 * 6, 1 - e2 * .6);
    }
  }
  function easeOut(t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function easeIn(t) { return t * t; }

  function clank(sl) {
    sl.clanked = true;
    var p = PLATES[sl.plate];
    sfx.clank(p.w);
    S.shake = performance.now();
    var g = plateGeom(S.stack)[sl.idx]; if (!g) return;
    for (var i = 0; i < 6; i++) {
      var side = i % 2 ? 1 : -1, x = side < 0 ? g.l + p.t : g.r;
      S.sparks.push({ x: x, y: BAR_Y + (Math.random() - .5) * p.h * .8, vx: side * (8 + Math.random() * 18) * (i < 2 ? -1 : 1), vy: -10 - Math.random() * 20, t0: performance.now() });
    }
  }

  // timeline of a set: walk in, unrack, one rep, rerack, walk back
  var T_IN = 420, T_UNRACK = 520, T_DOWN = 600, T_UP = 820, T_RERACK = 900, T_OUT = 1300;
  function frame(now) {
    if (!cv.width) resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawRoom();
    drawBoards(now);
    var sl = S.slide;
    if (sl && sl.kind === "add" && !sl.clanked && now - sl.t0 >= 160) clank(sl);
    if (sl && now - sl.t0 > 220) { S.slide = sl = null; }
    if (S.lift && !S.lift.t0 && !sl) { S.lift.t0 = now; sfx.ding(); }

    var barDY = 0, L = S.lift, liftT = L && L.t0 ? now - L.t0 : -1, who = L && L.who;
    // waiting lifters (foreground) and the one at the bar (behind it)
    var atBar = null;
    if (L && liftT >= 0) {
      var from = spot[who], to = spot.bar, k, fr;
      if (liftT < T_IN) { k = liftT / T_IN; fr = Math.floor(liftT / 105) % 2 ? "walkA" : "walkB"; atBar = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), f: fr }; }
      else if (liftT < T_RERACK) {
        var down = liftT >= T_DOWN && liftT < T_UP;
        if (liftT >= T_UNRACK && liftT < T_RERACK) barDY = down ? 8 : -1;
        if (down && !L.grunt) { L.grunt = true; sfx.thud(.12); }
        atBar = { x: to.x, y: to.y, f: down ? "squat" : "hold" };
      } else if (liftT < T_OUT) {
        if (!L.racked) { L.racked = true; sfx.thud(.22); }
        k = (liftT - T_RERACK) / (T_OUT - T_RERACK); fr = Math.floor(liftT / 105) % 2 ? "walkA" : "walkB";
        atBar = { x: lerp(to.x, from.x, k), y: lerp(to.y, from.y, k), f: fr };
      } else { var wasDone = L.done; S.lift = L = null; atBar = null; if (wasDone) { S.cheer = now; sfx.fanfare(); setTimeout(showResults, 350); } }
    }
    if (atBar) drawLifter(who, atBar.f, atBar.x, atBar.y);
    var shake = S.shake && now - S.shake < 90 ? (Math.floor((now - S.shake) / 30) % 2 ? 1 : -1) * .7 : 0;
    drawBar(barDY + shake, now);

    // sparks
    S.sparks = S.sparks.filter(function (p) {
      var t = (now - p.t0) / 1000; if (t > .3) return false;
      R(p.x + p.vx * t, p.y + p.vy * t + 60 * t * t, 1, 1, t < .15 ? "#ffffff" : "#e7b416"); return true;
    });

    ["you", "them"].forEach(function (w) {
      if (atBar && w === who) return;
      var sp = spot[w], f = "stand", bob = 0;
      var up = !S.done && S.pz.who[S.ti] === w && !L;
      if (up) { bob = Math.floor(now / 300) % 2 ? -2 : 0; }
      if (S.done && S.cheer && !L) { f = "hold"; bob = Math.floor(now / 220) % 2 ? -4 : 0; }
      drawLifter(w, f, sp.x, sp.y + bob);
      if (up) { // "my turn" marker
        var my = sp.y - 66 + bob;
        for (var r = 0; r < 4; r++) R(sp.x - 3.5 + r, my + r * 1.5, 7 - 2 * r, 1.5, "#111114");
        for (var r2 = 0; r2 < 3; r2++) R(sp.x - 2.5 + r2, my + .75 + r2 * 1.5, 5 - 2 * r2, 1.5, "#e7b416");
      }
    });
    requestAnimationFrame(frame);
  }
  function lerp(a, b, k) { return a + (b - a) * k; }

  cv.addEventListener("pointerdown", function (e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if ((x < STOP_L + 2 || x > STOP_R - 2) && y > 12 && y < 92 && S.stack.length) { e.preventDefault(); act("r"); }
  });
  $("wi-pull").addEventListener("click", function () { act("r"); });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Backspace" || e.key === "Delete") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); act("r"); }
    if (e.key === "Escape") hideResults();
  });

  // ---------- sound (synthesised; nothing to download) ----------
  var sfx = (function () {
    var A = null, noise = null;
    function ac() {
      if (!store.sound) return null;
      if (!A) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; A = new C(); }
      if (A.state === "suspended") A.resume();
      if (!noise) { noise = A.createBuffer(1, A.sampleRate * .3, A.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      return A;
    }
    function env(g, t, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    function tone(type, f, t, peak, dur, f2) {
      var o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      env(g, t, peak, dur); o.connect(g).connect(A.destination); o.start(t); o.stop(t + dur + .02);
    }
    function burst(t, freq, q, peak, dur) {
      var src = A.createBufferSource(), f = A.createBiquadFilter(), g = A.createGain();
      src.buffer = noise; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; env(g, t, peak, dur);
      src.connect(f).connect(g).connect(A.destination); src.start(t); src.stop(t + dur + .02);
    }
    return {
      clank: function (w) { // heavier plate, lower ring
        if (!ac()) return; var t = A.currentTime + .005, base = 210 + (45 - w) * 9;
        burst(t, 2600, 1.2, .5, .07);
        [1, 2.76, 5.4, 8.9].forEach(function (r, i) { tone(i ? "sine" : "triangle", base * r, t, .16 / (i + 1), .32 - i * .06); });
        tone("sine", 90 + (45 - w) * 2, t, .25, .08, 50);
      },
      swish: function () { if (!ac()) return; var t = A.currentTime + .005; burst(t, 1400, .7, .12, .12); tone("triangle", 520, t + .09, .05, .08, 300); },
      ding: function () { if (!ac()) return; var t = A.currentTime + .005; [659, 880, 1319].forEach(function (f, i) { tone("square", f, t + i * .06, .045, .09); }); },
      thud: function (v) { if (!ac()) return; var t = A.currentTime + .005; tone("sine", 120, t, v, .14, 55); burst(t, 400, 1, v * .6, .06); },
      fanfare: function () { if (!ac()) return; var t = A.currentTime + .01; [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone("square", f, t + i * .085, .05, i === 5 ? .3 : .1); }); }
    };
  })();
  function syncSound() {
    var b = $("wi-sound"); b.setAttribute("aria-pressed", store.sound ? "true" : "false"); b.setAttribute("aria-label", store.sound ? "Sound on" : "Sound off");
  }
  $("wi-sound").addEventListener("click", function () { store.sound = !store.sound; save(); syncSound(); if (store.sound) sfx.ding(); });

  // ---------- help ----------
  function setHelp(open) { $("wi-help").hidden = !open; $("wi-help-btn").setAttribute("aria-expanded", open ? "true" : "false"); }
  $("wi-help-btn").addEventListener("click", function () { setHelp($("wi-help").hidden); });

  // ---------- results + share ----------
  function verdict(moves, min) { return moves === min ? "Perfect" : "+" + (moves - min); }
  function shareText() {
    var rec = store.days[S.n] || { moves: S.moves, min: S.min };
    var v = verdict(rec.moves, rec.min);
    return "Can I Work In? #" + pad3(S.n) + " · " + rec.moves + " moves · " + (v === "Perfect" ? "Perfect" : v + " (min " + rec.min + ")") + "\n" + URL_SHARE;
  }
  function stats() {
    var nums = Object.keys(store.days).map(Number).filter(function (n) { return store.days[n].done; });
    var perfect = nums.filter(function (n) { return store.days[n].moves === store.days[n].min; }).length;
    var streak = 0, t = todayNumber(); if (!store.days[t] || !store.days[t].done) t--;
    while (t > 0 && store.days[t] && store.days[t].done && !store.days[t].late) { streak++; t--; }
    return { played: nums.length, perfect: perfect, streak: streak };
  }
  function showResults() {
    if (!S.done) return;
    var rec = S.practice ? { moves: S.moves, min: S.min } : store.days[S.n];
    $("wi-r-title").textContent = S.practice ? "Practice done" : "Racked";
    $("wi-r-moves").textContent = rec.moves; $("wi-r-min").textContent = rec.min;
    var v = verdict(rec.moves, rec.min), ve = $("wi-r-verdict");
    ve.textContent = v === "Perfect" ? "Perfect" : v + " over the minimum"; ve.classList.toggle("perfect", v === "Perfect");
    var list = $("wi-sol-list"); list.innerHTML = "";
    var ti = 0;
    S.solution.forEach(function (st) {
      var li = el("li"), what = st.plate != null ? "Add " + fmt(st.plate) + "s" : "Pull the outer pair";
      li.innerHTML = what + " &rarr; " + st.total + (st.hit ? ' <span class="hit">&#10003; ' + LIFTERS[S.pz.who[ti]].name.toLowerCase() + "</span>" : "");
      if (st.hit) ti++;
      list.appendChild(li);
    });
    $("wi-sol").open = false;
    var st = stats();
    $("wi-stats").textContent = "Played " + st.played + " · Perfect " + st.perfect + " · Streak " + st.streak;
    $("wi-share").textContent = S.practice ? "Share today’s score" : "Share";
    $("wi-share").hidden = !store.days[S.n] || !store.days[S.n].done;
    $("wi-copied").textContent = "";
    $("wi-sheet").hidden = false;
    tick();
  }
  function hideResults() { $("wi-sheet").hidden = true; }
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", hideResults); });

  $("wi-share").addEventListener("click", function () {
    var txt = shareText(), msg = $("wi-copied");
    function ok() { msg.textContent = "Copied! Paste it anywhere."; }
    function fallback() {
      var ta = el("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? ok() : (msg.textContent = txt); } catch (e) { msg.textContent = txt; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
  });
  $("wi-again").addEventListener("click", function () { hideResults(); setup(S.n, true); });

  // reopen results when the board is finished
  $("wi-stage").addEventListener("click", function () { if (S.done && !S.lift) showResults(); });

  // countdown + midnight rollover
  var loadedDate = ptDate(), viewing = null;
  function tick() {
    var sec = secondsToMidnightPT(), h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60;
    $("wi-count").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
    if (viewing == null && ptDate() !== loadedDate && (S.done || S.moves === 0)) { loadedDate = ptDate(); hideResults(); setup(todayNumber()); }
  }
  setInterval(tick, 1000);

  // ---------- boot ----------
  // ?n=12 replays an earlier puzzle (never a future one)
  var q = Number(new URLSearchParams(location.search).get("n"));
  if (q >= 1 && q < todayNumber()) viewing = q;
  syncSound();
  if (!store.seenHelp) { setHelp(true); store.seenHelp = true; save(); }
  resize();
  window.addEventListener("resize", resize);
  setup(viewing || todayNumber());
  if (S.done && !S.practice) setTimeout(showResults, 400);
  requestAnimationFrame(frame);
})();
