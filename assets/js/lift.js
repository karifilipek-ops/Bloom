/* Trainbloom workout tracker
 *
 * Everything lives in one localStorage key (bloom.lift.v1) and is saved after every change,
 * so locking the phone or refreshing never loses your place.
 *
 * DATA MODEL (built so Trainbloom programs can plug in later)
 *
 *   exercises   The lifter's own library: { id, name, group, bw? }. Built-ins live in SEED and
 *               custom lifts in db.exercises. History is keyed by exercise id, never by routine
 *               or program, so "Bench Press" is one lift no matter which plan you did it in.
 *
 *   templates   Anything you can start. Two sources today, one shape:
 *                 - db.routines           routines the lifter wrote  (source.kind = "mine")
 *                 - PROGRAMS[].routines   Trainbloom programs        (source.kind = "program")
 *               Both normalise through templateItems() into [{ ex, targets:[{min,max}], rest }]
 *               and start through startFromTemplate(), so they open in the exact same logger.
 *               Program exercises are referenced by name and resolved into the lifter's library
 *               with ensureExercise(), which is how their history carries across programs.
 *
 *   sessions    A workout: { id, name, startedAt, endedAt, source, items:[{ id, ex, rest,
 *               swappedFrom?, sets:[{ id, t:{min,max}|null, w, r, u, done, at }] }] }.
 *               Targets are copied into the session, so editing or unsubscribing from a
 *               program later never rewrites what you actually lifted.
 *
 * Later, a published program is just another entry in PROGRAMS (fetched instead of bundled),
 * versioned by { id, version }. Billing and publishing don't touch this file's history logic.
 */
