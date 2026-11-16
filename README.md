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
assets/css/site.css                     All styles (colors at the top in :root)
assets/js/layout.js                     Shared header nav + footer (edit the nav list here)
assets/js/calc.js                       Helpers shared by the calculators
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
