import { narratedStat } from '../../grader/narration.mjs';
import { steppedCount } from '../../grader/checks.mjs';

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// The narration helper stops at hold_to (5.5 s). The brief keeps the final number to the
// end of the timeline, so check the exact value is fully shown on every sampled frame from
// the cue to the last one.
function finalValueToEnd(ctx, manifest) {
  const {value, target, cue} = manifest.narration;
  const tail = ctx.frames.filter((f) => f.t >= cue - 1e-4);
  const complete = tail.length > 0 && Math.abs(tail[0].t - cue) <= 1e-4 &&
    Math.abs(tail.at(-1).t - manifest.duration) <= 1e-4 &&
    tail.every((f, i) => !i || f.t > tail[i - 1].t && f.t - tail[i - 1].t <= 1 / ctx.fps + 1e-4);
  const shown = (f) => {
    const r = f.roles[value];
    return r && r.o >= 0.98 && r.w > 0 && r.h > 0 && r.vw >= r.w - 0.5 && r.vh >= r.h - 0.5 &&
      norm(r.text) === target;
  };
  return {id: 'revision: final value stays visible to the end of the timeline',
    pass: complete && tail.every(shown), got: tail.length,
    want: `${target} fully shown from ${cue}s to ${manifest.duration}s`};
}

// Each required format is a separate obligation. Never average a failure away.
export function revisionChecks(contexts, manifest) {
  return manifest.formats.map((format) => {
    const ctx = contexts[format.id];
    if (!ctx) return { format: format.id, pass: false,
      checks: [{id: 'revision: required format exists', pass: false}] };
    const checks = narratedStat(ctx, {...manifest.narration, safe_rect: format.safe_rect});
    if (ctx.frames.length) checks.push(...steppedCount(ctx, manifest.counter));
    checks.push({id: 'revision: stage matches the requested format without scrolling',
      pass: ctx.stage != null && Math.abs(ctx.stage.width - format.width) <= 0.5 &&
        Math.abs(ctx.stage.height - format.height) <= 0.5 &&
        ctx.stage.scrollWidth <= format.width && ctx.stage.scrollHeight <= format.height,
      got: ctx.stage, want: [format.width, format.height]});
    checks.push(finalValueToEnd(ctx, manifest));
    checks.push({id: 'revision: timeline duration preserved',
      pass: Number.isFinite(ctx.duration) && Math.abs(ctx.duration - manifest.duration) < 1e-4,
      got: ctx.duration, want: manifest.duration});
    checks.push({id: 'revision: page and local assets load without errors',
      pass: ctx.errors.length === 0 && ctx.network.length === 0,
      got: {errors: ctx.errors, network: ctx.network}, want: 'no errors or external requests'});
    // Match the base contract: each role must occur, without duplicates at any time.
    // Narration enforces copy throughout the reading window; it may enter before it.
    checks.push({id: 'revision: required roles are unique',
      pass: [manifest.narration.value, ...manifest.narration.copy.map((c) => c.role)]
        .every((name) => ctx.frames.some((f) => f.roles[name] != null) &&
          ctx.frames.every((f) => !f.roles[name]?.dup)), want: 'one tag per role'});
    return {format: format.id, pass: checks.every((c) => c.pass), checks};
  });
}
