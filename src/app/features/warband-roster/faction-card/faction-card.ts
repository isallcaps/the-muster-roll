import {Component, Input} from '@angular/core';
import {isUnresolvedFallback} from '../../../core/models/game-data.interfaces';
import type {EnrichedAbility} from '../../../core/models/warband.interfaces';

@Component({
	selector: 'tc-faction-card',
	imports: [],
	templateUrl: './faction-card.html',
	styleUrl: './faction-card.scss',
})
export class FactionCardComponent {
	@Input({required: true}) warbandName!:string;
	@Input({required: true}) factionName!:string | null;
	@Input({required: true}) abilities!:EnrichedAbility[];
	@Input({required: true}) totalModels!:number;
	@Input({required: true}) totalDucats!:number;

	isUnresolved(entry:unknown):boolean {
		return isUnresolvedFallback(entry);
	}
}
