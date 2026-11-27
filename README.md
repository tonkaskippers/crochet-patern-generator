# Crochet Pattern Generator

A browser-based tool that writes complete, printable crochet patterns. Choose the
**project**, **size**, **difficulty** and **number of colors**, and it produces:

- a colour chart / stripe preview drawn with your palette
- materials list with estimated yardage and skeins per colour
- gauge, abbreviations (US or UK terms) and special-stitch instructions
- row-by-row written instructions, a border and finishing steps

Every design has a number (seed), so the same settings always rebuild the same pattern,
and **✨ New design** rolls a new one. The URL keeps all settings, so you can bookmark or
share a pattern.

## Controls

| Setting | Options |
| --- | --- |
| Project | Dishcloth, Scarf, Pillow Cover, Baby Blanket, Throw, Bed Blanket |
| Size | Three presets per project, or custom width × length (inches or cm) |
| Difficulty | Beginner, Easy, Intermediate, Advanced |
| Colors | 1–8, with 8 built-in palettes and editable swatches |
| Yarn weight | Fingering through Super Bulky (sets hook, gauge and yardage) |
| Technique | Auto, Stripes / Solid, Tapestry Colorwork, Corner-to-Corner (C2C) |
| Stitch pattern | Stitches that match the chosen difficulty (stripes technique only) |

### What each difficulty generates

- **Beginner** – single, half-double or double crochet rows; colors become even stripes.
- **Easy** – moss, griddle or ribbed back-loop stitch with stripe sequences (random, ombré, accent, Fibonacci…).
- **Intermediate** – V-stitch, shell or post-stitch ribbing, or (2+ colors) two-color tapestry motif bands with a written-out chart.
- **Advanced** – basketweave or bobble lattice, or (2+ colors) a multi-color C2C graphghan with a diagonal row-by-row color guide.

## Running it

No build step. Open `index.html` in a browser, or serve the folder:

```sh
npm start        # npx serve .
```

## Tests

```sh
npm test         # node --test
```

The tests check every project × difficulty × color combination, stitch multiples,
finished sizes, tapestry rows (≤ 2 colors each), C2C block coverage and US→UK conversion.

## Files

- `generator.js` – pattern engine (no DOM; works in the browser and Node)
- `app.js` – UI, chart rendering, print and copy
- `index.html`, `styles.css` – page and styles (light/dark and print layouts)

Yardage and gauge are estimates. Crochet a gauge swatch, and buy an extra skein of each color.

## Publishing on GitHub Pages

`.github/workflows/pages.yml` runs the tests and publishes the site on every push to `main`.
One-time setup: in the repository go to **Settings → Pages** and set **Source** to
**GitHub Actions**. The site will then be at
`https://tonkaskippers.github.io/crochet-patern-generator/`.
