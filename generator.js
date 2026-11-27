/*
 * Crochet pattern generator — pure logic, no DOM.
 * Works in the browser (window.CrochetGen) and in Node (module.exports).
 * All text is generated in US terms; use toUK() to convert.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrochetGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- utils
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const r = mulberry32(seed >>> 0);
    return {
      next: r,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
    };
  }
  const mod = (a, b) => ((a % b) + b) % b;
  const L = (i) => String.fromCharCode(65 + i);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function fmtLen(inches, units) {
    if (units === 'cm') {
      const cm = inches * 2.54;
      return `${cm >= 20 ? Math.round(cm) : Math.round(cm * 2) / 2} cm`;
    }
    return `${inches >= 10 ? Math.round(inches) : Math.round(inches * 2) / 2}"`;
  }

  function runsOf(arr) {
    const out = [];
    for (const v of arr) {
      const last = out[out.length - 1];
      if (last && last[0] === v) last[1]++;
      else out.push([v, 1]);
    }
    return out;
  }
  const runsText = (arr) => runsOf(arr).map(([c, n]) => `${n} ${L(c)}`).join(', ');

  // Collapse consecutive identical row instructions: [{n, text}] -> [{label, text}]
  function groupRows(rows, prefix = 'Row') {
    const out = [];
    let i = 0;
    while (i < rows.length) {
      let j = i;
      while (j + 1 < rows.length && rows[j + 1].text === rows[i].text) j++;
      const a = rows[i].n, b = rows[j].n;
      out.push({ label: a === b ? `${prefix} ${a}` : `${prefix}s ${a}–${b}`, text: rows[i].text });
      i = j + 1;
    }
    return out;
  }

  // ---------------------------------------------------------------- data
  const LEVELS = ['beginner', 'easy', 'intermediate', 'advanced'];
  const LEVEL_LABEL = { beginner: 'Beginner', easy: 'Easy', intermediate: 'Intermediate', advanced: 'Advanced' };

  // sc4/rows4 = single crochet stitches & rows per 4" (10 cm). ydFactor relative to worsted.
  const YARNS = {
    fingering: { label: 'Fingering (1)', hook: '2.75 mm (C-2)', sc4: 24, rows4: 28, ydFactor: 1.7, skein: 400, skeinG: 100 },
    sport: { label: 'Sport (2)', hook: '3.5 mm (E-4)', sc4: 20, rows4: 23, ydFactor: 1.35, skein: 330, skeinG: 100 },
    dk: { label: 'DK (3)', hook: '4 mm (G-6)', sc4: 18, rows4: 20, ydFactor: 1.15, skein: 230, skeinG: 100 },
    worsted: { label: 'Worsted / Aran (4)', hook: '5 mm (H-8)', sc4: 15, rows4: 17, ydFactor: 1, skein: 200, skeinG: 100 },
    bulky: { label: 'Bulky / Chunky (5)', hook: '6.5 mm (K-10½)', sc4: 11, rows4: 12, ydFactor: 0.7, skein: 130, skeinG: 100 },
    superbulky: { label: 'Super Bulky (6)', hook: '9 mm (M/N-13)', sc4: 8, rows4: 9, ydFactor: 0.45, skein: 80, skeinG: 100 },
  };
  const BASE_YD_PER_SQIN = 0.65; // worsted single crochet

  const PROJECTS = {
    dishcloth: { label: 'Dishcloth', panels: 1, sizes: [
      { id: 'S', name: 'Small', w: 7, h: 7 }, { id: 'M', name: 'Standard', w: 9, h: 9 }, { id: 'L', name: 'Large', w: 11, h: 11 }] },
    scarf: { label: 'Scarf', panels: 1, sizes: [
      { id: 'S', name: 'Child', w: 6, h: 48 }, { id: 'M', name: 'Adult', w: 8, h: 60 }, { id: 'L', name: 'Long', w: 10, h: 72 }] },
    pillow: { label: 'Pillow Cover', panels: 2, sizes: [
      { id: 'S', name: '14" form', w: 14, h: 14 }, { id: 'M', name: '18" form', w: 18, h: 18 }, { id: 'L', name: '22" form', w: 22, h: 22 }] },
    baby: { label: 'Baby Blanket', panels: 1, sizes: [
      { id: 'S', name: 'Stroller', w: 30, h: 30 }, { id: 'M', name: 'Receiving', w: 30, h: 36 }, { id: 'L', name: 'Crib', w: 36, h: 42 }] },
    throw: { label: 'Throw', panels: 1, sizes: [
      { id: 'S', name: 'Lapghan', w: 40, h: 50 }, { id: 'M', name: 'Standard', w: 50, h: 60 }, { id: 'L', name: 'Oversized', w: 60, h: 70 }] },
    bed: { label: 'Bed Blanket', panels: 1, sizes: [
      { id: 'S', name: 'Twin', w: 66, h: 90 }, { id: 'M', name: 'Full', w: 80, h: 90 }, { id: 'L', name: 'Queen', w: 90, h: 100 }] },
  };

  const ABBR = {
    ch: 'chain', sc: 'single crochet', hdc: 'half double crochet', dc: 'double crochet',
    'sl st': 'slip stitch', 'st(s)': 'stitch(es)', sk: 'skip', sp: 'space', rep: 'repeat',
    rnd: 'round', yo: 'yarn over', BLO: 'back loop only', FPdc: 'front post double crochet',
    BPdc: 'back post double crochet', 'V-st': 'V-stitch', RS: 'right side', WS: 'wrong side',
    'rev sc': 'reverse single crochet (crab stitch)', C2C: 'corner-to-corner',
  };
  const UK_ABBR = {
    sc: ['dc', 'double crochet'], hdc: ['htr', 'half treble crochet'], dc: ['tr', 'treble crochet'],
    sk: ['miss', 'miss'], yo: ['yrh', 'yarn round hook'], FPdc: ['FPtr', 'front post treble crochet'],
    BPdc: ['BPtr', 'back post treble crochet'], 'rev sc': ['rev dc', 'reverse double crochet (crab stitch)'],
  };
  const UK_MAP = {
    sc: 'dc', Sc: 'Dc', hdc: 'htr', Hdc: 'Htr', dc: 'tr', Dc: 'Tr', FPdc: 'FPtr', BPdc: 'BPtr',
    sk: 'miss', Sk: 'Miss', yo: 'yrh', Yo: 'Yrh', gauge: 'tension', Gauge: 'Tension',
    'half double crochet': 'half treble crochet', 'Half double crochet': 'Half treble crochet', 'Half Double Crochet': 'Half Treble Crochet',
    'Half Double': 'Half Treble', 'single crochet': 'double crochet', 'Single crochet': 'Double crochet', 'Single Crochet': 'Double Crochet',
    'double crochet': 'treble crochet', 'Double crochet': 'Treble crochet', 'Double Crochet': 'Treble Crochet', 'yarn over': 'yarn round hook',
  };
  const UK_RE = new RegExp('\\b(' + Object.keys(UK_MAP).sort((a, b) => b.length - a.length).join('|') + ')\\b', 'g');
  function toUK(text) { return String(text).replace(UK_RE, (m) => UK_MAP[m]); }

  const SPECIAL = {
    'V-st': '(Dc, ch 1, dc) in the same st or sp.',
    Shell: '5 dc in the same st.',
    FPdc: 'Yo, insert hook from front to back to front around the post of the indicated st, yo and pull up a loop, (yo and draw through 2 loops) twice.',
    BPdc: 'Yo, insert hook from back to front to back around the post of the indicated st, yo and pull up a loop, (yo and draw through 2 loops) twice.',
    Bobble: '*Yo, insert hook in st, yo and pull up a loop, yo and draw through 2 loops; rep from * 4 more times in the same st (6 loops on hook), yo and draw through all 6 loops. Bobbles pop out on the side facing away from you.',
    'rev sc': 'Working from left to right, insert hook in the next st to the right, yo and pull up a loop, yo and draw through both loops.',
    'C2C block': 'Ch 3, then 3 dc into the indicated ch-3 sp (or into the chain, for a new edge block).',
    'Tapestry color change': 'Work the last yo of the stitch before a color change with the new color. Lay the unused color along the top of the row and work over it so it is hidden inside the stitches.',
  };

  // ---------------------------------------------------------------- stitch patterns (worked flat in rows)
  // units = foundation width units; gw/gh scale sc gauge width/height; yd scales yardage.
  const STITCHES = [
    {
      id: 'sc', name: 'Single Crochet', level: 'beginner', gw: 1, gh: 1, yd: 1,
      mult: 1, extra: 0, minK: 8, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'sc', 'st(s)'], special: [], skills: ['Chain', 'Single crochet', 'Turning rows'],
      chain: (u) => u + 1,
      setup: (u) => [`Sc in 2nd ch from hook and in each ch across, turn. (${u} sc)`],
      repeat: (u) => [`Ch 1 (does not count as a st), sc in each st across, turn. (${u} sc)`],
    },
    {
      id: 'hdc', name: 'Half Double Crochet', level: 'beginner', gw: 0.95, gh: 0.78, yd: 0.95,
      mult: 1, extra: 0, minK: 8, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'hdc', 'st(s)'], special: [], skills: ['Chain', 'Half double crochet', 'Turning rows'],
      chain: (u) => u + 2,
      setup: (u) => [`Hdc in 3rd ch from hook and in each ch across, turn. (${u} hdc)`],
      repeat: (u) => [`Ch 2 (does not count as a st), hdc in each st across, turn. (${u} hdc)`],
    },
    {
      id: 'dc', name: 'Double Crochet', level: 'beginner', gw: 0.92, gh: 0.55, yd: 0.9,
      mult: 1, extra: 0, minK: 8, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'dc', 'st(s)'], special: [], skills: ['Chain', 'Double crochet', 'Turning rows'],
      chain: (u) => u + 2,
      setup: (u) => [`Dc in 3rd ch from hook and in each ch across, turn. (${u} dc)`],
      repeat: (u) => [`Ch 2 (does not count as a st), dc in each st across, turn. (${u} dc)`],
    },
    {
      id: 'moss', name: 'Moss (Linen) Stitch', level: 'easy', gw: 1, gh: 1.05, yd: 0.85,
      mult: 2, extra: 0, minK: 5, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'sc', 'sk', 'sp', 'rep'], special: [], skills: ['Single crochet', 'Working into chain spaces'],
      chain: (u) => u,
      setup: () => ['Sc in 4th ch from hook, *ch 1, sk next ch, sc in next ch; rep from * across, turn.'],
      repeat: () => ['Ch 2 (counts as sc + ch-1 sp), sk first sc, sc in next ch-1 sp, *ch 1, sk next sc, sc in next ch-1 sp; rep from * across, working the last sc into the sp under the beginning ch, turn.'],
    },
    {
      id: 'griddle', name: 'Griddle Stitch', level: 'easy', gw: 0.95, gh: 0.7, yd: 0.95,
      mult: 2, extra: 0, minK: 5, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'sc', 'dc', 'rep'], special: [], skills: ['Single crochet', 'Double crochet', 'Reading your stitches'],
      chain: (u) => u + 1,
      setup: (u) => [`Sc in 2nd ch from hook, dc in next ch, *sc in next ch, dc in next ch; rep from * across, turn. (${u} sts)`],
      repeat: (u) => [`Ch 1 (does not count as a st), *sc in next dc, dc in next sc; rep from * across, turn. (${u} sts)`],
    },
    {
      id: 'hdcblo', name: 'Ribbed Back-Loop Half Double', level: 'easy', gw: 0.95, gh: 0.8, yd: 1,
      mult: 1, extra: 0, minK: 8, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'hdc', 'BLO', 'st(s)'], special: [], skills: ['Half double crochet', 'Back loop only'],
      chain: (u) => u + 2,
      setup: (u) => [`Hdc in 3rd ch from hook and in each ch across, turn. (${u} hdc)`],
      repeat: (u) => [`Ch 2 (does not count as a st), hdc in BLO of each st across, turn. (${u} hdc)`],
    },
    {
      id: 'vstitch', name: 'V-Stitch', level: 'intermediate', gw: 0.95, gh: 0.55, yd: 0.8,
      mult: 3, extra: 4, minK: 3, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'dc', 'sk', 'sp', 'V-st', 'rep'], special: ['V-st'], skills: ['Double crochet', 'Working into chain spaces', 'Special stitches'],
      chain: (u) => u,
      setup: (u) => [`(Dc, ch 1, dc) in 5th ch from hook (V-st made), *sk 2 ch, V-st in next ch; rep from * to last 2 ch, sk next ch, dc in last ch, turn. (${(u - 4) / 3} V-sts)`],
      repeat: (u) => [`Ch 3 (counts as a dc), V-st in the ch-1 sp of each V-st across, dc in top of turning ch, turn. (${(u - 4) / 3} V-sts)`],
    },
    {
      id: 'shell', name: 'Classic Shell Stitch', level: 'intermediate', gw: 0.95, gh: 0.6, yd: 0.9,
      mult: 6, extra: 2, minK: 2, setupRows: 1, repeatRows: 2,
      abbr: ['ch', 'sc', 'dc', 'sk', 'rep'], special: ['Shell'], skills: ['Single crochet', 'Double crochet', 'Counting a stitch repeat'],
      chain: (u) => u,
      setup: (u) => [`Sc in 2nd ch from hook, *sk 2 ch, 5 dc in next ch (shell made), sk 2 ch, sc in next ch; rep from * across, turn. (${(u - 2) / 6} shells)`],
      repeat: () => [
        'Ch 3 (counts as a dc), 2 dc in first sc (half shell), *sk 2 dc, sc in next dc (center of shell), sk 2 dc, 5 dc in next sc; rep from * across, ending with 3 dc in the last sc instead of 5, turn.',
        'Ch 1, sc in first dc, *sk 2 dc, 5 dc in next sc, sk 2 dc, sc in next dc (center of shell); rep from * across, working the last sc into the top of the turning ch, turn.',
      ],
    },
    {
      id: 'postrib', name: 'Post-Stitch Ribbing', level: 'intermediate', gw: 0.92, gh: 0.6, yd: 1.15,
      mult: 2, extra: 0, minK: 5, setupRows: 1, repeatRows: 1,
      abbr: ['ch', 'dc', 'FPdc', 'BPdc', 'rep'], special: ['FPdc', 'BPdc'], skills: ['Double crochet', 'Front & back post stitches'],
      chain: (u) => u + 2,
      setup: (u) => [`Dc in 3rd ch from hook and in each ch across, turn. (${u} dc)`],
      repeat: (u) => [`Ch 2 (does not count as a st), *FPdc around next st, BPdc around next st; rep from * across, turn. (${u} sts)`],
    },
    {
      id: 'basket', name: 'Basketweave', level: 'advanced', gw: 0.92, gh: 0.6, yd: 1.25,
      mult: 8, extra: 0, minK: 2, setupRows: 1, repeatRows: 4,
      abbr: ['ch', 'dc', 'FPdc', 'BPdc', 'rep'], special: ['FPdc', 'BPdc'], skills: ['Front & back post stitches', 'Tracking a 4-row repeat'],
      chain: (u) => u + 2,
      setup: (u) => [`Dc in 3rd ch from hook and in each ch across, turn. (${u} dc)`],
      repeat: (u) => [
        `Ch 2 (does not count as a st), *FPdc around next 4 sts, BPdc around next 4 sts; rep from * across, turn. (${u} sts)`,
        'Ch 2, *FPdc around next 4 sts, BPdc around next 4 sts; rep from * across, turn.',
        'Ch 2, *BPdc around next 4 sts, FPdc around next 4 sts; rep from * across, turn.',
        'Ch 2, *BPdc around next 4 sts, FPdc around next 4 sts; rep from * across, turn.',
      ],
    },
    {
      id: 'bobble', name: 'Bobble Lattice', level: 'advanced', gw: 1, gh: 1, yd: 1.25,
      mult: 4, extra: 3, minK: 3, setupRows: 1, repeatRows: 4,
      abbr: ['ch', 'sc', 'yo', 'rep', 'RS', 'WS'], special: ['Bobble'], skills: ['Single crochet', 'Bobble stitch', 'Tracking a 4-row repeat'],
      chain: (u) => u + 1,
      setup: (u) => [`(RS) Sc in 2nd ch from hook and in each ch across, turn. (${u} sc)`],
      repeat: (u) => [
        `(WS) Ch 1, sc in first 3 sts, *Bobble in next st, sc in next 3 sts; rep from * across, turn. (${(u - 3) / 4} bobbles)`,
        `(RS) Ch 1, sc in each st across, turn. (${u} sc)`,
        `(WS) Ch 1, sc in first st, *Bobble in next st, sc in next 3 sts; rep from * to last 2 sts, Bobble in next st, sc in last st, turn. (${(u - 3) / 4 + 1} bobbles)`,
        `(RS) Ch 1, sc in each st across, turn. (${u} sc)`,
      ],
    },
  ];
  const STITCH_BY_ID = Object.fromEntries(STITCHES.map((s) => [s.id, s]));
  function stitchesFor(level) { return STITCHES.filter((s) => s.level === level); }

  const TECHNIQUES = {
    stripes: { label: 'Stripes / Solid', levels: LEVELS, minColors: 1 },
    tapestry: { label: 'Tapestry Colorwork', levels: ['intermediate', 'advanced'], minColors: 2 },
    c2c: { label: 'Corner-to-Corner (C2C)', levels: ['intermediate', 'advanced'], minColors: 1 },
  };
  function techniquesFor(level, colors) {
    return Object.keys(TECHNIQUES).filter((t) => TECHNIQUES[t].levels.includes(level) && colors >= TECHNIQUES[t].minColors);
  }
  function autoTechnique(level, colors) {
    if (level === 'intermediate' && colors >= 2) return 'tapestry';
    if (level === 'advanced' && colors >= 2) return 'c2c';
    return 'stripes';
  }

  // ---------------------------------------------------------------- stripe sequences
  function stripeBlock(rng, n, unit) {
    if (n === 1) return { style: 'Solid', stripes: [{ c: 0, rows: unit }] };
    const w = () => unit * rng.int(1, 3);
    const styles = ['Even', 'Random', 'Ombré', 'Accent', 'Fibonacci'];
    const style = rng.pick(n === 2 ? ['Even', 'Random', 'Accent', 'Fibonacci'] : styles);
    let stripes = [];
    if (style === 'Even') {
      const width = w();
      for (let c = 0; c < n; c++) stripes.push({ c, rows: width });
    } else if (style === 'Random') {
      const count = rng.int(n * 2, n * 3);
      const order = [];
      for (let i = 0; i < count; i++) order.push(i < n ? i : rng.int(0, n - 1));
      let seq = rng.shuffle(order);
      // avoid adjacent repeats (including wrap-around)
      for (let pass = 0; pass < 5; pass++) {
        for (let i = 0; i < seq.length; i++) {
          const nx = seq[(i + 1) % seq.length];
          if (seq[i] === nx) {
            const j = rng.int(0, seq.length - 1);
            [seq[(i + 1) % seq.length], seq[j]] = [seq[j], seq[(i + 1) % seq.length]];
          }
        }
      }
      stripes = seq.map((c) => ({ c, rows: w() }));
    } else if (style === 'Ombré') {
      const width = w();
      for (let c = 0; c < n; c++) stripes.push({ c, rows: width });
      for (let c = n - 2; c >= 1; c--) stripes.push({ c, rows: width });
    } else if (style === 'Accent') {
      const main = unit * rng.int(3, 5);
      for (let c = 1; c < n; c++) {
        stripes.push({ c: 0, rows: main });
        stripes.push({ c, rows: unit });
      }
    } else {
      const fib = [1, 1, 2, 3, 5];
      let i = 0;
      for (const f of fib) stripes.push({ c: i++ % n, rows: f * unit });
      if (stripes[stripes.length - 1].c === 0) stripes.push({ c: 1, rows: unit });
    }
    // merge any adjacent same-color stripes
    const merged = [];
    for (const s of stripes) {
      const last = merged[merged.length - 1];
      if (last && last.c === s.c) last.rows += s.rows; else merged.push({ ...s });
    }
    if (merged.length > 1 && merged[0].c === merged[merged.length - 1].c) {
      merged[0].rows += merged.pop().rows;
    }
    return { style, stripes: merged };
  }

  // ---------------------------------------------------------------- 2-color tiles for tapestry bands
  function tile(name, w, h, fn) {
    const cells = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells[y * w + x] = fn(x, y) ? 1 : 0;
    return { name, w, h, cells, at: (x, y) => cells[y * w + x] };
  }
  const HEART = ['.XX...XX.', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
  const TILE_FAMILIES = [
    (rng) => {
      const s = rng.pick([7, 9, 11, 13]), c = (s - 1) / 2, style = rng.pick(['filled', 'outline', 'nested']);
      return tile('Diamond', s + 1, s, (x, y) => {
        if (x >= s) return false;
        const d = Math.abs(x - c) + Math.abs(y - c);
        if (style === 'filled') return d <= c;
        if (style === 'outline') return d === c || d === c - 1;
        return d <= c && (c - d) % 3 === 0;
      });
    },
    (rng) => {
      const a = rng.pick([3, 4, 5, 6]), p = 2 * a;
      return tile('Zigzag', p, a + 2, (x, y) => { const yy = x <= a ? x : p - x; return y === yy || y === yy + 1; });
    },
    (rng) => { const b = rng.int(2, 4); return tile('Checkerboard', 2 * b, 2 * b, (x, y) => (Math.floor(x / b) + Math.floor(y / b)) % 2 === 0); },
    (rng) => {
      const n = rng.int(4, 7), outline = rng.chance(0.5);
      return tile(outline ? 'Arrowhead' : 'Mountain', 2 * n, n, (x, y) => {
        const t = n - 1 - Math.abs(x - (n - 1));
        return outline ? (y === t || y === t - 1) && t >= 0 : y <= t;
      });
    },
    (rng) => {
      const s = rng.pick([7, 9, 11]), c = (s - 1) / 2;
      return tile('Cross-Stitch', s + 1, s, (x, y) => x < s && Math.abs(Math.abs(x - c) - Math.abs(y - c)) === 0);
    },
    (rng) => {
      const s = rng.pick([5, 7, 9]), c = (s - 1) / 2, t = s >= 9 ? 1 : 0;
      return tile('Swiss Cross', s + 2, s, (x, y) => x < s && (Math.abs(x - c) <= t || Math.abs(y - c) <= t));
    },
    () => tile('Heart', 11, 8, (x, y) => x >= 1 && x <= 9 && HEART[7 - y][x - 1] === 'X'),
  ];
  function pickTile(rng, maxW, maxH) {
    for (const f of rng.shuffle(TILE_FAMILIES)) {
      for (let tries = 0; tries < 4; tries++) {
        const t = f(rng);
        if (t.w <= maxW && t.h <= maxH) return t;
      }
    }
    return tile('Checkerboard', 4, 4, (x, y) => (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0);
  }

  // ---------------------------------------------------------------- multi-color full-piece motifs for C2C
  function c2cMotif(rng, W, H, N) {
    const cells = new Uint8Array(W * H);
    const set = (fn) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells[y * W + x] = fn(x, y); };
    const base = Math.min(W, H);
    if (N === 1) { set(() => 0); return { name: 'Solid', cells }; }
    const fams = ['Diagonal Stripe', 'Concentric Diamond', 'Chevron', 'Block Check', 'Argyle', 'Tartan'];
    const name = rng.pick(fams);
    if (name === 'Diagonal Stripe') {
      const seq = [];
      const order = rng.shuffle([...Array(N).keys()]);
      const reps = N === 2 ? 2 : 1;
      for (let r = 0; r < reps; r++) for (const c of order) seq.push({ c, w: rng.int(1, Math.max(2, Math.round(base / 10))) });
      const total = seq.reduce((s, a) => s + a.w, 0);
      const flip = rng.chance(0.5);
      set((x, y) => {
        let s = mod(flip ? x - y : x + y, total);
        for (const a of seq) { if (s < a.w) return a.c; s -= a.w; }
        return 0;
      });
    } else if (name === 'Concentric Diamond') {
      const bw = Math.max(1, Math.round(base / rng.int(8, 14)));
      set((x, y) => Math.floor((Math.abs(2 * x - (W - 1)) + Math.abs(2 * y - (H - 1))) / (2 * bw)) % N);
    } else if (name === 'Chevron') {
      const a = Math.max(2, Math.round(W / rng.int(5, 9)));
      const bw = Math.max(1, Math.round(H / rng.int(12, 20)));
      set((x, y) => { const m = x % (2 * a); const t = m <= a ? m : 2 * a - m; return Math.floor((y + t) / bw) % N; });
    } else if (name === 'Block Check') {
      const bs = Math.max(2, Math.round(base / rng.int(5, 9)));
      const step = N > 2 ? 2 : 1;
      set((x, y) => (Math.floor(x / bs) + step * Math.floor(y / bs)) % N);
    } else if (name === 'Argyle') {
      const s = Math.max(3, Math.round(W / rng.int(3, 6)));
      set((x, y) => {
        const u = x + y, v = x - y + H * 4;
        if (N >= 3 && (u % (2 * s) === 0 || v % (2 * s) === 0)) return N - 1;
        const iu = Math.floor(u / (2 * s)), iv = Math.floor(v / (2 * s));
        if ((iu + iv) % 2 === 0) return 0;
        const k = N >= 3 ? N - 2 : 1;
        return 1 + (mod(iu, k));
      });
    } else {
      const mk = () => {
        const blk = [];
        let prev = -1;
        const count = rng.int(Math.max(3, N), N + 3);
        for (let i = 0; i < count; i++) {
          let c = i === 0 ? 0 : rng.int(0, N - 1);
          if (c === prev) c = (c + 1) % N;
          blk.push({ c, w: c === 0 ? rng.int(3, 7) : rng.int(1, 4) });
          prev = c;
        }
        const seq = [];
        for (const b of blk) for (let i = 0; i < b.w; i++) seq.push(b.c);
        return seq;
      };
      const hs = mk(), vs = rng.chance(0.5) ? hs : mk();
      set((x, y) => {
        const h = hs[y % hs.length], v = vs[x % vs.length];
        if (h === 0) return v;
        if (v === 0) return h;
        return (x + y) % 2 === 0 ? h : v;
      });
    }
    return { name, cells };
  }

  // ---------------------------------------------------------------- yardage helpers
  function skeinsFor(yards, yarn) { if (yards <= 0) return 0; return Math.max(1, Math.ceil((yards * 1.1) / yarn.skein)); }
  function borderPlan(level, n) {
    const color = n >= 3 ? n - 1 : 0;
    const c = L(color);
    const rnds = [];
    rnds.push(`Rnd 1: With RS facing, join ${c} in any corner. Ch 1, sc evenly around all four sides, working 3 sc in each corner. Join with sl st to first sc.`);
    if (level !== 'beginner') rnds.push('Rnd 2: Ch 1, sc in each st around, working 3 sc in the center st of each corner. Join with sl st to first sc.');
    if (level === 'intermediate') rnds.push('Rnd 3: Ch 2 (does not count as a st), hdc in each st around, working 3 hdc in each corner st. Join with sl st to first hdc.');
    if (level === 'advanced') rnds.push('Rnd 3: Ch 1, rev sc in each st around. Join with sl st to first st. Fasten off.');
    return { color, rnds };
  }

  // ---------------------------------------------------------------- main
  function generate(opts) {
    const o = Object.assign({ project: 'throw', size: 'M', units: 'in', level: 'beginner', colors: 3, yarn: 'worsted', technique: 'auto', stitch: 'auto', seed: 1 }, opts || {});
    const rng = makeRng(o.seed);
    const project = PROJECTS[o.project] || PROJECTS.throw;
    const yarn = YARNS[o.yarn] || YARNS.worsted;
    const level = LEVELS.includes(o.level) ? o.level : 'beginner';
    const N = Math.max(1, Math.min(8, Math.round(o.colors) || 1));
    const notices = [];

    let wIn, hIn, sizeName;
    if (o.size === 'custom') {
      const f = o.units === 'cm' ? 1 / 2.54 : 1;
      wIn = Math.min(120, Math.max(4, (+o.customW || 10) * f));
      hIn = Math.min(120, Math.max(4, (+o.customH || 10) * f));
      sizeName = 'Custom';
    } else {
      const s = project.sizes.find((z) => z.id === o.size) || project.sizes[1];
      wIn = s.w; hIn = s.h; sizeName = s.name;
    }

    let technique = o.technique === 'auto' ? autoTechnique(level, N) : o.technique;
    if (!techniquesFor(level, N).includes(technique)) {
      const fallback = autoTechnique(level, N);
      notices.push(`${TECHNIQUES[technique] ? TECHNIQUES[technique].label : 'That technique'} isn't available for ${LEVEL_LABEL[level]} with ${plural(N, 'color')} — using ${TECHNIQUES[fallback].label} instead.`);
      technique = fallback;
    }

    const ctx = { o, rng, project, yarn, level, N, wIn, hIn, notices };
    const body = technique === 'tapestry' ? buildTapestry(ctx) : technique === 'c2c' ? buildC2C(ctx) : buildStripes(ctx);

    // border
    const border = borderPlan(level, N);
    const borderYd = 2 * (body.wIn + body.hIn) * border.rnds.length * 0.25 * yarn.ydFactor;
    const yards = body.yards.slice();
    yards[border.color] += borderYd;
    const panels = project.panels;

    const abbrSet = new Set(['ch', 'sc', 'sl st', 'st(s)', 'rep', 'rnd', ...body.abbr]);
    if (level === 'intermediate') abbrSet.add('hdc');
    if (level === 'advanced') abbrSet.add('rev sc');
    const specialSet = new Set(body.special);
    if (level === 'advanced') specialSet.add('rev sc');

    const finishing = [];
    if (panels === 2) {
      finishing.push('Make a second panel the same way (or a solid back in color A) but skip the border.');
      finishing.push('Place the panels wrong sides together. Join the border color and sc through both layers around three sides, working 3 sc in each corner. Insert the pillow form, then sc the fourth side closed. Fasten off.');
    } else {
      finishing.push(...border.rnds);
    }
    if (o.project === 'scarf') finishing.push('Optional fringe: cut 12" (30 cm) strands, fold 3 strands in half and knot them into every 3rd stitch across both short ends. Trim evenly.');
    finishing.push('Weave in all ends securely, weaving each tail back along a stitch of its own color.');
    finishing.push(`Wet- or steam-block to ${fmtLen(body.wIn, o.units)} × ${fmtLen(body.hIn, o.units)}.`);

    const totalYd = yards.reduce((a, b) => a + b, 0) * panels;
    const materials = yards.map((y, i) => ({ letter: L(i), index: i, yards: Math.ceil(y * panels / 5) * 5, skeins: skeinsFor(y * panels, yarn) }));

    const lvlWord = { beginner: 'Simple', easy: 'Easy', intermediate: 'Classic', advanced: 'Heirloom' }[level];
    const title = `${o.paletteName ? o.paletteName + ' ' : ''}${body.motifName} ${project.label}`.replace(/\s+/g, ' ').trim();

    return {
      title,
      subtitle: `${lvlWord} ${TECHNIQUES[technique].label.toLowerCase()} • ${LEVEL_LABEL[level]} • ${plural(N, 'color')}`,
      seed: o.seed,
      level, levelLabel: LEVEL_LABEL[level],
      technique, techniqueLabel: TECHNIQUES[technique].label,
      project: project.label, sizeName, panels,
      colors: N,
      notices,
      finished: { w: body.wIn, h: body.hIn, text: `${fmtLen(body.wIn, o.units)} wide × ${fmtLen(body.hIn, o.units)} long${panels === 2 ? ' (each panel)' : ''}, before border` },
      yarn: { label: yarn.label, hook: yarn.hook, totalYards: Math.ceil(totalYd / 10) * 10, skeinYards: yarn.skein, skeinG: yarn.skeinG },
      materials,
      notions: ['Tapestry needle', 'Scissors', ...(technique !== 'stripes' || N > 2 ? ['Stitch markers (optional)'] : []), ...(technique === 'c2c' && N > 2 ? ['Yarn bobbins'] : []), ...(panels === 2 ? [`${fmtLen(Math.max(body.wIn, body.hIn) + 1, o.units)} pillow form`] : [])],
      gauge: body.gauge,
      skills: body.skills,
      abbreviations: [...abbrSet].filter((k) => ABBR[k]).map((k) => ({ us: k, usName: ABBR[k], uk: UK_ABBR[k] ? UK_ABBR[k][0] : k, ukName: UK_ABBR[k] ? UK_ABBR[k][1] : ABBR[k] })),
      special: [...specialSet].map((k) => ({ name: k, text: SPECIAL[k] })),
      notes: body.notes,
      sections: body.sections,
      finishing,
      chart: body.chart,
      stats: body.stats,
    };
  }

  // ---------------------------------------------------------------- stripes
  function buildStripes(ctx) {
    const { o, rng, yarn, level, N, wIn, hIn } = ctx;
    const options = stitchesFor(level);
    let st = o.stitch !== 'auto' ? STITCH_BY_ID[o.stitch] : null;
    if (st && st.level !== level) st = null;
    if (!st) st = rng.pick(options);

    const upi = (yarn.sc4 / 4) * st.gw;
    const rpi = (yarn.rows4 / 4) * st.gh;
    const k = Math.max(st.minK, Math.round((wIn * upi - st.extra) / st.mult));
    const units = st.mult * k + st.extra;
    const setupRows = st.setupRows, rep = st.repeatRows;
    const m = Math.max(1, Math.round((hIn * rpi - setupRows) / rep));
    const R = setupRows + rep * m;
    const actualW = units / upi, actualH = R / rpi;

    const unit = 2;
    const block = stripeBlock(rng, N, unit);
    const blockLen = block.stripes.reduce((a, s) => a + s.rows, 0);
    const rowColors = new Uint8Array(R);
    for (let r = 0; r < R; r++) {
      let p = r % blockLen;
      for (const s of block.stripes) { if (p < s.rows) { rowColors[r] = s.c; break; } p -= s.rows; }
    }

    const yd = BASE_YD_PER_SQIN * yarn.ydFactor * st.yd * (actualW * actualH) / R;
    const yards = new Array(N).fill(0);
    for (let r = 0; r < R; r++) yards[rowColors[r]] += yd;

    const sections = [];
    const setup = st.setup(units), repeat = st.repeat(units);
    const rowsList = [];
    rowsList.push({ label: 'Foundation', text: `With ${L(rowColors[0])}, ch ${st.chain(units)}.` });
    setup.forEach((t, i) => rowsList.push({ label: `Row ${i + 1}`, text: t }));
    repeat.forEach((t, i) => rowsList.push({ label: `Row ${setupRows + i + 1}`, text: t }));
    const a = setupRows + 1, b = setupRows + rep;
    rowsList.push({
      label: rep === 1 ? `Rows ${a + 1}–${R}` : `Rows ${b + 1}–${R}`,
      text: rep === 1 ? `Rep Row ${a} until you have worked ${R} rows in total (piece measures about ${fmtLen(actualH, o.units)}).`
        : `Rep Rows ${a}–${b} ${m - 1} more times (${R} rows in total; piece measures about ${fmtLen(actualH, o.units)}).`,
    });
    if (R <= b) rowsList.pop();
    sections.push({ title: `Body — ${st.name}`, items: rowsList });

    if (N > 1) {
      const items = [];
      let row = 1;
      for (const s of block.stripes) {
        items.push({ label: s.rows === 1 ? `Row ${row}` : `Rows ${row}–${row + s.rows - 1}`, text: `Color ${L(s.c)}` });
        row += s.rows;
      }
      const fullReps = Math.floor(R / blockLen), leftover = R - fullReps * blockLen;
      items.push({
        label: 'Repeat',
        text: `The stripe sequence is ${blockLen} rows long. Work it ${plural(fullReps, 'time')}${leftover ? `, then work rows 1–${leftover} of the sequence once more` : ''}.`,
      });
      sections.push({ title: `Stripe Sequence — ${block.style}`, items });
    }

    const notes = [];
    if (N > 1) {
      notes.push('To change color, work the last stitch of the row until 2 loops remain (for sc: insert, yo, pull up a loop), then finish the stitch with the new color.');
      notes.push('All stripes are an even number of rows, so color changes always fall on the same edge. Carry colors that come back within a few rows loosely up the side instead of cutting them.');
    }
    if (st.repeatRows > 1) notes.push(`This stitch has a ${st.repeatRows}-row repeat after the setup row; a stitch marker on the first row of each repeat helps you keep your place.`);
    if (k * st.mult > 150) notes.push('Long foundation chains tend to be tight — use a hook one or two sizes larger for the chain only, or use a foundation single crochet row.');
    notes.push('Turning chains are noted in each row; count your stitches at the end of every few rows to keep the edges straight.');

    return {
      wIn: actualW, hIn: actualH,
      motifName: N === 1 ? st.name : `${block.style} Stripe`,
      gauge: `${Math.round(yarn.sc4 * st.gw)} units × ${Math.round(yarn.rows4 * st.gh)} rows = 4" (10 cm) in ${st.name} with a ${yarn.hook} hook. (A "unit" is one chain of the foundation.)`,
      skills: st.skills.concat(N > 1 ? ['Changing colors'] : []),
      abbr: st.abbr, special: st.special,
      notes, sections, yards,
      chart: { type: 'rows', rows: R, units, rowColors, stitch: st.id, aspect: actualW / actualH },
      stats: { stitchesWide: units, rows: R, stitch: st.name },
    };
  }

  // ---------------------------------------------------------------- tapestry
  function buildTapestry(ctx) {
    const { o, rng, yarn, N, wIn, hIn, notices } = ctx;
    const spi = yarn.sc4 / 4, rpi = (yarn.rows4 / 4) * 1.05;
    const targetSts = Math.round(wIn * spi), targetRows = Math.round(hIn * rpi);
    const e = 2;
    const t = pickTile(rng, Math.max(4, Math.floor((targetSts - 2 * e) / 2)), Math.max(4, Math.floor(targetRows / 2.5)));
    const k = Math.max(1, Math.round((targetSts - 2 * e) / t.w));
    const W = t.w * k + 2 * e;
    const g = Math.max(2, Math.ceil(t.h / 3));
    const nb = Math.max(1, Math.floor((targetRows - 4 + g) / (t.h + g)));
    const used = nb * t.h + (nb - 1) * g;
    const rest = Math.max(4, targetRows - used);
    const bottom = Math.max(2, Math.floor(rest / 2)), top = Math.max(2, rest - bottom);
    const R = bottom + used + top;

    const cells = new Uint8Array(W * R);
    const accent = N >= 3 && g >= 3 ? N - 1 : -1;
    const contrastColors = [];
    for (let i = 0; i < N - 1; i++) if (i + 1 !== accent || N - 1 === 1) contrastColors.push(i + 1);
    if (!contrastColors.length) contrastColors.push(1);
    let r = bottom;
    for (let i = 0; i < nb; i++) {
      const ci = contrastColors[i % contrastColors.length];
      for (let ty = 0; ty < t.h; ty++, r++) {
        for (let c = e; c < W - e; c++) if (t.at((c - e) % t.w, ty)) cells[r * W + c] = ci;
      }
      if (i < nb - 1) {
        if (accent > 0) { const mid = r + Math.floor(g / 2); for (let c = 0; c < W; c++) cells[mid * W + c] = accent; }
        r += g;
      }
    }

    const working = (row) => {
      const arr = Array.from(cells.subarray(row * W, row * W + W));
      return row % 2 === 0 ? arr.reverse() : arr; // odd (1-based) rows are RS, read right to left
    };
    const rowText = (row) => {
      const arr = working(row);
      if (arr.every((v) => v === arr[0])) return `With ${L(arr[0])}, sc in each st across.`;
      const mid = arr.slice(e, W - e);
      const period = mid.slice(0, t.w);
      if (k === 1) return runsText(arr);
      return `${runsText(arr.slice(0, e))}, *${runsText(period)}; rep from * ${plural(k - 1, 'more time')}, ${runsText(arr.slice(W - e))}.`;
    };

    const rows = [];
    for (let i = 1; i < R; i++) rows.push({ n: i + 1, text: rowText(i) });
    const items = [
      { label: 'Foundation', text: `With A, ch ${W + 1}.` },
      { label: 'Row 1 (RS)', text: `Sc in 2nd ch from hook and in each ch across, turn. (${W} sc)` },
      ...groupRows(rows),
    ];

    const yards = new Array(N).fill(0);
    const ydPerSt = (BASE_YD_PER_SQIN * yarn.ydFactor * 1.1) / (spi * rpi);
    const carryPerSt = 1 / spi / 36;
    for (let row = 0; row < R; row++) {
      const set = new Set();
      for (let c = 0; c < W; c++) { const v = cells[row * W + c]; yards[v] += ydPerSt; set.add(v); }
      if (set.size > 1) for (const v of set) yards[v] += W * carryPerSt;
    }

    const usedColors = new Set(cells).size;
    if (usedColors < N) notices.push(`Only ${usedColors} of your ${N} colors fit this piece's ${plural(nb, 'motif band')} — try a larger size, a new design, or C2C to use every color.`);

    return {
      wIn: W / spi, hIn: R / rpi,
      motifName: `${t.name} Band`,
      gauge: `${yarn.sc4} sc × ${Math.round(yarn.rows4 * 1.05)} rows = 4" (10 cm) in tapestry single crochet with a ${yarn.hook} hook.`,
      skills: ['Single crochet', 'Tapestry crochet (carrying yarn)', 'Reading a color chart'],
      abbr: ['RS', 'WS'], special: ['Tapestry color change'],
      notes: [
        'Every row after Row 1 begins with ch 1 (does not count as a st), is worked in sc, and ends with turn.',
        `Color runs are read in working order: "3 A, 2 B" means sc 3 sts with A, then 2 sts with B. Odd rows are RS rows (read the chart right to left); even rows are WS rows (read left to right).`,
        'Each row uses no more than two colors. Carry the inactive color across the full width of every motif row. Cut and weave the contrast color at the end of each band.',
        `The motif is a ${t.w}-st × ${t.h}-row repeat, worked ${plural(k, 'time')} across with ${e} edge sts on each side.`,
      ],
      sections: [{ title: 'Body — Tapestry Chart, Written Out', items }],
      yards,
      chart: { type: 'grid', w: W, h: R, cells },
      stats: { stitchesWide: W, rows: R, stitch: 'Tapestry single crochet' },
    };
  }

  // ---------------------------------------------------------------- corner to corner
  function buildC2C(ctx) {
    const { o, rng, yarn, N, wIn, hIn } = ctx;
    const blockIn = 0.75 * (15 / yarn.sc4);
    const W = Math.max(4, Math.round(wIn / blockIn)), H = Math.max(4, Math.round(hIn / blockIn));
    const motif = c2cMotif(rng, W, H, N);
    const cells = motif.cells;

    const rows = [];
    const D = W + H - 1;
    for (let d = 0; d < D; d++) {
      const lo = Math.max(0, d - (H - 1)), hi = Math.min(d, W - 1);
      const n = d + 1;
      const colors = [];
      if (n % 2 === 1) for (let c = hi; c >= lo; c--) colors.push(cells[(d - c) * W + c]);
      else for (let c = lo; c <= hi; c++) colors.push(cells[(d - c) * W + c]);
      const lrGrows = d <= W - 1, ulGrows = d <= H - 1;
      const startGrows = n % 2 === 1 ? lrGrows : ulGrows;
      const endGrows = n % 2 === 1 ? ulGrows : lrGrows;
      let how;
      if (n === 1) how = 'Ch 6, dc in 4th ch from hook and in next 2 ch';
      else {
        how = startGrows ? 'Inc at start' : 'Dec at start';
        if (!endGrows) how += ', dec at end';
      }
      rows.push({ n, text: `[${how}] ${plural(colors.length, 'block')}: ${runsText(colors)}` });
    }

    const yards = new Array(N).fill(0);
    const ydPerBlock = BASE_YD_PER_SQIN * yarn.ydFactor * 1.4 * blockIn * blockIn;
    for (const v of cells) yards[v] += ydPerBlock;

    const incPhase = Math.min(W, H);
    return {
      wIn: W * blockIn, hIn: H * blockIn,
      motifName: `${motif.name} C2C`,
      gauge: `Each C2C block measures about ${fmtLen(blockIn, o.units)} square with a ${yarn.hook} hook (about ${Math.round(4 / blockIn * 10) / 10} blocks = 4" / 10 cm). The chart is ${W} × ${H} blocks.`,
      skills: ['Double crochet', 'C2C increases & decreases', ...(N > 1 ? ['Reading a color chart', 'Managing bobbins'] : [])],
      abbr: ['dc', 'sp', 'C2C'], special: ['C2C block'],
      notes: [
        'Row 1 is the bottom-left block of the chart. Rows are worked on the diagonal. Odd rows run from the bottom/right edge toward the top/left; even rows run the other way. Colors for each row are listed in working order.',
        `The piece increases at both edges for the first ${incPhase} rows, then increases on one edge and decreases on the other${W === H ? '' : ` until row ${Math.max(W, H)}`}, then decreases at both edges to the final corner.`,
        'For a color change, finish the last dc of a block with the new color, then work the next block’s ch 3 with it. Use a bobbin for every separate color section; carry yarn only when the same color returns within 1–2 blocks.',
      ],
      sections: [
        {
          title: 'How to Work C2C', items: [
            { label: 'Row 1', text: 'Ch 6, dc in 4th ch from hook and in next 2 ch. (1 block) Turn.' },
            { label: 'Inc at start', text: 'Ch 6, dc in 4th ch from hook and in next 2 ch (new edge block), *sl st into the ch-3 sp of the next block of the previous row, ch 3, 3 dc in the same sp; rep from * across. Turn.' },
            { label: 'Dec at start', text: 'Sl st in each of the 3 dc of the block just made and into its ch-3 sp, ch 3, 3 dc in the same sp, then continue across as for the rest of the row.' },
            { label: 'Dec at end', text: 'When you reach the last block of the previous row, sl st into its ch-3 sp but do not work a block there. Turn.' },
          ],
        },
        { title: `Rows 1–${D} — Color Guide`, items: groupRows(rows) },
      ],
      yards,
      chart: { type: 'grid', w: W, h: H, cells, c2c: true },
      stats: { stitchesWide: W, rows: D, stitch: `C2C (${W} × ${H} blocks)` },
    };
  }

  return { generate, toUK, PROJECTS, YARNS, LEVELS, LEVEL_LABEL, STITCHES, stitchesFor, TECHNIQUES, techniquesFor, autoTechnique, fmtLen, _internal: { runsText, groupRows, stripeBlock, pickTile, c2cMotif, makeRng } };
});
