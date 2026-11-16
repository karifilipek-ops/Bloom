# Trainbloom

Static rebuild of [trainbloom.com](https://www.trainbloom.com) — free fitness calculators. Plain HTML, CSS and JavaScript: no build step, no dependencies.

## Structure

```
index.html                              Home (calculator grid)
calorie-calculator-tdee/index.html      TDEE / calorie calculator
calorie-calculator/index.html           Same calculator, dark editorial theme (assets/css/bold.css)
protein-calculator-1/index.html         Protein calculator
vo2-max-calculator/index.html           VO2 max calculator
1-rep-max-calculator/index.html         One-rep max calculator
strength-standards-calculator/index.html
muscle-gain-potential-calculator/index.html
creatine-calculator/index.html
how-long-should-i-diet-calculator/index.html
workout-tracker/index.html              Workout tracker (mobile-first, saves on device)
assets/css/site.css                     All styles (colors at the top in :root)
assets/js/layout.js                     Shared header nav + footer (edit the nav list here)
assets/js/calc.js                       Helpers shared by the calculators
assets/js/lift.js, assets/css/lift.css  Workout tracker app (data model documented at the top of lift.js)
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
