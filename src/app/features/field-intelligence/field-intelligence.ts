import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
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
}
