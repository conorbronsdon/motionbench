import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { revisionChecks } from '../experiments/revision-stat/checks.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../experiments/revision-stat/manifest.json', import.meta.url)));
const role = (text, y, h = 60) => ({text, x: 100, y, w: 800, h, o: 1, font: 'JetBrains Mono',
  vw: 800, vh: h, textFits: true, textBounds: [100, y, 800, h]});
function fixture() {
  return Object.fromEntries(manifest.formats.map((format) => [format.id, {
    fps: manifest.fps, duration: manifest.duration, errors: [], network: [],
    stage: {width: format.width, height: format.height, scrollWidth: format.width, scrollHeight: format.height},
    frames: Array.from({length: manifest.duration * manifest.fps + 1}, (_, i) => ({
      t: Math.round(i / manifest.fps * 10000) / 10000,
      roles: {
        value: role(Math.floor(manifest.counter.to * (1 - (1 - Math.max(0, Math.min(1,
          (i / manifest.fps - manifest.counter.start) / (manifest.counter.land - manifest.counter.start)))) ** 4))
          .toLocaleString('en-US'), 300, 180),
        qualifier: role(manifest.narration.copy[0].text, 520, 120),
        source: role(manifest.narration.copy[1].text, 760),
      },
    })),
  }]));
}
const passes = (ctx) => revisionChecks(ctx, manifest).every((f) => f.pass);
test('both formats satisfy every revision obligation', () => assert.equal(passes(fixture()), true));
test('landscape success never compensates for a missing portrait', () => {
  const ctx = fixture(); delete ctx.portrait;
  const result = revisionChecks(ctx, manifest);
  assert.equal(result[0].pass, true); assert.equal(result[1].pass, false);
});
for (const [name, mutate, check] of [
  ['stale value', (c) => c.frames.forEach((f) => f.roles.value.text = '1,284'), 'spoken cue'],
  ['shortened qualifier', (c) => c.frames[180].roles.qualifier.text = 'requests', 'qualifier stays'],
  ['cue shifted by three frames', (c) => c.frames.forEach((f, i) => {
    if (i >= 150 && i < 153) f.roles.value.text = '128,399';
  }), 'spoken cue'],
  ['one-frame clipped qualifier', (c) => c.frames[180].roles.qualifier.vw = 0, 'qualifier stays'],
  ['portrait text uses landscape bounds', (c) => c.frames[180].roles.source.textBounds = [1300, 760, 500, 60], 'source stays'],
  ['portrait source enters reserved lower area', (c) => {
    c.frames[180].roles.source.y = 1700; c.frames[180].roles.source.textBounds[1] = 1700;
  }, 'source stays'],
  ['one-frame hold shortened', (c) => c.frames.splice(330, 1), 'final value stays'],
  ['landscape canvas mislabeled as portrait', (c) => c.stage.width = 1920, 'stage matches'],
  ['counter loses separators', (c) => c.frames[90].roles.value.text = '10000', 'thousands separators'],
  ['counter moves backwards', (c) => c.frames[90].roles.value.text = '0', 'never goes backwards'],
  ['duration changed', (c) => c.duration = 6.2, 'duration preserved'],
  ['duplicate role', (c) => c.frames[180].roles.value.dup = 2, 'roles are unique'],
  ['missing role before the hold', (c) => delete c.frames[20].roles.source, 'roles are unique'],
]) test(name, () => {
  const ctx = fixture(); mutate(ctx.portrait);
  const result = revisionChecks(ctx, manifest);
  assert.equal(result[0].pass, true);
  assert.equal(result[1].checks.find((c) => c.id.includes(check)).pass, false);
});
