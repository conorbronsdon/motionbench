// node experiments/revision-stat/evaluate.mjs <workspace> [result.json]
// Measures this experimental output pair. This is not the standard score.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from '../../kit/tools/lib.mjs';
import { revisionChecks } from './checks.mjs';

export async function evaluate(workspace) {
  const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url)));
  const contexts = {};
  for (const format of manifest.formats) {
    const entry = path.join(workspace, format.file);
    if (!fs.existsSync(entry)) continue;
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'motionbench-revision-'));
    let probe;
    try {
      fs.copyFileSync(entry, path.join(temp, 'index.html'));
      if (fs.existsSync(path.join(workspace, 'assets')))
        fs.cpSync(path.join(workspace, 'assets'), path.join(temp, 'assets'), {recursive: true});
      probe = await open(temp, {viewport: {width: format.width, height: format.height}});
      if (probe.error) {
        contexts[format.id] = {fps: manifest.fps, frames: [], errors: [probe.error], network: []};
        continue;
      }
      // The contract asks for a stage of the exact size, not a body of that size: an absolutely
      // positioned stage leaves the body with no height. Report whichever of the body and its
      // direct element children is closest to the requested size; scroll extents still catch overflow.
      const stage = await probe.page.evaluate(([w, h]) => {
        const boxes = [document.body, ...document.body.children]
          .filter((el) => !['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE'].includes(el.tagName))
          .map((el) => el.getBoundingClientRect());
        const off = (b) => Math.abs(b.width - w) + Math.abs(b.height - h);
        const best = boxes.reduce((a, b) => (off(b) < off(a) ? b : a));
        return {width: best.width, height: best.height,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight};
      }, [format.width, format.height]);
      const frames = [];
      for (let i = 0; i <= manifest.duration * manifest.fps; i++) {
        const t = Math.round(i / manifest.fps * 10000) / 10000;
        frames.push({t, roles: await probe.roles(Math.min(i / manifest.fps, manifest.duration - 1e-6))});
      }
      await probe.close();
      contexts[format.id] = {fps: manifest.fps, frames, stage, duration: probe.duration,
        errors: probe.log.errors, network: probe.log.network};
      probe = null;
    } finally {
      if (probe?.close) await probe.close();
      if (path.dirname(path.resolve(temp)) !== path.resolve(os.tmpdir()) ||
          !path.basename(temp).startsWith('motionbench-revision-'))
        throw new Error('Refusing to remove an unexpected temporary path.');
      fs.rmSync(temp, {recursive: true, force: true});
    }
  }
  const formats = revisionChecks(contexts, manifest);
  return {experiment: manifest.id, status: manifest.status,
    pass: formats.every((f) => f.pass), formats};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Provide a workspace containing index.html, portrait.html and local assets.');
  const result = await evaluate(path.resolve(process.argv[2]));
  const serialized = JSON.stringify(result, null, 2) + '\n';
  if (process.argv[3]) fs.writeFileSync(process.argv[3], serialized);
  else process.stdout.write(serialized);
  process.exitCode = result.pass ? 0 : 1;
}
