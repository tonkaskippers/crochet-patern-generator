/* UI for the crochet pattern generator. Depends on generator.js (window.CrochetGen). */
(function () {
  'use strict';
  const G = window.CrochetGen;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const PALETTES = {
    Harvest: [['#F3E9D2', 'Cream'], ['#A23E2A', 'Rust'], ['#D9A441', 'Mustard'], ['#5B6E3A', 'Olive'], ['#2F4858', 'Slate'], ['#C97B63', 'Terracotta'], ['#6B4226', 'Chestnut'], ['#E8C1A0', 'Peach']],
    Seaside: [['#F1FAEE', 'Sea Salt'], ['#1D3557', 'Navy'], ['#457B9D', 'Harbor Blue'], ['#A8DADC', 'Seafoam'], ['#E63946', 'Coral'], ['#2A9D8F', 'Teal'], ['#E9C46A', 'Sand'], ['#F4A261', 'Apricot']],
    'Berry Patch': [['#FBF3F0', 'Milk'], ['#6D2E46', 'Mulberry'], ['#A26769', 'Rosewood'], ['#D5B9B2', 'Blush'], ['#3D405B', 'Indigo'], ['#B5446E', 'Raspberry'], ['#8E7DBE', 'Lavender'], ['#F2CC8F', 'Honey']],
    Nordic: [['#F7F7F2', 'Snow'], ['#22333B', 'Charcoal'], ['#B23A48', 'Lingonberry'], ['#5E6472', 'Fjord Gray'], ['#A9BCD0', 'Frost'], ['#2E5E4E', 'Pine'], ['#D8A47F', 'Birch'], ['#EAE0D5', 'Oat']],
    Meadow: [['#FFFBEA', 'Buttermilk'], ['#386641', 'Fern'], ['#6A994E', 'Moss'], ['#A7C957', 'Lime'], ['#BC4749', 'Poppy'], ['#F4D35E', 'Buttercup'], ['#7C9EB2', 'Sky'], ['#8B5E3C', 'Bark']],
    Sunset: [['#2B2D42', 'Midnight'], ['#FFB703', 'Marigold'], ['#FB8500', 'Tangerine'], ['#E76F51', 'Persimmon'], ['#8ECAE6', 'Dusk Blue'], ['#219EBC', 'Lagoon'], ['#F4ACB7', 'Flamingo'], ['#FFF1D0', 'Vanilla']],
    Nursery: [['#FFFFFF', 'White'], ['#F7C5CC', 'Petal'], ['#BDE0FE', 'Baby Blue'], ['#CDB4DB', 'Lilac'], ['#B9FBC0', 'Mint'], ['#FFE5A0', 'Lemon'], ['#FFC8A2', 'Peach Fuzz'], ['#A0C4FF', 'Periwinkle']],
    Desert: [['#EDE0D4', 'Sandstone'], ['#7F5539', 'Saddle'], ['#B08968', 'Camel'], ['#DDB892', 'Latte'], ['#9C6644', 'Clay'], ['#6B705C', 'Sage'], ['#E6CCB2', 'Dune'], ['#3E2C23', 'Espresso']],
  };
  const NAMED = [].concat(...Object.values(PALETTES), [['#000000', 'Black'], ['#808080', 'Gray'], ['#FF0000', 'Red'], ['#00A000', 'Green'], ['#0050FF', 'Blue'], ['#FFFF00', 'Yellow'], ['#800080', 'Purple'], ['#FFA500', 'Orange']]);
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function nearestName(hex) {
    const [r, g, b] = rgb(hex);
    let best = 'Custom', bd = Infinity;
    for (const [h, n] of NAMED) {
      const [r2, g2, b2] = rgb(h);
      const d = 2 * (r - r2) ** 2 + 4 * (g - g2) ** 2 + 3 * (b - b2) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  const luminance = (hex) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  const LEVEL_HINTS = {
    beginner: 'Basic stitches worked in rows, with simple stripes when you add colors.',
    easy: 'Textured stitch patterns and stripe sequences — great second project.',
    intermediate: 'Shell, V and post stitches, or two-color tapestry motif bands.',
    advanced: 'Basketweave and bobbles, or multi-color corner-to-corner graphghans.',
  };

  // ---------------------------------------------------------------- state
  const state = {
    project: 'throw', size: 'M', customW: 50, customH: 60, units: 'in',
    level: 'beginner', colors: 3, yarn: 'worsted', technique: 'auto', stitch: 'auto',
    terms: 'us', seed: randSeed(), palette: 'Harvest', swatches: PALETTES.Harvest.map((c) => c[0]),
  };
  let result = null;
  let fitChart = true;

  function randSeed() { return Math.floor(Math.random() * 900000) + 100000; }

  function readHash() {
    try {
      const p = new URLSearchParams(location.hash.slice(1));
      for (const k of ['project', 'size', 'units', 'level', 'yarn', 'technique', 'stitch', 'terms', 'palette']) if (p.get(k)) state[k] = p.get(k);
      for (const k of ['customW', 'customH', 'colors', 'seed']) if (p.get(k) && !isNaN(+p.get(k))) state[k] = +p.get(k);
      if (!G.PROJECTS[state.project]) state.project = 'throw';
      if (!PALETTES[state.palette]) state.palette = 'Harvest';
      state.swatches = PALETTES[state.palette].map((c) => c[0]);
      if (p.get('sw')) {
        const sw = p.get('sw').split('-').filter((h) => /^[0-9a-f]{6}$/i.test(h)).map((h) => '#' + h.toUpperCase());
        sw.forEach((h, i) => { if (i < 8) state.swatches[i] = h; });
      }
    } catch (e) { /* ignore malformed hash */ }
  }
  function writeHash() {
    const p = new URLSearchParams();
    for (const k of ['project', 'size', 'units', 'level', 'colors', 'yarn', 'technique', 'stitch', 'terms', 'palette', 'seed']) p.set(k, state[k]);
    if (state.size === 'custom') { p.set('customW', state.customW); p.set('customH', state.customH); }
    const def = PALETTES[state.palette].map((c) => c[0]);
    if (state.swatches.some((h, i) => h !== def[i])) p.set('sw', state.swatches.map((h) => h.slice(1)).join('-'));
    history.replaceState(null, '', '#' + p.toString());
  }

  // ---------------------------------------------------------------- controls
  function buildStaticControls() {
    $('project').innerHTML = Object.entries(G.PROJECTS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('');
    $('yarn').innerHTML = Object.entries(G.YARNS).map(([k, y]) => `<option value="${k}">${esc(y.label)}</option>`).join('');
    $('palette').innerHTML = Object.keys(PALETTES).map((k) => `<option value="${esc(k)}">${esc(k)} palette</option>`).join('');
  }

  function syncControls() {
    $('project').value = state.project;
    $('yarn').value = state.yarn;
    $('palette').value = state.palette;
    $('colors').value = state.colors;
    $('colors-out').textContent = state.colors;
    document.querySelector(`input[name=level][value=${state.level}]`).checked = true;
    document.querySelector(`input[name=units][value=${state.units}]`).checked = true;
    document.querySelector(`input[name=terms][value=${state.terms}]`).checked = true;
    $('level-hint').textContent = LEVEL_HINTS[state.level];

    const proj = G.PROJECTS[state.project];
    const u = state.units;
    $('sizes').innerHTML = proj.sizes.map((s) =>
      `<label><input type="radio" name="size" value="${s.id}"${state.size === s.id ? ' checked' : ''}><span>${esc(s.name)}<small>${G.fmtLen(s.w, u)} × ${G.fmtLen(s.h, u)}</small></span></label>`
    ).join('') + `<label><input type="radio" name="size" value="custom"${state.size === 'custom' ? ' checked' : ''}><span>Custom<small>your dimensions</small></span></label>`;
    $('custom-size').hidden = state.size !== 'custom';
    $('customW').value = state.customW;
    $('customH').value = state.customH;

    const techs = G.techniquesFor(state.level, state.colors);
    if (state.technique !== 'auto' && !techs.includes(state.technique)) state.technique = 'auto';
    const autoT = G.autoTechnique(state.level, state.colors);
    $('technique').innerHTML = `<option value="auto">Auto (${esc(G.TECHNIQUES[autoT].label)})</option>` +
      techs.map((t) => `<option value="${t}">${esc(G.TECHNIQUES[t].label)}</option>`).join('');
    $('technique').value = state.technique;

    const st = G.stitchesFor(state.level);
    if (state.stitch !== 'auto' && !st.some((s) => s.id === state.stitch)) state.stitch = 'auto';
    $('stitch').innerHTML = '<option value="auto">Surprise me</option>' + st.map((s) => `<option value="${s.id}">${esc(T(s.name))}</option>`).join('');
    $('stitch').value = state.stitch;
    const effective = state.technique === 'auto' ? autoT : state.technique;
    $('stitch-field').hidden = effective !== 'stripes';

    renderSwatches();
  }

  function renderSwatches() {
    $('swatches').innerHTML = state.swatches.slice(0, state.colors).map((h, i) =>
      `<label class="swatch"><input type="color" value="${h}" data-i="${i}" aria-label="Color ${String.fromCharCode(65 + i)}"><b>${String.fromCharCode(65 + i)}</b><span class="nm">${esc(colorName(i))}</span></label>`
    ).join('');
  }
  function colorName(i) {
    const hex = state.swatches[i];
    const pal = PALETTES[state.palette].find((c) => c[0].toUpperCase() === hex.toUpperCase());
    return pal ? pal[1] : nearestName(hex);
  }

  function bind() {
    const regen = () => { syncControls(); update(); };
    $('project').addEventListener('change', (e) => { state.project = e.target.value; if (state.size !== 'custom') state.size = 'M'; regen(); });
    $('sizes').addEventListener('change', (e) => {
      state.size = e.target.value;
      if (state.size === 'custom' && !$('customW').dataset.touched) {
        const s = G.PROJECTS[state.project].sizes.find((z) => z.id === 'M');
        const f = state.units === 'cm' ? 2.54 : 1;
        state.customW = Math.round(s.w * f); state.customH = Math.round(s.h * f);
      }
      regen();
    });
    for (const id of ['customW', 'customH']) {
      $(id).addEventListener('input', debounce((e) => { $('customW').dataset.touched = '1'; state[id] = +e.target.value || state[id]; update(); }, 250));
    }
    document.querySelectorAll('input[name=units]').forEach((r) => r.addEventListener('change', (e) => {
      const f = e.target.value === 'cm' ? 2.54 : 1 / 2.54;
      state.customW = Math.round(state.customW * f * 2) / 2; state.customH = Math.round(state.customH * f * 2) / 2;
      state.units = e.target.value; regen();
    }));
    document.querySelectorAll('input[name=level]').forEach((r) => r.addEventListener('change', (e) => { state.level = e.target.value; regen(); }));
    document.querySelectorAll('input[name=terms]').forEach((r) => r.addEventListener('change', (e) => { state.terms = e.target.value; syncControls(); render(); writeHash(); }));
    $('colors').addEventListener('input', (e) => { state.colors = +e.target.value; regen(); });
    $('yarn').addEventListener('change', (e) => { state.yarn = e.target.value; update(); });
    $('technique').addEventListener('change', (e) => { state.technique = e.target.value; regen(); });
    $('stitch').addEventListener('change', (e) => { state.stitch = e.target.value; update(); });
    $('palette').addEventListener('change', (e) => { state.palette = e.target.value; state.swatches = PALETTES[state.palette].map((c) => c[0]); regen(); });
    $('shuffle-palette').addEventListener('click', () => {
      const a = state.swatches.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      state.swatches = a; renderSwatches(); update();
    });
    $('swatches').addEventListener('input', (e) => {
      if (e.target.type !== 'color') return;
      state.swatches[+e.target.dataset.i] = e.target.value.toUpperCase();
      e.target.parentElement.querySelector('.nm').textContent = colorName(+e.target.dataset.i);
      renderLight();
    });
    $('new-design').addEventListener('click', () => { state.seed = randSeed(); update(); });
    $('print').addEventListener('click', () => { const f = fitChart; fitChart = true; drawChart(); window.print(); fitChart = f; drawChart(); });
    $('copy').addEventListener('click', () => copy(plainText(), 'Pattern copied to clipboard'));
    $('share').addEventListener('click', (e) => { e.preventDefault(); copy(location.href, 'Link copied — it recreates this exact pattern'); });
    $('settings').addEventListener('submit', (e) => e.preventDefault());
    window.addEventListener('resize', debounce(drawChart, 150));
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200); }
  function copy(text, msg) {
    const done = () => toast(msg);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed'); }
    ta.remove();
  }

  // ---------------------------------------------------------------- generate + render
  function update() {
    result = G.generate({
      project: state.project, size: state.size, customW: state.customW, customH: state.customH, units: state.units,
      level: state.level, colors: state.colors, yarn: state.yarn, technique: state.technique, stitch: state.stitch,
      seed: state.seed, paletteName: state.palette,
    });
    $('seed').textContent = state.seed;
    render();
    writeHash();
  }

  const T = (s) => (state.terms === 'uk' ? G.toUK(s) : s);
  const hexOf = (i) => state.swatches[i];

  function render() {
    const r = result;
    const facts = [
      ['Finished size', r.finished.text],
      ['Yarn', `${r.yarn.label}, ~${r.yarn.totalYards.toLocaleString()} yd total`],
      ['Hook', r.yarn.hook],
      ['Size', `${r.sizeName}${r.panels === 2 ? ' · 2 panels' : ''}`],
      [r.technique === 'c2c' ? 'Grid' : 'Stitches × rows', r.technique === 'c2c' ? `${r.chart.w} × ${r.chart.h} blocks` : `${r.stats.stitchesWide} × ${r.stats.rows}`],
    ];
    const ydLabel = (y) => `${y.toLocaleString()} yd / ${Math.round(y * 0.9144).toLocaleString()} m`;

    $('pattern').innerHTML = `
      <h2>${esc(r.title)}</h2>
      <p class="sub">${esc(r.levelLabel)} · ${esc(r.techniqueLabel)} · ${r.colors} color${r.colors > 1 ? 's' : ''}</p>
      ${r.notices.map((n) => `<div class="notice">${esc(n)}</div>`).join('')}
      <div class="facts">${facts.map(([k, v]) => `<div class="fact"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>

      <div class="chart-wrap">
        <div class="chart-box ${fitChart ? 'fit' : ''}" id="chart-box"><canvas id="chart" role="img" aria-label="Pattern preview"></canvas></div>
        <div class="chart-tools">
          <span>${r.chart.type === 'grid' ? (r.chart.c2c ? 'Each square is one C2C block. Row 1 starts at the bottom-left corner.' : 'Each square is one stitch. Row 1 is at the bottom; read RS rows right to left.') : 'Preview of the stripe layout (Row 1 at the bottom).'}</span>
          ${r.chart.type === 'grid' ? `<button type="button" class="btn" id="zoom">${fitChart ? 'Zoom in' : 'Fit to width'}</button>` : ''}
        </div>
        <div class="legend" id="legend"></div>
      </div>

      <h3>Materials</h3>
      <table>
        <thead><tr><th>Color</th><th class="num">Approx. amount</th><th class="num">Skeins*</th></tr></thead>
        <tbody id="materials">${r.materials.map((m) => `<tr><td><i class="dot" data-c="${m.index}"></i><b>${m.letter}</b> – <span data-n="${m.index}"></span></td><td class="num">${m.yards ? ydLabel(m.yards) : 'not used'}</td><td class="num">${m.skeins || '—'}</td></tr>`).join('')}</tbody>
      </table>
      <p class="hint">*Based on ${r.yarn.skeinYards}-yd (${r.yarn.skeinG} g) skeins of ${esc(r.yarn.label.toLowerCase())} yarn, plus 10% extra. Hook: ${esc(r.yarn.hook)}, or size needed to obtain gauge.</p>
      <ul class="plain">${r.notions.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>

      <h3>${T('Gauge')}</h3>
      <p>${esc(T(r.gauge))}</p>

      <h3>Skills Used</h3>
      <div class="skills">${r.skills.map((s) => `<span>${esc(T(s))}</span>`).join('')}</div>

      <h3>Abbreviations (${state.terms.toUpperCase()} terms)</h3>
      <div class="abbr">${r.abbreviations.map((a) => state.terms === 'uk' ? `<div><b>${esc(a.uk)}</b> ${esc(a.ukName)}</div>` : `<div><b>${esc(a.us)}</b> ${esc(a.usName)}</div>`).join('')}</div>

      ${r.special.length ? `<h3>Special Stitches</h3><dl class="special">${r.special.map((s) => `<dt>${esc(T(s.name))}</dt><dd>${esc(T(s.text))}</dd>`).join('')}</dl>` : ''}

      <h3>Pattern Notes</h3>
      <ul class="plain">${r.notes.map((n) => `<li>${esc(T(n))}</li>`).join('')}</ul>

      ${r.sections.map((s) => `
        <h3>${esc(T(s.title))}</h3>
        <ol class="steps${s.items.length > 30 ? ' long' : ''}">${s.items.map((it) => `<li><b>${esc(T(it.label))}</b><span>${esc(T(it.text))}</span></li>`).join('')}</ol>`).join('')}

      <h3>${r.panels === 2 ? 'Assembly &amp; Finishing' : 'Border &amp; Finishing'}</h3>
      <ol class="steps">${r.finishing.map((f) => { const m = f.match(/^(Rnd \d+): (.*)$/); return `<li><b>${m ? m[1] : '•'}</b><span>${esc(T(m ? m[2] : f))}</span></li>`; }).join('')}</ol>
    `;
    const z = $('zoom');
    if (z) z.addEventListener('click', () => { fitChart = !fitChart; $('chart-box').classList.toggle('fit', fitChart); z.textContent = fitChart ? 'Zoom in' : 'Fit to width'; drawChart(); });
    renderLight();
  }

  // Re-color things that depend only on the palette (no regeneration).
  function renderLight() {
    if (!result) return;
    document.querySelectorAll('[data-c]').forEach((el) => { el.style.background = hexOf(+el.dataset.c); });
    document.querySelectorAll('[data-n]').forEach((el) => { el.textContent = colorName(+el.dataset.n); });
    const counts = new Array(result.colors).fill(0);
    if (result.chart.type === 'grid') for (const v of result.chart.cells) counts[v]++;
    else for (const v of result.chart.rowColors) counts[v]++;
    const unit = result.chart.type === 'grid' ? (result.chart.c2c ? 'blocks' : 'sts') : 'rows';
    $('legend').innerHTML = counts.map((n, i) => `<div><i style="background:${hexOf(i)}"></i>${String.fromCharCode(65 + i)} · ${esc(colorName(i))} <span class="hint" style="margin:0">(${n.toLocaleString()} ${unit})</span></div>`).join('');
    drawChart();
  }

  function drawChart() {
    const cv = $('chart');
    if (!cv || !result) return;
    const ch = result.chart;
    const box = $('chart-box');
    const avail = Math.max(200, box.clientWidth - 24);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = cv.getContext('2d');

    if (ch.type === 'grid') {
      const cs = fitChart ? Math.max(1, Math.min(14, Math.floor(avail / ch.w), Math.floor(560 / ch.h) || 1)) : 12;
      const W = ch.w * cs, H = ch.h * cs;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let y = 0; y < ch.h; y++) {
        for (let x = 0; x < ch.w; x++) {
          ctx.fillStyle = hexOf(ch.cells[y * ch.w + x]);
          ctx.fillRect(x * cs, (ch.h - 1 - y) * cs, cs, cs);
        }
      }
      if (cs >= 5) {
        ctx.lineWidth = 1;
        for (let x = 0; x <= ch.w; x++) {
          ctx.strokeStyle = x % 10 === 0 ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.12)';
          ctx.beginPath(); ctx.moveTo(x * cs + 0.5, 0); ctx.lineTo(x * cs + 0.5, H); ctx.stroke();
        }
        for (let y = 0; y <= ch.h; y++) {
          ctx.strokeStyle = y % 10 === 0 ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.12)';
          const py = H - y * cs;
          ctx.beginPath(); ctx.moveTo(0, py - 0.5); ctx.lineTo(W, py - 0.5); ctx.stroke();
        }
      }
    } else {
      let H = Math.min(520, Math.max(220, avail / ch.aspect));
      let Wd = H * ch.aspect;
      if (Wd > avail) { Wd = avail; H = Wd / ch.aspect; }
      Wd = Math.round(Wd); H = Math.round(H);
      cv.width = Wd * dpr; cv.height = H * dpr;
      cv.style.width = Wd + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rh = H / ch.rows;
      for (let r = 0; r < ch.rows; r++) {
        ctx.fillStyle = hexOf(ch.rowColors[r]);
        ctx.fillRect(0, H - (r + 1) * rh, Wd, rh + 0.6);
      }
      // stitch texture
      const sw = Math.max(3, Math.min(10, rh * 1.1));
      if (rh >= 2) {
        for (let r = 0; r < ch.rows; r++) {
          const y0 = H - (r + 1) * rh;
          const dark = luminance(hexOf(ch.rowColors[r])) > 0.5;
          ctx.strokeStyle = dark ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.16)';
          ctx.lineWidth = 1;
          const off = (r % 2) * sw / 2;
          ctx.beginPath();
          for (let x = off; x < Wd; x += sw) {
            ctx.moveTo(x, y0 + rh * 0.85); ctx.lineTo(x + sw * 0.35, y0 + rh * 0.15);
            ctx.moveTo(x + sw * 0.7, y0 + rh * 0.85); ctx.lineTo(x + sw * 0.35, y0 + rh * 0.15);
          }
          ctx.stroke();
        }
      }
    }
  }

  function plainText() {
    const r = result;
    const out = [];
    const line = (s = '') => out.push(s);
    line(r.title.toUpperCase());
    line(`${r.levelLabel} · ${r.techniqueLabel} · ${r.colors} color(s)`);
    line(`Design #${r.seed} — ${location.href}`);
    line();
    line(`Finished size: ${r.finished.text}`);
    line(`Yarn: ${r.yarn.label}, about ${r.yarn.totalYards} yd total`);
    r.materials.forEach((m) => line(`  ${m.letter} – ${colorName(m.index)} (${hexOf(m.index)}): ${m.yards ? `${m.yards} yd, ${m.skeins} skein(s)` : 'not used'}`));
    line(`Hook: ${r.yarn.hook}`);
    line(`Notions: ${r.notions.join(', ')}`);
    line();
    line(`${T('Gauge').toUpperCase()}: ${T(r.gauge)}`);
    line();
    line(`ABBREVIATIONS (${state.terms.toUpperCase()})`);
    r.abbreviations.forEach((a) => line(state.terms === 'uk' ? `  ${a.uk} = ${a.ukName}` : `  ${a.us} = ${a.usName}`));
    if (r.special.length) { line(); line('SPECIAL STITCHES'); r.special.forEach((s) => line(`  ${T(s.name)}: ${T(s.text)}`)); }
    line(); line('NOTES'); r.notes.forEach((n) => line(`  - ${T(n)}`));
    r.sections.forEach((s) => { line(); line(T(s.title).toUpperCase()); s.items.forEach((it) => line(`${T(it.label)}: ${T(it.text)}`)); });
    line(); line('FINISHING'); r.finishing.forEach((f) => line(T(f)));
    return out.join('\n');
  }

  // ---------------------------------------------------------------- init
  readHash();
  buildStaticControls();
  syncControls();
  bind();
  update();
})();
