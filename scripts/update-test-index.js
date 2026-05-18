#!/usr/bin/env node
/**
 * update-test-index.js
 *
 * Scans src/assets/test-cases/ for all .json files (excluding index.json),
 * extracts metadata from each, and rewrites index.json.
 *
 * Usage:
 *   node scripts/update-test-index.js
 *   node scripts/update-test-index.js --watch
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────

const ROOT       = path.resolve(__dirname, '..');
const CASES_DIR  = path.join(ROOT, 'src', 'assets', 'test-cases');
const INDEX_PATH = path.join(CASES_DIR, 'index.json');

// ── Metadata extraction ───────────────────────────────────────────────────────

/**
 * Reads one test-case file and extracts the fields that belong in index.json.
 * Returns null (with a logged warning) if the file can't be parsed.
 *
 * Index entry shape:
 *   { id, name, warbandId?, modelCount?, factionId? }
 *
 * The `name` field is the human-readable test-case label stored at the top of
 * each file. `warbandId` is sourced from either the top-level field (legacy)
 * or exportJson.warband_id (API format). `modelCount` and `factionId` come
 * from parsing warband_data, which is always a JSON string in both formats.
 */
function extractMetadata(filePath) {
	let raw;
	try {
		raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch (err) {
		console.warn(`  ⚠  Could not parse ${path.basename(filePath)}: ${err.message}`);
		return null;
	}

	// ── Core fields ────────────────────────────────────────────────────────────

	// id: top-level field, or derive from filename as fallback
	const id = raw.id ?? path.basename(filePath, '.json');

	// name: the test-case display label (not necessarily the TC warband name)
	const name = raw.name ?? id;

	// warbandId: top-level takes precedence; fall back to exportJson.warband_id
	const warbandId =
		raw.warbandId ??
		(typeof raw.exportJson?.warband_id === 'number' ? raw.exportJson.warband_id : undefined);

	// ── warband_data (optional enrichment) ────────────────────────────────────
	// warband_data is always a JSON string (both export and API format).

	let modelCount;
	let factionId;

	const rawWarbandData = raw.exportJson?.warband_data;
	if (typeof rawWarbandData === 'string') {
		try {
			const wd = JSON.parse(rawWarbandData);
			modelCount = Array.isArray(wd.models) ? wd.models.length : undefined;
			factionId  = wd.faction?.faction_property?.object_id ?? undefined;
		} catch {
			// warband_data parse failure is non-fatal; skip enrichment
		}
	}

	// ── Assemble entry (omit undefined keys) ─────────────────────────────────

	const entry = { id, name };
	if (warbandId  !== undefined) entry.warbandId  = warbandId;
	if (modelCount !== undefined) entry.modelCount = modelCount;
	if (factionId  !== undefined) entry.factionId  = factionId;
	return entry;
}

// ── Index rebuild ─────────────────────────────────────────────────────────────

function rebuild() {
	let files;
	try {
		files = fs.readdirSync(CASES_DIR).filter(
			f => f.endsWith('.json') && f !== 'index.json'
		);
	} catch (err) {
		console.error(`Error reading ${CASES_DIR}: ${err.message}`);
		process.exit(1);
	}

	if (files.length === 0) {
		console.log('No test-case files found — index.json will be empty.');
	}

	// Sort filenames so the index order is stable and diff-friendly
	files.sort();

	const entries = [];
	const errors  = [];

	for (const file of files) {
		const meta = extractMetadata(path.join(CASES_DIR, file));
		if (meta) {
			entries.push(meta);
		} else {
			errors.push(file);
		}
	}

	// Write index.json with 2-space indent (matches existing style)
	fs.writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf8');

	// ── Summary table ──────────────────────────────────────────────────────────

	console.log('');
	console.log(`Updated index.json — ${entries.length} test case(s) found:`);
	console.log('');

	// Column widths for the table
	const colId      = Math.max(4, ...entries.map(e => e.id.length));
	const colName    = Math.max(4, ...entries.map(e => e.name.length));
	const colModels  = 6;
	const colWbId    = 10;
	const colFaction = Math.max(9, ...entries.map(e => (e.factionId ?? '').length));

	const row = (id, name, models, wbId, faction) =>
		`  ${id.padEnd(colId)}  ${name.padEnd(colName)}  ${String(models).padStart(colModels)}  ${String(wbId).padEnd(colWbId)}  ${faction}`;

	const sep = (len) => '─'.repeat(len);

	console.log(row('ID', 'Name', 'Models', 'WarbandID', 'Faction ID'));
	console.log(row(sep(colId), sep(colName), sep(colModels), sep(colWbId), sep(colFaction)));

	for (const e of entries) {
		console.log(row(
			e.id,
			e.name,
			e.modelCount ?? '—',
			e.warbandId  ?? '—',
			e.factionId  ?? '—',
		));
	}

	console.log('');

	if (errors.length) {
		console.warn(`  ⚠  ${errors.length} file(s) skipped due to parse errors: ${errors.join(', ')}`);
		console.log('');
	}

	return entries.length;
}

// ── Watch mode ────────────────────────────────────────────────────────────────

function watch() {
	console.log(`Watching ${CASES_DIR} for changes…`);
	console.log('Press Ctrl+C to stop.');
	console.log('');

	// Run once on start
	rebuild();

	// Debounce: wait 200 ms after the last event before rebuilding
	let timer = null;
	const scheduleRebuild = (eventType, filename) => {
		if (!filename || !filename.endsWith('.json') || filename === 'index.json') return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			console.log(`\n[${new Date().toLocaleTimeString()}] Change detected (${filename}) — rebuilding…`);
			rebuild();
		}, 200);
	};

	fs.watch(CASES_DIR, { persistent: true }, scheduleRebuild);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const isWatch = process.argv.includes('--watch');

if (isWatch) {
	watch();
} else {
	rebuild();
}
