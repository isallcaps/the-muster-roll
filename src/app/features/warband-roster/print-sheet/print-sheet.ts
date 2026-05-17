import {Component, computed, inject, isDevMode, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {WarbandService} from '../../../core/services/warband.service';
import {KeywordToggleService} from '../../../core/services/keyword-toggle.service';
import {PrintSettingsService} from '../../../core/services/print-settings.service';
import {TestCaseService} from '../../../core/services/test-case.service';
import {ModelCardComponent} from '../model-card/model-card';
import {FactionCardComponent} from '../faction-card/faction-card';
import {isUnresolvedFallback} from '../../../core/models/game-data.interfaces';
import type {EnrichedWarbandModel, EnrichedAbility, ResolvedKeyword, EnrichedEquipment} from '../../../core/models/warband.interfaces';
import type {TestCase} from '../../../core/models/test-case.interfaces';

type CardSlot =
	| { kind:'model'; model:EnrichedWarbandModel }
	| { kind:'faction' }
	| { kind:'empty' };

type CardPage = [CardSlot, CardSlot];

// ---------------------------------------------------------------------------
// Dev-only validation types
// ---------------------------------------------------------------------------

interface Discrepancy {
	severity:'warn' | 'fail';
	type:'equipment-unresolved' | 'ability-unresolved' | 'keyword-unresolved';
	modelName:string;
	warbandName:string;
	exportId:string;
	exportName:string;
	notes:string;
}

@Component({
	selector: 'app-print-sheet',
	imports: [ModelCardComponent, FactionCardComponent, FormsModule],
	templateUrl: './print-sheet.html',
	styleUrl: './print-sheet.scss',
})
export class PrintSheetComponent {
	private readonly warbandSvc = inject(WarbandService);
	readonly kwToggle = inject(KeywordToggleService);
	readonly printSettings = inject(PrintSettingsService);
	readonly testCaseSvc = inject(TestCaseService);

	/** True only in `ng serve` / development builds — drives @if guards in template. */
	readonly devMode = isDevMode();

	readonly warband = this.warbandSvc.warband;
	readonly parseError = this.warbandSvc.parseError;
	readonly detectedFormat = this.warbandSvc.detectedFormat;

	/** Textarea values bound via [(ngModel)] so test-case loading can set them. */
	jsonDraft = '';
	htmlDraft = '';

	/** Warband ID input — used to build the Open API URL helper link. */
	warbandIdDraft = '';

	readonly inputCollapsed = signal(false);

	/** Warband ID of the currently-loaded test case, if any. */
	readonly loadedTestCaseWarbandId = signal<number | null>(null);

	/** Feedback shown after a "Save Current" download. */
	readonly saveFeedback = signal<string | null>(null);

	/** exportId of the item whose "Copy row" button was last clicked. */
	readonly copiedRowId = signal<string | null>(null);
	/** True while the "Copy All" button is showing its confirmation. */
	readonly copiedAll = signal(false);

	readonly formatLabel = computed<string | null>(() => {
		const fmt = this.detectedFormat();
		if (!fmt) return null;
		if (fmt === 'api') return 'API format';
		return 'Export format';
	});

	readonly factionAbilities = computed<EnrichedAbility[]>(() => {
		const wb = this.warband();
		if (!wb) return [];
		const seen = new Set<string>();
		const result:EnrichedAbility[] = [];
		for (const model of wb.models) {
			for (const ab of model.abilities) {
				if (ab.source === 'variant-rule' && !seen.has(ab.ref['ability-id'])) {
					seen.add(ab.ref['ability-id']);
					result.push(ab);
				}
			}
		}
		return result;
	});

	readonly factionName = computed<string | null>(() => {
		// Prefer the variant name detected from the TC faction property ID — this
		// works even when all faction_rules are filtered out (e.g. Great Hunger).
		const wb = this.warband();
		if (wb?.variantName) return wb.variantName;
		// Fallback: derive from the first resolved variant rule's variantName.
		const ab = this.factionAbilities()[0];
		if (!ab?.variantRule || isUnresolvedFallback(ab.variantRule)) return null;
		return (ab.variantRule as { variantName?:string }).variantName ?? null;
	});

	readonly totalDucats = computed<number>(() =>
		this.warband()?.models.reduce((s, m) => s + (m.export.cost?.ducats ?? 0), 0) ?? 0
	);

	readonly cardPages = computed<CardPage[]>(() => {
		const wb = this.warband();
		if (!wb) return [];
		const hasFaction = this.factionAbilities().length > 0;
		const slots:CardSlot[] = [
			...(hasFaction ? [{kind: 'faction' as const}] : []),
			...wb.models.map(m => ({kind: 'model' as const, model: m})),
		];
		const pages:CardPage[] = [];
		for (let i = 0; i < slots.length; i += 2) {
			pages.push([slots[i], slots[i + 1] ?? {kind: 'empty' as const}]);
		}
		return pages;
	});

	readonly allWarbandKeywords = computed<ResolvedKeyword[]>(
		() => this.warband()?.allWarbandKeywords ?? []
	);

	/**
	 * Returns a sorted, deduplicated keyword list for a single model's cheat sheet.
	 * Collects from modelKeywords, equipment[].keywords, and abilities[].keywords.
	 */
	keywordsForModel(model:EnrichedWarbandModel):ResolvedKeyword[] {
		const seen = new Map<string, ResolvedKeyword>();
		for (const kw of model.modelKeywords) {
			if (!seen.has(kw.exportId)) seen.set(kw.exportId, kw);
		}
		for (const eq of model.equipment) {
			for (const kw of eq.keywords) {
				if (!seen.has(kw.exportId)) seen.set(kw.exportId, kw);
			}
		}
		for (const ab of model.abilities) {
			for (const kw of ab.keywords) {
				if (!seen.has(kw.exportId)) seen.set(kw.exportId, kw);
			}
		}
		return [...seen.values()].sort((a, b) => a.exportName.localeCompare(b.exportName));
	}

	// ---------------------------------------------------------------------------
	// Dev-only: live validation report
	// ---------------------------------------------------------------------------

	readonly validationReport = computed<Discrepancy[]>(() => {
		const wb = this.warband();
		if (!wb) return [];

		const issues:Discrepancy[] = [];
		const seenKeywords = new Set<string>();

		for (const model of wb.models) {
			const modelName = model.export['name'] || model.export['model-name'];

			for (const eq of model.equipment) {
				if (isUnresolvedFallback(eq.item)) {
					issues.push({
						severity: 'fail',
						type: 'equipment-unresolved',
						modelName,
						warbandName: wb.name,
						exportId: eq.ref['equipment-id'],
						exportName: eq.ref['equipment-name'],
						notes: 'ID not found in equipment.json or addons.json. Item renders with name only — no range, modifiers, blurb, or description.',
					});
				}
			}

			for (const ab of model.abilities) {
				if (isUnresolvedFallback(ab.addon) || isUnresolvedFallback(ab.variantRule)) {
					issues.push({
						severity: 'fail',
						type: 'ability-unresolved',
						modelName,
						warbandName: wb.name,
						exportId: ab.ref['ability-id'],
						exportName: ab.ref['ability-name'],
						notes: 'ID not found in addons.json and does not match any variant rule slug. Ability renders with name only.',
					});
				}
			}

			for (const kw of model.modelKeywords) {
				if (isUnresolvedFallback(kw.glossaryEntry) && !seenKeywords.has(kw.exportId)) {
					seenKeywords.add(kw.exportId);
					issues.push({
						severity: 'warn',
						type: 'keyword-unresolved',
						modelName,
						warbandName: wb.name,
						exportId: kw.exportId,
						exportName: kw.exportName,
						notes: 'No matching entry in glossary.json. Keyword name appears on the card but no definition text is shown.',
					});
				}
			}

			for (const eq of model.equipment) {
				for (const kw of eq.keywords) {
					if (isUnresolvedFallback(kw.glossaryEntry) && !seenKeywords.has(kw.exportId)) {
						seenKeywords.add(kw.exportId);
						issues.push({
							severity: 'warn',
							type: 'keyword-unresolved',
							modelName,
							warbandName: wb.name,
							exportId: kw.exportId,
							exportName: kw.exportName,
							notes: `No matching entry in glossary.json (from equipment "${eq.ref['equipment-name']}"). Definition text not shown.`,
						});
					}
				}
			}
		}

		return issues;
	});

	constructor() {
		if (this.devMode) {
			this.testCaseSvc.loadIndex();
		}
	}

	// ---------------------------------------------------------------------------
	// Open API URL — opens the warband JSON in a new tab for copy-paste
	// ---------------------------------------------------------------------------

	openApiUrl(id?:number | null):void {
		const warbandId = String(id ?? this.warbandIdDraft).trim();
		if (!warbandId) return;
		window.open(`https://synod.trench-companion.com/wp-json/synod/v1/warband/${warbandId}`, '_blank');
	}

	// ---------------------------------------------------------------------------
	// Manual render — primary path
	// ---------------------------------------------------------------------------

	render():void {
		this.warbandSvc.load(this.jsonDraft);
		if (this.warbandSvc.warband()) this.inputCollapsed.set(true);
		this.kwToggle.showAll();
	}

	print():void {
		window.print();
	}

	hideAllDefs():void {
		this.kwToggle.hideAll(this.allWarbandKeywords().map(kw => kw.exportId));
	}

	showAllDefs():void {
		this.kwToggle.showAll();
	}

	readonly isUnresolvedFallback = isUnresolvedFallback;

	toggleBlurb(event:Event):void {
		this.printSettings.update({showBlurb: (event.target as HTMLInputElement).checked});
	}

	toggleKeywordSheet(event:Event):void {
		this.printSettings.update({showKeywordSheet: (event.target as HTMLInputElement).checked});
	}

	// ---------------------------------------------------------------------------
	// Dev-only: test case management
	// ---------------------------------------------------------------------------

	onTestCaseSelect(event:Event):void {
		const id = (event.target as HTMLSelectElement).value;
		if (!id) {
			this.loadedTestCaseWarbandId.set(null);
			return;
		}

		this.testCaseSvc.loadTestCase(id).subscribe((tc:TestCase | null) => {
			this.testCaseSvc.loading.set(false);
			if (!tc) return;
			this.jsonDraft = JSON.stringify(tc.exportJson, null, 2);
			this.htmlDraft = tc.trenchCompanionHtml;
			this.loadedTestCaseWarbandId.set(tc.warbandId ?? null);
			if (tc.warbandId) {
				this.warbandIdDraft = String(tc.warbandId);
			}
		});
	}

	saveCurrentHandler():void {
		const name = window.prompt('Name for this test case (e.g. "The Wrecking Crew v2"):');
		if (!name?.trim()) return;

		const id = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		let exportJson:unknown;
		try {
			exportJson = JSON.parse(this.jsonDraft);
		} catch {
			window.alert('Cannot save: the warband JSON textarea contains invalid JSON.');
			return;
		}

		const warbandIdNum = this.detectedFormat() === 'api' && this.warbandIdDraft.trim()
			? parseInt(this.warbandIdDraft.trim(), 10)
			: undefined;

		const testCase:Record<string, unknown> = {
			id,
			name: name.trim(),
			...(warbandIdNum ? {warbandId: warbandIdNum} : {}),
			exportJson,
			trenchCompanionHtml: this.htmlDraft,
		};
		const payload = JSON.stringify(testCase, null, 2);

		// Trigger a browser file download — no clipboard or terminal step needed.
		// (Terminal fallback for reference:
		//   macOS:  pbpaste | node scripts/save-test-case.mjs
		//   Linux:  xclip -selection clipboard -o | node scripts/save-test-case.mjs)
		const blob = new Blob([payload], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${id}.json`;
		a.click();
		URL.revokeObjectURL(url);

		this.saveFeedback.set(
			`Downloaded ${id}.json — move it to src/assets/test-cases/ and add an entry to index.json to register it.`
		);
	}

	// ---------------------------------------------------------------------------
	// Dev-only: table row label for each discrepancy type
	// ---------------------------------------------------------------------------

	tableRowLabel(type:Discrepancy['type']):string {
		switch (type) {
			case 'equipment-unresolved':
				return 'Missing Equipment Definitions table';
			case 'ability-unresolved':
				return 'Missing Ability Definitions table';
			case 'keyword-unresolved':
				return 'Missing Glossary Entries table';
		}
	}

	// ---------------------------------------------------------------------------
	// Dev-only: copy a single markdown table row
	// ---------------------------------------------------------------------------

	copyTableRow(d:Discrepancy):void {
		const row = this.buildTableRow(d);
		navigator.clipboard.writeText(row).then(() => {
			this.copiedRowId.set(d.exportId);
			setTimeout(() => this.copiedRowId.update(cur => cur === d.exportId ? null : cur), 2000);
		}).catch(() => console.log('Table row (copy manually):\n', row));
	}

	private buildTableRow(d:Discrepancy):string {
		switch (d.type) {
			case 'ability-unresolved':
				return `| \`${d.exportId}\` | ${d.exportName} | ${d.modelName} (${d.warbandName}) |`;

			case 'keyword-unresolved': {
				const match = d.notes.match(/\(from equipment "([^"]+)"\)/);
				const foundIn = match
					? `Equipment tags (${match[1]})`
					: `${d.modelName} (${d.warbandName})`;
				return `| \`${d.exportId}\` | ${d.exportName} | ${foundIn} |`;
			}

			case 'equipment-unresolved':
				return `| \`${d.exportId}\` | ${d.exportName} | ${d.modelName} (${d.warbandName}) |`;
		}
	}

	// ---------------------------------------------------------------------------
	// Dev-only: copy all discrepancies grouped by section with headings
	// ---------------------------------------------------------------------------

	copyAllTableRows():void {
		const report = this.validationReport();
		const byType = {
			'equipment-unresolved': report.filter(d => d.type === 'equipment-unresolved'),
			'ability-unresolved': report.filter(d => d.type === 'ability-unresolved'),
			'keyword-unresolved': report.filter(d => d.type === 'keyword-unresolved'),
		};

		const lines:string[] = [];

		if (byType['equipment-unresolved'].length) {
			lines.push('## Missing Equipment Definitions', '');
			lines.push('| Equipment ID | Display Name | Affected Warband / Notes |');
			lines.push('|--------------|--------------|--------------------------|');
			byType['equipment-unresolved'].forEach(d => lines.push(this.buildTableRow(d)));
			lines.push('');
		}

		if (byType['ability-unresolved'].length) {
			lines.push('## Missing Ability Definitions', '');
			lines.push('| Ability ID | Display Name | Affected Warband / Notes |');
			lines.push('|------------|--------------|--------------------------|');
			byType['ability-unresolved'].forEach(d => lines.push(this.buildTableRow(d)));
			lines.push('');
		}

		if (byType['keyword-unresolved'].length) {
			lines.push('## Missing Glossary Entries', '');
			lines.push('| Keyword ID | Keyword Name | Found In |');
			lines.push('|------------|--------------|----------|');
			byType['keyword-unresolved'].forEach(d => lines.push(this.buildTableRow(d)));
			lines.push('');
		}

		const text = lines.join('\n');
		navigator.clipboard.writeText(text).then(() => {
			this.copiedAll.set(true);
			setTimeout(() => this.copiedAll.set(false), 2000);
		}).catch(() => console.log('All table rows (copy manually):\n', text));
	}

}
