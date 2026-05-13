import { Component, computed, inject, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WarbandService } from '../services/warband.service';
import { KeywordToggleService } from '../services/keyword-toggle.service';
import { PrintSettingsService } from '../services/print-settings.service';
import { TestCaseService } from '../services/test-case.service';
import { ModelCardComponent } from './model-card';
import { isUnresolvedFallback } from '../models/game-data.interfaces';
import type { EnrichedWarbandModel, ResolvedKeyword } from '../models/warband.interfaces';

type ModelPair = [EnrichedWarbandModel, EnrichedWarbandModel | null];

// ---------------------------------------------------------------------------
// Dev-only validation types
// ---------------------------------------------------------------------------

interface Discrepancy {
  severity   : 'warn' | 'fail';
  type       : 'equipment-unresolved' | 'ability-unresolved' | 'keyword-unresolved';
  modelName  : string;
  warbandName: string;
  exportId   : string;
  exportName : string;
  notes      : string;
}

@Component({
  selector: 'app-print-sheet',
  imports: [ModelCardComponent, FormsModule],
  templateUrl: './print-sheet.html',
  styleUrl: './print-sheet.scss',
})
export class PrintSheetComponent {
  private readonly warbandSvc = inject(WarbandService);
  readonly kwToggle      = inject(KeywordToggleService);
  readonly printSettings = inject(PrintSettingsService);
  readonly testCaseSvc   = inject(TestCaseService);

  /** True only in `ng serve` / development builds — drives @if guards in template. */
  readonly devMode = isDevMode();

  readonly warband    = this.warbandSvc.warband;
  readonly parseError = this.warbandSvc.parseError;

  /** Textarea values bound via [(ngModel)] so test-case loading can set them. */
  jsonDraft = '';
  htmlDraft = '';

  /** Feedback shown after a "Save Current" copy-to-clipboard action. */
  readonly saveFeedback = signal<string | null>(null);

  readonly modelPairs = computed<ModelPair[]>(() => {
    const models = this.warband()?.models ?? [];
    const pairs: ModelPair[] = [];
    for (let i = 0; i < models.length; i += 2) {
      pairs.push([models[i], models[i + 1] ?? null]);
    }
    return pairs;
  });

  /**
   * Deduplicated warband-wide keyword list — built once in WarbandService and
   * surfaced here as a simple computed wrapper. Drives the keyword toggle panel.
   */
  readonly allWarbandKeywords = computed<ResolvedKeyword[]>(
    () => this.warband()?.allWarbandKeywords ?? []
  );

  // ---------------------------------------------------------------------------
  // Dev-only: live validation report
  // ---------------------------------------------------------------------------

  /**
   * Scans the enriched warband for items that failed to resolve against the
   * game data and emits a flat list of discrepancies. Only computed in dev
   * mode (the template guards it); in production the warband signal is never
   * populated via the toolbar anyway.
   */
  readonly validationReport = computed<Discrepancy[]>(() => {
    const wb = this.warband();
    if (!wb) return [];

    const issues: Discrepancy[] = [];
    const seenKeywords = new Set<string>();

    for (const model of wb.models) {
      const modelName = model.export['name'] || model.export['model-name'];

      // FAIL — equipment IDs with no matching game data entry
      for (const eq of model.equipment) {
        if (isUnresolvedFallback(eq.item)) {
          issues.push({
            severity   : 'fail',
            type       : 'equipment-unresolved',
            modelName,
            warbandName: wb.name,
            exportId   : eq.ref['equipment-id'],
            exportName : eq.ref['equipment-name'],
            notes      : 'ID not found in equipment.json or addons.json. Item renders with name only — no range, modifiers, blurb, or description.',
          });
        }
      }

      // FAIL — ability IDs with no matching game data entry
      for (const ab of model.abilities) {
        if (isUnresolvedFallback(ab.addon) || isUnresolvedFallback(ab.variantRule)) {
          issues.push({
            severity   : 'fail',
            type       : 'ability-unresolved',
            modelName,
            warbandName: wb.name,
            exportId   : ab.ref['ability-id'],
            exportName : ab.ref['ability-name'],
            notes      : 'ID not found in addons.json and does not match any variant rule slug. Ability renders with name only.',
          });
        }
      }

      // WARN — model keywords with no glossary entry (deduped globally)
      for (const kw of model.modelKeywords) {
        if (isUnresolvedFallback(kw.glossaryEntry) && !seenKeywords.has(kw.exportId)) {
          seenKeywords.add(kw.exportId);
          issues.push({
            severity   : 'warn',
            type       : 'keyword-unresolved',
            modelName,
            warbandName: wb.name,
            exportId   : kw.exportId,
            exportName : kw.exportName,
            notes      : 'No matching entry in glossary.json. Keyword name appears on the card but no definition text is shown.',
          });
        }
      }

      // WARN — equipment keyword tags with no glossary entry (deduped globally)
      for (const eq of model.equipment) {
        for (const kw of eq.keywords) {
          if (isUnresolvedFallback(kw.glossaryEntry) && !seenKeywords.has(kw.exportId)) {
            seenKeywords.add(kw.exportId);
            issues.push({
              severity   : 'warn',
              type       : 'keyword-unresolved',
              modelName,
              warbandName: wb.name,
              exportId   : kw.exportId,
              exportName : kw.exportName,
              notes      : `No matching entry in glossary.json (from equipment "${eq.ref['equipment-name']}"). Definition text not shown.`,
            });
          }
        }
      }
    }

    return issues;
  });

