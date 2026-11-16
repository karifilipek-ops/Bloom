# Trainbloom

Static rebuild of [trainbloom.com](https://www.trainbloom.com) — free fitness calculators. Plain HTML, CSS and JavaScript: no build step, no dependencies.

## Structure

```
index.html                              Home (calculator grid)
calorie-calculator-tdee/index.html      TDEE / calorie calculator
protein-calculator-1/index.html         Protein calculator
vo2-max-calculator/index.html           VO2 max calculator
1-rep-max-calculator/index.html         One-rep max calculator
strength-standards-calculator/index.html
muscle-gain-potential-calculator/index.html
creatine-calculator/index.html
how-long-should-i-diet-calculator/index.html
workout-tracker/index.html              Workout tracker (mobile-first, saves on device)
can-i-work-in/index.html                Can I Work In? daily barbell puzzle
assets/css/site.css                     All styles (colors at the top in :root)
assets/js/layout.js                     Shared header nav + footer (edit the nav list here)
assets/js/calc.js                       Helpers shared by the calculators
assets/js/lift.js, assets/css/lift.css  Workout tracker app (data model documented at the top of lift.js)
assets/js/workin-*.js, assets/css/workin.css  Daily puzzle: engine/solver, puzzle list, game
tools/workin-check.js, workin-generate.js     Validate / propose daily puzzles (Node, no deps)
assets/img, assets/fonts                Images and the pixel font from the Wix site
```

URLs match the old Wix site, so existing links keep working.

## Run locally

Pages use root-relative paths (`/assets/...`), so serve the folder rather than opening files directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Point it at the repo root with no build command, then move the `trainbloom.com` domain over from Wix.

## Workout tracker

`/workout-tracker/` is a single-page app (hash routes) that saves every tap to `localStorage` (`bloom.lift.v1`), works offline via `workout-tracker/sw.js`, and can export/import a JSON backup from Settings.

Programs and user routines share one template shape and open in the same logger. Lift history is keyed by exercise, not by routine or program, so it survives switching programs. To ship a real Trainbloom program later, add it to `PROGRAMS` in `assets/js/lift.js` (or fetch that list from a server in the same shape).

## Can I Work In? (daily puzzle)

`/can-i-work-in/` is a daily barbell puzzle: two lifters share one bar, and the player hits every weight in order in the fewest plate moves (adding or pulling one pair = one move; only the outer pair comes off). Everyone gets the same puzzle, rolling over at midnight Pacific.

- **Edit puzzles** in `assets/js/workin-puzzles.js` (`start` date = puzzle #001; the list loops when it runs out). Each entry is `targets`, plus an optional `rack` (plate pairs available), `note` and `who`.
- **Check them** with `node tools/workin-check.js`. It validates every puzzle, confirms the #001 reference line, and shows how many moves a lifter who only plans for the current target can waste. Bigger is better.
- **Get new ideas** with `node tools/workin-generate.js [count] [seed]`.

The game computes the true minimum in the browser with a breadth-first search over (plate order, active target), so scores stay correct after edits. Progress, streaks and the sound setting are saved in `localStorage` (`bloom.workin.v1`). `?n=5` replays an earlier puzzle, never a future one.
