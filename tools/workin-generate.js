// Propose new "Can I Work In?" puzzles. Prints JSON lines you can paste into assets/js/workin-puzzles.js.
//   node tools/workin-generate.js [count=40] [seed=1]
// Ranks candidates by how many moves a "one target at a time" lifter can waste
// (greedyWorst - min) and whether even their luckiest play misses the minimum.
var E = require("../assets/js/workin-engine.js");
var count = Number(process.argv[2] || 40), seed = Number(process.argv[3] || 1);
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }

var RACKS = [
  null, // default
  { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 },             // no 35s
  { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 },    // one pair of 45s
  { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 },    // thin rack
  { "45": 3, "25": 1, "10": 2, "5": 1 }                         // plate-hog gym
];
// Gym-ish numbers: every 10 lb, plus the classic 5s (95, 135, 185, 225, ...)
var WEIGHTS = []; for (var w = 65; w <= 315; w += 5) if (w % 10 === 0 || w % 50 === 35 || w % 50 === 45 || w % 50 === 15) WEIGHTS.push(w);
var seen = new Set(), out = [];
for (var tries = 0; tries < 20000 && out.length < count * 6; tries++) {
  var n = pick([3, 3, 4, 4, 5]), targets = [];
  while (targets.length < n) { var t = pick(WEIGHTS); if (t !== targets[targets.length - 1]) targets.push(t); }
  var rack = pick(RACKS), entry = rack ? { targets: targets, rack: rack } : { targets: targets };
  var k = JSON.stringify(entry); if (seen.has(k)) continue; seen.add(k);
  var a = E.analyze(E.normalize(entry));
  if (a.errors.length || a.min < 4 || a.min > 10 || a.aheadSaves < 2) continue;
  var score = (a.greedyBest > a.min ? 30 : 0) + Math.min(a.aheadSaves, 8) * 3 - Math.abs(a.min - 6) * 4 - (n - 3) * 2;
  out.push({ entry: entry, a: a, score: score });
}
out.sort(function (x, y) { return y.score - x.score; });
out.slice(0, count).forEach(function (o) {
  console.log(JSON.stringify(o.entry) + ",  // min " + o.a.min + ", greedy " + o.a.greedyBest + "-" + o.a.greedyWorst);
});
