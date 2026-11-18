/* Trainbloom body graphics (smooth vector, not pixel art).
 *
 *  LiftBody.map(levels)        front + back anatomical figure, each muscle its own shape,
 *                              filled by how much work it got (levels: { chest: 0..1+, ... }).
 *  LiftBody.torso(level, sex)  shaded torso for the body-fat picker (level 0 = leanest .. 8).
 *
 * Shapes are written for the figure's left side (viewer's right) and mirrored, then smoothed
 * with Catmull-Rom curves, so editing a muscle is just nudging a few points.
 */
window.LiftBody = (function () {
  "use strict";

  // Closed smooth path through points (Catmull-Rom converted to cubic Béziers).
  function smooth(pts) {
    var n = pts.length, d = "M" + f(pts[0][0]) + "," + f(pts[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += "C" + f(p1[0] + (p2[0] - p0[0]) / 6) + "," + f(p1[1] + (p2[1] - p0[1]) / 6) + " " +
        f(p2[0] - (p3[0] - p1[0]) / 6) + "," + f(p2[1] - (p3[1] - p1[1]) / 6) + " " + f(p2[0]) + "," + f(p2[1]);
    }
    return d + "Z";
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function mirror(pts, cx) { return pts.map(function (p) { return [2 * cx - p[0], p[1]]; }); }
  // Right half + mirrored left half as one closed outline (right listed top→bottom).
  function sym(right, cx) { return right.concat(mirror(right, cx).reverse()); }

  /* ---------------------------------------------------------------- muscle map */

  var RAMP = ["#3a3552", "#4e4577", "#665a9f", "#8170c8", "#a08ef0", "#d6ccff"];
  var BASE = "#2b2841", GAP = "#0d0c16";
  function rampIdx(v) { return v == null ? 0 : v <= 0 ? 0 : v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.75 ? 3 : v < 1 ? 4 : 5; }

  // Silhouette pieces (right side of a figure centred on x=50).
  var TORSO = [[54, 21], [55.5, 28], [62, 31], [69, 33.5], [68, 46], [66.5, 58], [64, 72], [64.5, 84], [67, 95], [66, 104], [56, 110], [50, 111]];
  var ARM = [[64, 31.5], [70.5, 31.8], [75.5, 37], [77.2, 48], [78, 62], [80, 74], [81.5, 86], [82.5, 98], [84, 104], [83, 113], [79.5, 113.5], [77.5, 105], [76, 98],
    [73.5, 86], [72, 76], [70, 64], [68.5, 52], [66.5, 40]];
  var LEG = [[51.5, 106], [56, 99], [66.5, 96], [69, 108], [68.5, 124], [66.5, 140], [64.5, 150], [65.5, 162], [64.5, 178], [61.5, 193], [63.5, 199], [64, 205], [56.5, 206],
    [55, 199], [55.2, 188], [53.8, 172], [53.2, 156], [52.4, 142], [51.6, 124]];
  var FRONT = [
    ["traps", [[53.5, 25.5], [58, 28.8], [65, 31.8], [59, 32.6], [54.5, 30.5]]],
    ["shoulders", [[64.5, 32.2], [70.5, 32.4], [75, 37.5], [76.2, 46], [73.5, 51.5], [70.5, 47], [66.5, 39]]],
    ["chest", [[50.8, 35], [57, 33.6], [64.5, 35.5], [68.2, 41.5], [66.8, 48.5], [62, 52.4], [55.5, 53.2], [50.8, 51]]],
    ["biceps", [[69.2, 50.5], [73.2, 52.5], [75.8, 58.5], [76.2, 67], [73.8, 73.5], [71, 69], [69.4, 60]]],
    ["forearms", [[73.2, 77.5], [78.2, 78.8], [80.6, 87], [81.2, 97.5], [78, 99.5], [75.6, 92], [73.6, 84.5]]],
    ["abs", [[51, 56], [56, 55.6], [56.4, 63.5], [51, 64]]],
    ["abs", [[51, 66], [56.4, 65.6], [56.6, 73.5], [51, 74]]],
    ["abs", [[51, 76], [56.6, 75.6], [56.4, 84], [51, 84.5]]],
    ["abs", [[51, 86.5], [56, 86.2], [54.8, 97], [51, 99]]],
    ["abs", [[58.4, 56.5], [64.2, 59.5], [63.6, 71], [61.8, 83.5], [60, 92], [57.8, 87], [58.2, 70]]],
    ["quads", [[56.5, 103.5], [63, 100], [67.6, 106.5], [67.6, 122], [65.6, 137], [61.6, 146.5], [58.4, 143], [57, 130], [55.2, 116]]],
    ["quads", [[53.2, 112], [55.6, 118], [57.6, 132], [59.6, 143], [56.8, 147.2], [53.6, 140], [52.6, 126]]],
    ["calves", [[63.2, 157], [65, 165], [64.2, 177], [62, 180], [61.4, 168]]],
    ["calves", [[54, 158], [55.6, 164], [55.4, 176], [54.4, 178], [53.6, 168]]]
  ];
  var BACK = [
    ["traps", [[50.6, 22.5], [55, 27], [64.5, 31.8], [59, 35.5], [55.5, 42], [52.5, 52], [50.6, 55]]],
    ["shoulders", [[64.5, 32.2], [70.5, 32.4], [75, 37.5], [76.2, 46], [73.5, 51.5], [70.5, 47], [66.5, 39]]],
    ["back", [[56.5, 38.5], [63, 36.6], [67.4, 40.2], [63, 43.6], [56.6, 43.8]]],
    ["back", [[54.8, 47], [61, 46.5], [67.4, 46], [67.6, 54], [65.2, 64], [60.8, 73.5], [56, 77.5], [53.6, 62]]],
    ["lowback", [[51, 72], [55.4, 77.6], [57, 88], [55.6, 94], [51, 93]]],
    ["triceps", [[69.2, 50.5], [73.6, 51.5], [76.2, 59], [75.8, 69], [73, 74], [70.6, 67], [69.2, 58]]],
    ["forearms", [[73.2, 77.5], [78.2, 78.8], [80.6, 87], [81.2, 97.5], [78, 99.5], [75.6, 92], [73.6, 84.5]]],
    ["glutes", [[51, 95.5], [57.5, 92], [65.4, 95.5], [68, 104], [66, 113.5], [59, 117.5], [51, 114.5]]],
    ["hamstrings", [[59.4, 120], [65.6, 121.5], [66.4, 133], [64, 144], [60.4, 147], [59.2, 134]]],
    ["hamstrings", [[52.8, 120.5], [57.6, 120], [57.8, 134], [58.6, 146.5], [55, 145], [52.8, 132]]],
    ["calves", [[59, 152.5], [63.8, 155], [65.4, 165], [63, 177], [59.6, 171]]],
    ["calves", [[54, 153], [57.8, 154], [58, 168], [55.6, 179], [53.6, 167]]]
  ];

  function figure(cx, shapes, levels, head) {
    var dx = cx - 50, out = '<g transform="translate(' + dx + ',0)">';
    // silhouette
    out += '<ellipse cx="50" cy="12.5" rx="7.4" ry="9.4" fill="' + BASE + '"/>';
    out += '<path d="' + smooth(sym(TORSO, 50)) + '" fill="' + BASE + '"/>';
    [ARM, LEG].forEach(function (p) {
      out += '<path d="' + smooth(p) + '" fill="' + BASE + '" stroke="' + GAP + '" stroke-width="0.9"/>';
      out += '<path d="' + smooth(mirror(p, 50)) + '" fill="' + BASE + '" stroke="' + GAP + '" stroke-width="0.9"/>';
    });
    if (head) out += head;
    shapes.forEach(function (s) {
      var c = RAMP[rampIdx(levels[s[0]])], glow = rampIdx(levels[s[0]]) >= 4;
      [s[1], mirror(s[1], 50)].forEach(function (pts) {
        out += '<path class="m-' + s[0] + '" d="' + smooth(pts) + '" fill="' + c + '" stroke="' + GAP + '" stroke-width="1.15" stroke-linejoin="round"' + (glow ? ' filter="url(#lb-glow)"' : "") + "/>";
      });
    });
    return out + "</g>";
  }
  function map(levels) {
    levels = levels || {};
    return '<svg class="bodymap" viewBox="0 0 210 212" role="img" aria-label="Body map, front and back">' +
      '<defs><filter id="lb-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      figure(55, FRONT, levels) +
      figure(155, BACK, levels) + "</svg>";
  }

  /* ---------------------------------------------------------------- body-fat torsos */

  var MALE = { waist: [20.5, 21.5, 22.8, 24.2, 25.8, 27.4, 29, 30.6, 32.2], hip: [24, 24.5, 25.2, 26.2, 27.4, 28.6, 30, 31.4, 32.8], belly: [0, 0, 0, 0.5, 1.6, 3.2, 5, 7, 9] };
  var FEMALE = { waist: [18.5, 19.5, 20.6, 22, 23.6, 25.2, 26.8, 28.4, 30], hip: [27, 27.6, 28.4, 29.4, 30.6, 31.8, 33.2, 34.6, 36], belly: [0, 0, 0, 0.3, 1, 2.2, 3.6, 5, 6.6] };
  var tid = 0;
  function torso(level, sex) {
    var fem = sex === "female", T = fem ? FEMALE : MALE, W = T.waist[level], H = T.hip[level], B = T.belly[level];
    var C = (fem ? 27 : 29) + level * 0.35, id = "t" + (++tid);
    var def = [0.95, 0.8, 0.6, 0.38, 0.2, 0.08, 0, 0, 0][level] * (fem ? 0.7 : 1);
    var soft = Math.max(0, (level - 4) / 4);
    var R = [[56.5, -1], [57.5, 8], [65, 11.5], [76, 14.5], [84, 20], [87.5, 29], [85.5, 38], [50 + C, 45], [50 + C - 0.8, 56], [50 + W + B * 0.2, 70],
      [50 + W + B * 0.75, 80], [50 + H + B * 0.55, 92], [50 + H, 102], [50 + H + 0.5, 116]];
    var ARMR = [[82, 20], [90, 27], [92.5, 40], [92, 56], [91, 72], [83.5, 72], [82, 56], [81, 42]];
    var s = '<svg viewBox="4 0 92 106" class="torso" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 's" x1="0" x2="1"><stop offset="0" stop-color="#7d7891"/><stop offset=".2" stop-color="#bdb9cc"/><stop offset=".5" stop-color="#e6e3ee"/><stop offset=".8" stop-color="#bdb9cc"/><stop offset="1" stop-color="#7d7891"/></linearGradient>' +
      '<linearGradient id="' + id + 'a" x1="0" x2="0" y1="0" y2="1"><stop offset=".55" stop-color="#9f9bb2"/><stop offset="1" stop-color="#9f9bb2" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + id + 'h" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + smooth(sym(R, 50)) + '"/></clipPath></defs>';
    s += '<path d="' + smooth(ARMR) + '" fill="url(#' + id + 'a)"/><path d="' + smooth(mirror(ARMR, 50)) + '" fill="url(#' + id + 'a)"/>';
    s += '<path d="' + smooth(sym(R, 50)) + '" fill="url(#' + id + 's)"/>';
    s += '<g clip-path="url(#' + id + 'c)"><ellipse cx="50" cy="60" rx="' + (W + 6) + '" ry="40" fill="url(#' + id + 'h)"/>';
    var ink = "#4d4862";
    function line(d, op, w) { if (op > 0.02) s += '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-opacity="' + f(op) + '" stroke-width="' + (w || 1.1) + '" stroke-linecap="round"/>'; }
    function both(fn) { fn(1); fn(-1); }
    if (fem) {
      // sports top
      s += '<path d="M' + (50 - C + 2) + ',40 C' + (50 - C + 4) + ',56 ' + (50 - 8) + ',60 50,57 C' + (50 + 8) + ',60 ' + (50 + C - 4) + ',56 ' + (50 + C - 2) + ',40 C' + (50 + C - 8) + ',33 ' + (50 + 8) + ',34 50,38 C' + (50 - 8) + ',34 ' + (50 - C + 8) + ',33 ' + (50 - C + 2) + ',40Z" fill="#3b3850"/>';
      both(function (k) { s += '<path d="M' + (50 + k * (C - 6)) + ',37 L' + (50 + k * 14) + ',12" stroke="#3b3850" stroke-width="3.2" stroke-linecap="round"/>'; });
    } else {
      // chest: crisp pec line when lean, softer and lower as body fat rises
      both(function (k) { line("M50," + (49 + soft * 4) + " C" + (50 + k * 7) + "," + (56 + soft * 5) + " " + (50 + k * (C - 9)) + "," + (55 + soft * 5) + " " + (50 + k * (C - 2.5)) + "," + (45 + soft * 3), Math.max(def, 0.45 - soft * 0.1), 1.2); });
      line("M50,30 L50,48", def * 0.8);
    }
    // abs, obliques and the V
    line("M50,56 L50,93", def * 0.9);
    [63, 72, 81].forEach(function (y, i) { line("M" + (50 - 6.5 + i * 0.3) + "," + (y + 1) + " Q50," + (y - 0.6) + " " + (50 + 6.5 - i * 0.3) + "," + (y + 1), def * 0.85); });
    both(function (k) {
      line("M" + (50 + k * 7.5) + ",55 C" + (50 + k * 9.6) + ",68 " + (50 + k * 9.4) + ",82 " + (50 + k * 6) + ",95", def * 0.8);
      line("M" + (50 + k * (W - 2)) + ",76 C" + (50 + k * (W - 4.5)) + ",88 " + (50 + k * 9) + ",97 " + (50 + k * 4) + ",104", def * 0.9);
      if (level <= 1) [58, 62, 66].forEach(function (y) { line("M" + (50 + k * (C - 4)) + "," + y + " l" + (k * -2.6) + ",1.6", def * 0.7, 0.9); });
    });
    // navel, then softness cues: belly fold and love handles
    s += '<ellipse cx="50" cy="' + (86 + soft * 2) + '" rx="' + f(0.9 + soft * 1.2) + '" ry="' + f(1.3 - soft * 0.4) + '" fill="' + ink + '" fill-opacity=".75"/>';
    if (soft > 0) {
      line("M" + (50 - W + 3) + "," + (95 + soft * 2) + " C" + (50 - 7) + "," + (100 + soft * 3) + " " + (50 + 7) + "," + (100 + soft * 3) + " " + (50 + W - 3) + "," + (95 + soft * 2), soft * 0.55, 1.3);
      both(function (k) { line("M" + (50 + k * (W + B * 0.3 - 1)) + ",72 C" + (50 + k * (W + B * 0.3 - 4)) + ",75 " + (50 + k * (W + B * 0.3 - 5)) + ",78 " + (50 + k * (W + B * 0.3 - 6)) + ",79", soft * 0.5, 1.1); });
    }
    // waistband
    s += '<rect x="0" y="100" width="100" height="10" fill="#3b3850"/><rect x="0" y="100" width="100" height="1.6" fill="#57536e"/>';
    s += "</g></svg>";
    return s;
  }

  return { map: map, torso: torso, RAMP: RAMP };
})();
