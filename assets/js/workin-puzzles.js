// Can I Work In? — the daily puzzle list. Edit freely.
//
// Puzzle #001 plays on `start` (midnight Pacific); each day after that plays the next
// entry, looping back to the top when the list runs out. Each entry:
//   targets  total bar weights in lb, in order. Lifters alternate: you, them, you, ...
//   rack     optional: plate PAIRS on the rack (replaces the default rack below)
//   note     optional: one line shown above the rack (say why the rack is odd today)
//   who      optional: e.g. ["you", "you", "them"] to override the alternation
//
// The game works out the true minimum itself, so editing a puzzle can't break scoring.
// After editing, run  node tools/workin-check.js  to validate every puzzle. It also prints
// how many moves a lifter who only plans for the current target ends up wasting:
// the bigger that gap, the better the puzzle. Fresh ideas: node tools/workin-generate.js
(function (root) {
  var data = {
    start: "2026-11-16",
    bar: 45,
    rack: { "45": 2, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 },
    puzzles: [
      { targets: [185, 95, 115] },  // #001 min 4 · one-at-a-time 4–6
      { targets: [95, 120, 160], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #002 min 6 · one-at-a-time 9–9
      { targets: [250, 200, 120] },  // #003 min 8 · one-at-a-time 12–18
      { targets: [170, 80, 215] },  // #004 min 8 · one-at-a-time 12–15
      { targets: [90, 220, 130] },  // #005 min 8 · one-at-a-time 12–14
      { targets: [240, 300, 180], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #006 min 10 · one-at-a-time 14–20
      { targets: [145, 260, 300, 250], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #007 min 10 · one-at-a-time 14–19
      { targets: [95, 235, 185], rack: { "45": 3, "25": 1, "10": 2, "5": 1 }, note: "Plate-hog gym: lots of 45s, little else." },  // #008 min 6 · one-at-a-time 8–10
      { targets: [120, 100, 185] },  // #009 min 6 · one-at-a-time 8–10
      { targets: [165, 200, 145], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #010 min 8 · one-at-a-time 11–12
      { targets: [180, 220, 130], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #011 min 8 · one-at-a-time 10–18
      { targets: [290, 270, 265] },  // #012 min 8 · one-at-a-time 10–18
      { targets: [280, 180, 90] },  // #013 min 9 · one-at-a-time 13–17
      { targets: [100, 270, 245], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #014 min 10 · one-at-a-time 14–15
      { targets: [135, 210, 120] },  // #015 min 6 · one-at-a-time 8–8
      { targets: [190, 150, 170], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #016 min 6 · one-at-a-time 6–15
      { targets: [150, 270, 265], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #017 min 8 · one-at-a-time 10–16
      { targets: [220, 170, 70], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #018 min 8 · one-at-a-time 10–16
      { targets: [170, 150, 80] },  // #019 min 7 · one-at-a-time 9–15
      { targets: [235, 180, 90] },  // #020 min 10 · one-at-a-time 14–15
      { targets: [165, 245, 85, 245], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #021 min 10 · one-at-a-time 14–14
      { targets: [150, 200, 270, 200] },  // #022 min 6 · one-at-a-time 6–14
      { targets: [145, 100, 120], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #023 min 5 · one-at-a-time 5–12
      { targets: [235, 150, 290], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #024 min 8 · one-at-a-time 10–14
      { targets: [90, 250, 245], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #025 min 8 · one-at-a-time 10–13
      { targets: [110, 250, 245], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #026 min 8 · one-at-a-time 10–13
      { targets: [190, 290, 295], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #027 min 10 · one-at-a-time 13–17
      { targets: [170, 290, 90] },  // #028 min 10 · one-at-a-time 13–15
      { targets: [235, 190, 210] },  // #029 min 6 · one-at-a-time 6–13
      { targets: [250, 230, 140] },  // #030 min 6 · one-at-a-time 6–13
      { targets: [140, 130, 185] },  // #031 min 8 · one-at-a-time 10–12
      { targets: [165, 195, 145, 185] },  // #032 min 8 · one-at-a-time 10–12
      { targets: [140, 200, 285] },  // #033 min 8 · one-at-a-time 10–12
      { targets: [100, 150, 95, 215], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #034 min 9 · one-at-a-time 12–14
      { targets: [70, 200, 245], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #035 min 10 · one-at-a-time 13–15
      { targets: [95, 270, 180] },  // #036 min 6 · one-at-a-time 6–12
      { targets: [160, 120, 70] },  // #037 min 6 · one-at-a-time 6–12
      { targets: [100, 80, 185] },  // #038 min 8 · one-at-a-time 10–12
      { targets: [120, 190, 110] },  // #039 min 7 · one-at-a-time 9–11
      { targets: [70, 250, 245], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #040 min 7 · one-at-a-time 9–11
      { targets: [245, 195, 70] },  // #041 min 9 · one-at-a-time 12–14
      { targets: [220, 200, 195, 140] },  // #042 min 10 · one-at-a-time 12–24
      { targets: [300, 295, 300] },  // #043 min 6 · one-at-a-time 6–12
      { targets: [190, 195, 185] },  // #044 min 6 · one-at-a-time 6–12
      { targets: [235, 245, 290], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #045 min 8 · one-at-a-time 10–12
      { targets: [170, 250, 270] },  // #046 min 7 · one-at-a-time 9–11
      { targets: [165, 245, 145] },  // #047 min 8 · one-at-a-time 10–11
      { targets: [300, 290, 110], rack: { "45": 2, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Someone took the 35s." },  // #048 min 9 · one-at-a-time 11–23
      { targets: [290, 215, 170], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #049 min 10 · one-at-a-time 12–18
      { targets: [260, 190, 240], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #050 min 6 · one-at-a-time 6–11
      { targets: [145, 195, 245] },  // #051 min 4 · one-at-a-time 4–9
      { targets: [85, 165, 80], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #052 min 7 · one-at-a-time 9–9
      { targets: [85, 215, 115], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #053 min 8 · one-at-a-time 10–10
      { targets: [115, 195, 95] },  // #054 min 7 · one-at-a-time 9–9
      { targets: [230, 180, 140, 90], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #055 min 9 · one-at-a-time 11–17
      { targets: [250, 195, 310] },  // #056 min 10 · one-at-a-time 12–18
      { targets: [145, 140, 180], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #057 min 6 · one-at-a-time 6–11
      { targets: [145, 160, 280] },  // #058 min 6 · one-at-a-time 6–10
      { targets: [135, 160, 80] },  // #059 min 7 · one-at-a-time 9–9
      { targets: [115, 180, 100] },  // #060 min 8 · one-at-a-time 10–10
      { targets: [185, 115, 90], rack: { "45": 1, "35": 1, "25": 2, "10": 2, "5": 2, "2.5": 1 }, note: "Only one pair of 45s free." },  // #061 min 7 · one-at-a-time 9–9
      { targets: [65, 195, 110, 95] },  // #062 min 9 · one-at-a-time 11–17
      { targets: [280, 270, 160], rack: { "45": 2, "35": 1, "25": 1, "10": 2, "5": 1, "2.5": 1 }, note: "Thin rack today." },  // #063 min 9 · one-at-a-time 11–17
      { targets: [210, 120, 300] },  // #064 min 6 · one-at-a-time 6–10
      { targets: [315, 245, 315] },  // #065 min 6 · one-at-a-time 6–10
      { targets: [315, 265, 165] },  // #066 min 8 · one-at-a-time 9–15
      { targets: [240, 170, 210] },  // #067 min 8 · one-at-a-time 9–15
      { targets: [65, 95, 150, 290] },  // #068 min 8 · one-at-a-time 9–14
      { targets: [170, 80, 300] },  // #069 min 9 · one-at-a-time 11–16
      { targets: [250, 215, 200] }  // #070 min 10 · one-at-a-time 12–17
    ]
  };
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.WORKIN_PUZZLES = data;
})(this);
