'use strict';
const test = require('node:test');
const assert = require('node:assert');
const G = require('../generator.js');

test('generates a pattern for every project × level × color count', () => {
  for (const project of Object.keys(G.PROJECTS)) {
    for (const level of G.LEVELS) {
      for (const colors of [1, 2, 3, 5, 8]) {
        for (let seed = 1; seed <= 3; seed++) {
          const r = G.generate({ project, level, colors, seed });
          assert.ok(r.title && r.sections.length, `${project}/${level}/${colors}`);
          assert.strictEqual(r.materials.length, colors);
          assert.strictEqual(r.level, level);
          assert.ok(r.finished.w > 0 && r.finished.h > 0);
        }
      }
    }
  }
});

test('same seed is deterministic, different seeds vary', () => {
  const a = G.generate({ project: 'throw', level: 'advanced', colors: 4, seed: 42 });
  const b = G.generate({ project: 'throw', level: 'advanced', colors: 4, seed: 42 });
  assert.deepStrictEqual(a.sections, b.sections);
  const titles = new Set();
  for (let s = 1; s <= 20; s++) titles.add(G.generate({ project: 'throw', level: 'advanced', colors: 4, seed: s }).title);
  assert.ok(titles.size > 1);
});

test('auto technique follows difficulty', () => {
  assert.strictEqual(G.generate({ level: 'beginner', colors: 4 }).technique, 'stripes');
  assert.strictEqual(G.generate({ level: 'intermediate', colors: 3 }).technique, 'tapestry');
  assert.strictEqual(G.generate({ level: 'advanced', colors: 3 }).technique, 'c2c');
  assert.strictEqual(G.generate({ level: 'advanced', colors: 1 }).technique, 'stripes');
});

test('unavailable technique falls back with a notice', () => {
  const r = G.generate({ level: 'beginner', colors: 3, technique: 'c2c' });
  assert.strictEqual(r.technique, 'stripes');
  assert.strictEqual(r.notices.length, 1);
});

test('stitch counts honor each stitch multiple', () => {
  for (const st of G.STITCHES) {
    for (const w of [7, 9, 30, 50, 90]) {
      const r = G.generate({ project: 'throw', size: 'custom', customW: w, customH: 20, level: st.level, colors: 2, technique: 'stripes', stitch: st.id, seed: 3 });
      const u = r.stats.stitchesWide;
      assert.strictEqual(r.stats.stitch, st.name);
      assert.strictEqual((u - st.extra) % st.mult, 0, `${st.id} width ${u}`);
      assert.strictEqual((r.stats.rows - st.setupRows) % st.repeatRows, 0, `${st.id} rows`);
    }
  }
});

test('finished size is close to the requested size', () => {
  for (const level of G.LEVELS) {
    const r = G.generate({ project: 'throw', size: 'M', level, colors: 3, seed: 7 });
    assert.ok(Math.abs(r.finished.w - 50) < 6, `${level} width ${r.finished.w}`);
    assert.ok(Math.abs(r.finished.h - 60) < 6, `${level} height ${r.finished.h}`);
  }
});

test('tapestry rows use at most two colors and chart matches stitch count', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const r = G.generate({ project: 'throw', level: 'intermediate', colors: 5, seed });
    const { w, h, cells } = r.chart;
    assert.strictEqual(cells.length, w * h);
    for (let y = 0; y < h; y++) assert.ok(new Set(cells.subarray(y * w, y * w + w)).size <= 2);
    const total = r.sections[0].items.find((i) => i.label === 'Row 1 (RS)').text;
    assert.ok(total.includes(`(${w} sc)`));
  }
});

test('C2C rows cover every block exactly once', () => {
  const r = G.generate({ project: 'baby', level: 'advanced', colors: 4, seed: 5 });
  const { w, h } = r.chart;
  const guide = r.sections[1].items;
  let blocks = 0;
  for (const it of guide) {
    const m = it.label.match(/Rows? (\d+)(?:–(\d+))?/);
    const count = m[2] ? +m[2] - +m[1] + 1 : 1;
    blocks += count * +it.text.match(/(\d+) blocks?:/)[1];
  }
  assert.strictEqual(blocks, w * h);
});

test('UK conversion maps stitch names without touching other words', () => {
  assert.strictEqual(G.toUK('Sc in 2nd ch, hdc, dc, FPdc, sk 2, scarf'), 'Dc in 2nd ch, htr, tr, FPtr, miss 2, scarf');
});

test('custom size in cm is converted', () => {
  const r = G.generate({ project: 'scarf', size: 'custom', customW: 20, customH: 150, units: 'cm', level: 'beginner', colors: 1, seed: 1 });
  assert.ok(Math.abs(r.finished.w - 20 / 2.54) < 1);
  assert.ok(r.finished.text.includes('cm'));
});
