import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {WarbandService} from '../../core/services/warband.service';
import {GameDataService} from '../../core/services/game-data.service';
import {JsonTreeComponent} from '../../shared/components/json-tree/json-tree';
import {isUnresolvedFallback} from '../../core/models/game-data.interfaces';

export interface UnresolvedDetail {
	modelName:string;
	id:string;
	displayName:string;
	type:'equipment' | 'ability' | 'keyword';
}

export interface FactionMismatch {
	modelName:string;
	modelId:string;
	resolvedFactionId:string;
	expectedFactionId:string;
}

const FI_DEV_MODE_KEY = 'musterroll_fi_devmode';

@Component({
	selector: 'app-field-intelligence',
	imports: [JsonTreeComponent, RouterLink],
	templateUrl: './field-intelligence.html',
	styleUrl: './field-intelligence.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldIntelligenceView {
	private readonly warbandSvc  = inject(WarbandService);
	private readonly gameDataSvc = inject(GameDataService);

	readonly warband   = this.warbandSvc.warband;
	readonly rawExport = this.warbandSvc.rawExport;

	/** Session-wide unresolved IDs tracked by GameDataService. */
	readonly unresolvedIds = this.gameDataSvc.unresolvedIds;

	/** Developer Mode — persisted to localStorage. Default off. */
	readonly devMode = signal(localStorage.getItem(FI_DEV_MODE_KEY) === 'true');

	toggleDevMode():void {
		const next = !this.devMode();
		this.devMode.set(next);
		localStorage.setItem(FI_DEV_MODE_KEY, String(next));
	}

	/**
	 * Count derived from the detail list so the banner and table are always in sync.
	 * (unresolvedIds can over-count: an ID resolved via name-based fallback on the
	 * second lookup is still recorded from the first lookup without a displayName.)
	 */
	readonly unresolvedCount = computed(() => this.unresolvedDetail().length);

	/** Detailed breakdown of every unresolved ID — which model, what type, display name. */
	readonly unresolvedDetail = computed<UnresolvedDetail[]>(() => {
		const wb = this.warband();
		if (!wb) return [];

		const items:UnresolvedDetail[] = [];
		const seenKeywords = new Set<string>();

		for (const model of wb.models) {
			const modelName = model.export['name'] || model.export['model-name'];

			for (const eq of model.equipment) {
				if (isUnresolvedFallback(eq.item)) {
					items.push({
						modelName,
						id: eq.ref['equipment-id'],
						displayName: eq.ref['equipment-name'],
						type: 'equipment',
					});
				}
			}

			for (const ab of model.abilities) {
				const abUnresolved =
					(ab.addon === undefined || isUnresolvedFallback(ab.addon)) &&
					(ab.variantRule === undefined || isUnresolvedFallback(ab.variantRule));
				if (abUnresolved) {
					items.push({
						modelName,
						id: ab.ref['ability-id'],
						displayName: ab.ref['ability-name'],
						type: 'ability',
					});
				}
			}

			for (const kw of model.modelKeywords) {
				if (isUnresolvedFallback(kw.glossaryEntry) && !seenKeywords.has(kw.exportId)) {
					seenKeywords.add(kw.exportId);
					items.push({
						modelName,
						id: kw.exportId,
						displayName: kw.exportName,
						type: 'keyword',
					});
				}
			}

			for (const eq of model.equipment) {
				for (const kw of eq.keywords) {
					if (isUnresolvedFallback(kw.glossaryEntry) && !seenKeywords.has(kw.exportId)) {
						seenKeywords.add(kw.exportId);
						items.push({
							modelName,
							id: kw.exportId,
							displayName: kw.exportName,
							type: 'keyword',
						});
					}
				}
			}
		}

		return items;
	});

	/**
	 * Faction consistency check — flags any model whose resolved definition has a
	 * faction_id that differs from the warband's plurality faction.
	 *
	 * Catches cases where a model resolves to the wrong faction's profile (e.g.
	 * md_wretched resolving to the Court profile in a Heretic Legion warband).
	 * Returns an empty array when all models agree (or only one faction is present).
	 */
	readonly factionMismatches = computed<FactionMismatch[]>(() => {
		const wb = this.warband();
		if (!wb) return [];

		// Tally faction_id occurrences across all models with a resolved definition.
		const factionCounts = new Map<string, number>();
		for (const model of wb.models) {
			const fid = model.definition?.faction_id;
			if (fid) factionCounts.set(fid, (factionCounts.get(fid) ?? 0) + 1);
		}
		if (factionCounts.size <= 1) return [];

		// Expected faction = plurality (most models agree on this faction_id).
		let expectedFactionId = '';
		let maxCount = 0;
		for (const [fid, count] of factionCounts) {
			if (count > maxCount) { maxCount = count; expectedFactionId = fid; }
		}

		const mismatches:FactionMismatch[] = [];
		for (const model of wb.models) {
			const fid = model.definition?.faction_id;
			if (fid && fid !== expectedFactionId) {
				mismatches.push({
					modelName: model.export['name'] || model.export['model-name'],
					modelId: model.export['model-id'],
					resolvedFactionId: fid,
					expectedFactionId,
				});
			}
		}
		return mismatches;
	});
}
