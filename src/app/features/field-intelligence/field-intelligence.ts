import {ChangeDetectionStrategy, Component, computed, inject, isDevMode} from '@angular/core';
import {WarbandService} from '../../core/services/warband.service';
import {GameDataService} from '../../core/services/game-data.service';
import {JsonTreeComponent} from '../../shared/components/json-tree/json-tree';

@Component({
	selector: 'app-field-intelligence',
	imports: [JsonTreeComponent],
	templateUrl: './field-intelligence.html',
	styleUrl: './field-intelligence.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldIntelligenceView {
	private readonly warbandSvc = inject(WarbandService);
	private readonly gameDataSvc = inject(GameDataService);

	readonly devMode = isDevMode();

	readonly warband = this.warbandSvc.warband;
	readonly rawExport = this.warbandSvc.rawExport;
	readonly parseError = this.warbandSvc.parseError;

	jsonDraft = '';

	/** Session-wide unresolved IDs tracked by GameDataService. */
	readonly unresolvedIds = this.gameDataSvc.unresolvedIds;
	readonly unresolvedCount = computed(() => this.unresolvedIds().size);

	readonly downloadLabel = computed(() => {
		const wb = this.warband();
		return wb ? `Download enriched JSON` : 'Download enriched JSON';
	});

	render():void {
		this.warbandSvc.load(this.jsonDraft);
	}

	onTextareaInput(event:Event):void {
		this.jsonDraft = (event.target as HTMLTextAreaElement).value;
	}

	downloadEnriched():void {
		const wb = this.warband();
		if (!wb) return;
		const slug = wb.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
		const blob = new Blob([JSON.stringify(wb, null, 2)], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${slug}-enriched.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
