import {Injectable, signal, computed} from '@angular/core';
import type {EnrichedAbility, EnrichedWarbandModel} from '../models/warband.interfaces';

export interface PrintSettings {
	/**
	 * When true, variant rules (rl_ abilities like "Fast as Lightning") are
	 * shown on every individual model card. Toggle off to hoist them to a
	 * warband-level rules box instead.
	 */
	showVariantRulesOnModels:boolean;
	/**
	 * When true (default), the flavour/blurb italics text is shown on
	 * equipment items. Uncheck to hide it for a more compact card.
	 * Applies to both screen preview and print.
	 */
	showBlurb:boolean;
	/**
	 * When true (default), a keyword cheat sheet panel is shown on the right
	 * side of each model's landscape page.
	 */
	showKeywordSheet:boolean;
	/**
	 * When true (default) and showKeywordSheet is also true, all inline keyword
	 * and ability definitions on the left-panel model card are hidden on render.
	 * Individual 'I Know These Rules' toggles still override per-keyword.
	 */
	autoHideDefsWithSheet:boolean;
}

const DEFAULTS:PrintSettings = {
	showVariantRulesOnModels: true,
	showBlurb: true,
	showKeywordSheet: true,
	autoHideDefsWithSheet: true,
};

@Injectable({providedIn: 'root'})
export class PrintSettingsService {
	readonly settings = signal<PrintSettings>({...DEFAULTS});

	update(patch:Partial<PrintSettings>):void {
		this.settings.update(current => ({...current, ...patch}));
	}

	reset():void {
		this.settings.set({...DEFAULTS});
	}

	/**
	 * Filter a model's abilities according to current print settings.
	 * Use this in templates instead of accessing model.abilities directly.
	 */
	readonly filterAbilities = computed(() => {
		const {showVariantRulesOnModels} = this.settings();
		return (model:EnrichedWarbandModel):EnrichedAbility[] =>
			showVariantRulesOnModels
				? model.abilities
				: model.abilities.filter(a => a.source !== 'variant-rule');
	});

	/**
	 * Collect the warband-wide variant rules that were suppressed from model
	 * cards (when showVariantRulesOnModels is false). Returns a deduped list
	 * ordered by ability name — suitable for a warband-level rules box.
	 */
	readonly warbandVariantRules = computed(() => {
		const {showVariantRulesOnModels} = this.settings();
		if (showVariantRulesOnModels) return null; // nothing hoisted
		return (models:EnrichedWarbandModel[]):EnrichedAbility[] => {
			const seen = new Map<string, EnrichedAbility>();
			for (const model of models) {
				for (const ability of model.abilities) {
					if (ability.source === 'variant-rule' && !seen.has(ability.ref['ability-id'])) {
						seen.set(ability.ref['ability-id'], ability);
					}
				}
			}
			return [...seen.values()].sort((a, b) =>
				a.ref['ability-name'].localeCompare(b.ref['ability-name'])
			);
		};
	});
}
