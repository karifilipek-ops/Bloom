/* Trainbloom body graphics (smooth vector, not pixel art).
 *
 *  LiftBody.map(levels, sex)   front + back faceted figure, each muscle its own flat shape,
 *                              filled by how much work it got (levels: { chest: 0..1+, ... }).
 *  LiftBody.torso(level, sex)  shaded torso for the body-fat picker (level 0 = leanest .. 8).
 *
 * Muscle-map shapes are straight-edged polygons written for one side and mirrored. The torsos use
 * smoothed curves (Catmull-Rom), since skin should look soft and muscles should look sharp.
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
  // Faceted figure: flat polygons that tile the body edge to edge, outlined like a line drawing.
  // Points are [u, v]: u = distance right of the centre line, v = height (traced at 1104 units tall).
  // Each shape is drawn on the right and mirrored. "whole" shapes straddle the centre line and are
  // joined into one piece instead of two halves.

  var RAMP = ["#3a3552", "#4e4577", "#665a9f", "#8170c8", "#a08ef0", "#d6ccff"];
  var BASE = "#2b2841", LINE = "#0d0c16";
  function rampIdx(v) { return v == null ? 0 : v <= 0 ? 0 : v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.75 ? 3 : v < 1 ? 4 : 5; }

  var HEAD = [[0, 64], [27.5, 64], [52.5, 90], [54, 152.5], [40, 170], [37.5, 185], [12.5, 209], [0, 209]];
  var NECK = [[0, 209], [12.5, 209], [34, 191], [34, 222.5], [12.5, 269], [0, 281]];
  var DELT = [[92.5, 272.5], [112.5, 262.5], [150, 266], [177.5, 300], [175, 357.5], [127.5, 331]];
  var BICEP = [[127.5, 331], [160, 350], [177.5, 450], [172.5, 469], [147.5, 464], [120, 410], [112.5, 364]];
  var ARMSTRIP = [[160, 350], [175, 357.5], [189, 384], [187.5, 435], [177.5, 450]];
  var FOREARM = [[147.5, 464], [172.5, 469], [187.5, 435], [205, 464], [207, 560], [203, 585], [203, 625], [175, 625], [172.5, 577], [162.5, 560], [147.5, 515]];
  var HAND = [[175, 625], [203, 625], [205, 680], [186, 695], [160, 695], [159, 642.5]];
  var KNEECAP = [[40, 810], [75, 787.5], [97.5, 810], [95, 840], [85, 832.5], [60, 832.5], [50, 842.5]];
  var KNEE = [[50, 842.5], [60, 832.5], [85, 832.5], [95, 840], [96, 860], [85, 872.5], [60, 872.5], [52.5, 865]];
  var KNEESIDE_IN = [[40, 810], [50, 842.5], [52.5, 865], [44, 858]];
  var KNEESIDE_OUT = [[97.5, 810], [95, 840], [96, 860], [99, 835]];
  var FOOT = [[59, 1100], [91, 1100], [93, 1122], [136, 1152], [136, 1168], [50, 1168], [50, 1108]];

  var FRONT = [
    ["base", HEAD, 1], ["base", NECK, 1],
    ["traps", [[34, 222.5], [112.5, 262.5], [92.5, 272.5], [12.5, 269]]],
    ["shoulders", DELT],
    ["chest", [[0, 281], [12.5, 269], [92.5, 272.5], [127.5, 331], [112.5, 364], [74, 394], [45, 394], [0, 380]]],
    ["biceps", BICEP], ["triceps", ARMSTRIP], ["forearms", FOREARM], ["base", HAND],
    ["abs", [[0, 380], [45, 394], [74, 394], [61, 432.5], [32.5, 437.5], [0, 432.5]]],
    ["abs", [[0, 432.5], [32.5, 437.5], [61, 432.5], [61, 467.5], [50, 481], [32.5, 485], [0, 477.5]]],
    ["abs", [[0, 477.5], [32.5, 485], [50, 481], [50, 500], [39, 542.5], [0, 542.5]]],
    ["abs", [[74, 394], [112.5, 364], [82.5, 454], [61, 467.5], [61, 432.5]]],
    ["abs", [[61, 467.5], [82.5, 454], [82.5, 517.5], [39, 542.5], [50, 500], [50, 481]]],
    ["base", [[0, 542.5], [39, 542.5], [82.5, 517.5], [95, 550], [70, 572.5], [50, 587.5], [14, 640], [0, 641]], 1],
    ["quads", [[70, 572.5], [95, 550], [102.5, 560], [120, 610], [120, 730], [112.5, 745], [97.5, 810], [75, 787.5], [102.5, 655]]],
    ["quads", [[14, 640], [50, 587.5], [70, 572.5], [102.5, 655], [75, 787.5], [40, 810], [27.5, 745], [20, 730]]],
    ["base", KNEECAP], ["base", KNEE], ["base", KNEESIDE_IN], ["base", KNEESIDE_OUT],
    ["base", [[52.5, 865], [60, 872.5], [85, 872.5], [96, 860], [115, 887.5], [115, 960], [107, 980], [95, 1040], [91, 1100], [59, 1100], [57.5, 1045], [47.5, 975], [39, 957.5], [40, 890]]],
    ["base", FOOT]
  ];
  var BACK = [
    ["base", HEAD, 1], ["base", [[0, 209], [12.5, 209], [34, 191], [34, 222.5], [0, 218]], 1],
    ["traps", [[0, 218], [34, 222.5], [112.5, 262.5], [92.5, 272.5], [50, 312], [18, 362], [0, 398]], 1],
    ["shoulders", DELT],
    ["back", [[50, 312], [92.5, 272.5], [127.5, 331], [100, 352], [55, 352], [18, 362]]],
    ["back", [[18, 362], [55, 352], [100, 352], [112.5, 364], [82.5, 454], [55, 494], [25, 470], [18, 420]]],
    ["lowback", [[0, 398], [18, 362], [18, 420], [25, 470], [39, 542.5], [0, 542.5]], 1],
    ["abs", [[25, 470], [55, 494], [82.5, 454], [82.5, 517.5], [39, 542.5]]],
    ["triceps", BICEP], ["triceps", ARMSTRIP], ["forearms", FOREARM], ["base", HAND],
    ["glutes", [[0, 542.5], [39, 542.5], [82.5, 517.5], [95, 550], [102.5, 560], [118, 602], [106, 640], [60, 656], [14, 640], [0, 641]]],
    ["hamstrings", [[60, 656], [106, 640], [118, 602], [120, 610], [120, 730], [112.5, 745], [97.5, 810], [75, 790], [66, 702]]],
    ["hamstrings", [[14, 640], [60, 656], [66, 702], [75, 790], [40, 810], [27.5, 745], [20, 730]]],
    ["base", KNEECAP], ["base", KNEE], ["base", KNEESIDE_IN], ["base", KNEESIDE_OUT],
    ["calves", [[75, 872.5], [85, 872.5], [96, 860], [115, 887.5], [115, 960], [107, 980], [82, 968]]],
    ["calves", [[52.5, 865], [60, 872.5], [75, 872.5], [82, 968], [62, 992], [39, 957.5], [40, 890]]],
    ["base", [[39, 957.5], [62, 992], [82, 968], [107, 980], [95, 1040], [91, 1100], [59, 1100], [57.5, 1045], [47.5, 975]]],
    ["base", FOOT]
  ];

  // Female front, traced from the same reference, vertex for vertex with the male FRONT list.
  var F_HEAD = [[0, 114], [27.5, 114], [52.5, 139], [54, 199], [37.5, 216], [35, 232.5], [11, 252.5], [0, 252.5]];
  var F_NECK = [[0, 252.5], [11, 252.5], [26.5, 238], [26.5, 275], [9, 312.5], [0, 320]];
  var F_DELT = [[65, 312.5], [80, 304], [112.5, 307.5], [136, 335], [135, 382.5], [97.5, 360]];
  var F_BICEP = [[97.5, 360], [122.5, 375], [142.5, 472.5], [137.5, 482.5], [120, 482.5], [95, 440], [82.5, 392.5]];
  var F_STRIP = [[122.5, 375], [135, 382.5], [147.5, 405], [149, 462.5], [142.5, 472.5]];
  var F_FOREARM = [[120, 482.5], [137.5, 482.5], [142.5, 472.5], [149, 462.5], [165, 490], [167.5, 590], [170, 632.5], [150, 632.5], [140, 587.5], [130, 560], [120, 527.5]];
  var F_HAND = [[150, 634], [170, 634], [172.5, 680], [157.5, 694], [140, 694], [139, 649]];
  var F_KNEECAP = [[36, 812.5], [67.5, 787.5], [90, 812.5], [89, 837.5], [80, 835], [55, 835], [44, 842.5]];
  var F_KNEE = [[44, 842.5], [55, 835], [80, 835], [89, 840], [90, 865], [80, 874], [55, 874], [47.5, 867.5]];
  var F_KIN = [[36, 812.5], [44, 842.5], [47.5, 867.5], [39, 850]];
  var F_KOUT = [[90, 812.5], [89, 837.5], [90, 865], [92, 838]];
  var F_FOOT = [[56, 1101], [85, 1101], [86, 1122.5], [131, 1155], [131, 1166], [49, 1166], [49, 1112.5]];
  var FEMALE_FRONT = [
    ["base", F_HEAD, 1], ["base", F_NECK, 1],
    ["traps", [[26.5, 275], [80, 304], [65, 312.5], [9, 312.5]]],
    ["shoulders", F_DELT],
    ["chest", [[0, 320], [9, 312.5], [65, 312.5], [97.5, 360], [82.5, 392.5], [52.5, 412.5], [20, 409], [0, 402.5]]],
    ["biceps", F_BICEP], ["triceps", F_STRIP], ["forearms", F_FOREARM], ["base", F_HAND],
    ["abs", [[0, 402.5], [20, 409], [52.5, 412.5], [47.5, 447.5], [25, 452.5], [0, 446]]],
    ["abs", [[0, 446], [25, 452.5], [47.5, 447.5], [47.5, 477.5], [40, 494], [20, 496], [0, 491]]],
    ["abs", [[0, 491], [20, 496], [40, 494], [41, 515], [35, 555], [0, 555]]],
    ["abs", [[52.5, 412.5], [82.5, 392.5], [55, 477.5], [47.5, 477.5], [47.5, 447.5]]],
    ["abs", [[47.5, 477.5], [55, 477.5], [77.5, 532.5], [35, 555], [41, 515], [40, 494]]],
    ["base", [[0, 555], [35, 555], [77.5, 532.5], [90, 557.5], [67.5, 580], [45, 592.5], [10, 637.5], [0, 640]], 1],
    ["quads", [[67.5, 580], [90, 557.5], [100, 585], [115, 620], [116, 702.5], [107.5, 740], [90, 812.5], [67.5, 787.5], [97.5, 655]]],
    ["quads", [[10, 637.5], [45, 592.5], [67.5, 580], [97.5, 655], [67.5, 787.5], [36, 812.5], [20, 720], [12.5, 702.5]]],
    ["base", F_KNEECAP], ["base", F_KNEE], ["base", F_KIN], ["base", F_KOUT],
    ["base", [[47.5, 867.5], [55, 874], [80, 874], [90, 865], [106, 892.5], [106, 962.5], [97.5, 982.5], [87.5, 1060], [85, 1101], [56, 1101], [52.5, 1060], [42.5, 980], [35, 960], [35, 897.5]]],
    ["base", F_FOOT]
  ];
  // Female back: every point shared with the front takes the female position; back-only points
  // (spine, lats, glute fold) are placed by proportion between the two figures.
  var CORR = {};
  function key(p) { return p[0] + "," + p[1]; }
  function lerpTable(t, x) {
    if (x <= t[0][0]) return t[0][1];
    for (var i = 0; i < t.length - 1; i++) if (x <= t[i + 1][0]) return t[i][1] + (t[i + 1][1] - t[i][1]) * (x - t[i][0]) / (t[i + 1][0] - t[i][0]);
    return t[t.length - 1][1];
  }
  var V_MAP = [[64, 114], [209, 252.5], [262.5, 304], [380, 402.5], [542.5, 555], [641, 640], [842.5, 842.5], [1100, 1101], [1168, 1166]];
  var U_RATIO = [[209, 0.78], [262.5, 0.71], [331, 0.76], [364, 0.73], [454, 0.67], [517.5, 0.94], [560, 0.9], [640, 0.95], [810, 0.92], [960, 0.92], [1168, 0.96]];
  function toFemale(p) { return CORR[key(p)] || [p[0] * lerpTable(U_RATIO, p[1]), lerpTable(V_MAP, p[1])]; }
  var K = 0.2, TOP = 58, FCX = 873;
  function pts(list, cx, side) { return list.map(function (p) { return f(cx + side * p[0] * K) + "," + f((p[1] - TOP) * K); }).join(" "); }
  function figure(cx, shapes, levels) {
    var out = "";
    shapes.forEach(function (s) {
      var k = s[0], fill = k === "base" ? BASE : RAMP[rampIdx(levels[k])], cls = k === "base" ? "" : ' class="m-' + k + '"';
      var attrs = ' fill="' + fill + '" stroke="' + LINE + '" stroke-width="1.25" stroke-linejoin="round"' + cls;
      if (s[2]) { // one piece across the centre line
        var whole = s[1].concat(s[1].slice(1, -1).reverse().map(function (p) { return [-p[0], p[1]]; }));
        out += '<polygon points="' + pts(whole, cx, 1) + '"' + attrs + "/>";
      } else {
        out += '<polygon points="' + pts(s[1], cx, 1) + '"' + attrs + "/>";
        out += '<polygon points="' + pts(s[1], cx, -1) + '"' + attrs + "/>";
      }
    });
    return out;
  }
  var FEMALE_BACK = null;
  function femaleBack() {
    if (FEMALE_BACK) return FEMALE_BACK;
    FRONT.forEach(function (sh, i) { sh[1].forEach(function (p, j) { CORR[key(p)] = FEMALE_FRONT[i][1][j]; }); });
    FEMALE_BACK = BACK.map(function (sh) { return [sh[0], sh[1].map(toFemale), sh[2]]; });
    return FEMALE_BACK;
  }
  function map(levels, sex) {
    levels = levels || {};
    var fem = sex === "female";
    return '<svg class="bodymap" viewBox="0 -2 186 228" role="img" aria-label="Body map, front and back">' +
      figure(46, fem ? FEMALE_FRONT : FRONT, levels) + figure(140, fem ? femaleBack() : BACK, levels) + "</svg>";
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

  // For checking a trace against its reference drawing (image coordinates).
  function _shapes(which) { return (which === "female" ? FEMALE_FRONT : FRONT).map(function (x) { return { pts: x[1], cx: which === "female" ? FCX : 390 }; }); }
  return { map: map, torso: torso, RAMP: RAMP, _shapes: _shapes };
})();
