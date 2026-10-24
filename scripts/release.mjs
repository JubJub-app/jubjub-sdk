#!/usr/bin/env node
// Release the SDK to its stable hosting paths (pot model decisions 3 and 4,
// 2026-10-24).
//
// GitHub Pages serves the root of main at https://jubjub-app.github.io/jubjub-sdk/
// so two addresses come out of this:
//   stable:    https://jubjub-app.github.io/jubjub-sdk/stable/jubjub-sdk.umd.js
//   versioned: https://jubjub-app.github.io/jubjub-sdk/v/<version>/jubjub-sdk.umd.js
//
// stable/ moves only after the release passes tests: this script runs the full
// suite first, then builds, then copies dist/jubjub-sdk.umd.js to
// v/<package.json version>/ and stable/. The copies are committed by hand like
// dist/ is; scripts/check-release.mjs (run by CI on every push and pull
// request) refuses a tree where they differ from dist/.
//
// Usage: npm run release
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const bundle = 'jubjub-sdk.umd.js';

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`release: package.json version "${version}" is not a release version`);
  process.exit(1);
}

function run(label, cmd, args) {
  console.log(`release: ${label} (${[cmd, ...args].join(' ')})`);
  const res = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    console.error(`release: ${label} failed (exit ${res.status ?? 'signal'}); nothing was copied`);
    process.exit(res.status ?? 1);
  }
}

run('tests', 'npm', ['test']);
run('build', 'npm', ['run', 'build']);

const source = join(root, 'dist', bundle);
const targets = [join(root, 'v', version, bundle), join(root, 'stable', bundle)];
for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`release: wrote ${target.slice(root.length + 1)}`);
}

run('check', process.execPath, [join(root, 'scripts', 'check-release.mjs')]);
console.log(`release: ${version} is in v/${version}/ and stable/. Commit dist/, v/ and stable/ together.`);
