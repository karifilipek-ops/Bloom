// Validate every "Can I Work In?" puzzle and print its true minimum.
//   node tools/workin-check.js
// Exits non-zero if a puzzle is broken or the #001 reference solution stops holding.
var E = require("../assets/js/workin-engine.js");
var data = require("../assets/js/workin-puzzles.js");
var bad = 0;

function assert(ok, msg) { if (!ok) { bad++; console.log("FAIL  " + msg); } }

// Reference checks for the opening puzzle (185 -> 95 -> 115).
var p1 = E.normalize(data.puzzles[0], data);
var s1 = E.solve(p1);
assert(s1.min === 4, "#001 minimum should be 4, got " + s1.min);
var st = { stack: [], ti: 0 };
[["add", 25], ["add", 45], ["remove"], ["add", 10]].forEach(function (m) {
  st = E.step(p1, st, m[0] === "add" ? { type: "add", plate: E.idxOf(m[1]) } : { type: "remove" });
});
assert(st && st.ti === 3, "#001: +25 +45 -45 +10 should clear all three targets");
var after45 = E.step(p1, { stack: [], ti: 0 }, { type: "add", plate: E.idxOf(45) });
assert(1 + E.solve(p1, after45).min >= 6, "#001: loading the 45s first should cost at least 6");

console.log(" #    targets                    min  one-at-a-time  saved by planning");
data.puzzles.forEach(function (raw, i) {
  var pz = E.normalize(raw, data), a = E.analyze(pz);
  var id = "#" + String(i + 1).padStart(3, "0");
  if (a.errors.length) { bad++; console.log("FAIL  " + id + " " + a.errors.join("; ")); return; }
  var flag = a.aheadSaves < 2 ? "   <- weak: planning ahead barely helps" : "";
  console.log(id + "  " + pz.targets.join(" > ").padEnd(26) + String(a.min).padStart(4) +
    ("   " + a.greedyBest + "-" + a.greedyWorst).padEnd(16) + "up to " + a.aheadSaves + flag);
});
console.log(bad ? "\n" + bad + " problem(s)" : "\nAll " + data.puzzles.length + " puzzles OK");
process.exit(bad ? 1 : 0);
