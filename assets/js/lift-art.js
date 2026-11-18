/* Trainbloom exercise illustrations.
 *
 * Every lift is drawn from data: a pose (hip position, torso angle, where the hands and feet go)
 * for its start and end position, plus the equipment around it. A tiny renderer turns that into
 * an 80×60 pixel-art image, highlights the target muscles, and the app flips between the two
 * frames so you can see the movement. No image files: it all works offline and stays on-style.
 *
 * Adding a lift: copy a similar entry in EX below and adjust the numbers. Coordinates are pixels
 * on the 80×60 canvas (floor at y≈55.5); angles are degrees with 0 = right, 90 = down, -90 = up.
 */
window.LiftArt = (function () {
  "use strict";
  var W = 80, H = 60, FLOOR = 55.5;
  var COL = {
    bg: "#0d0c16", star: "#3b3655", floor: "#2c2842", floorHi: "#6f6496",
    body: "#ece9f6", far: "#7d7797", mus: "#a98fff", line: "#07070b",
    metal: "#8a87a0", frame: "#45415c", pad: "#2c2940", padHi: "#3d3956",
    plate: "#6f6496", hub: "#cfc8ff", cable: "#b9adde"
  };
  var LEN = { torso: 15, neck: 2.2, head: 3.3, ua: 8.5, fa: 8, th: 12, sh: 11.5, ft: 4 };

  /* ---------------------------------------------------------------- tiny raster engine */

  var ids, cols;
  function reset() { ids = new Int16Array(W * H); cols = new Array(W * H).fill(null); }
  function put(x, y, color, id, clip) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    var i = y * W + x;
    if (clip && clip.indexOf(ids[i]) < 0) return;
    cols[i] = color; if (!clip) ids[i] = id;
  }
  function capsule(a, b, ra, rb, color, id, clip) {
    var x0 = Math.floor(Math.min(a[0] - ra, b[0] - rb)), x1 = Math.ceil(Math.max(a[0] + ra, b[0] + rb));
    var y0 = Math.floor(Math.min(a[1] - ra, b[1] - rb)), y1 = Math.ceil(Math.max(a[1] + ra, b[1] + rb));
    var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var px = x + 0.5 - a[0], py = y + 0.5 - a[1];
      var t = L2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / L2)) : 0;
      var ex = px - t * dx, ey = py - t * dy, r = ra + (rb - ra) * t;
      if (ex * ex + ey * ey <= r * r) put(x, y, color, id, clip);
    }
  }
  function circle(p, r, color, id, clip) { capsule(p, p, r, r, color, id, clip); }
  function poly(pts, color, id) {
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    for (var y = Math.floor(Math.min.apply(null, ys)); y <= Math.ceil(Math.max.apply(null, ys)); y++)
      for (var x = Math.floor(Math.min.apply(null, xs)); x <= Math.ceil(Math.max.apply(null, xs)); x++) {
        var px = x + 0.5, py = y + 0.5, inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var a = pts[i], b = pts[j];
          if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        if (inside) put(x, y, color, id);
      }
  }
  function rect(x, y, w, h, color, id) { poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, id); }

  /* ---------------------------------------------------------------- geometry */

  function dir(a) { var r = a * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
  function add(p, d, l) { return [p[0] + d[0] * l, p[1] + d[1] * l]; }
  function angTo(p, q) { return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function unit(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  function rotP(d) { return [-d[1], d[0]]; } // 90° clockwise on screen
  function rotM(d) { return [d[1], -d[0]]; }

  // Two-bone limb. spec: [dx,dy,bend] target relative to root, {to:[x,y],b} absolute, {a:[a1,a2]} angles.
  function limb(root, spec, l1, l2) {
    if (spec.a) { var j = add(root, dir(spec.a[0]), l1); return [j, add(j, dir(spec.a[1]), l2)]; }
    var t = spec.to || [root[0] + spec[0], root[1] + spec[1]], bend = spec.to ? (spec.b || 1) : (spec[2] || 1);
    var d = Math.hypot(t[0] - root[0], t[1] - root[1]), dd = Math.max(0.01, Math.min(d, l1 + l2 - 0.001));
    var th = angTo(root, t), a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd)))) * 180 / Math.PI;
    var joint = add(root, dir(th + bend * a), l1);
    return [joint, add(joint, dir(angTo(joint, t)), l2)];
  }

  /* ---------------------------------------------------------------- figure */

  function sideFigure(p) {
    var J = {}, t = p.t == null ? -90 : p.t, td = dir(t);
    J.hip = p.hip; J.sh = add(p.hip, td, LEN.torso);
    J.front = rotP(td); J.back = [-J.front[0], -J.front[1]]; J.td = td;
    var hd = dir(t + (p.hd || 0));
    J.head = add(J.sh, hd, LEN.neck + LEN.head - 0.2);
    var af = p.af || 1, ua = LEN.ua * af, fa = LEN.fa * af;
    var arm = limb(J.sh, p.arm || { a: [90, 90] }, ua, fa); J.el = arm[0]; J.ha = arm[1];
    var farm = limb(J.sh, p.farm || p.arm || { a: [90, 90] }, ua, fa); J.fel = farm[0]; J.fha = farm[1];
    var th = LEN.th * (p.thf || 1);
    var leg = limb(J.hip, p.leg || { a: [90, 90] }, th, LEN.sh); J.kn = leg[0]; J.an = leg[1];
    var fleg = limb(J.hip, p.fleg || p.leg || { a: [90, 90] }, th, LEN.sh); J.fkn = fleg[0]; J.fan = fleg[1];
    J.toe = add(J.an, dir(p.foot || 0), LEN.ft); J.ftoe = add(J.fan, dir(p.ffoot == null ? (p.foot || 0) : p.ffoot), LEN.ft);
    return J;
  }
  function drawSide(J, p, order) {
    var o = [-1, -1], f = COL.far, idF = order("far");
    function sh(q) { return [q[0] + o[0], q[1] + o[1]]; }
    capsule(sh(J.hip), sh(J.fkn), 2.8, 2.3, f, idF); capsule(sh(J.fkn), sh(J.fan), 2.2, 1.6, f, idF); capsule(sh(J.fan), sh(J.ftoe), 1.3, 1.2, f, idF);
    capsule(sh(J.sh), sh(J.fel), 1.9, 1.6, f, idF); capsule(sh(J.fel), sh(J.fha), 1.6, 1.4, f, idF); circle(sh(J.fha), 1.6, f, idF);
    drawGear(p.g2, J, order);  // gear between the far limbs and the body
    var b = COL.body, idB = order("body");
    capsule(J.hip, add(J.sh, J.td, -1.2), 3.4, 4.2, b, idB);
    capsule(J.sh, add(J.sh, dir((p.t == null ? -90 : p.t) + (p.hd || 0)), LEN.neck), 1.5, 1.5, b, idB);
    circle(J.head, LEN.head, b, idB);
    var idL = order("leg");
    capsule(J.hip, J.kn, 3.0, 2.4, b, idL); capsule(J.kn, J.an, 2.3, 1.6, b, idL); capsule(J.an, J.toe, 1.4, 1.2, b, idL);
    var idA = order("arm");
    capsule(J.sh, J.el, 2.0, 1.7, b, idA); capsule(J.el, J.ha, 1.7, 1.4, b, idA); circle(J.ha, 1.7, b, idA);
    var eye = add(add(J.head, J.front, 1.6), dir((p.t == null ? -90 : p.t) + (p.hd || 0)), 0.6);
    put(Math.floor(eye[0]), Math.floor(eye[1]), COL.line, idB);
  }
  function sideMuscles(J, m, ids) {
    var c = COL.mus;
    function along(a, b, t0, t1, side, off, r, clip) {
      var d = unit(a, b), s = side(d), p0 = add(lerp(a, b, t0), s, off), p1 = add(lerp(a, b, t1), s, off);
      capsule(p0, p1, r, r, c, 0, clip);
    }
    var T = [ids.body], A = [ids.arm], L = [ids.leg];
    m.forEach(function (k) {
      if (k === "chest") along(J.hip, J.sh, 0.6, 0.92, rotP, 2.2, 2.5, T);
      if (k === "back") along(J.hip, J.sh, 0.45, 0.9, rotM, 2.2, 2.6, T);
      if (k === "lowback") along(J.hip, J.sh, 0.08, 0.42, rotM, 2.0, 2.0, T);
      if (k === "abs") along(J.hip, J.sh, 0.12, 0.55, rotP, 2.0, 2.0, T);
      if (k === "traps") circle(add(add(J.sh, J.back, 2.2), J.td, -0.5), 2.0, c, 0, T);
      if (k === "shoulders") circle(J.sh, 2.6, c, 0, [ids.arm, ids.body]);
      if (k === "biceps") along(J.sh, J.el, 0.25, 0.8, rotM, 0.9, 1.3, A);
      if (k === "triceps") along(J.sh, J.el, 0.25, 0.8, rotP, 0.9, 1.3, A);
      if (k === "forearms") along(J.el, J.ha, 0.1, 0.6, rotM, 0, 1.4, A);
      if (k === "quads") along(J.hip, J.kn, 0.15, 0.85, rotM, 1.2, 2.0, L);
      if (k === "hamstrings") along(J.hip, J.kn, 0.2, 0.85, rotP, 1.2, 2.0, L);
      if (k === "glutes") circle(add(J.hip, J.back, 2.4), 2.9, c, 0, [ids.body, ids.leg]);
      if (k === "calves") along(J.kn, J.an, 0.08, 0.5, rotP, 0.9, 1.6, L);
    });
  }

  function frontFigure(p) {
    var J = {}, cx = p.hip[0], hy = p.hip[1], sy = hy - 14.5;
    J.cx = cx; J.hy = hy; J.sy = sy; J.hip = p.hip;
    J.sh = [cx + 7, sy + 0.6]; J.sh2 = [cx - 7, sy + 0.6]; J.head = [cx, sy - 5.6];
    function mirror(q) { return [2 * cx - q[0], q[1]]; }
    function mspec(s) { return s.a ? { a: [180 - s.a[0], 180 - s.a[1]] } : s.to ? { to: mirror(s.to), b: -(s.b || 1) } : [-s[0], s[1], -(s[2] || 1)]; }
    var af = p.af || 1, ua = LEN.ua * af, fa = LEN.fa * af, th = LEN.th * (p.thf || 1);
    var armS = p.arm || { a: [90, 90] }, a1 = limb(J.sh, armS, ua, fa), a2 = limb(J.sh2, p.arm2 ? mspec(p.arm2) : mspec(armS), ua, fa);
    J.el = a1[0]; J.ha = a1[1]; J.el2 = a2[0]; J.ha2 = a2[1];
    J.hp = [cx + 2.7, hy + 1.2]; J.hp2 = [cx - 2.7, hy + 1.2];
    var legS = p.leg || { a: [90, 90] }, l1 = limb(J.hp, legS, th, LEN.sh), l2 = limb(J.hp2, p.leg2 ? mspec(p.leg2) : mspec(legS), th, LEN.sh);
    J.kn = l1[0]; J.an = l1[1]; J.kn2 = l2[0]; J.an2 = l2[1];
    J.toe = add(J.an, [1, 0.25], 2.6); J.toe2 = add(J.an2, [-1, 0.25], 2.6);
    J.mid = lerp(J.ha, J.ha2, 0.5);
    return J;
  }
  function drawFront(J, p, order) {
    drawGear(p.g2, J, order);
    var b = COL.body, idL = order("leg"), cx = J.cx, hy = J.hy, sy = J.sy;
    [[J.hp, J.kn, J.an, J.toe], [J.hp2, J.kn2, J.an2, J.toe2]].forEach(function (l) {
      capsule(l[0], l[1], 2.8, 2.3, b, idL); capsule(l[1], l[2], 2.2, 1.6, b, idL); capsule(l[2], l[3], 1.4, 1.2, b, idL);
    });
    var idB = order("body");
    poly([[cx - 4.4, hy + 2], [cx + 4.4, hy + 2], [cx + 5.2, hy - 6], [cx + 7.4, sy + 1.6], [cx + 6.6, sy - 0.9], [cx - 6.6, sy - 0.9], [cx - 7.4, sy + 1.6], [cx - 5.2, hy - 6]], b, idB);
    circle([cx + 6.3, sy + 0.9], 2.0, b, idB); circle([cx - 6.3, sy + 0.9], 2.0, b, idB);
    capsule([cx, sy], [cx, sy - 2.6], 1.5, 1.5, b, idB); circle(J.head, LEN.head, b, idB);
    put(Math.floor(cx - 1.4), Math.floor(J.head[1]), COL.line, idB); put(Math.floor(cx + 1.4), Math.floor(J.head[1]), COL.line, idB);
    var idA = order("arm");
    [[J.sh, J.el, J.ha], [J.sh2, J.el2, J.ha2]].forEach(function (a) {
      capsule(a[0], a[1], 2.0, 1.7, b, idA); capsule(a[1], a[2], 1.7, 1.4, b, idA); circle(a[2], 1.7, b, idA);
    });
  }
  function frontMuscles(J, m, ids) {
    var c = COL.mus, cx = J.cx, sy = J.sy, hy = J.hy, T = [ids.body], A = [ids.arm], L = [ids.leg];
    m.forEach(function (k) {
      if (k === "chest") { circle([cx + 3.2, sy + 3.6], 2.7, c, 0, T); circle([cx - 3.2, sy + 3.6], 2.7, c, 0, T); }
      if (k === "abs") capsule([cx, sy + 7.5], [cx, hy - 0.5], 2.2, 2.2, c, 0, T);
      if (k === "back") { capsule([cx + 5.6, sy + 3], [cx + 4.2, sy + 9.5], 1.8, 1.4, c, 0, T); capsule([cx - 5.6, sy + 3], [cx - 4.2, sy + 9.5], 1.8, 1.4, c, 0, T); }
      if (k === "traps") { circle([cx + 3, sy - 0.4], 1.6, c, 0, T); circle([cx - 3, sy - 0.4], 1.6, c, 0, T); }
      if (k === "shoulders") { circle(J.sh, 2.6, c, 0, [ids.arm, ids.body]); circle(J.sh2, 2.6, c, 0, [ids.arm, ids.body]); }
      if (k === "biceps" || k === "triceps") { capsule(lerp(J.sh, J.el, 0.3), lerp(J.sh, J.el, 0.8), 1.3, 1.3, c, 0, A); capsule(lerp(J.sh2, J.el2, 0.3), lerp(J.sh2, J.el2, 0.8), 1.3, 1.3, c, 0, A); }
      if (k === "quads" || k === "hamstrings") { capsule(lerp(J.hp, J.kn, 0.2), lerp(J.hp, J.kn, 0.8), 2.0, 1.8, c, 0, L); capsule(lerp(J.hp2, J.kn2, 0.2), lerp(J.hp2, J.kn2, 0.8), 2.0, 1.8, c, 0, L); }
    });
  }

  /* ---------------------------------------------------------------- equipment */

  // Points: [x,y] or [joint, dx, dy, back, along] (back/along follow the torso in side view).
  function P(J, q) {
    if (typeof q[0] === "number") return q;
    var base = q[0] === "mid" ? J.mid : J[q[0]];
    var x = base[0] + (q[1] || 0), y = base[1] + (q[2] || 0);
    if (q[3]) { x += J.back[0] * q[3]; y += J.back[1] * q[3]; }
    if (q[4]) { x += J.td[0] * q[4]; y += J.td[1] * q[4]; }
    return [x, y];
  }
  function drawGear(list, J, order) {
    (list || []).forEach(function (g) {
      var t = g[0], id = order(), c;
      if (t === "plate") { var p = P(J, g[1]), r = g[2] || 7; circle(p, r, COL.plate, id); circle(p, r * 0.45, COL.frame, id); circle(p, 1.1, COL.hub, id); }
      else if (t === "db") { var q = P(J, g[1]); circle(q, g[2] || 3, COL.plate, id); circle(q, 0.9, COL.hub, id); }
      else if (t === "dbl") { // dumbbell seen from the side of its handle: [dbl, P, angle]
        var m = P(J, g[1]), d = dir(g[2] || 0), e1 = add(m, d, 3.4), e2 = add(m, d, -3.4);
        capsule(e1, e2, 0.9, 0.9, COL.metal, id); capsule(add(e1, d, -0.6), add(e1, d, 0.9), 2.1, 2.1, COL.plate, id); capsule(add(e2, d, 0.6), add(e2, d, -0.9), 2.1, 2.1, COL.plate, id);
      }
      else if (t === "bar") { c = COL[g[4]] || g[4] || COL.metal; capsule(P(J, g[1]), P(J, g[2]), g[3] || 1, g[3] || 1, c, id); }
      else if (t === "pad") capsule(P(J, g[1]), P(J, g[2]), g[3] || 2.2, g[3] || 2.2, COL.pad, id);
      else if (t === "cable") capsule(P(J, g[1]), P(J, g[2]), 0.55, 0.55, COL.cable, id);
      else if (t === "rect") rect(g[1], g[2], g[3], g[4], COL[g[5]] || g[5] || COL.frame, id);
      else if (t === "circ") circle(P(J, g[1]), g[2], COL[g[3]] || g[3] || COL.metal, id);
      else if (t === "poly") poly(g[1].map(function (q) { return P(J, q); }), COL[g[2]] || g[2] || COL.pad, id);
      else if (t === "bench") { // [bench, x1, x2, topY]
        rect(g[1] + 2, g[3] + 3, 2, FLOOR - g[3] - 2.5, COL.frame, id); rect(g[2] - 4, g[3] + 3, 2, FLOOR - g[3] - 2.5, COL.frame, id);
        rect(g[1], g[3], g[2] - g[1], 3, COL.pad, id); rect(g[1], g[3], g[2] - g[1], 1, COL.padHi, id);
      }
      else if (t === "stack") { // [stack, x, topY]: cable tower with weight plates
        rect(g[1], g[2], 7, FLOOR + 0.5 - g[2], COL.frame, id);
        for (var y = FLOOR - 8; y > FLOOR - 20; y -= 3) rect(g[1] + 1.5, y, 4, 2, COL.plate, id);
      }
    });
  }

  /* ---------------------------------------------------------------- scene */

  var STARS = [[6, 5], [17, 12], [29, 4], [44, 9], [58, 3], [67, 13], [75, 6], [11, 22], [71, 25], [52, 18], [36, 15], [3, 34], [77, 38]];
  function scene(ex, frame) {
    reset();
    var p = Object.assign({}, ex.base || {}, ex.f[frame]);
    var front = ex.v === "f";
    var J = front ? frontFigure(p) : sideFigure(p);
    var seq = 0, roles = {};
    function order(role) { seq++; if (role) roles[role] = seq; return seq; }
    drawGear((ex.g || []).filter(function (g) { return g[0].charAt(0) === "-"; }).map(strip).concat((p.gb || [])), J, order);
    p.g2 = (ex.g || []).filter(function (g) { return g[0].charAt(0) === "~"; }).map(strip).concat(p.gm || []);
    if (front) drawFront(J, p, order); else drawSide(J, p, order);
    drawGear((ex.g || []).filter(function (g) { var c = g[0].charAt(0); return c !== "-" && c !== "~"; }).concat(p.gf || []), J, order);
    if (front) frontMuscles(J, ex.m, roles); else sideMuscles(J, ex.m, roles);
    // a darker seam wherever something sits in front of something else
    var out = cols.slice();
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x, a = ids[i]; if (!a) continue;
      var n = [x > 0 ? ids[i - 1] : 0, x < W - 1 ? ids[i + 1] : 0, y > 0 ? ids[i - W] : 0, y < H - 1 ? ids[i + W] : 0];
      if (n.some(function (b) { return b > a; })) out[i] = COL.line;
    }
    return { cols: out, floor: !ex.nofloor && !p.nofloor };
  }
  function strip(g) { var c = g.slice(); c[0] = c[0].slice(1); return c; }

  function toCanvas(s) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COL.star; STARS.forEach(function (st) { ctx.fillRect(st[0], st[1], 1, 1); });
    if (s.floor) {
      ctx.fillStyle = COL.floor; ctx.fillRect(0, 56, W, 4);
      ctx.fillStyle = COL.floorHi; for (var x = 1; x < W; x += 4) ctx.fillRect(x, 56, 2, 1);
    }
    for (var i = 0; i < s.cols.length; i++) if (s.cols[i]) { ctx.fillStyle = s.cols[i]; ctx.fillRect(i % W, Math.floor(i / W), 1, 1); }
    return cv;
  }

  /* ---------------------------------------------------------------- the lifts */
  // m: highlighted muscles. g: equipment ("-" behind everyone, "~" behind the near side, else in front).
  // f: [start, end] poses. arm/leg: [dx,dy,bend] from shoulder/hip, {to:[x,y],b}, or {a:[upper,lower]}.

  var STAND = { hip: [36, 31], t: -90, leg: { a: [90, 90] } };
  var LIE = { hip: [47, 34.5], t: 180, leg: { to: [57, 54], b: -1 } };
  var INCL = { hip: [46, 41], t: -145, leg: { to: [57, 54], b: -1 } };
  var SEAT = { hip: [30, 42], t: -93, leg: { to: [43, 54], b: -1 } };
  var FSEAT = { hip: [40, 41], thf: 0.35, leg: { a: [70, 92] } };
  function S(o) { return Object.assign({}, STAND, o); }

  var EX = {
    "bench-press": { m: ["chest", "triceps", "shoulders"], cue: "Lie back, feet planted, shoulder blades pinched. Lower the bar to mid-chest, then press it back up over your shoulders.",
      g: [["-rect", 28, 16, 2, 40, "frame"], ["-rect", 28, 21, 6, 1.5, "frame"], ["-bench", 16, 60, 38], ["plate", ["ha"]]], base: LIE,
      f: [{ arm: [1, -16, 1] }, { arm: [7, -6, -1] }] },
    "incline-bench": { m: ["chest", "shoulders", "triceps"], cue: "Bench set to about 30°. Lower the bar to your upper chest, then press straight up.",
      g: [["-rect", 27, 13, 2, 43, "frame"], ["-pad", ["hip", 0, 0, 4.8, -1], ["sh", 0, 0, 4.8, 3]], ["-rect", 38, 44.5, 16, 3, "pad"], ["-rect", 44, 47, 2, 9, "frame"], ["plate", ["ha"]]], base: INCL,
      f: [{ arm: [2, -16, 1] }, { arm: [8, -3, -1] }] },
    "db-bench": { m: ["chest", "triceps", "shoulders"], cue: "Lie back with a dumbbell in each hand. Lower them beside your chest with elbows slightly tucked, then press up.",
      g: [["-bench", 16, 60, 38], ["db", ["ha"]]], base: LIE,
      f: [{ arm: [1, -16, 1] }, { arm: [5, -4, -1] }] },
    "incline-db-press": { m: ["chest", "shoulders", "triceps"], cue: "Bench at about 30°. Lower the dumbbells to the sides of your upper chest, then press up.",
      g: [["-pad", ["hip", 0, 0, 4.8, -1], ["sh", 0, 0, 4.8, 3]], ["-rect", 38, 44.5, 16, 3, "pad"], ["-rect", 44, 47, 2, 9, "frame"], ["db", ["ha"]]], base: INCL,
      f: [{ arm: [2, -16, 1] }, { arm: [6, -2, -1] }] },
    "machine-chest-press": { m: ["chest", "triceps", "shoulders"], cue: "Sit tall with handles at chest height. Press forward until your arms are long, then control it back.",
      g: [["-rect", 62, 6, 3, 50, "frame"], ["-pad", ["hip", 0, 0, 4.5, -1], ["sh", 0, 0, 4.5, 2]], ["-rect", 20, 45, 18, 2.5, "pad"], ["-rect", 27, 47.5, 2, 8, "frame"],
        ["bar", ["ha"], [63, 12], 0.9, "metal"], ["bar", ["ha", 0, -2.5], ["ha", 0, 2.5], 1.1, "metal"]], base: SEAT,
      f: [{ arm: [16, 1, -1] }, { arm: [5, 1, -1] }] },
    "cable-fly": { v: "f", m: ["chest", "shoulders"], cue: "Stand between two high cables. With a soft bend in your elbows, hug the handles together in front of your chest.",
      g: [["-rect", 2, 3, 3, 53, "frame"], ["-rect", 75, 3, 3, 53, "frame"], ["cable", ["ha"], [76, 4]], ["cable", ["ha2"], [4, 4]], ["circ", ["ha"], 1.3, "metal"], ["circ", ["ha2"], 1.3, "metal"]],
      base: { hip: [40, 31] }, f: [{ arm: [15, -3, -1] }, { arm: [-5, 10, 1] }] },
    "pec-deck": { v: "f", m: ["chest", "shoulders"], cue: "Sit with forearms on the pads, elbows at shoulder height. Squeeze the pads together in front of your chest.",
      g: [["-rect", 32, 17, 16, 24, "pad"], ["-rect", 31, 40, 18, 3, "pad"], ["-rect", 39, 43, 2, 13, "frame"], ["pad", ["el", 0, 0], ["ha", 0, -1], 2.3], ["pad", ["el2", 0, 0], ["ha2", 0, -1], 2.3]],
      base: FSEAT, f: [{ arm: { a: [0, -90] } }, { arm: { a: [180, -90] }, af: 0.5 }] },
    "dips": { m: ["chest", "triceps", "shoulders"], cue: "Support yourself on the bars, lean slightly forward, lower until your shoulders dip below your elbows, then push up.",
      g: [["-rect", 41, 32, 2, 24, "frame"], ["circ", [41.6, 31.2], 1.8, "metal"]], nofloor: false,
      f: [{ hip: [38, 30], t: -80, arm: { to: [41.6, 31.2], b: 1 }, leg: { a: [100, 150] }, foot: 100 },
        { hip: [37, 38], t: -68, arm: { to: [41.6, 31.2], b: 1 }, leg: { a: [105, 150] }, foot: 100 }] },
    "push-up": { m: ["chest", "triceps", "shoulders"], cue: "Hands under your shoulders, body in one straight line. Lower your chest to the floor, then push away.",
      f: [{ hip: [34, 44.4], t: -25.4, arm: { to: [48, 54.3], b: 1 }, leg: { a: [154.6, 154.6] }, foot: 120 },
        { hip: [34, 50.6], t: -9, arm: { to: [48, 54.3], b: 1 }, leg: { a: [171, 171] }, foot: 105 }] },
    "ohp": { m: ["shoulders", "triceps"], cue: "Stand with the bar on your front shoulders. Press it straight overhead, moving your head back out of the way.",
      g: [["plate", ["ha"], 4.5]], base: S({ hip: [36, 33] }), f: [{ arm: [5, 2, 1] }, { arm: [-1, -13, 1], hd: -12 }] },
    "db-shoulder-press": { v: "f", m: ["shoulders", "triceps"], cue: "Sit tall with dumbbells at shoulder height, palms forward. Press up until your arms are straight.",
      g: [["-rect", 32, 14, 16, 27, "pad"], ["-rect", 31, 40, 18, 3, "pad"], ["-rect", 39, 43, 2, 13, "frame"], ["dbl", ["ha"], 0], ["dbl", ["ha2"], 0]],
      base: FSEAT, f: [{ arm: { a: [10, -95] } }, { arm: [3, -16, 1] }] },
    "machine-shoulder-press": { m: ["shoulders", "triceps"], cue: "Sit with your back on the pad and handles by your shoulders. Press overhead, then lower with control.",
      g: [["-rect", 14, 4, 3, 52, "frame"], ["-pad", ["hip", 0, 0, 4.5, -1], ["sh", 0, 0, 4.5, 3]], ["-rect", 20, 45, 18, 2.5, "pad"], ["-rect", 27, 47.5, 2, 8, "frame"],
        ["bar", ["ha"], [15, 6], 0.9, "metal"], ["bar", ["ha", -2.5, 0], ["ha", 2.5, 0], 1.1, "metal"]], base: SEAT,
      f: [{ arm: [3, -1, 1] }, { arm: [2, -16, 1] }] },
    "lateral-raise": { v: "f", m: ["shoulders"], cue: "Dumbbells at your sides. Raise them out to shoulder height with a slight elbow bend, leading with your elbows.",
      g: [["db", ["ha"], 2.4], ["db", ["ha2"], 2.4]], base: { hip: [40, 31] }, f: [{ arm: { a: [80, 86] } }, { arm: { a: [-4, 2] } }] },
    "cable-lateral": { v: "f", m: ["shoulders"], cue: "Stand side-on to a low cable, handle in the far hand. Raise your arm out to shoulder height.",
      g: [["-stack", 1, 20], ["cable", ["ha"], [8, 53]], ["circ", [8, 53], 1.4, "metal"], ["circ", ["ha"], 1.3, "metal"]], base: { hip: [42, 31], arm2: { a: [80, 60] } },
      f: [{ arm: { a: [110, 112] } }, { arm: { a: [-6, 0] } }] },
    "rear-delt-fly": { m: ["shoulders", "back"], cue: "Hinge forward with a flat back, dumbbells hanging. Sweep them out wide, squeezing between your shoulder blades.",
      g: [["db", ["ha"]]], base: { hip: [28, 31], t: -14, leg: { a: [80, 96] } },
      f: [{ arm: { a: [90, 90] } }, { arm: { a: [90, 90] }, af: 0.3 }] },
    "face-pull": { m: ["shoulders", "back", "traps"], cue: "Rope at head height. Pull it toward your face, elbows high, hands finishing beside your ears.",
      g: [["-stack", 66, 6], ["cable", ["ha"], [66, 12]], ["circ", [66, 12], 1.5, "metal"], ["circ", ["ha"], 1.4, "metal"]], base: S({ t: -95 }),
      f: [{ arm: [14, 1, -1] }, { arm: [5, -6, -1] }] },
    "pull-up": { v: "f", nofloor: true, m: ["back", "biceps"], cue: "Hang from the bar, hands just wider than shoulders. Pull your chest up until your chin clears the bar.",
      g: [["-rect", 6, 2, 68, 2.2, "metal"]], f: [{ hip: [40, 34], arm: { to: [54, 3], b: -1 }, leg: { a: [90, 92] } }, { hip: [40, 23], arm: { to: [54, 3], b: 1 }, leg: { a: [88, 100] } }] },
    "chin-up": { v: "f", nofloor: true, m: ["biceps", "back"], cue: "Hang with palms facing you, hands shoulder-width. Pull until your chin is over the bar.",
      g: [["-rect", 6, 2, 68, 2.2, "metal"]], f: [{ hip: [40, 34], arm: { to: [47, 3], b: -1 }, leg: { a: [90, 92] } }, { hip: [40, 23], arm: { to: [47, 3], b: 1 }, leg: { a: [88, 100] } }] },
    "lat-pulldown": { v: "f", m: ["back", "biceps"], cue: "Sit with thighs under the pad and a wide grip. Pull the bar to your upper chest, driving elbows down.",
      g: [["-rect", 31, 41, 18, 3, "pad"], ["-rect", 39, 44, 2, 12, "frame"], ["cable", ["mid"], [40, 0]], ["bar", ["ha2", -3, 0], ["ha", 3, 0], 1, "metal"], ["rect", 30, 40, 20, 2.4, "pad"]],
      base: { hip: [40, 38], thf: 0.35, leg: { a: [70, 92] } }, f: [{ arm: { to: [55, 7], b: -1 } }, { arm: { to: [53, 22], b: 1 } }] },
    "barbell-row": { m: ["back", "biceps"], cue: "Hinge until your torso is near parallel. Row the bar to your lower ribs, then lower it under control.",
      g: [["plate", ["ha"], 6]], base: { hip: [28, 30], t: -18, leg: { a: [80, 96] } },
      f: [{ arm: { a: [90, 90] } }, { arm: { to: [37, 34], b: 1 } }] },
    "chest-supported-row": { m: ["back", "biceps"], cue: "Lie chest-down on an incline bench, arms hanging. Row the dumbbells up beside your ribs.",
      g: [["-pad", ["hip", 0, 0, -6.6, -2], ["sh", 0, 0, -6.6, 2], 2.2], ["-bar", [36, 38], [36, 56], 1, "frame"], ["db", ["ha"]]], base: { hip: [28, 38], t: -40, leg: { to: [25, 54], b: -1 }, hd: 20 },
      f: [{ arm: { a: [90, 90] } }, { arm: { to: [33, 38], b: 1 } }] },
    "cable-row": { m: ["back", "biceps"], cue: "Sit tall, feet on the platform. Pull the handle to your stomach, squeeze your shoulder blades, then reach forward.",
      g: [["-stack", 58, 22], ["-rect", 12, 47, 22, 2.5, "pad"], ["-rect", 20, 49.5, 2, 6, "frame"], ["rect", 49, 41, 2, 14, "frame"], ["cable", ["ha"], [58, 45]], ["circ", [58, 45], 1.4, "metal"], ["bar", ["ha", 0, -2], ["ha", 0, 2], 1, "metal"]],
      base: { hip: [24, 45], leg: { to: [46, 47], b: -1 }, foot: -80 }, f: [{ t: -72, arm: { to: [44, 38], b: -1 } }, { t: -96, arm: { to: [31, 39], b: 1 } }] },
    "db-row": { m: ["back", "biceps"], cue: "One knee and hand on a bench, back flat. Row the dumbbell up to your hip, then lower it all the way.",
      g: [["-bench", 16, 54, 47], ["db", ["ha"]]], base: { hip: [30, 34], t: -8, leg: { to: [25, 54], b: -1 }, fleg: { a: [75, 180] }, ffoot: 180, farm: { to: [48, 46], b: 1 } },
      f: [{ arm: { a: [90, 90] } }, { arm: { to: [37, 37], b: 1 } }] },
    "deadlift": { m: ["back", "lowback", "glutes", "hamstrings"], cue: "Bar over mid-foot. Grip it, brace, and stand up by pushing the floor away. Keep the bar close to your legs.",
      g: [["plate", ["ha"], 7]], f: [{ hip: [32, 39], t: -25, leg: { to: [42, 54], b: -1 }, arm: { to: [44, 48], b: 1 } }, { hip: [36, 31], t: -94, leg: { a: [90, 90] }, arm: { a: [88, 88] } }] },
    "squat": { m: ["quads", "glutes"], cue: "Bar on your upper back, feet shoulder-width. Sit down between your heels, then stand back up.",
      g: [["plate", ["sh", 0, 0, 2.5, -2], 5.5]], f: [{ hip: [36, 31], t: -88, leg: { to: [37, 54], b: -1 }, arm: { to: [34, 18], b: 1 } }, { hip: [29, 44], t: -55, leg: { to: [37, 54], b: -1 }, arm: { to: [35, 32], b: 1 } }] },
    "front-squat": { m: ["quads", "glutes"], cue: "Bar resting on your front shoulders, elbows high. Squat down keeping your chest up, then stand.",
      g: [["plate", ["sh", 0, 0, -3.5, -1.5], 5]], f: [{ hip: [36, 31], t: -90, leg: { to: [37, 54], b: -1 }, arm: [7, -1, -1] }, { hip: [30, 44], t: -70, leg: { to: [37, 54], b: -1 }, arm: [7, -2, -1] }] },
    "hack-squat": { m: ["quads", "glutes"], cue: "Back flat on the pad, shoulders under the pads, feet on the platform. Lower until your knees are deeply bent, then push back up.",
      g: [["-bar", [19, 8], [40, 56], 1.4, "frame"], ["~pad", ["hip", 0, 0, 4.5, -1], ["sh", 0, 0, 4.5, 3]], ["-bar", [40, 56.5], [54, 54], 1.4, "metal"]],
      base: { t: -115, foot: -15 }, f: [{ hip: [36, 30], leg: { to: [45, 53], b: -1 }, arm: { to: [34, 18], b: 1 } }, { hip: [41, 41], leg: { to: [45, 53], b: -1 }, arm: { to: [38, 29], b: 1 } }] },
    "leg-press": { m: ["quads", "glutes"], cue: "Back flat on the seat, feet on the sled. Lower until your knees come toward your chest, then press away.",
      g: [["-bar", [42, 52], [72, 22], 1.4, "frame"], ["-pad", ["hip", 0, 0, 4.4, -2], ["sh", 0, 0, 4.4, 2]], ["-rect", 26, 47, 14, 3, "pad"], ["-rect", 31, 50, 2, 6, "frame"], ["bar", ["an", -3, -6], ["an", 5, 2], 1.5, "metal"]],
      base: { hip: [30, 44], t: -152, foot: -50, arm: { to: [34, 47], b: 1 } }, f: [{ leg: { to: [47, 28], b: 1 } }, { leg: { to: [41, 33], b: 1 } }] },
    "split-squat": { m: ["quads", "glutes"], cue: "Rear foot up on a bench behind you. Drop your back knee toward the floor, then drive up through your front foot.",
      g: [["-bench", 6, 21, 41], ["db", ["ha"]]], base: { arm: { a: [92, 92] }, fleg: { to: [17, 40], b: 1 }, ffoot: 175 },
      f: [{ hip: [35, 32], t: -86, leg: { to: [42, 54], b: -1 } }, { hip: [33, 41], t: -80, leg: { to: [42, 54], b: -1 } }] },
    "leg-extension": { m: ["quads"], cue: "Sit with the pad on your lower shins. Straighten your knees until your legs are long, then lower slowly.",
      g: [["-rect", 18, 4, 3, 52, "frame"], ["-pad", ["hip", 0, 0, 4.5, -1], ["sh", 0, 0, 4.5, 1]], ["-rect", 20, 42.5, 24, 3, "pad"], ["-rect", 30, 45.5, 2, 10, "frame"], ["bar", ["kn"], ["an"], 0.8, "metal"]],
      base: { hip: [30, 40], t: -95, arm: { to: [36, 42], b: 1 }, foot: 0 },
      f: [{ leg: { a: [0, 90] }, gf: [["circ", ["an", 2.6, -1], 2.2, "pad"]] }, { leg: { a: [0, -4] }, gf: [["circ", ["an", 0.5, -2.6], 2.2, "pad"]], foot: -60 }] },
    "rdl": { m: ["hamstrings", "glutes", "lowback"], cue: "Soft knees, bar against your thighs. Push your hips back and slide the bar down your legs until you feel a hamstring stretch, then stand up.",
      g: [["plate", ["ha"], 7]], f: [{ hip: [36, 31], t: -92, leg: { a: [88, 92] }, arm: { a: [88, 88] } }, { hip: [29, 32], t: -16, leg: { to: [37, 54], b: -1 }, arm: { a: [90, 90] } }] },
    "lying-leg-curl": { m: ["hamstrings"], cue: "Lie face down with the pad behind your ankles. Curl your heels toward your glutes, then lower slowly.",
      g: [["-bench", 20, 62, 39.5], ["bar", ["kn"], ["an"], 0.8, "metal"]], base: { hip: [34, 36], t: -3, hd: 10, arm: { to: [55, 42], b: -1 }, foot: 180 },
      f: [{ leg: { a: [180, 180] }, gf: [["circ", ["an", 0, -2.6], 2.2, "pad"]] }, { leg: { a: [180, -78] }, gf: [["circ", ["an", -2.6, 0], 2.2, "pad"]], foot: 100 }] },
    "seated-leg-curl": { m: ["hamstrings"], cue: "Sit with the pad on top of your thighs and behind your ankles. Curl your heels down and under, then let them back up slowly.",
      g: [["-rect", 18, 4, 3, 52, "frame"], ["-pad", ["hip", 0, 0, 4.5, -1], ["sh", 0, 0, 4.5, 1]], ["-rect", 20, 42.5, 24, 3, "pad"], ["-rect", 30, 45.5, 2, 10, "frame"], ["pad", [37, 35.3], [43, 35.3], 1.8], ["bar", ["kn"], ["an"], 0.8, "metal"]],
      base: { hip: [30, 40], t: -95, arm: { to: [36, 42], b: 1 } },
      f: [{ leg: { a: [0, 2] }, gf: [["circ", ["an", 0, 2.6], 2.2, "pad"]], foot: -60 }, { leg: { a: [0, 112] }, gf: [["circ", ["an", -2.4, 1], 2.2, "pad"]], foot: 30 }] },
    "hip-thrust": { m: ["glutes", "hamstrings"], cue: "Upper back on a bench, bar across your hips. Drive through your heels until your hips are level with your knees.",
      g: [["-bench", 4, 20, 34], ["plate", ["hip", 0, 0, -5.5, 0], 6.5]], base: { leg: { to: [44, 54], b: -1 }, arm: { to: [36, 38], b: 1 }, hd: -8 },
      f: [{ hip: [28, 45], t: -132, arm: { to: [31, 40], b: 1 } }, { hip: [33, 35], t: -176, arm: { to: [33, 29], b: 1 } }] },
    "calf-raise": { m: ["calves"], cue: "Balls of your feet on a step, heels hanging off. Rise up as high as you can, pause, then lower into a stretch.",
      g: [["-rect", 38, 52, 14, 4, "frame"], ["db", ["ha"]]], base: { t: -90, arm: { a: [90, 90] }, leg: { a: [90, 90] } },
      f: [{ hip: [36, 27.5], foot: 8 }, { hip: [37, 24], foot: 52 }] },
    "seated-calf": { m: ["calves"], cue: "Sit with the pad on your knees and the balls of your feet on the block. Raise your heels as high as you can, then lower slowly.",
      g: [["-rect", 18, 6, 3, 50, "frame"], ["-rect", 20, 42.5, 20, 3, "pad"], ["-rect", 27, 45.5, 2, 10, "frame"], ["rect", 42, 52.5, 10, 3.5, "frame"], ["pad", ["kn", -4, -3.2], ["kn", 2, -3.2], 1.8], ["bar", ["kn", 2, -3.2], [60, 30], 0.9, "metal"]],
      base: { hip: [30, 40], t: -90, arm: { to: [38, 36], b: 1 } }, f: [{ leg: { a: [0, 90] }, foot: 8 }, { leg: { a: [-8, 88] }, foot: 50 }] },
    "barbell-curl": { m: ["biceps", "forearms"], cue: "Stand tall, bar at your thighs, elbows pinned to your sides. Curl it up to your shoulders, then lower all the way.",
      g: [["plate", ["ha"], 5]], base: STAND, f: [{ arm: { a: [88, 85] } }, { arm: { a: [92, -62] } }] },
    "db-curl": { m: ["biceps", "forearms"], cue: "Dumbbells at your sides, palms forward. Curl them up without swinging, then lower slowly.",
      g: [["db", ["ha"]]], base: STAND, f: [{ arm: { a: [88, 86] } }, { arm: { a: [92, -72] } }] },
    "hammer-curl": { m: ["biceps", "forearms"], cue: "Palms facing each other, like holding hammers. Curl the dumbbells up, keeping your elbows still.",
      g: [["dbl", ["ha"], 90]], base: STAND, f: [{ arm: { a: [88, 86] } }, { arm: { a: [92, -72] }, gf: [] }] },
    "preacher-curl": { m: ["biceps"], cue: "Upper arms flat on the angled pad. Curl the bar up, then lower until your arms are nearly straight.",
      g: [["-poly", [[33, 26], [48, 38], [46, 41], [31, 30]], "pad"], ["-rect", 38, 40, 2, 16, "frame"], ["-rect", 18, 44, 18, 3, "pad"], ["-rect", 25, 47, 2, 9, "frame"], ["plate", ["ha"], 4.5]],
      base: { hip: [27, 41], t: -84, leg: { to: [38, 54], b: -1 }, hd: 15 }, f: [{ arm: { a: [40, 55] } }, { arm: { a: [40, -78] } }] },
    "pushdown": { m: ["triceps"], cue: "Facing a high cable, elbows pinned at your sides. Push the bar down until your arms are straight, then let it rise to chest height.",
      g: [["-stack", 60, 4], ["cable", ["ha"], [60, 8]], ["circ", [60, 8], 1.5, "metal"], ["bar", ["ha", -1, -2], ["ha", 1, 2], 1, "metal"]], base: S({ t: -82 }),
      f: [{ arm: { a: [96, -32] } }, { arm: { a: [94, 82] } }] },
    "oh-tri-ext": { m: ["triceps"], cue: "Hold a dumbbell overhead with both hands. Lower it behind your head by bending only at the elbows, then straighten.",
      g: [["dbl", ["ha"], 0]], base: S({ hip: [36, 33] }), f: [{ arm: { a: [-100, 115] } }, { arm: { a: [-98, -88] } }] },
    "skull-crusher": { m: ["triceps"], cue: "Lie on a bench, bar above your shoulders. Bend at the elbows to lower it toward your forehead, then extend.",
      g: [["-bench", 16, 60, 38], ["plate", ["ha"], 5]], base: LIE, f: [{ arm: { a: [-100, -92] } }, { arm: { a: [-108, 160] } }] },
    "hanging-leg-raise": { nofloor: true, m: ["abs"], cue: "Hang from a bar. Without swinging, raise your legs until they're level with your hips or higher, then lower slowly.",
      g: [["circ", [38, 2.5], 1.6, "metal"]], base: { hip: [38, 33.5], t: -90, arm: { to: [38, 2.5], b: 1 } },
      f: [{ leg: { a: [90, 92] } }, { leg: { a: [-8, 0] }, foot: -80 }] },
    "cable-crunch": { m: ["abs"], cue: "Kneel facing a high cable, rope beside your head. Crunch your ribs down toward your hips, then rise back up.",
      g: [["-stack", 66, 4], ["cable", ["ha"], [66, 8]], ["circ", [66, 8], 1.5, "metal"]], base: { hip: [36, 42], leg: { a: [82, 180] }, foot: 180 },
      f: [{ t: -72, arm: { to: ["head", 2, 2], b: -1 }, hd: 10 }, { t: -22, arm: { to: ["head", 1, 3], b: -1 }, hd: 40 }] }
  };
  var _side = sideFigure;
  sideFigure = function (p) { // two-pass for arms that reach for the head
    var a = p.arm;
    if (a && a.to && typeof a.to[0] === "string") {
      var j = _side(Object.assign({}, p, { arm: { a: [90, 90] } }));
      p = Object.assign({}, p, { arm: { to: [j[a.to[0]][0] + (a.to[1] || 0), j[a.to[0]][1] + (a.to[2] || 0)], b: a.b } });
    }
    return _side(p);
  };

  /* ---------------------------------------------------------------- body map */
  // Front + back figure, each muscle its own region. levels: { chest: 0..1+, ... } (missing = untrained).
  var BM_W = 120, BM_H = 96;
  var RAMP = ["#3a3552", "#4e4577", "#665a9f", "#8170c8", "#a08ef0", "#d6ccff"];
  var BM_BASE = "#2a2740", BM_SEAM = "#0d0c16";
  function fillCap(a, b, ra, rb, plot) {
    var x0 = Math.floor(Math.min(a[0] - ra, b[0] - rb)), x1 = Math.ceil(Math.max(a[0] + ra, b[0] + rb));
    var y0 = Math.floor(Math.min(a[1] - ra, b[1] - rb)), y1 = Math.ceil(Math.max(a[1] + ra, b[1] + rb));
    var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var px = x + 0.5 - a[0], py = y + 0.5 - a[1], t = L2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / L2)) : 0;
      var ex = px - t * dx, ey = py - t * dy, r = ra + (rb - ra) * t;
      if (ex * ex + ey * ey <= r * r) plot(x, y);
    }
  }
  function fillPoly(pts, plot) {
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    for (var y = Math.floor(Math.min.apply(null, ys)); y <= Math.ceil(Math.max.apply(null, ys)); y++)
      for (var x = Math.floor(Math.min.apply(null, xs)); x <= Math.ceil(Math.max.apply(null, xs)); x++) {
        var px = x + 0.5, py = y + 0.5, inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var A = pts[i], B = pts[j];
          if ((A[1] > py) !== (B[1] > py) && px < (B[0] - A[0]) * (py - A[1]) / (B[1] - A[1]) + A[0]) inside = !inside;
        }
        if (inside) plot(x, y);
      }
  }
  function bodyMapRegions() {
    var reg = new Array(BM_W * BM_H).fill(null);
    function P(name) { return function (x, y) { if (x >= 0 && y >= 0 && x < BM_W && y < BM_H) reg[y * BM_W + x] = name; }; }
    function both(cx, f) { f(cx, 1); f(cx, -1); }
    [[30, "front"], [90, "back"]].forEach(function (v) {
      var cx = v[0], back = v[1] === "back", base = P("base");
      // silhouette
      fillCap([cx, 8.5], [cx, 8.5], 5, 5, base);
      fillCap([cx, 13], [cx, 17], 2.6, 2.6, base);
      fillPoly([[cx - 11, 17.5], [cx + 11, 17.5], [cx + 12.5, 21], [cx + 9.5, 32], [cx + 8.5, 46], [cx - 8.5, 46], [cx - 9.5, 32], [cx - 12.5, 21]], base);
      fillPoly([[cx - 8.5, 45], [cx + 8.5, 45], [cx + 9.5, 51.5], [cx - 9.5, 51.5]], base);
      both(cx, function (c, s) {
        fillCap([c + s * 12.5, 20], [c + s * 14, 33], 3, 2.7, base);
        fillCap([c + s * 14.3, 34], [c + s * 16, 46], 2.6, 2, base);
        fillCap([c + s * 16.6, 48.8], [c + s * 16.6, 48.8], 2, 2, base);
        fillCap([c + s * 5, 49], [c + s * 5, 67], 4.6, 3.6, base);
        fillCap([c + s * 5, 69], [c + s * 5, 69], 3, 3, base);
        fillCap([c + s * 5, 70.5], [c + s * 5, 87.5], 3.1, 2, base);
        fillCap([c + s * 5, 90], [c + s * 7.2, 90.5], 1.8, 1.6, base);
      });
      if (!back) {
        both(cx, function (c, s) {
          var k = "." + s;
          fillPoly([[c + s * 2.5, 16.4], [c + s * 9.5, 18.6], [c + s * 4, 19.8]], P("traps" + k));
          fillCap([c + s * 11.6, 21], [c + s * 11.6, 21], 4.2, 4.2, P("shoulders" + k));
          fillCap([c + s * 7.6, 23.4], [c + s * 2.2, 24.6], 3.9, 3.6, P("chest" + k));
          fillCap([c + s * 7.3, 30.5], [c + s * 6.6, 42], 2, 1.7, P("abs~o" + k));
          fillPoly([[c, 29.4], [c + s * 4.8, 29.4], [c + s * 4.1, 44], [c, 44]], P("abs" + k));
          fillCap([c + s * 13.1, 23.6], [c + s * 14, 31.6], 2.4, 2.1, P("biceps" + k));
          fillCap([c + s * 14.5, 35], [c + s * 15.8, 44.6], 2.2, 1.7, P("forearms" + k));
          fillCap([c + s * 5.3, 51.5], [c + s * 5, 65.5], 3.9, 3, P("quads" + k));
          fillCap([c + s * 7.3, 73], [c + s * 6.8, 81], 1.4, 1.1, P("calves" + k));
        });
      } else {
        both(cx, function (c, s) {
          var k = "." + s;
          fillPoly([[c, 14.5], [c + s * 9.5, 19], [c + s * 3.2, 22.4], [c, 31]], P("traps" + k));
          fillCap([c + s * 11.6, 21], [c + s * 11.6, 21], 4.2, 4.2, P("shoulders" + k));
          fillPoly([[c + s * 3.4, 23], [c + s * 10.4, 23.4], [c + s * 9, 33.5], [c + s * 3.4, 38.5]], P("back" + k));
          fillCap([c + s * 13.1, 23.6], [c + s * 14, 31.6], 2.4, 2.1, P("triceps" + k));
          fillCap([c + s * 14.5, 35], [c + s * 15.8, 44.6], 2.2, 1.7, P("forearms" + k));
          fillPoly([[c, 37.5], [c + s * 4.4, 37.5], [c + s * 5.8, 45.6], [c, 45.6]], P("lowback" + k));
          fillCap([c + s * 4.4, 50], [c + s * 4.4, 50], 4.7, 4.7, P("glutes" + k));
          fillCap([c + s * 5.2, 56.5], [c + s * 5, 66], 3.8, 3.1, P("hamstrings" + k));
          fillCap([c + s * 5, 72.5], [c + s * 5, 81.5], 3.1, 2.2, P("calves" + k));
        });
      }
    });
    return reg;
  }
  var REG = null;
  function rampIdx(v) { return v == null ? -1 : v <= 0 ? 0 : v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.75 ? 3 : v < 1 ? 4 : 5; }
  function bodyMap(levels) {
    REG = REG || bodyMapRegions();
    var cv = document.createElement("canvas"); cv.width = BM_W; cv.height = BM_H;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, BM_W, BM_H);
    ctx.fillStyle = COL.star; STARS.forEach(function (st) { ctx.fillRect(st[0] * 1.5 % BM_W, st[1] * 1.6 % BM_H, 1, 1); });
    for (var y = 0; y < BM_H; y++) for (var x = 0; x < BM_W; x++) {
      var i = y * BM_W + x, r = REG[i]; if (!r) continue;
      var lv = r === "base" ? null : levels[r.split(/[.~]/)[0]];
      var c = r === "base" ? BM_BASE : RAMP[Math.max(0, rampIdx(lv))];
      if (r !== "base") {
        var nb = [x > 0 ? REG[i - 1] : null, x < BM_W - 1 ? REG[i + 1] : null, y > 0 ? REG[i - BM_W] : null, y < BM_H - 1 ? REG[i + BM_W] : null];
        // outline each muscle: against the body, and a 1px seam against a neighbouring muscle
        if (nb.some(function (n) { return n === "base" || (n && n !== r && n < r); })) c = BM_SEAM;
      }
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    }
    return cv.toDataURL("image/png");
  }

  /* ---------------------------------------------------------------- public */

  var cache = {};
  function url(id, frame) {
    var ex = EX[id]; if (!ex) return null;
    var key = id + ":" + frame;
    if (!cache[key]) { try { cache[key] = toCanvas(scene(ex, frame)).toDataURL("image/png"); } catch (e) { return null; } }
    return cache[key];
  }
  var LABEL = { chest: "Chest", back: "Lats & upper back", lowback: "Lower back", abs: "Abs", traps: "Traps", shoulders: "Shoulders",
    biceps: "Biceps", triceps: "Triceps", forearms: "Forearms", quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves" };
  return {
    has: function (id) { return !!EX[id]; },
    url: url,
    info: function (id) { var e = EX[id]; return e ? { cue: e.cue, muscles: e.m.map(function (k) { return LABEL[k]; }) } : null; },
    ids: function () { return Object.keys(EX); },
    bodyMap: function (levels) { try { return bodyMap(levels || {}); } catch (e) { return null; } },
    RAMP: RAMP,
    W: W, H: H
  };
})();
