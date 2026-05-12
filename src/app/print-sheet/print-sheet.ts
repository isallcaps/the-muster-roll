import { Component, computed, inject, signal } from '@angular/core';
import { WarbandService } from '../services/warband.service';
import { KeywordToggleService } from '../services/keyword-toggle.service';
import { ModelCardComponent } from './model-card';
import type { EnrichedWarbandModel, ResolvedKeyword } from '../models/warband.interfaces';

type ModelPair = [EnrichedWarbandModel, EnrichedWarbandModel | null];

@Component({
  selector: 'app-print-sheet',
  imports: [ModelCardComponent],
  templateUrl: './print-sheet.html',
  styleUrl: './print-sheet.scss',
})
export class PrintSheetComponent {
  private readonly warbandSvc = inject(WarbandService);
  readonly kwToggle = inject(KeywordToggleService);

  readonly warband    = this.warbandSvc.warband;
  readonly parseError = this.warbandSvc.parseError;
  readonly jsonDraft  = signal('');

  readonly modelPairs = computed<ModelPair[]>(() => {
    const models = this.warband()?.models ?? [];
    const pairs: ModelPair[] = [];
    for (let i = 0; i < models.length; i += 2) {
      pairs.push([models[i], models[i + 1] ?? null]);
    }
    return pairs;
  });

  /** Deduplicated union of every keyword referenced anywhere across all models. */
  readonly allWarbandKeywords = computed<ResolvedKeyword[]>(() => {
    const wb = this.warband();
    if (!wb) return [];
    const seen = new Map<string, ResolvedKeyword>();
    for (const model of wb.models) {
      for (const kw of model.allKeywords) {
        if (!seen.has(kw.exportId)) seen.set(kw.exportId, kw);
      }
    }
    return [...seen.values()].sort((a, b) => a.exportName.localeCompare(b.exportName));
  });

  onInput(e: Event): void {
    this.jsonDraft.set((e.target as HTMLTextAreaElement).value);
  }

  render(): void {
    this.warbandSvc.load(this.jsonDraft());
    // Reset toggles so newly rendered keywords start visible.
    this.kwToggle.showAll();
  }

  print(): void {
    window.print();
  }

  hideAllDefs(): void {
    this.kwToggle.hideAll(this.allWarbandKeywords().map(kw => kw.exportId));
  }

  showAllDefs(): void {
    this.kwToggle.showAll();
  }
}
