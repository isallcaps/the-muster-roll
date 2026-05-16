import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {WarbandService} from '../../core/services/warband.service';
import {GameDataService} from '../../core/services/game-data.service';
import {JsonTreeComponent} from '../../shared/components/json-tree/json-tree';

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
	readonly unresolvedIds   = this.gameDataSvc.unresolvedIds;
	readonly unresolvedCount = computed(() => this.unresolvedIds().size);
}
