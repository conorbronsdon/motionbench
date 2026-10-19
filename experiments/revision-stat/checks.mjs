import { narratedStat } from '../../grader/narration.mjs';
import { steppedCount } from '../../grader/checks.mjs';

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
    checks.push({id: 'revision: timeline duration preserved',
      pass: Number.isFinite(ctx.duration) && Math.abs(ctx.duration - manifest.duration) < 1e-4,
      got: ctx.duration, want: manifest.duration});
    checks.push({id: 'revision: page and local assets load without errors',
      pass: ctx.errors.length === 0 && ctx.network.length === 0,
      got: {errors: ctx.errors, network: ctx.network}, want: 'no errors or external requests'});
    checks.push({id: 'revision: required roles are unique',
      pass: ctx.frames.length > 0 && ctx.frames.every((f) =>
        [manifest.narration.value, ...manifest.narration.copy.map((c) => c.role)]
          .every((name) => f.roles[name] != null && !f.roles[name].dup)), want: 'one tag per role'});
    return {format: format.id, pass: checks.every((c) => c.pass), checks};
  });
}
