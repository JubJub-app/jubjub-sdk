#!/usr/bin/env node
// Refuse a tree whose hosted copies of the bundle do not match the build.
//
// GitHub Pages serves main's root, so stable/jubjub-sdk.umd.js and
// v/<version>/jubjub-sdk.umd.js ARE the SDK every integrator loads. This check
// fails unless both exist and are byte-identical to dist/jubjub-sdk.umd.js for
// the version in package.json. It runs in CI on every push to main and every
// pull request (.github/workflows/release-check.yml) and at the end of
// `npm run release`.
//
// Usage: node scripts/check-release.mjs    (exit 0 when consistent)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const bundle = 'jubjub-sdk.umd.js';

const dist = join('dist', bundle);
const versioned = join('v', version, bundle);
const stable = join('stable', bundle);

const problems = [];
for (const rel of [dist, versioned, stable]) {
  if (!existsSync(join(root, rel))) problems.push(`${rel} is missing`);
}
if (problems.length) {
  for (const p of problems) console.error(`check-release: ${p}`);
  console.error(`check-release: run "npm run release" for ${version} and commit dist/, v/ and stable/`);
  process.exit(1);
}

const sha256 = (rel) => createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
const distHash = sha256(dist);
const results = [dist, versioned, stable].map((rel) => ({ rel, hash: sha256(rel), bytes: readFileSync(join(root, rel)).length }));
for (const r of results) {
  console.log(`check-release: ${r.rel}  ${r.bytes} bytes  sha256 ${r.hash.slice(0, 16)}`);
}

const mismatched = results.filter((r) => r.hash !== distHash);
if (mismatched.length) {
  for (const r of mismatched) console.error(`check-release: ${r.rel} differs from ${dist}`);
  console.error(`check-release: run "npm run release" for ${version} and commit dist/, v/ and stable/`);
  process.exit(1);
}

// The bundle carries the version it was built from (vite define). A dist/
// built from another package.json version would pass the byte comparison and
// still be the wrong release, so say so.
const built = readFileSync(join(root, dist), 'utf8');
if (!built.includes(JSON.stringify(version))) {
  console.error(`check-release: ${dist} does not carry version ${version}; rebuild with "npm run release"`);
  process.exit(1);
}

console.log(`check-release: ok, stable/ and v/${version}/ match dist/ (${version})`);
