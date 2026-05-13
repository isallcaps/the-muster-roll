import { Component, Input, inject } from '@angular/core';
import { DescBlocksComponent } from './desc-blocks.component';
import { KeywordToggleService } from '../services/keyword-toggle.service';
import { PrintSettingsService } from '../services/print-settings.service';
import { isUnresolvedFallback } from '../models/game-data.interfaces';
import type { EnrichedWarbandModel, EnrichedAbility } from '../models/warband.interfaces';

@Component({
  selector: 'tc-model-card',
  imports: [DescBlocksComponent],
  templateUrl: './model-card.html',
  styleUrl: './model-card.scss',
})
export class ModelCardComponent {
  @Input({ required: true }) model!: EnrichedWarbandModel;
  @Input({ required: true }) warbandName!: string;

  readonly kwToggle      = inject(KeywordToggleService);
  readonly printSettings = inject(PrintSettingsService);

  get addonAbilities(): EnrichedAbility[] {
    return this.model.abilities.filter(a => a.source === 'addon');
  }

  get variantAbilities(): EnrichedAbility[] {
    return this.model.abilities.filter(a => a.source === 'variant-rule');
  }

  isDefVisible(exportId: string): boolean {
    return this.kwToggle.isVisible(exportId);
  }

  isUnresolved(entry: unknown): boolean {
    return isUnresolvedFallback(entry);
  }
}
