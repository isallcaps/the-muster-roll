import {Component, Input, inject} from '@angular/core';
import {DescBlocksComponent} from '../desc-blocks/desc-blocks.component';
import {KeywordToggleService} from '../../../core/services/keyword-toggle.service';
import {PrintSettingsService} from '../../../core/services/print-settings.service';
import {isUnresolvedFallback} from '../../../core/models/game-data.interfaces';
import type {EnrichedWarbandModel, EnrichedAbility} from '../../../core/models/warband.interfaces';

@Component({
	selector: 'tc-model-card',
	imports: [DescBlocksComponent],
	templateUrl: './model-card.html',
	styleUrl: './model-card.scss',
})
export class ModelCardComponent {
	@Input({required: true}) model!:EnrichedWarbandModel;
	@Input({required: true}) warbandName!:string;

	readonly kwToggle = inject(KeywordToggleService);
	readonly printSettings = inject(PrintSettingsService);

	get addonAbilities():EnrichedAbility[] {
		return this.model.abilities.filter(a => a.source === 'addon');
	}

	get variantAbilities():EnrichedAbility[] {
		return this.model.abilities.filter(a => a.source === 'variant-rule' && a.isGameplayRule);
	}

	isDefVisible(exportId:string):boolean {
		return this.kwToggle.isVisible(exportId);
	}

	toggleDef(exportId:string):void {
		this.kwToggle.toggle(exportId);
	}

	isUnresolved(entry:unknown):boolean {
		return isUnresolvedFallback(entry);
	}

	/**
	 * Returns true for injury-related dice/modifier keywords so the template
	 * can apply a distinct visual style to their chips.
	 * Covers gl_injurydice* (+/-1/2 Injury Dice) and gl_injurymodifier* (+/-N Injury Modifier).
	 */
	isInjuryKw(exportId:string):boolean {
		return exportId.startsWith('gl_injurydice') || exportId.startsWith('gl_injurymodifier');
	}
}
