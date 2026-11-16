// Can I Work In? — rules + solver. Shared by the game (browser) and tools/workin-check.js (Node).
//
// The bar holds a stack of plates per side (both sides mirror). Moves:
//   add    — slide a pair of one plate size on as the new outermost pair
//   remove — pull the outermost pair off
// Each move costs 1. After every move, if the total equals the active target,
// that target is checked off and the next one becomes active. Plates stay put.
(function (root) {
  // t = thickness on the sleeve, h = diameter (game units; the sleeve holds SLEEVE units)
  var PLATES = [
    { w: 45,  t: 12, h: 60, face: "#3d3a8c", edge: "#26245e", hi: "#5b57b8", ink: "#ffffff" },
    { w: 35,  t: 11, h: 52, face: "#e7b416", edge: "#a27c07", hi: "#ffd94d", ink: "#2a2000" },
    { w: 25,  t: 10, h: 44, face: "#2f9d5c", edge: "#1d6a3d", hi: "#4fc77f", ink: "#ffffff" },
    { w: 10,  t: 9,  h: 33, face: "#f1f1f3", edge: "#9a9aa6", hi: "#ffffff", ink: "#242424" },
    { w: 5,   t: 8,  h: 26, face: "#d6453d", edge: "#8f2722", hi: "#f2766f", ink: "#ffffff" },
    { w: 2.5, t: 8,  h: 20, face: "#9d91be", edge: "#6f6496", hi: "#c9c3e6", ink: "#111114" }
  ];
  var SLEEVE = 62;
  var BAR = 45;
  var DEFAULT_RACK = { "45": 2, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }; // pairs

  function idxOf(w) {
    for (var i = 0; i < PLATES.length; i++) if (PLATES[i].w === Number(w)) return i;
    return -1;
  }

  // Normalise a puzzle entry into { targets, bar, counts[], who[] }
  function normalize(p, defaults) {
    defaults = defaults || {};
    var rack = p.rack || defaults.rack || DEFAULT_RACK;
    var counts = PLATES.map(function (pl) { return Number(rack[String(pl.w)] || 0); });
    var who = p.who || p.targets.map(function (_, i) { return i % 2 ? "them" : "you"; });
    return { targets: p.targets.slice(), bar: p.bar || defaults.bar || BAR, counts: counts, who: who, rack: rack };
  }

  function sideLoad(stack) { var s = 0; for (var i = 0; i < stack.length; i++) s += PLATES[stack[i]].w; return s; }
  function total(pz, stack) { return pz.bar + 2 * sideLoad(stack); }
  function used(stack, i) { var n = 0; for (var k = 0; k < stack.length; k++) if (stack[k] === i) n++; return n; }
  function thick(stack) { var s = 0; for (var i = 0; i < stack.length; i++) s += PLATES[stack[i]].t; return s; }

  // Why can't plate i go on right now? null = it can.
  function blockAdd(pz, stack, i) {
    if (used(stack, i) >= pz.counts[i]) return "none";
    if (thick(stack) + PLATES[i].t > SLEEVE) return "full";
    return null;
  }

  // Apply a move. move = { type: "add", plate: i } | { type: "remove" }. Returns new state or null.
  function step(pz, st, move) {
    var stack = st.stack.slice();
    if (move.type === "add") {
      if (blockAdd(pz, stack, move.plate)) return null;
      stack.push(move.plate);
    } else {
      if (!stack.length) return null;
      stack.pop();
    }
    var ti = st.ti;
    var hit = ti < pz.targets.length && total(pz, stack) === pz.targets[ti];
    if (hit) ti++;
    return { stack: stack, ti: ti, hit: hit };
  }

  function key(st) { return st.stack.join(",") + "|" + st.ti; }

  // Neighbours worth exploring. Loading past every remaining target is never optimal
  // (no target can be hit until those plates come back off), so those adds are pruned.
  function neighbours(pz, st, cap) {
    var out = [];
    if (st.stack.length) out.push({ type: "remove" });
    var load = total(pz, st.stack);
    for (var i = 0; i < PLATES.length; i++) {
      if (load + 2 * PLATES[i].w > cap) continue;
      if (!blockAdd(pz, st.stack, i)) out.push({ type: "add", plate: i });
    }
    return out;
  }

  function suffixMax(arr) {
    var m = new Array(arr.length + 1); m[arr.length] = -Infinity;
    for (var i = arr.length - 1; i >= 0; i--) m[i] = Math.max(arr[i], m[i + 1]);
    return m;
  }

  // True minimum number of moves to clear every remaining target from `from`.
  // Breadth-first search over (plate stack, active target) states.
  function solve(pz, from) {
    var start = { stack: (from && from.stack || []).slice(), ti: from ? from.ti : 0 };
    var n = pz.targets.length;
    if (start.ti >= n) return { min: 0, path: [] };
    var maxRem = suffixMax(pz.targets);
    var prev = new Map(); prev.set(key(start), null);
    var queue = [start], head = 0;
    while (head < queue.length) {
      var st = queue[head++];
      var moves = neighbours(pz, st, maxRem[st.ti]);
      for (var m = 0; m < moves.length; m++) {
        var nx = step(pz, st, moves[m]);
        var k = key(nx);
        if (prev.has(k)) continue;
        prev.set(k, { from: key(st), move: moves[m], state: nx });
        if (nx.ti === n) return { min: rebuild(prev, k).length, path: rebuild(prev, k) };
        queue.push(nx);
      }
    }
    return { min: Infinity, path: null };
  }

  function rebuild(prev, k) {
    var path = [];
    for (var e = prev.get(k); e; e = prev.get(e.from)) path.unshift({ move: e.move, hit: e.state.hit, total: null });
    return path;
  }

  // All states that hit the *active* target in the fewest moves (a lifter who only plans for now).
  function nearestHits(pz, st) {
    var target = pz.targets[st.ti];
    var seen = new Set([key(st)]), level = [st], d = 0;
    while (level.length) {
      d++;
      var next = [], hits = [], hitKeys = new Set();
      for (var a = 0; a < level.length; a++) {
        var moves = neighbours(pz, level[a], target);
        for (var m = 0; m < moves.length; m++) {
          var nx = step(pz, level[a], moves[m]), k = key(nx);
          if (nx.hit) { if (!hitKeys.has(k)) { hitKeys.add(k); hits.push(nx); } continue; }
          if (seen.has(k)) continue;
          seen.add(k); next.push(nx);
        }
      }
      if (hits.length) return { d: d, hits: hits };
      level = next;
    }
    return { d: Infinity, hits: [] };
  }

  // Score a "one target at a time" player over every tie they could pick.
  function greedy(pz) {
    var memo = new Map();
    function go(st) {
      if (st.ti >= pz.targets.length) return { best: 0, worst: 0 };
      var k = key(st); if (memo.has(k)) return memo.get(k);
      var r = nearestHits(pz, st), best = Infinity, worst = -Infinity;
      for (var i = 0; i < r.hits.length; i++) {
        var sub = go({ stack: r.hits[i].stack, ti: r.hits[i].ti });
        best = Math.min(best, r.d + sub.best); worst = Math.max(worst, r.d + sub.worst);
      }
      var res = { best: best, worst: worst }; memo.set(k, res); return res;
    }
    return go({ stack: [], ti: 0 });
  }

  function validate(pz) {
    var errs = [];
    if (!pz.targets.length) errs.push("no targets");
    pz.targets.forEach(function (t, i) {
      if ((t - pz.bar) % 5 !== 0) errs.push("target " + t + " is not loadable in 5 lb steps");
      if (t < pz.bar) errs.push("target " + t + " is lighter than the bar");
      if (i === 0 && t === pz.bar) errs.push("first target equals the empty bar");
      if (i > 0 && t === pz.targets[i - 1]) errs.push("targets " + i + " and " + (i + 1) + " are the same weight");
    });
    return errs;
  }

  function analyze(pz) {
    var errs = validate(pz);
    var s = solve(pz);
    if (s.min === Infinity) errs.push("unsolvable with this rack");
    var g = errs.length ? { best: NaN, worst: NaN } : greedy(pz);
    return { errors: errs, min: s.min, path: s.path, greedyBest: g.best, greedyWorst: g.worst, aheadSaves: g.worst - s.min };
  }

  // Annotate a path with running totals for display.
  function describe(pz, path) {
    var st = { stack: [], ti: 0 };
    return path.map(function (p) {
      st = step(pz, st, p.move);
      return { move: p.move, plate: p.move.type === "add" ? PLATES[p.move.plate].w : null, total: total(pz, st.stack), hit: st.hit, stack: st.stack.slice() };
    });
  }

  var api = {
    PLATES: PLATES, SLEEVE: SLEEVE, BAR: BAR, DEFAULT_RACK: DEFAULT_RACK,
    idxOf: idxOf, normalize: normalize, total: total, sideLoad: sideLoad, used: used, thick: thick,
    blockAdd: blockAdd, step: step, solve: solve, greedy: greedy, analyze: analyze, validate: validate, describe: describe
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorkInEngine = api;
})(this);