(function () {
  "use strict";

  var KEY = "bloom.lift.v1";
  var LB_PER_KG = 2.20462;

  /* ---------------------------------------------------------------- library */

  var SEED_LIST = [
    ["bench-press", "Barbell Bench Press", "chest"],
    ["incline-bench", "Incline Barbell Bench Press", "chest"],
    ["db-bench", "Dumbbell Bench Press", "chest"],
    ["incline-db-press", "Incline Dumbbell Press", "chest"],
    ["machine-chest-press", "Machine Chest Press", "chest"],
    ["cable-fly", "Cable Fly", "chest"],
    ["pec-deck", "Pec Deck", "chest"],
    ["dips", "Dips", "chest", 1],
    ["push-up", "Push-Up", "chest", 1],
    ["ohp", "Overhead Press", "shoulders"],
    ["db-shoulder-press", "Seated Dumbbell Shoulder Press", "shoulders"],
    ["machine-shoulder-press", "Machine Shoulder Press", "shoulders"],
    ["lateral-raise", "Dumbbell Lateral Raise", "shoulders"],
    ["cable-lateral", "Cable Lateral Raise", "shoulders"],
    ["rear-delt-fly", "Rear Delt Fly", "shoulders"],
    ["face-pull", "Face Pull", "shoulders"],
    ["pull-up", "Pull-Up", "back", 1],
    ["chin-up", "Chin-Up", "back", 1],
    ["lat-pulldown", "Lat Pulldown", "back"],
    ["barbell-row", "Barbell Row", "back"],
    ["chest-supported-row", "Chest-Supported Row", "back"],
    ["cable-row", "Seated Cable Row", "back"],
    ["db-row", "Single-Arm Dumbbell Row", "back"],
    ["deadlift", "Deadlift", "back"],
    ["squat", "Back Squat", "quads"],
    ["front-squat", "Front Squat", "quads"],
    ["hack-squat", "Hack Squat", "quads"],
    ["leg-press", "Leg Press", "quads"],
    ["split-squat", "Bulgarian Split Squat", "quads"],
    ["leg-extension", "Leg Extension", "quads"],
    ["rdl", "Romanian Deadlift", "hamstrings"],
    ["lying-leg-curl", "Lying Leg Curl", "hamstrings"],
    ["seated-leg-curl", "Seated Leg Curl", "hamstrings"],
    ["hip-thrust", "Barbell Hip Thrust", "glutes"],
    ["calf-raise", "Standing Calf Raise", "calves"],
    ["seated-calf", "Seated Calf Raise", "calves"],
    ["barbell-curl", "Barbell Curl", "biceps"],
    ["db-curl", "Dumbbell Curl", "biceps"],
    ["hammer-curl", "Hammer Curl", "biceps"],
    ["preacher-curl", "Preacher Curl", "biceps"],
    ["pushdown", "Triceps Pushdown", "triceps"],
    ["oh-tri-ext", "Overhead Triceps Extension", "triceps"],
    ["skull-crusher", "Skull Crusher", "triceps"],
    ["hanging-leg-raise", "Hanging Leg Raise", "abs", 1],
    ["cable-crunch", "Cable Crunch", "abs"]
  ];
  var SEED = {};
  SEED_LIST.forEach(function (e) { SEED[e[0]] = { id: e[0], name: e[1], group: e[2], bw: !!e[3] }; });
  var GROUPS = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "calves", "biceps", "triceps", "abs", "other"];

  /* A bundled sample so the program path is real today. Published programs will arrive in this shape. */
  var PROGRAMS = [{
    id: "tb-upper-lower", version: 1, author: "Trainbloom", name: "Upper / Lower Starter",
    blurb: "Sample Trainbloom program. Four days, double progression: hit the top of the range on every set, then add weight.",
    routines: [
      { key: "upper-a", name: "Upper A", items: [
        { name: "Barbell Bench Press", sets: 3, min: 6, max: 8, rest: 180 },
        { name: "Chest-Supported Row", sets: 3, min: 8, max: 10, rest: 150 },
        { name: "Seated Dumbbell Shoulder Press", sets: 2, min: 8, max: 10, rest: 120 },
        { name: "Lat Pulldown", sets: 2, min: 10, max: 12, rest: 120 },
        { name: "Dumbbell Lateral Raise", sets: 3, min: 12, max: 15, rest: 75 },
        { name: "Triceps Pushdown", sets: 2, min: 10, max: 12, rest: 75 }
      ] },
      { key: "lower-a", name: "Lower A", items: [
        { name: "Back Squat", sets: 3, min: 5, max: 7, rest: 210 },
        { name: "Romanian Deadlift", sets: 3, min: 8, max: 10, rest: 150 },
        { name: "Leg Extension", sets: 2, min: 10, max: 12, rest: 90 },
        { name: "Lying Leg Curl", sets: 2, min: 10, max: 12, rest: 90 },
        { name: "Standing Calf Raise", sets: 3, min: 10, max: 15, rest: 75 }
      ] },
      { key: "upper-b", name: "Upper B", items: [
        { name: "Incline Dumbbell Press", sets: 3, min: 8, max: 10, rest: 150 },
        { name: "Pull-Up", sets: 3, min: 6, max: 10, rest: 150 },
        { name: "Machine Chest Press", sets: 2, min: 10, max: 12, rest: 120 },
        { name: "Seated Cable Row", sets: 2, min: 10, max: 12, rest: 120 },
        { name: "Dumbbell Curl", sets: 3, min: 10, max: 12, rest: 75 }
      ] },
      { key: "lower-b", name: "Lower B", items: [
        { name: "Deadlift", sets: 2, min: 4, max: 6, rest: 240 },
        { name: "Leg Press", sets: 3, min: 10, max: 12, rest: 150 },
        { name: "Bulgarian Split Squat", sets: 2, min: 8, max: 10, rest: 120 },
        { name: "Seated Leg Curl", sets: 3, min: 10, max: 12, rest: 90 },
        { name: "Hanging Leg Raise", sets: 2, min: 10, max: 15, rest: 75 }
      ] }
    ]
  }];

  /* ---------------------------------------------------------------- pixel art (original, tiny) */

  var PAL = { k: "#242424", l: "#9d91be", d: "#6f6496", s: "#e9e6f3", w: "#ffffff", m: "#8a8a93", n: "#07070b" };
  var ART = {
    dumbbell: [
      "..kk..........kk..",
      ".kllk........kllk.",
      "kkllkk......kkllkk",
      "kkllkkkkkkkkkkllkk",
      "kkllkkkkkkkkkkllkk",
      "kkllkk......kkllkk",
      ".kllk........kllk.",
      "..kk..........kk.."
    ],
    clipboard: [
      "...kkkk...",
      ".kkk..kkk.",
      ".kwkkkkwk.",
      ".kwwwwwwk.",
      ".kwllwwwk.",
      ".kwwwwwwk.",
      ".kwllllwk.",
      ".kwwwwwwk.",
      ".kwlllwwk.",
      ".kkkkkkkk."
    ],
    chart: [
      "k.........",
      "k......kk.",
      "k......kk.",
      "k...kk.kk.",
      "k...kk.kk.",
      "k.kkkk.kk.",
      "k.kkkk.kk.",
      "k.kkkk.kk.",
      "kkkkkkkkkk"
    ],
    hourglass: [
      "kkkkkkk",
      ".kwwwk.",
      ".klllk.",
      "..klk..",
      "...k...",
      "..kwk..",
      ".kwlwk.",
      ".klllk.",
      "kkkkkkk"
    ],
    star: [
      "...k...",
      "..kdk..",
      "kkkdkkk",
      "kdddddk",
      ".kdddk.",
      ".kdkdk.",
      ".kk.kk."
    ],
    plate: [
      "..kkkk..",
      ".kllllk.",
      "kllddllk",
      "kldkkdlk",
      "kldkkdlk",
      "kllddllk",
      ".kllllk.",
      "..kkkk.."
    ],
    flower: [
      ".l.l.",
      "lldll",
      ".l.l.",
      "..k..",
      "k.k..",
      ".kk.k",
      "..kk.",
      "..k.."
    ]
  };
  function pix(name, scale, cls) {
    var rows = ART[name], h = rows.length, w = rows[0].length, out = "";
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var c = rows[y][x];
      if (c !== ".") out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + PAL[c] + '"/>';
    }
    return '<svg class="pix ' + (cls || "") + '" viewBox="0 0 ' + w + " " + h + '" width="' + w * scale + '" height="' + h * scale +
      '" shape-rendering="crispEdges" aria-hidden="true">' + out + "</svg>";
  }
  // The workout-complete barbell, drawn from rectangles so it stays symmetric.
  function barbellSVG() {
    var W = 44, H = 17, r = [];
    function R(x, y, w, h, c) { r.push([x, y, w, h, c]); }
    function mirror(x, y, w, h, c) { R(x, y, w, h, c); R(W - x - w, y, w, h, c); }
    R(0, 8, W, 1, "k");                         // bar
    for (var i = 17; i < 27; i += 2) R(i, 8, 1, 1, "m"); // knurling
    mirror(0, 7, 6, 3, "k"); mirror(1, 8, 4, 1, "m");    // sleeves
    mirror(6, 1, 5, 15, "k"); mirror(7, 2, 3, 13, "l"); mirror(7, 2, 1, 13, "s"); // 45s
    mirror(11, 3, 3, 11, "k"); mirror(12, 4, 1, 9, "d");  // 25s
    mirror(14, 6, 2, 5, "k");                             // collars
    var out = r.map(function (a) {
      return '<rect x="' + a[0] + '" y="' + a[1] + '" width="' + a[2] + '" height="' + a[3] + '" fill="' + PAL[a[4]] + '"/>';
    }).join("");
    return '<svg class="pix barbell" viewBox="0 0 ' + W + " " + H + '" width="' + W * 6 + '" height="' + H * 6 +
      '" shape-rendering="crispEdges" aria-hidden="true">' + out + "</svg>";
  }

  /* ---------------------------------------------------------------- storage */

  function blank() {
    return {
      v: 1,
      settings: { unit: "lb", rest: true, restSec: 120, sound: true, wake: false },
      exercises: {}, routines: [], sessions: [], activeId: null
    };
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.v === 1) {
        var b = blank();
        d.settings = Object.assign(b.settings, d.settings || {});
        ["exercises", "routines", "sessions"].forEach(function (k) { if (!d[k]) d[k] = b[k]; });
        return d;
      }
    } catch (e) { /* fall through */ }
    return blank();
  }
  var db = load();
  var saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); saveWarned = false; }
    catch (e) {
      if (!saveWarned) toast("Couldn’t save on this device. Private browsing or full storage?");
      saveWarned = true;
    }
  }
  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) { /* optional */ } }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------------------------------------------------------------- helpers */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function U() { return db.settings.unit; }
  function step() { return U() === "kg" ? 2.5 : 5; }
  function conv(w, from, to) {
    if (w == null || from === to) return w;
    return to === "kg" ? w / LB_PER_KG : w * LB_PER_KG;
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  function dw(set) { return set.w == null ? null : round1(conv(set.w, set.u || U(), U())); } // display weight
  function fmtN(n) { return n == null ? "–" : String(round1(n)); }
  function fmtW(w, ex) { return (w === 0 && ex && ex.bw) ? "BW" : fmtN(w); }
  function setTxt(w, r, ex) { return (w === 0 && ex && ex.bw ? "BW" : fmtN(w)) + " × " + (r == null ? "–" : r); }
  function plural(n, a) { return n + " " + a + (n === 1 ? "" : "s"); }
  function e1rm(w, r) { return r <= 1 ? w : w * (1 + r / 30); }
  function dur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(sec).padStart(2, "0");
  }
  function durWords(ms) { var m = Math.round(ms / 60000); return m < 60 ? m + " min" : Math.floor(m / 60) + "h " + (m % 60) + "m"; }
  function dateLabel(t, long) {
    var d = new Date(t), now = new Date();
    var days = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5);
    if (!long && days === 0) return "Today";
    if (!long && days === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
  }
  function restLabel(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function getEx(id) { return db.exercises[id] || SEED[id] || { id: id, name: "Unknown lift", group: "other" }; }
  function allExercises() {
    var list = Object.keys(SEED).map(function (k) { return SEED[k]; });
    Object.keys(db.exercises).forEach(function (k) { if (!SEED[k]) list.push(db.exercises[k]); });
    return list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function findExByName(name) {
    var n = norm(name);
    return allExercises().filter(function (e) { return norm(e.name) === n; })[0] || null;
  }
  function ensureExercise(name, group) {
    var hit = findExByName(name);
    if (hit) return hit.id;
    var base = norm(name).replace(/ /g, "-") || "lift", id = base, i = 2;
    while (SEED[id] || db.exercises[id]) id = base + "-" + i++;
    db.exercises[id] = { id: id, name: name.trim(), group: group || "other", custom: true };
    return id;
  }

  /* ---------------------------------------------------------------- history */

  function finished() {
    return db.sessions.filter(function (s) { return s.endedAt; }).sort(function (a, b) { return b.startedAt - a.startedAt; });
  }
  function doneSetsFor(session, exId) {
    var out = [];
    session.items.forEach(function (it) {
      if (it.ex === exId) it.sets.forEach(function (s) { if (s.done) out.push(s); });
    });
    return out;
  }
  // Every finished session containing this lift, newest first, whatever routine or program it came from.
  function historyFor(exId) {
    return finished().map(function (s) { return { session: s, sets: doneSetsFor(s, exId) }; })
      .filter(function (h) { return h.sets.length; });
  }
  function lastFor(exId, excludeId, before) {
    var h = historyFor(exId).filter(function (x) { return x.session.id !== excludeId && (!before || x.session.startedAt < before); });
    return h[0] || null;
  }
  function plain(sets) { return sets.map(function (s) { return { w: dw(s) || 0, r: s.r }; }); }

  // Turn two sessions of one lift into specific, honest lines.
  function compareSets(today, prev) {
    var res = { first: !prev || !prev.length, up: [], down: [] };
    if (res.first || !today.length) return res;
    function idx(list) {
      var max = {}, tot = {};
      list.forEach(function (s) { var k = round1(s.w); max[k] = Math.max(max[k] || 0, s.r); tot[k] = (tot[k] || 0) + s.r; });
      return { max: max, tot: tot };
    }
    var T = idx(today), P = idx(prev), u = " " + U();
    var tTop = Math.max.apply(null, today.map(function (s) { return round1(s.w); }));
    var pTop = Math.max.apply(null, prev.map(function (s) { return round1(s.w); }));
    if (tTop > pTop) res.up.push({ text: "+" + fmtN(tTop - pTop) + u + " on your top set", detail: fmtN(tTop) + " × " + T.max[tTop] + ", was " + fmtN(pTop) + " × " + P.max[pTop] });
    Object.keys(T.max).map(Number).sort(function (a, b) { return b - a; }).forEach(function (w) {
      if (P.max[w] == null) return;
      var d = T.max[w] - P.max[w];
      if (d > 0) res.up.push({ text: "+" + plural(d, "rep") + " at " + fmtN(w) + u, detail: fmtN(w) + " × " + T.max[w] + ", was " + fmtN(w) + " × " + P.max[w] });
      else if (d < 0) res.down.push({ text: "−" + plural(-d, "rep") + " at " + fmtN(w) + u, detail: "best set " + fmtN(w) + " × " + T.max[w] + ", was × " + P.max[w] });
      else {
        var dt = T.tot[w] - P.tot[w];
        if (dt > 0) res.up.push({ text: "+" + plural(dt, "total rep") + " at " + fmtN(w) + u, detail: T.tot[w] + " reps across sets, was " + P.tot[w] });
        else if (dt < 0) res.down.push({ text: "−" + plural(-dt, "total rep") + " at " + fmtN(w) + u, detail: T.tot[w] + " reps across sets, was " + P.tot[w] });
      }
    });
    if (tTop < pTop) res.down.push({ text: "Top set lighter", detail: fmtN(tTop) + u + ", was " + fmtN(pTop) + u });
    return res;
  }
  // All-time records set in this session vs everything before it.
  function prsFor(session, exId) {
    var today = plain(doneSetsFor(session, exId));
    var before = [];
    historyFor(exId).forEach(function (h) { if (h.session.startedAt < session.startedAt) before = before.concat(plain(h.sets)); });
    if (!before.length || !today.length) return [];
    var out = [];
    var hiBefore = Math.max.apply(null, before.map(function (s) { return s.w; }));
    var hiToday = Math.max.apply(null, today.map(function (s) { return s.w; }));
    if (hiToday > hiBefore) out.push("Heaviest ever: " + fmtN(hiToday) + " " + U());
    var repPr = null;
    today.forEach(function (s) {
      var best = 0;
      before.forEach(function (b) { if (b.w >= s.w) best = Math.max(best, b.r); });
      if (s.r > best && s.w <= hiBefore && (!repPr || s.w > repPr.w)) repPr = s;
    });
    if (repPr) out.push("Rep PR: " + repPr.r + " at " + fmtN(repPr.w) + " " + U());
    return out;
  }

  /* ---------------------------------------------------------------- templates → sessions */

  function templateItems(tpl, kind) {
    if (kind === "program") {
      return tpl.items.map(function (it) {
        var t = []; for (var i = 0; i < it.sets; i++) t.push({ min: it.min, max: it.max });
        return { ex: ensureExercise(it.name), targets: t, rest: it.rest };
      });
    }
    return tpl.items.map(function (it) { return { ex: it.ex, targets: it.sets.slice(), rest: it.rest }; });
  }
  function makeItem(exId, targets, rest, excludeId) {
    var last = lastFor(exId, excludeId), ps = last ? last.sets : [], ex = getEx(exId);
    if (!targets.length) targets = ps.length ? ps.map(function () { return null; }) : [null, null, null];
    return {
      id: uid(), ex: exId, rest: rest || db.settings.restSec,
      sets: targets.map(function (t, i) {
        var p = ps[i] || ps[ps.length - 1];
        return { id: uid(), t: t, w: p ? dw(p) : (ex.bw ? 0 : null), r: p ? p.r : null, u: U(), done: false };
      })
    };
  }
  function startFromTemplate(name, items, source) {
    if (!confirmReplaceActive()) return;
    var s = { id: uid(), name: name, startedAt: Date.now(), endedAt: null, source: source, items: [] };
    s.items = items.map(function (it) { return makeItem(it.ex, it.targets, it.rest, s.id); });
    s.focus = s.items[0] && s.items[0].sets[0] ? s.items[0].sets[0].id : null;
    db.sessions.push(s); db.activeId = s.id; save();
    go("#/workout");
  }
  function startRoutine(id) {
    var r = db.routines.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.lastUsed = Date.now();
    startFromTemplate(r.name, templateItems(r, "mine"), { kind: "routine", routineId: r.id });
  }
  function startProgram(pid, key) {
    var p = PROGRAMS.filter(function (x) { return x.id === pid; })[0];
    var r = p && p.routines.filter(function (x) { return x.key === key; })[0];
    if (!r) return;
    startFromTemplate(r.name, templateItems(r, "program"),
      { kind: "program", programId: p.id, version: p.version, routineKey: r.key, label: p.name });
  }
  function startEmpty() { startFromTemplate("Workout", [], { kind: "empty" }); }
  function confirmReplaceActive() {
    var a = active();
    if (!a) return true;
    var logged = countSets(a).done;
    if (!logged) { db.sessions = db.sessions.filter(function (s) { return s.id !== a.id; }); db.activeId = null; return true; }
    if (confirm("You’re mid-workout (" + plural(logged, "set") + " logged). Finish it and start the new one?")) { finishActive(true); return true; }
    return false;
  }

  /* ---------------------------------------------------------------- active session */

  function active() { return db.activeId ? db.sessions.filter(function (s) { return s.id === db.activeId; })[0] || null : null; }
  function countSets(s) {
    var t = 0, d = 0;
    s.items.forEach(function (it) { it.sets.forEach(function (x) { t++; if (x.done) d++; }); });
    return { total: t, done: d };
  }
  function locate(s, setId) {
    for (var i = 0; i < s.items.length; i++) for (var j = 0; j < s.items[i].sets.length; j++)
      if (s.items[i].sets[j].id === setId) return { item: s.items[i], set: s.items[i].sets[j], i: i, j: j };
    return null;
  }
  function itemById(s, id) { return s.items.filter(function (it) { return it.id === id; })[0]; }
  function nextOpen(s, fromItem) {
    var start = Math.max(0, s.items.indexOf(fromItem));
    for (var k = 0; k < s.items.length; k++) {
      var it = s.items[(start + k) % s.items.length];
      var open = it.sets.filter(function (x) { return !x.done; })[0];
      if (open) return open.id;
    }
    return null;
  }

  var undoStack = [];
  function snap(label) {
    var s = active(); if (!s) return;
    undoStack.push({ id: s.id, json: JSON.stringify(s), label: label });
    if (undoStack.length > 30) undoStack.shift();
  }
  function undo() {
    var u = undoStack.pop(), s = active();
    if (!u || !s || u.id !== s.id) { toast("Nothing to undo"); return; }
    var restored = JSON.parse(u.json);
    db.sessions[db.sessions.indexOf(s)] = restored;
    save(); render(); toast("Undid: " + u.label);
  }

  function logSet(setId) {
    var s = active(), L = locate(s, setId); if (!L) return;
    var set = L.set, ex = getEx(L.item.ex);
    if (set.w == null && ex.bw) set.w = 0;
    if (set.w != null) { set.w = dw(set); set.u = U(); }
    if (set.w == null || !(set.r > 0)) { toast(set.w == null ? "Enter a weight first" : "Enter your reps first"); return; }
    snap("log set " + (L.j + 1));
    var wasDone = set.done;
    set.done = true; set.at = Date.now();
    // carry today's numbers forward into empty sets below
    L.item.sets.slice(L.j + 1).forEach(function (n) {
      if (!n.done && n.w == null) { n.w = set.w; n.u = set.u; }
      if (!n.done && n.r == null) n.r = set.r;
    });
    s.focus = nextOpen(s, L.item);
    if (!wasDone && db.settings.rest && s.focus) startRest(L.item.rest || db.settings.restSec);
    save(); render();
    toast((s.focus ? "Set " + (L.j + 1) + " logged · " + setTxt(set.w, set.r, ex) : "Every set logged. Finish when ready."), "Undo", undo);
    scrollToFocus();
  }
  function unlogSet(setId) {
    var s = active(), L = locate(s, setId); if (!L) return;
    snap("unlog set " + (L.j + 1));
    L.set.done = false; L.set.at = null; s.focus = setId;
    save(); render();
  }
  function addSet(itemId) {
    var s = active(), it = itemById(s, itemId); if (!it) return;
    snap("add set");
    var last = it.sets[it.sets.length - 1];
    var n = { id: uid(), t: last ? last.t : null, w: last ? last.w : null, r: last ? last.r : null, u: last ? last.u : U(), done: false };
    it.sets.push(n); s.focus = n.id; save(); render(); scrollToFocus();
  }
  function removeSet(itemId) {
    var s = active(), it = itemById(s, itemId); if (!it || !it.sets.length) return;
    snap("remove set");
    var gone = it.sets.pop();
    if (s.focus === gone.id) s.focus = nextOpen(s, it);
    save(); render();
  }
  function addExercise(exId) {
    var s = active(); if (!s) return;
    snap("add exercise");
    var it = makeItem(exId, [], null, s.id);
    s.items.push(it); s.focus = it.sets[0].id; save(); render(); scrollToFocus();
  }
  // Swap keeps logged sets under the original lift and moves the remaining targets to the new one.
  function swapExercise(itemId, exId) {
    var s = active(), it = itemById(s, itemId); if (!it || it.ex === exId) return;
    snap("swap exercise");
    var logged = it.sets.filter(function (x) { return x.done; }), open = it.sets.filter(function (x) { return !x.done; });
    var targets = (open.length ? open : it.sets).map(function (x) { return x.t; });
    var fresh = makeItem(exId, targets, it.rest, s.id);
    fresh.swappedFrom = it.ex;
    var at = s.items.indexOf(it);
    if (logged.length) { it.sets = logged; s.items.splice(at + 1, 0, fresh); }
    else s.items.splice(at, 1, fresh);
    s.focus = fresh.sets[0].id; save(); render();
    toast("Swapped to " + getEx(exId).name, "Undo", undo);
  }
  function removeItem(itemId) {
    var s = active(), it = itemById(s, itemId); if (!it) return;
    snap("remove exercise");
    s.items.splice(s.items.indexOf(it), 1);
    s.focus = nextOpen(s, s.items[0]); save(); render();
    toast("Removed " + getEx(it.ex).name, "Undo", undo);
  }
  function moveItem(itemId, d) {
    var s = active(), it = itemById(s, itemId), i = s.items.indexOf(it), j = i + d;
    if (j < 0 || j >= s.items.length) return;
    snap("move exercise");
    s.items.splice(i, 1); s.items.splice(j, 0, it); save(); render();
  }
  function finishActive(silent) {
    var s = active(); if (!s) return null;
    s.items.forEach(function (it) { it.sets = it.sets.filter(function (x) { return x.done; }); });
    s.items = s.items.filter(function (it) { return it.sets.length; });
    s.endedAt = Date.now(); delete s.rest; delete s.focus;
    db.activeId = null; undoStack = [];
    if (!s.items.length) db.sessions = db.sessions.filter(function (x) { return x !== s; });
    save(); hideRest();
    if (!silent) go(s.items.length ? "#/done/" + s.id : "#/");
    return s;
  }
  function discardActive() {
    var s = active(); if (!s) return;
    if (!confirm("Discard this workout? Logged sets will be deleted.")) return;
    db.sessions = db.sessions.filter(function (x) { return x !== s; });
    db.activeId = null; undoStack = []; save(); hideRest(); go("#/");
  }

  /* ---------------------------------------------------------------- rest timer */

  var audio = null;
  function unlockAudio() {
    if (audio || !db.settings.sound) return;
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
  }
  function beep() {
    if (!audio || !db.settings.sound) return;
    try {
      [0, 0.18, 0.36].forEach(function (t, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = "square"; o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.06, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.14);
        o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.15);
      });
    } catch (e) { /* no sound */ }
  }
  function startRest(sec) {
    var s = active(); if (!s) return;
    s.rest = { end: Date.now() + sec * 1000, total: sec, alerted: false };
    save(); paintRest();
  }
  function hideRest() { var bar = document.getElementById("restbar"); bar.hidden = true; document.body.classList.remove("resting"); }
  function paintRest() {
    var s = active(), bar = document.getElementById("restbar");
    if (!s || !s.rest || route().name !== "workout") { hideRest(); return; }
    var left = s.rest.end - Date.now();
    if (left <= -8000) { delete s.rest; save(); hideRest(); return; }
    var done = left <= 0;
    if (done && !s.rest.alerted) {
      s.rest.alerted = true; save(); beep();
      if (navigator.vibrate) try { navigator.vibrate([180, 90, 180]); } catch (e) { /* ignore */ }
    }
    var pct = Math.max(0, Math.min(100, 100 - left / (s.rest.total * 10)));
    var html = '<div class="rb-fill" style="width:' + pct + '%"></div>' +
      '<div class="rb-in">' + pix("hourglass", 3, done ? "" : "spin") +
      '<div class="rb-time">' + (done ? "GO" : dur(left + 999)) + '<small>' + (done ? "Rest’s up. Back under the bar." : "Rest") + "</small></div>" +
      (done ? "" : '<button data-act="rest-adj" data-d="-15">−15</button><button data-act="rest-adj" data-d="15">+15</button>') +
      '<button data-act="rest-skip">' + (done ? "OK" : "Skip") + "</button></div>";
    bar.innerHTML = html; bar.hidden = false; bar.classList.toggle("done", done);
    document.body.classList.add("resting");
  }

  /* ---------------------------------------------------------------- wake lock */

  var wakeLock = null;
  function syncWake() {
    var want = db.settings.wake && route().name === "workout" && document.visibilityState === "visible";
    if (want && !wakeLock && navigator.wakeLock) {
      navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); }).catch(function () {});
    } else if (!want && wakeLock) { wakeLock.release(); wakeLock = null; }
  }

  /* ---------------------------------------------------------------- UI bits */

  var toastTimer = null;
  function toast(msg, actLabel, fn) {
    var el = document.getElementById("toast");
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (actLabel ? '<button type="button">' + esc(actLabel) + "</button>" : "");
    el.hidden = false;
    if (actLabel) el.querySelector("button").onclick = function () { el.hidden = true; fn(); };
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, actLabel ? 5000 : 2600);
  }
  function openSheet(html, onOpen) {
    var wrap = document.getElementById("sheet");
    wrap.querySelector(".sheet").innerHTML = '<div class="sheet-grab"></div>' + html;
    wrap.hidden = false; document.body.classList.add("sheet-open");
    if (onOpen) onOpen(wrap.querySelector(".sheet"));
  }
  function closeSheet() { document.getElementById("sheet").hidden = true; document.body.classList.remove("sheet-open"); }
  function scrollToFocus() {
    requestAnimationFrame(function () {
      var el = document.querySelector(".set-edit");
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top < 120 || r.bottom > window.innerHeight - 90) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // Exercise picker: used for adding, swapping and building routines.
  function openPicker(title, onPick, opts) {
    opts = opts || {};
    var similarGroup = opts.group;
    openSheet(
      '<h2 class="sheet-h">' + esc(title) + "</h2>" +
      '<input class="pick-q" type="search" placeholder="Search or name a new lift" autocomplete="off" enterkeyhint="done">' +
      '<div class="pick-list"></div>',
      function (root) {
        var q = root.querySelector(".pick-q"), list = root.querySelector(".pick-list"), lastDone = {};
        finished().forEach(function (s) { s.items.forEach(function (it) { if (!lastDone[it.ex]) lastDone[it.ex] = s.startedAt; }); });
        function draw() {
          var term = norm(q.value), all = allExercises().filter(function (e) { return e.id !== opts.exclude; });
          var hits = term ? all.filter(function (e) { return norm(e.name).indexOf(term) > -1 || e.group.indexOf(term) === 0; }) : all;
          var html = "";
          if (term && !findExByName(q.value)) {
            html += '<button class="pick-new" data-new="1">+ Create “' + esc(q.value.trim()) + '”</button>';
          }
          if (similarGroup && !term) {
            var sim = hits.filter(function (e) { return e.group === similarGroup; });
            if (sim.length) html += '<div class="pick-sec pxt">Same muscle · ' + esc(similarGroup) + "</div>" + sim.map(row).join("");
            html += '<div class="pick-sec pxt">Everything</div>';
          }
          html += hits.map(row).join("") || '<p class="muted pad">No match. Create it above.</p>';
          list.innerHTML = html;
        }
        function row(e) {
          var last = lastDone[e.id];
          return '<button class="pick-row" data-id="' + esc(e.id) + '"><span>' + esc(e.name) + '<small>' + esc(e.group) +
            (last ? " · last " + esc(dateLabel(last)) : "") + "</small></span><b>+</b></button>";
        }
        q.addEventListener("input", draw);
        list.addEventListener("click", function (ev) {
          var b = ev.target.closest("button"); if (!b) return;
          var id = b.dataset.new ? ensureExercise(q.value, similarGroup) : b.dataset.id;
          save(); closeSheet(); onPick(id);
        });
        draw();
        if (!("ontouchstart" in window)) q.focus();
      });
  }

  /* ---------------------------------------------------------------- routing */

  function route() {
    var h = (location.hash || "#/").slice(2).split("/");
    return { name: h[0] || "home", id: h[1] ? decodeURIComponent(h[1]) : null };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  var app = document.getElementById("app");
  function render() {
    var r = route(), html;
    if (r.name === "workout" && !active()) { location.replace("#/"); return; }
    switch (r.name) {
      case "workout": html = viewWorkout(); break;
      case "routines": html = viewRoutines(); break;
      case "routine": html = viewRoutineEdit(r.id); break;
      case "program": html = viewProgram(r.id); break;
      case "lifts": html = viewLifts(); break;
      case "lift": html = viewLift(r.id); break;
      case "done": html = viewDone(r.id); break;
      case "session": html = viewSession(r.id); break;
      case "settings": html = viewSettings(); break;
      default: html = viewHome();
    }
    app.innerHTML = html;
    document.body.dataset.view = r.name;
    var tab = { home: "home", workout: "home", done: "home", session: "home", settings: "home", routines: "routines", routine: "routines", program: "routines", lifts: "lifts", lift: "lifts" }[r.name];
    document.querySelectorAll("#tabbar a").forEach(function (a) { a.classList.toggle("on", a.dataset.tab === tab); });
    paintRest(); syncWake(); tick();
    var q = app.querySelector("#lift-q"); if (q) q.addEventListener("input", filterLifts);
  }

  /* ---------------------------------------------------------------- views */

  function head(title, sub, back) {
    return '<div class="vhead">' + (back ? '<a class="back" href="' + back + '" aria-label="Back">‹</a>' : "") +
      '<div><h1 class="vtitle">' + title + "</h1>" + (sub ? '<p class="vsub">' + sub + "</p>" : "") + "</div></div>";
  }

  function viewHome() {
    var a = active(), html = '<div class="home-top"><div><h1 class="vtitle">Lift Log</h1><p class="vsub">Your sets. Your history. On this phone.</p></div>' +
      '<a class="icon-btn" href="#/settings" aria-label="Settings">' + pix("plate", 3) + "</a></div>";
    if (a) {
      var c = countSets(a);
      html += '<a class="resume" href="#/workout"><div class="pxt k">In progress</div><div class="resume-name">' + esc(a.name) + "</div>" +
        '<div class="resume-meta"><span data-elapsed>' + dur(Date.now() - a.startedAt) + "</span> · " + c.done + "/" + c.total + " sets</div>" +
        '<div class="meter-mini"><i style="width:' + (c.total ? c.done / c.total * 100 : 0) + '%"></i></div><span class="resume-go">Resume ›</span></a>';
    }
    var mine = db.routines.slice().sort(function (x, y) { return (y.lastUsed || y.createdAt || 0) - (x.lastUsed || x.createdAt || 0); });
    html += '<h2 class="sec">Start</h2><div class="start-grid">';
    mine.slice(0, 6).forEach(function (r) {
      html += '<button class="start-card" data-act="start-routine" data-id="' + r.id + '"><span class="sc-name">' + esc(r.name || "Untitled") + "</span>" +
        '<span class="sc-meta">' + plural(r.items.length, "exercise") + (r.lastUsed ? " · " + esc(dateLabel(r.lastUsed)) : "") + "</span><span class=\"sc-go\">Start ›</span></button>";
    });
    html += '<button class="start-card ghost" data-act="start-empty"><span class="sc-name">Empty workout</span><span class="sc-meta">Add lifts as you go</span><span class="sc-go">Start ›</span></button>';
    html += '<a class="start-card ghost" href="#/routines"><span class="sc-name">' + (mine.length ? "All routines" : "Build a routine") + '</span><span class="sc-meta">' +
      (mine.length ? "Edit, or start a program" : "Exercises, sets, rep ranges") + '</span><span class="sc-go">Open ›</span></a></div>';

    var recent = finished().slice(0, 8);
    html += '<h2 class="sec">Recent</h2>';
    if (!recent.length) {
      html += '<div class="lift-empty">' + pix("dumbbell", 4) + "<p>No workouts yet. The bar misses you.</p></div>";
    } else {
      html += '<div class="list">' + recent.map(function (s) {
        var c = countSets(s), wins = 0;
        uniqueEx(s).forEach(function (ex) { var l = lastFor(ex, s.id, s.startedAt); if (l && compareSets(plain(doneSetsFor(s, ex)), plain(l.sets)).up.length) wins++; });
        return '<a class="list-row" href="#/session/' + s.id + '"><span><b>' + esc(s.name) + "</b><small>" + esc(dateLabel(s.startedAt)) + " · " + plural(c.done, "set") +
          " · " + durWords(s.endedAt - s.startedAt) + (s.source && s.source.kind === "program" ? " · " + esc(s.source.label) : "") + "</small></span>" +
          (wins ? '<span class="win">' + pix("star", 2) + "+" + wins + "</span>" : "") + "</a>";
      }).join("") + "</div>";
    }
    return html;
  }
  function uniqueEx(s) { var seen = {}; return s.items.map(function (i) { return i.ex; }).filter(function (e) { return seen[e] ? false : (seen[e] = 1); }); }

  function viewWorkout() {
    var s = active(), c = countSets(s);
    var html = '<div class="wk-head"><a class="back" href="#/" aria-label="Home">‹</a>' +
      '<div class="wk-title"><input class="wk-name" data-field="session-name" value="' + esc(s.name) + '" aria-label="Workout name">' +
      '<div class="wk-sub"><span data-elapsed>' + dur(Date.now() - s.startedAt) + "</span> · " + c.done + "/" + c.total + " sets</div></div>" +
      '<button class="chip" data-act="undo"' + (undoStack.length ? "" : " disabled") + ">Undo</button>" +
      '<button class="chip dark" data-act="finish">Finish</button></div>';
    if (s.source && s.source.kind === "program") html += '<div class="src-tag pxt">' + esc(s.source.label) + "</div>";

    s.items.forEach(function (it, idx) {
      var ex = getEx(it.ex), last = lastFor(it.ex, s.id), ps = last ? last.sets : [];
      var t = it.sets[0] && it.sets[0].t, open = it.sets.some(function (x) { return !x.done; });
      var allDone = !open;
      html += '<section class="ex-card' + (allDone ? " complete" : "") + '" id="it-' + it.id + '">' +
        '<header class="ex-h"><button class="ex-name" data-act="lift-hist" data-ex="' + esc(it.ex) + '">' + esc(ex.name) + "</button>" +
        '<button class="kebab" data-act="ex-menu" data-item="' + it.id + '" aria-label="Exercise options">•••</button></header>' +
        '<div class="ex-meta">' + (it.swappedFrom ? '<span class="tag">swapped from ' + esc(getEx(it.swappedFrom).name) + "</span>" : "") +
        (t ? "<span>Target " + it.sets.length + " × " + t.min + (t.max !== t.min ? "–" + t.max : "") + "</span>" : "") +
        '<button class="linkish" data-act="rest-set" data-item="' + it.id + '">Rest ' + restLabel(it.rest || db.settings.restSec) + "</button>" +
        (last ? "<span>Last " + esc(dateLabel(last.session.startedAt)) + "</span>" : "<span>First time</span>") + "</div>";
      var hint = progressionHint(it, ps, ex);
      if (hint) html += '<div class="hint-line">' + pix("flower", 2) + "<span>" + hint + "</span></div>";
      html += '<div class="sets"><div class="set-cols"><span>Set</span><span>Last</span><span>Today</span><span></span></div>';
      it.sets.forEach(function (st, j) {
        var p = ps[j] || null;
        html += st.id === s.focus ? setEditor(it, st, j, p, ex) : setRow(st, j, p, ex);
      });
      html += "</div>" +
        '<div class="ex-foot"><button class="ghost-btn" data-act="add-set" data-item="' + it.id + '">+ Add set</button>' +
        '<button class="ghost-btn" data-act="swap" data-item="' + it.id + '">⇄ Swap</button></div></section>';
      void idx;
    });
    if (!s.items.length) html += '<div class="lift-empty">' + pix("dumbbell", 4) + "<p>Empty bar. Add your first lift.</p></div>";
    html += '<button class="add-ex" data-act="add-ex">+ Add exercise</button>' +
      '<div class="wk-end"><button class="btn big-btn" data-act="finish">Finish workout</button>' +
      '<button class="linkish danger" data-act="discard">Discard workout</button></div>';
    return html;
  }
  function progressionHint(it, ps, ex) {
    var t = it.sets[0] && it.sets[0].t;
    if (!t || !ps.length || it.sets.some(function (x) { return x.done; })) return "";
    var n = Math.min(ps.length, it.sets.length), top = dw(ps[0]);
    for (var i = 0; i < n; i++) if (ps[i].r < t.max || dw(ps[i]) !== top) return "";
    if (ex.bw && !top) return "You hit " + t.max + " on every set last time. Add a little weight or slow the reps down.";
    return "You hit " + t.max + " on every set last time. Bar’s getting light: try <b>" + fmtN(top + step()) + " " + U() + "</b>.";
  }
  function deltaVs(st, p) {
    if (!p || st.w == null || st.r == null) return null;
    var pw = dw(p), w = dw(st);
    if (w === pw) {
      var d = st.r - p.r;
      return d > 0 ? { c: "up", t: "+" + plural(d, "rep") + " vs last" } : d < 0 ? { c: "down", t: "−" + plural(-d, "rep") + " vs last" } : { c: "same", t: "Matches last" };
    }
    return w > pw ? { c: "up", t: "+" + fmtN(w - pw) + " " + U() + " vs last" } : { c: "down", t: "−" + fmtN(pw - w) + " " + U() + " vs last" };
  }
  function setRow(st, j, p, ex) {
    var d = st.done ? deltaVs(st, p) : null;
    return '<div class="set-row' + (st.done ? " done" : "") + '" data-act="focus" data-set="' + st.id + '">' +
      '<span class="sn">' + (j + 1) + "</span>" +
      '<span class="prev">' + (p ? setTxt(dw(p), p.r, ex) : "—") + "</span>" +
      '<span class="now">' + (st.w != null || st.r != null ? setTxt(dw(st), st.r, ex) : '<i class="muted">tap to enter</i>') +
      (d && d.c === "up" ? ' <em class="d up">' + esc(d.t.replace(" vs last", "")) + "</em>" : "") + "</span>" +
      '<button class="chk' + (st.done ? " on" : "") + '" data-act="toggle" data-set="' + st.id + '" aria-label="' + (st.done ? "Unlog" : "Log") + " set " + (j + 1) + '">' +
      (st.done ? "✓" : "") + "</button></div>";
  }
  function setEditor(it, st, j, p, ex) {
    var d = deltaVs(st, p);
    return '<div class="set-edit' + (st.done ? " was-done" : "") + '" data-setid="' + st.id + '">' +
      '<div class="se-top"><span class="pxt">Set ' + (j + 1) + "</span>" + (st.t ? "<span>Target " + st.t.min + (st.t.max !== st.t.min ? "–" + st.t.max : "") + "</span>" : "") +
      '<span class="se-last">' + (p ? "Last <b>" + setTxt(dw(p), p.r, ex) + "</b>" : "No history yet") + "</span></div>" +
      '<div class="se-fields">' +
      '<div class="fld"><label for="in-w">' + (ex.bw ? U() + " added" : U()) + '</label><div class="stp"><button data-act="w-" aria-label="Less weight">−</button>' +
      '<input id="in-w" inputmode="decimal" autocomplete="off" value="' + (st.w == null ? "" : fmtN(dw(st))) + '" placeholder="' + (p ? fmtN(dw(p)) : "0") + '">' +
      '<button data-act="w+" aria-label="More weight">+</button></div></div>' +
      '<div class="fld"><label for="in-r">Reps</label><div class="stp"><button data-act="r-" aria-label="One less rep">−</button>' +
      '<input id="in-r" inputmode="numeric" autocomplete="off" value="' + (st.r == null ? "" : st.r) + '" placeholder="' + (st.t ? st.t.max : "0") + '">' +
      '<button data-act="r+" aria-label="One more rep">+</button></div></div></div>' +
      '<div class="se-delta ' + (d ? d.c : "") + '" id="se-delta">' + (d ? esc(d.t) : "&nbsp;") + "</div>" +
      '<button class="log-btn" data-act="log" data-set="' + st.id + '" id="log-btn">' + logLabel(st, ex) + "</button>" +
      (st.done ? '<button class="linkish" data-act="unlog" data-set="' + st.id + '">Unlog this set</button>' : "") + "</div>";
  }
  function logLabel(st, ex) {
    return (st.done ? "Update " : "Log ") + '<span class="lb-v">' + setTxt(dw(st), st.r, ex) + "</span>";
  }

  function viewRoutines() {
    var html = head("Routines", "Write your own, or run a Trainbloom program.");
    html += '<h2 class="sec">Mine</h2>';
    if (!db.routines.length) html += '<div class="lift-empty sm">' + pix("clipboard", 4) + "<p>No routines yet. Build one and it’s a single tap from Train.</p></div>";
    html += '<div class="list">' + db.routines.map(function (r) {
      return '<div class="list-row"><a href="#/routine/' + r.id + '"><b>' + esc(r.name || "Untitled") + "</b><small>" +
        esc(r.items.map(function (i) { return getEx(i.ex).name; }).join(" · ") || "No exercises yet") + "</small></a>" +
        '<button class="chip dark" data-act="start-routine" data-id="' + r.id + '">Start</button></div>';
    }).join("") + "</div>";
    html += '<button class="add-ex" data-act="new-routine">+ New routine</button>';
    html += '<h2 class="sec">Trainbloom programs</h2><div class="list">' + PROGRAMS.map(function (p) {
      return '<a class="list-row prog" href="#/program/' + p.id + '"><span><b>' + esc(p.name) + "</b><small>" + esc(p.author) + " · " + plural(p.routines.length, "day") + "</small></span><span class=\"go\">›</span></a>";
    }).join("") + "</div>";
    return html;
  }
  function viewProgram(id) {
    var p = PROGRAMS.filter(function (x) { return x.id === id; })[0];
    if (!p) return head("Program not found", "", "#/routines");
    var html = head(esc(p.name), esc(p.author) + " · v" + p.version, "#/routines") + '<p class="blurb">' + esc(p.blurb) + "</p>";
    p.routines.forEach(function (r) {
      html += '<section class="ex-card"><header class="ex-h"><span class="ex-name">' + esc(r.name) + "</span>" +
        '<button class="chip dark" data-act="start-program" data-id="' + p.id + '" data-key="' + r.key + '">Start</button></header><ul class="plan">' +
        r.items.map(function (i) { return "<li><span>" + esc(i.name) + "</span><b>" + i.sets + " × " + i.min + "–" + i.max + "</b></li>"; }).join("") +
        '</ul><div class="ex-foot"><button class="ghost-btn" data-act="copy-program" data-id="' + p.id + '" data-key="' + r.key + '">Copy to my routines</button></div></section>';
    });
    html += '<p class="note center">Your lift history stays yours. Switch programs any time and every lift keeps its past.</p>';
    return html;
  }
  function viewRoutineEdit(id) {
    var r = db.routines.filter(function (x) { return x.id === id; })[0];
    if (!r) return head("Routine not found", "", "#/routines");
    var html = '<div class="vhead"><a class="back" href="#/routines" aria-label="Back">‹</a><input class="r-name" data-field="routine-name" data-id="' + r.id +
      '" value="' + esc(r.name) + '" placeholder="Name it (e.g. Push Day)" aria-label="Routine name"></div><p class="vsub saved">Saves as you type.</p>';
    r.items.forEach(function (it, i) {
      var t = it.sets[0] || { min: 8, max: 10 };
      html += '<section class="ex-card r-item"><header class="ex-h"><span class="ex-name">' + esc(getEx(it.ex).name) + "</span>" +
        '<span class="r-move"><button data-act="r-up" data-i="' + i + '" aria-label="Move up">↑</button><button data-act="r-down" data-i="' + i + '" aria-label="Move down">↓</button>' +
        '<button data-act="r-del" data-i="' + i + '" aria-label="Remove">✕</button></span></header>' +
        '<div class="r-grid">' +
        '<div class="fld"><label>Sets</label><div class="stp sm"><button data-act="r-sets" data-i="' + i + '" data-d="-1">−</button><output>' + it.sets.length +
        '</output><button data-act="r-sets" data-i="' + i + '" data-d="1">+</button></div></div>' +
        '<div class="fld"><label>Reps</label><div class="range"><input inputmode="numeric" data-field="r-min" data-i="' + i + '" value="' + t.min + '" aria-label="Min reps"><span>–</span>' +
        '<input inputmode="numeric" data-field="r-max" data-i="' + i + '" value="' + t.max + '" aria-label="Max reps"></div></div>' +
        '<div class="fld"><label>Rest</label><select data-field="r-rest" data-i="' + i + '">' + [45, 60, 75, 90, 120, 150, 180, 210, 240, 300].map(function (s) {
          return '<option value="' + s + '"' + (s === it.rest ? " selected" : "") + ">" + restLabel(s) + "</option>";
        }).join("") + "</select></div></div></section>";
    });
    html += '<button class="add-ex" data-act="r-add" data-id="' + r.id + '">+ Add exercise</button>' +
      '<div class="wk-end"><button class="btn big-btn" data-act="start-routine" data-id="' + r.id + '"' + (r.items.length ? "" : " disabled") + ">Start this routine</button>" +
      '<button class="linkish danger" data-act="del-routine" data-id="' + r.id + '">Delete routine</button></div>';
    return html;
  }

  function liftSummaries() {
    var map = {};
    finished().forEach(function (s) {
      s.items.forEach(function (it) {
        var done = it.sets.filter(function (x) { return x.done; }); if (!done.length) return;
        var m = map[it.ex] || (map[it.ex] = { ex: getEx(it.ex), n: 0, last: 0, best: null, sessions: {} });
        if (!m.sessions[s.id]) { m.sessions[s.id] = 1; m.n++; }
        m.last = Math.max(m.last, s.startedAt);
        plain(done).forEach(function (x) { if (!m.best || e1rm(x.w, x.r) > e1rm(m.best.w, m.best.r)) m.best = x; });
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.last - a.last; });
  }
  function viewLifts() {
    var L = liftSummaries(), html = head("Lifts", "Every lift you’ve logged, across every routine and program.");
    if (!L.length) return html + '<div class="lift-empty">' + pix("chart", 5) + "<p>Nothing here yet. Log a set and it shows up.</p></div>";
    html += '<input id="lift-q" class="pick-q" type="search" placeholder="Find a lift" autocomplete="off"><div class="list" id="lift-list">';
    html += L.map(function (m) {
      return '<a class="list-row" href="#/lift/' + encodeURIComponent(m.ex.id) + '" data-name="' + esc(norm(m.ex.name)) + '"><span><b>' + esc(m.ex.name) + "</b><small>" +
        esc(dateLabel(m.last)) + " · " + plural(m.n, "session") + "</small></span><span class=\"best\"><small>Best</small>" + setTxt(m.best.w, m.best.r, m.ex) + "</span></a>";
    }).join("") + "</div>";
    return html;
  }
  function filterLifts(e) {
    var t = norm(e.target.value);
    document.querySelectorAll("#lift-list .list-row").forEach(function (a) { a.hidden = t && a.dataset.name.indexOf(t) < 0; });
  }
  function viewLift(id) {
    var ex = getEx(id), H = historyFor(id);
    var html = head(esc(ex.name), esc(ex.group), "#/lifts");
    if (!H.length) return html + '<div class="lift-empty">' + pix("dumbbell", 4) + "<p>No sets logged for this lift yet.</p></div>";
    var latest = compareSets(plain(H[0].sets), H[1] ? plain(H[1].sets) : null);
    var all = []; H.forEach(function (h) { all = all.concat(plain(h.sets)); });
    var heavy = all.reduce(function (b, x) { return !b || x.w > b.w || (x.w === b.w && x.r > b.r) ? x : b; }, null);
    var best = all.reduce(function (b, x) { return !b || e1rm(x.w, x.r) > e1rm(b.w, b.r) ? x : b; }, null);
    html += '<div class="headline">' + (latest.first ? "<b>First session logged.</b> Next time you’ll see exactly what moved." :
      latest.up.length ? latest.up.slice(0, 2).map(function (u) { return '<div class="hl-up">' + pix("star", 2) + "<span><b>" + esc(u.text) + "</b><small>" + esc(u.detail) + "</small></span></div>"; }).join("") :
        latest.down.length ? "<span>Off day last time: " + esc(latest.down[0].text) + ". It happens.</span>" : "<b>Matched your previous session.</b> Add a rep next time.") +
      '<small class="hl-cap">Latest (' + esc(dateLabel(H[0].session.startedAt)) + ")" + (H[1] ? " vs " + esc(dateLabel(H[1].session.startedAt)) : "") + "</small></div>";
    html += '<div class="stat3"><div><small>Heaviest</small><b>' + setTxt(heavy.w, heavy.r, ex) + "</b></div>" +
      "<div><small>Est. 1RM</small><b>" + (ex.bw && !best.w ? "—" : fmtN(Math.round(e1rm(best.w, best.r))) + " <i>" + U() + "</i>") + "</b></div>" +
      "<div><small>Sessions</small><b>" + H.length + "</b></div></div>";
    html += '<h2 class="sec">By date</h2><div class="hist">';
    H.forEach(function (h, i) {
      var c = compareSets(plain(h.sets), H[i + 1] ? plain(H[i + 1].sets) : null), src = h.session.source || {};
      html += '<a class="hist-row" href="#/session/' + h.session.id + '"><div class="hr-top"><b>' + esc(dateLabel(h.session.startedAt, true)) + "</b><span>" + esc(h.session.name) +
        (src.kind === "program" ? " · " + esc(src.label) : "") + "</span></div>" +
        '<div class="chips">' + h.sets.map(function (x) { return "<span>" + setTxt(dw(x), x.r, ex) + "</span>"; }).join("") + "</div>" +
        (c.up.length ? '<div class="d up">' + c.up.map(function (u) { return esc(u.text); }).join(" · ") + "</div>" : "") +
        (!c.up.length && c.down.length ? '<div class="d down">' + esc(c.down[0].text) + "</div>" : "") + "</a>";
    });
    return html + "</div>";
  }

  var DONE_LINES = ["Bar’s racked.", "Plates back on the tree.", "Logged. Now go eat.", "That one counts.", "Chalk dust settles."];
  function viewDone(id) {
    var s = db.sessions.filter(function (x) { return x.id === id; })[0];
    if (!s) return head("Workout not found", "", "#/");
    var c = countSets(s), vol = 0, reps = 0;
    s.items.forEach(function (it) { plain(it.sets).forEach(function (x) { vol += x.w * x.r; reps += x.r; }); });
    var html = '<div class="done-hero"><div class="lift-anim">' + barbellSVG() + pix("flower", 4, "bloom-pop") + '</div><div class="floor"></div>' +
      '<p class="pxt k">Workout complete</p><h1>' + esc(DONE_LINES[s.startedAt % DONE_LINES.length]) + "</h1></div>";
    html += '<div class="stat3"><div><small>Time</small><b>' + durWords(s.endedAt - s.startedAt) + "</b></div><div><small>Sets</small><b>" + c.done +
      "</b></div><div><small>Volume</small><b>" + Math.round(vol).toLocaleString() + " <i>" + U() + "</i></b></div></div>";
    html += '<h2 class="sec">What moved</h2><div class="moved">';
    var any = false;
    uniqueEx(s).forEach(function (exId) {
      var ex = getEx(exId), last = lastFor(exId, s.id, s.startedAt), cmp = compareSets(plain(doneSetsFor(s, exId)), last ? plain(last.sets) : null), prs = prsFor(s, exId);
      var lines = cmp.first ? ['<span class="d">First time. Baseline set.</span>'] :
        cmp.up.map(function (u) { return '<span class="d up">' + esc(u.text) + "<small>" + esc(u.detail) + "</small></span>"; });
      if (!cmp.first && !cmp.up.length) lines.push('<span class="d ' + (cmp.down.length ? "down" : "same") + '">' + esc(cmp.down.length ? cmp.down[0].text : "Matched last time") + "</span>");
      if (cmp.up.length || prs.length) any = true;
      html += '<div class="moved-row"><a href="#/lift/' + encodeURIComponent(exId) + '">' + esc(ex.name) + "</a>" + lines.join("") +
        prs.map(function (p) { return '<span class="pr">' + pix("star", 2) + esc(p) + "</span>"; }).join("") + "</div>";
    });
    html += "</div>" + (any ? "" : '<p class="note center">No new numbers today. Showing up is the part most people skip.</p>');
    html += '<div class="wk-end">' + (s.source && s.source.kind === "empty" ? '<button class="ghost-btn wide" data-act="save-as-routine" data-id="' + s.id + '">Save as a routine</button>' : "") +
      '<a class="btn big-btn" href="#/">Done</a></div>';
    return html;
  }
  function viewSession(id) {
    var s = db.sessions.filter(function (x) { return x.id === id; })[0];
    if (!s) return head("Workout not found", "", "#/");
    if (!s.endedAt) { location.replace("#/workout"); return ""; }
    var html = head(esc(s.name), esc(dateLabel(s.startedAt, true)) + " · " + durWords(s.endedAt - s.startedAt) + (s.source && s.source.kind === "program" ? " · " + esc(s.source.label) : ""), "#/");
    s.items.forEach(function (it) {
      var ex = getEx(it.ex);
      html += '<section class="ex-card"><header class="ex-h"><a class="ex-name" href="#/lift/' + encodeURIComponent(it.ex) + '">' + esc(ex.name) + " ›</a></header>" +
        '<div class="chips big">' + it.sets.map(function (x) { return "<span>" + setTxt(dw(x), x.r, ex) + "</span>"; }).join("") + "</div></section>";
    });
    html += '<div class="wk-end"><button class="btn big-btn" data-act="repeat" data-id="' + s.id + '">Do this workout again</button>' +
      (s.source && s.source.kind === "empty" ? '<button class="ghost-btn wide" data-act="save-as-routine" data-id="' + s.id + '">Save as a routine</button>' : "") +
      '<button class="linkish danger" data-act="del-session" data-id="' + s.id + '">Delete from history</button></div>';
    return html;
  }
  function viewSettings() {
    var st = db.settings;
    function seg(name, opts, cur) {
      return '<div class="seg">' + opts.map(function (o) {
        return '<button data-act="set" data-k="' + name + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }
    return head("Settings", "", "#/") +
      '<div class="settings">' +
      '<div class="fld"><label>Units</label>' + seg("unit", [["lb", "lb"], ["kg", "kg"]], st.unit) + "</div>" +
      '<div class="fld"><label>Rest timer after each set</label>' + seg("rest", [[true, "On"], [false, "Off"]], st.rest) + "</div>" +
      '<div class="fld"><label>Default rest</label>' + seg("restSec", [[60, "1:00"], [90, "1:30"], [120, "2:00"], [180, "3:00"]], st.restSec) + "</div>" +
      '<div class="fld"><label>Beep when rest ends</label>' + seg("sound", [[true, "On"], [false, "Off"]], st.sound) + "</div>" +
      '<div class="fld"><label>Keep screen on while lifting</label>' + seg("wake", [[true, "On"], [false, "Off"]], st.wake) + "</div>" +
      "</div>" +
      '<h2 class="sec">Your data</h2><p class="note">Workouts are saved on this device only. Export a backup now and then, especially before clearing your browser.</p>' +
      '<div class="settings-actions"><button class="ghost-btn wide" data-act="export">Export backup (.json)</button>' +
      '<label class="ghost-btn wide file">Import backup<input type="file" accept="application/json,.json" id="import-file" hidden></label>' +
      '<button class="linkish danger" data-act="wipe">Erase everything on this device</button></div>';
  }

  /* ---------------------------------------------------------------- events */

  function workoutSet() { var s = active(); return s && s.focus ? locate(s, s.focus) : null; }
  function refreshEditor() {
    var L = workoutSet(); if (!L) return;
    var s = active(), last = lastFor(L.item.ex, s.id), p = last ? last.sets[L.j] || null : null, d = deltaVs(L.set, p);
    var el = document.getElementById("se-delta");
    if (el) { el.className = "se-delta " + (d ? d.c : ""); el.innerHTML = d ? esc(d.t) : "&nbsp;"; }
    var b = document.getElementById("log-btn"); if (b) b.innerHTML = logLabel(L.set, getEx(L.item.ex));
  }

  var ACT = {
    "sheet-close": closeSheet,
    "start-empty": startEmpty,
    "start-routine": function (b) { startRoutine(b.dataset.id); },
    "start-program": function (b) { startProgram(b.dataset.id, b.dataset.key); },
    "undo": undo,
    "finish": function () {
      var s = active(), c = countSets(s);
      if (!c.done) { if (confirm("Nothing logged yet. Leave this workout?")) { finishActive(); } return; }
      var left = c.total - c.done;
      if (left && !confirm(plural(left, "set") + " not logged. Finish anyway? (They won’t be saved.)")) return;
      finishActive();
    },
    "discard": discardActive,
    "focus": function (b) { var s = active(); if (s.focus === b.dataset.set) return; s.focus = b.dataset.set; save(); render(); scrollToFocus(); },
    "toggle": function (b) {
      var s = active(), L = locate(s, b.dataset.set); if (!L) return;
      if (L.set.done) unlogSet(L.set.id); else logSet(L.set.id);
    },
    "log": function (b) { logSet(b.dataset.set); },
    "unlog": function (b) { unlogSet(b.dataset.set); },
    "w-": function () { bump("w", -step()); }, "w+": function () { bump("w", step()); },
    "r-": function () { bump("r", -1); }, "r+": function () { bump("r", 1); },
    "add-set": function (b) { addSet(b.dataset.item); },
    "add-ex": function () { openPicker("Add exercise", addExercise); },
    "swap": function (b) { var it = itemById(active(), b.dataset.item); openPicker("Swap " + getEx(it.ex).name, function (id) { swapExercise(it.id, id); }, { group: getEx(it.ex).group, exclude: it.ex }); },
    "lift-hist": function (b) { go("#/lift/" + encodeURIComponent(b.dataset.ex)); },
    "ex-menu": function (b) {
      var s = active(), it = itemById(s, b.dataset.item), i = s.items.indexOf(it);
      openSheet('<h2 class="sheet-h">' + esc(getEx(it.ex).name) + '</h2><div class="menu">' +
        '<button data-act="swap" data-item="' + it.id + '">⇄ Swap exercise <small>equipment taken?</small></button>' +
        '<button data-act="add-set" data-item="' + it.id + '">+ Add a set</button>' +
        '<button data-act="rm-set" data-item="' + it.id + '"' + (it.sets.length ? "" : " disabled") + ">− Remove last set</button>" +
        '<button data-act="rest-set" data-item="' + it.id + '">Rest time · ' + restLabel(it.rest || db.settings.restSec) + "</button>" +
        (i > 0 ? '<button data-act="mv" data-d="-1" data-item="' + it.id + '">↑ Move up</button>' : "") +
        (i < s.items.length - 1 ? '<button data-act="mv" data-d="1" data-item="' + it.id + '">↓ Move down</button>' : "") +
        '<button data-act="lift-hist" data-ex="' + esc(it.ex) + '">History for this lift</button>' +
        '<button class="danger" data-act="rm-item" data-item="' + it.id + '">Remove exercise</button></div>');
    },
    "rm-set": function (b) { removeSet(b.dataset.item); },
    "rm-item": function (b) { removeItem(b.dataset.item); },
    "mv": function (b) { moveItem(b.dataset.item, +b.dataset.d); },
    "rest-set": function (b) {
      var it = itemById(active(), b.dataset.item);
      openSheet('<h2 class="sheet-h">Rest for ' + esc(getEx(it.ex).name) + '</h2><div class="rest-grid">' + [45, 60, 75, 90, 120, 150, 180, 240, 300].map(function (x) {
        return '<button data-act="rest-pick" data-item="' + it.id + '" data-s="' + x + '" aria-pressed="' + ((it.rest || db.settings.restSec) === x) + '">' + restLabel(x) + "</button>";
      }).join("") + "</div>");
    },
    "rest-pick": function (b) { var it = itemById(active(), b.dataset.item); it.rest = +b.dataset.s; save(); render(); },
    "rest-adj": function (b) { var s = active(); if (!s.rest) return; s.rest.end += +b.dataset.d * 1000; s.rest.total = Math.max(15, s.rest.total + +b.dataset.d); save(); paintRest(); },
    "rest-skip": function () { var s = active(); if (s) { delete s.rest; save(); } hideRest(); },
    "new-routine": function () {
      var r = { id: uid(), name: "", items: [], createdAt: Date.now(), source: { kind: "mine" } };
      db.routines.push(r); save(); go("#/routine/" + r.id);
    },
    "copy-program": function (b) {
      var p = PROGRAMS.filter(function (x) { return x.id === b.dataset.id; })[0], pr = p.routines.filter(function (x) { return x.key === b.dataset.key; })[0];
      var r = { id: uid(), name: pr.name + " (" + p.name + ")", createdAt: Date.now(), source: { kind: "mine", copiedFrom: { programId: p.id, version: p.version, routineKey: pr.key } },
        items: templateItems(pr, "program").map(function (i) { return { ex: i.ex, sets: i.targets, rest: i.rest }; }) };
      db.routines.push(r); save(); toast("Copied. Edit it however you like."); go("#/routine/" + r.id);
    },
    "r-add": function (b) {
      openPicker("Add to routine", function (exId) {
        var r = routineById(b.dataset.id); var prev = r.items[r.items.length - 1];
        r.items.push({ ex: exId, sets: [1, 2, 3].map(function () { return { min: 8, max: 12 }; }), rest: prev ? prev.rest : db.settings.restSec });
        save(); render();
      });
    },
    "r-up": function (b) { routineMove(+b.dataset.i, -1); }, "r-down": function (b) { routineMove(+b.dataset.i, 1); },
    "r-del": function (b) { var r = curRoutine(); r.items.splice(+b.dataset.i, 1); save(); render(); },
    "r-sets": function (b) {
      var it = curRoutine().items[+b.dataset.i], n = it.sets.length + +b.dataset.d;
      if (n < 1 || n > 12) return;
      if (n > it.sets.length) it.sets.push(Object.assign({}, it.sets[it.sets.length - 1])); else it.sets.pop();
      save(); render();
    },
    "del-routine": function (b) {
      if (!confirm("Delete this routine? Your logged workouts stay in history.")) return;
      db.routines = db.routines.filter(function (r) { return r.id !== b.dataset.id; }); save(); go("#/routines");
    },
    "save-as-routine": function (b) {
      var s = db.sessions.filter(function (x) { return x.id === b.dataset.id; })[0];
      var r = { id: uid(), name: s.name === "Workout" ? "" : s.name, createdAt: Date.now(), source: { kind: "mine" }, items: s.items.map(function (it) {
        return { ex: it.ex, rest: it.rest, sets: it.sets.map(function (x) { return x.t || { min: Math.max(1, x.r - 2), max: x.r }; }) };
      }) };
      db.routines.push(r); save(); go("#/routine/" + r.id); toast("Routine saved. Give it a name.");
    },
    "repeat": function (b) {
      var s = db.sessions.filter(function (x) { return x.id === b.dataset.id; })[0];
      startFromTemplate(s.name, s.items.map(function (it) { return { ex: it.ex, targets: it.sets.map(function (x) { return x.t; }), rest: it.rest }; }),
        Object.assign({}, s.source || { kind: "empty" }));
    },
    "del-session": function (b) {
      if (!confirm("Delete this workout from your history?")) return;
      db.sessions = db.sessions.filter(function (x) { return x.id !== b.dataset.id; }); save(); go("#/");
    },
    "set": function (b) {
      var v = b.dataset.v; v = v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v;
      db.settings[b.dataset.k] = v; save(); render();
    },
    "export": function () {
      var blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "bloom-lifts-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    },
    "wipe": function () {
      if (!confirm("Erase every workout, routine and setting on this device? This can’t be undone.")) return;
      db = blank(); save(); go("#/");
    }
  };
  function bump(k, d) {
    var L = workoutSet(); if (!L) return;
    var v = k === "w" ? dw(L.set) : L.set[k];
    if (k === "w" && v == null) { var s = active(), last = lastFor(L.item.ex, s.id); v = last && last.sets[L.j] ? dw(last.sets[L.j]) : 0; d = v ? d : 0; }
    if (k === "w") L.set.u = U();
    L.set[k] = Math.max(0, round1((v || 0) + d));
    save();
    var input = document.getElementById(k === "w" ? "in-w" : "in-r"); if (input) input.value = fmtN(L.set[k]);
    refreshEditor();
  }
  function routineById(id) { return db.routines.filter(function (x) { return x.id === id; })[0]; }
  function curRoutine() { return routineById(route().id); }
  function routineMove(i, d) {
    var r = curRoutine(), j = i + d; if (j < 0 || j >= r.items.length) return;
    var it = r.items.splice(i, 1)[0]; r.items.splice(j, 0, it); save(); render();
  }

  document.addEventListener("click", function (e) {
    unlockAudio();
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    if (e.target.closest("input")) return; // typing into a set shouldn't refocus it
    var fn = ACT[b.dataset.act]; if (!fn) return;
    e.preventDefault();
    if (b.closest("#sheet") && b.dataset.act !== "swap" && b.dataset.act !== "rest-set") closeSheet();
    fn(b);
  });

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.id === "in-w" || el.id === "in-r") {
      var L = workoutSet(); if (!L) return;
      var raw = el.value.replace(",", ".").trim(), n = raw === "" ? null : parseFloat(raw);
      if (n != null && !isFinite(n)) return;
      if (el.id === "in-w") { L.set.w = n; L.set.u = U(); } else L.set.r = n == null ? null : Math.round(n);
      save(); refreshEditor(); return;
    }
    var f = el.dataset.field; if (!f) return;
    if (f === "session-name") { var s = active(); s.name = el.value || "Workout"; save(); return; }
    if (f === "routine-name") { var r0 = routineById(el.dataset.id); r0.name = el.value; save(); return; }
    var r = curRoutine(); if (!r) return;
    var it = r.items[+el.dataset.i];
    if (f === "r-rest") it.rest = +el.value;
    else {
      var v = parseInt(el.value, 10); if (!(v > 0)) return;
      it.sets.forEach(function (t) { if (f === "r-min") { t.min = v; if (t.max < v) t.max = v; } else { t.max = v; if (t.min > v) t.min = v; } });
    }
    save();
  });
  document.addEventListener("change", function (e) {
    if (e.target.dataset.field === "r-min" || e.target.dataset.field === "r-max") render();
    if (e.target.id === "import-file" && e.target.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || d.v !== 1 || !Array.isArray(d.sessions)) throw new Error("bad");
          if (!confirm("Replace everything on this device with this backup (" + plural(d.sessions.length, "workout") + ")?")) return;
          localStorage.setItem(KEY, JSON.stringify(d)); db = load(); toast("Backup restored"); go("#/");
        } catch (err) { toast("That file isn’t a Bloom backup."); }
      };
      rd.readAsText(e.target.files[0]);
    }
  });
  // Enter on the reps field logs the set: fast when typing on a phone keyboard.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.target.id === "in-r" || e.target.id === "in-w")) {
      e.preventDefault(); var L = workoutSet(); if (L) { e.target.blur(); logSet(L.set.id); }
    }
    if (e.key === "Escape") closeSheet();
  });

  function tick() {
    var s = active();
    if (s) document.querySelectorAll("[data-elapsed]").forEach(function (el) { el.textContent = dur(Date.now() - s.startedAt); });
    if (s && s.rest) paintRest();
  }
  setInterval(tick, 500);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { db = load(); render(); } else save(); syncWake(); });
  window.addEventListener("pagehide", save);
  window.addEventListener("hashchange", function () { closeSheet(); document.getElementById("toast").hidden = true; render(); window.scrollTo(0, 0); });
  // Another tab changed the log: pick it up.
  window.addEventListener("storage", function (e) { if (e.key === KEY) { db = load(); render(); } });

  document.querySelectorAll("[data-pix]").forEach(function (el) { el.innerHTML = pix(el.dataset.pix, 2); });
  render();
  if (route().name === "workout") scrollToFocus();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/workout-tracker/sw.js", { scope: "/workout-tracker/" }).catch(function () {});
  }

  // Exposed for debugging and tests.
  window.BloomLift = { db: function () { return db; }, compareSets: compareSets, PROGRAMS: PROGRAMS };
})();
