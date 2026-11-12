#!/usr/bin/env node
/*
 * Fetches component source from the React Bits registry.
 *
 *   node scripts/fetch-reactbits.mjs SplitText Dock [--variant JS-CSS]
 *
 * The registry is an SPA, so every response is parsed as JSON and rejected
 * when it is not a component payload. Never hand-write these files.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const variantFlag = args.indexOf('--variant');
const variant = variantFlag === -1 ? 'JS-CSS' : args.splice(variantFlag, 2)[1];
const names = args.filter((arg) => !arg.startsWith('--'));

const outRoot = path.resolve('src/reactbits');

let failed = 0;
const dependencies = new Set();

for (const name of names) {
  const url = `https://reactbits.dev/r/${name}-${variant}.json`;
  const response = await fetch(url);
  const body = await response.text();

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    console.error(`skip ${name}: HTTP ${response.status}, body is not JSON`);
    failed += 1;
    continue;
  }

  if (!Array.isArray(payload.files) || payload.files.length === 0) {
    console.error(`skip ${name}: payload has no files`);
    failed += 1;
    continue;
  }

  for (const file of payload.files) {
    if (typeof file.content !== 'string' || typeof file.path !== 'string') {
      console.error(`skip ${name}: malformed file entry`);
      failed += 1;
      continue;
    }
    const dest = path.join(outRoot, file.path);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, file.content);
    console.log(`wrote ${path.relative(process.cwd(), dest)} (${file.content.length} bytes)`);
  }

  for (const dependency of payload.dependencies ?? []) dependencies.add(dependency);
}

if (dependencies.size > 0) {
  console.log('\nnpm install ' + [...dependencies].join(' '));
}
if (failed > 0) {
  console.error(`\n${failed} component(s) failed to fetch`);
  process.exitCode = 1;
}
