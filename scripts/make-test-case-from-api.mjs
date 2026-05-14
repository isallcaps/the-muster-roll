#!/usr/bin/env node
/**
 * make-test-case-from-api.mjs
 *
 * Converts a raw Trench Companion API response (Format 1) into a test case
 * file that warband.service.ts can load and parse.
 *
 * Usage (pipe the full API JSON on stdin):
 *   curl 'https://synod.trench-companion.com/wp-json/synod/v1/warband/278648' \
 *     | node scripts/make-test-case-from-api.mjs [test-case-name]
 *
 *   # or from a saved API response file:
 *   cat api-response.json | node scripts/make-test-case-from-api.mjs "The Wrecking Crew v2"
 *
 * The test case is written to src/assets/test-cases/<slug>.json and the
 * index at src/assets/test-cases/index.json is updated automatically.
 *
 * Format 1 notes:
 *   - The outer wrapper has: { id, warband_id, warband_data: "<JSON string>", ... }
 *   - warband_data is a stringified JSON string (double-serialised) that the
 *     service parses with a second JSON.parse().
 *   - This script stores the Format 1 wrapper (with warband_data kept as a string)
 *     as exportJson, so the service's format detection fires correctly on load.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const TC_DIR = join(ROOT, 'src/assets/test-cases');

// ---------------------------------------------------------------------------
// Read stdin
// ---------------------------------------------------------------------------

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let apiResponse;
try {
  apiResponse = JSON.parse(raw);
} catch {
  console.error('Error: stdin is not valid JSON.');
  process.exit(1);
}

if (!apiResponse.warband_id || !apiResponse.warband_data) {
  console.error('Error: input does not look like a TC API response (missing warband_id or warband_data).');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Derive name and slug
// ---------------------------------------------------------------------------

const nameArg = process.argv[2]?.trim();
let warbandName = nameArg;

if (!warbandName) {
  // Try to extract the name from the inner warband_data
  try {
    const inner = JSON.parse(apiResponse.warband_data);
    warbandName = inner.name ?? `Warband ${apiResponse.warband_id}`;
  } catch {
    warbandName = `Warband ${apiResponse.warband_id}`;
  }
}

const slug = warbandName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

// ---------------------------------------------------------------------------
// Build the test case — store only the fields needed for parsing.
// warband_data is kept as the original string so Format 1 detection fires.
// ---------------------------------------------------------------------------

const testCase = {
  id        : slug,
  name      : warbandName,
  warbandId : apiResponse.warband_id,
  exportJson: {
    id          : apiResponse.id ?? apiResponse.warband_id,
    warband_id  : apiResponse.warband_id,
    warband_data: apiResponse.warband_data,   // keep as string — Format 1
  },
  trenchCompanionHtml: '',
};

const outPath = join(TC_DIR, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(testCase, null, 2));
console.log(`Written: ${outPath}`);

// ---------------------------------------------------------------------------
// Update index.json
// ---------------------------------------------------------------------------

const indexPath = join(TC_DIR, 'index.json');
let index;
try {
  index = JSON.parse(readFileSync(indexPath, 'utf8'));
} catch {
  index = [];
}

const existing = index.findIndex(e => e.id === slug);
const entry = { id: slug, name: warbandName, warbandId: apiResponse.warband_id };

if (existing >= 0) {
  index[existing] = entry;
  console.log(`Updated existing index entry for "${slug}".`);
} else {
  index.push(entry);
  console.log(`Added new index entry for "${slug}".`);
}

writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`Updated: ${indexPath}`);
