import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WarbandService } from '../../services/warband.service';
import { JsonTreeComponent } from '../../components/json-tree/json-tree';

@Component({
  selector: 'app-field-intelligence',
  imports: [JsonTreeComponent],
  templateUrl: './field-intelligence.html',
  styleUrl: './field-intelligence.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldIntelligenceView {
  private readonly warbandSvc = inject(WarbandService);

  readonly warband    = this.warbandSvc.warband;
  readonly rawExport  = this.warbandSvc.rawExport;
  readonly parseError = this.warbandSvc.parseError;

  jsonDraft = '';

  /** IDs that failed to resolve during enrichment — used to warn in the raw panel. */
  readonly unresolvedIds = computed(() => {
    const wb = this.warband();
    if (!wb) return new Set<string>();
    const ids = new Set<string>();
    for (const model of wb.models) {
      for (const eq of model.equipment) {
        if (!eq.item) ids.add(eq.ref['equipment-id']);
      }
      for (const ab of model.abilities) {
        if (ab.source === 'unknown') ids.add(ab.ref['ability-id']);
      }
    }
    return ids;
  });

  readonly downloadLabel = computed(() => {
    const wb = this.warband();
    return wb ? `Download enriched JSON` : 'Download enriched JSON';
  });

  render(): void {
    this.warbandSvc.load(this.jsonDraft);
  }

  onTextareaInput(event: Event): void {
    this.jsonDraft = (event.target as HTMLTextAreaElement).value;
  }

  downloadEnriched(): void {
    const wb = this.warband();
    if (!wb) return;
    const slug = wb.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const blob = new Blob([JSON.stringify(wb, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${slug}-enriched.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
