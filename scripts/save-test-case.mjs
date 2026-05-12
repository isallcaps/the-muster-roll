#!/usr/bin/env node
/**
 * save-test-case.mjs
 *
 * Reads a TestCase JSON object from stdin, writes it to
 * src/assets/test-cases/<id>.json, and updates the index file.
 *
 * Usage (copy test case JSON to clipboard first, then):
 *
 *   macOS:   pbpaste | node scripts/save-test-case.mjs
 *   Linux:   xclip -selection clipboard -o | node scripts/save-test-case.mjs
 *   stdin:   echo '<json>' | node scripts/save-test-case.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const assetsDir  = join(__dirname, '..', 'src', 'assets', 'test-cases');
const indexPath  = join(assetsDir, 'index.json');

// Read stdin
let raw = '';
process.stdin.setEncoding('utf-8');
for await (const chunk of process.stdin) raw += chunk;

if (!raw.trim()) {
  console.error('Error: no input received on stdin.');
  process.exit(1);
}

let testCase;
try {
  testCase = JSON.parse(raw);
} catch (e) {
  console.error('Error: stdin is not valid JSON.\n', e.message);
  process.exit(1);
}

if (!testCase.id || !testCase.name) {
  console.error('Error: JSON must have "id" and "name" fields.');
  process.exit(1);
}

// Ensure the directory exists
mkdirSync(assetsDir, { recursive: true });

// Write the test case file
const casePath = join(assetsDir, `${testCase.id}.json`);
writeFileSync(casePath, JSON.stringify(testCase, null, 2) + '\n', 'utf-8');
console.log(`✓  Written: ${casePath}`);

// Load or initialise the index
let index = [];
try {
  index = JSON.parse(readFileSync(indexPath, 'utf-8'));
} catch {
  // index.json doesn't exist yet — start fresh
}

// Upsert the entry
const entry = { id: testCase.id, name: testCase.name };
const pos   = index.findIndex(e => e.id === testCase.id);
if (pos >= 0) {
  index[pos] = entry;
  console.log(`↺  Updated existing entry "${testCase.name}" in index.`);
} else {
  index.push(entry);
  console.log(`+  Added new entry "${testCase.name}" to index.`);
}

// Keep the index sorted by name
index.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
console.log(`✓  Index updated: ${indexPath}`);
