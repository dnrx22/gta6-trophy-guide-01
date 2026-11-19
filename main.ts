// Leonida Platinum Roadmap — build script (Node 22, standard library only).
// Copies app/ and screenshots/ into the output directory and writes the
// make.fun dossier (dossier.json) there. The output directory itself is never
// removed — only its contents are cleared — because the grader may mount it
// as a volume.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv && fromEnv.trim() !== '') return resolve(fromEnv);
  const fromArg = process.argv[2];
  if (fromArg && fromArg.trim() !== '') return resolve(fromArg);
  return resolve(repoRoot, 'out');
}

function clearContents(dir: string): void {
  // Remove every child of dir, never dir itself.
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main(): void {
  const out = outputDir();
  mkdirSync(out, { recursive: true });
  clearContents(out);

  const appSrc = join(repoRoot, 'app');
  const shotsSrc = join(repoRoot, 'screenshots');
  if (!existsSync(appSrc)) throw new Error('missing app/ directory in repo root');
  if (!existsSync(shotsSrc)) throw new Error('missing screenshots/ directory in repo root');

  cpSync(appSrc, join(out, 'app'), { recursive: true });
  cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });

  // The dossier caps demand 3–4 screenshots; fail loudly instead of
  // shipping a build the scorer would refuse.
  const shotCount = readdirSync(join(out, 'screenshots'))
    .filter((name) => /\.(png|jpe?g)$/i.test(name)).length;
  if (shotCount < 3 || shotCount > 4) {
    throw new Error('expected 3-4 screenshots, found ' + shotCount);
  }
  console.log('copied app/ and ' + shotCount + ' screenshots to ' + out);

  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 48 * 1024 * 1024,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log('wrote ' + join(out, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();