  constructor() {
    if (this.devMode) {
      this.testCaseSvc.loadIndex();
    }
  }

  render(): void {
    this.warbandSvc.load(this.jsonDraft);
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

  toggleBlurb(event: Event): void {
    this.printSettings.update({ showBlurb: (event.target as HTMLInputElement).checked });
  }

  // ---------------------------------------------------------------------------
  // Dev-only: test case management
  // ---------------------------------------------------------------------------

  onTestCaseSelect(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) return;

    this.testCaseSvc.loadTestCase(id).subscribe(tc => {
      this.testCaseSvc.loading.set(false);
      if (!tc) return;
      this.jsonDraft = JSON.stringify(tc.exportJson, null, 2);
      this.htmlDraft = tc.trenchCompanionHtml;
    });
  }

  /**
   * Builds a TestCase JSON from the current textarea contents, copies it to
   * the system clipboard, then shows the terminal paste command the user runs
   * to write the file.  Writing directly to src/assets/ from the browser is
   * not possible at runtime, so the workflow is: copy → paste into terminal.
   */
  saveCurrentHandler(): void {
    const name = window.prompt('Name for this test case (e.g. "The Wrecking Crew v2"):');
    if (!name?.trim()) return;

    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let exportJson: unknown;
    try {
      exportJson = JSON.parse(this.jsonDraft);
    } catch {
      window.alert('Cannot save: the warband JSON textarea contains invalid JSON.');
      return;
    }

    const testCase = { id, name: name.trim(), exportJson, trenchCompanionHtml: this.htmlDraft };
    const payload  = JSON.stringify(testCase, null, 2);

    navigator.clipboard.writeText(payload).then(() => {
      this.saveFeedback.set(
        `JSON copied to clipboard!\n` +
        `Run in terminal:\n` +
        `  macOS:  pbpaste | node scripts/save-test-case.mjs\n` +
        `  Linux:  xclip -selection clipboard -o | node scripts/save-test-case.mjs`
      );
    }).catch(() => {
      this.saveFeedback.set(
        `Clipboard unavailable — JSON logged to the browser console.\n` +
        `Copy it, save to a .json file, then run:\n` +
        `  cat <file>.json | node scripts/save-test-case.mjs`
      );
      console.log('Test case JSON:\n', payload);
    });
  }

  // ---------------------------------------------------------------------------
  // Dev-only: copy GitHub issue report to clipboard
  // ---------------------------------------------------------------------------

  copyIssueReport(d: Discrepancy): void {
    const typeLabel: Record<Discrepancy['type'], string> = {
      'equipment-unresolved': 'Equipment ID not found in game data',
      'ability-unresolved'  : 'Ability ID not found in game data',
      'keyword-unresolved'  : 'Glossary entry missing from game data',
    };

    const body = [
      `## Summary`,
      ``,
      `Data discrepancy found during validation of a Trench Companion warband export.`,
      ``,
      `## Discrepancy Type`,
      typeLabel[d.type],
      ``,
      `## Details`,
      `- **Severity**: ${d.severity.toUpperCase()}`,
      `- **Export ID**: \`${d.exportId}\``,
      `- **Display name in export**: ${d.exportName}`,
      `- **Affected model**: ${d.modelName}`,
      `- **Warband**: ${d.warbandName}`,
      ``,
      `## Notes`,
      d.notes,
      ``,
      `## Expected Behavior`,
      `The ID \`${d.exportId}\` should resolve to an entry in the game data files` +
        ` with full definition text so that print tools can display the complete rule.`,
      ``,
      `## Actual Behavior`,
      `No matching entry found. The item renders with name only.`,
      ``,
      `---`,
      `*Reported via [The Muster Roll](https://github.com/Bob-The-Seagull-King/trenchcrusadedata)*`,
    ].join('\n');

    navigator.clipboard.writeText(body).catch(() => {
      console.log('Issue report (copy manually):\n', body);
    });
  }
}
