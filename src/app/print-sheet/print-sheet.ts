import { Component, computed, inject, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { WarbandService } from '../services/warband.service';
import { KeywordToggleService } from '../services/keyword-toggle.service';
import { PrintSettingsService } from '../services/print-settings.service';
import { TestCaseService } from '../services/test-case.service';
import { ModelCardComponent } from './model-card';
import { isUnresolvedFallback } from '../models/game-data.interfaces';
import type { EnrichedWarbandModel, ResolvedKeyword } from '../models/warband.interfaces';
import type { TestCase } from '../models/test-case.interfaces';

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

  readonly warband        = this.warbandSvc.warband;
  readonly parseError     = this.warbandSvc.parseError;
  readonly detectedFormat = this.warbandSvc.detectedFormat;

  /** Textarea values bound via [(ngModel)] so test-case loading can set them. */
  jsonDraft = '';
  htmlDraft = '';

  /** Warband ID input for direct API fetch. */
  warbandIdDraft = '';

  /** API fetch state. */
  readonly apiLoading = signal(false);
  readonly apiError   = signal<string | null>(null);

  /** Warband ID of the currently-loaded test case, if any. */
  readonly loadedTestCaseWarbandId = signal<number | null>(null);

  /** Feedback shown after a "Save Current" copy-to-clipboard action. */
  readonly saveFeedback = signal<string | null>(null);

  /** exportId of the item whose "Copy row" button was last clicked. */
  readonly copiedRowId   = signal<string | null>(null);
  /** exportId of the item whose "Copy as GitHub Issue" button was last clicked. */
  readonly copiedIssueId = signal<string | null>(null);
  /** True while the "Copy All" button is showing its confirmation. */
  readonly copiedAll     = signal(false);

  readonly formatLabel = computed<string | null>(() => {
    const fmt = this.detectedFormat();
    if (!fmt) return null;
    if (fmt === 'api')        return 'Loaded via API — full warband data';
    if (fmt === 'full')       return 'Detected: Full warband data';
    if (fmt === 'simplified') return 'Detected: Simplified export';
    return null;
  });

  readonly modelPairs = computed<ModelPair[]>(() => {
    const models = this.warband()?.models ?? [];
    const pairs: ModelPair[] = [];
    for (let i = 0; i < models.length; i += 2) {
      pairs.push([models[i], models[i + 1] ?? null]);
    }
    return pairs;
  });

  readonly allWarbandKeywords = computed<ResolvedKeyword[]>(
    () => this.warband()?.allWarbandKeywords ?? []
  );

  // ---------------------------------------------------------------------------
  // Dev-only: live validation report
  // ---------------------------------------------------------------------------

  readonly validationReport = computed<Discrepancy[]>(() => {
    const wb = this.warband();
    if (!wb) return [];

    const issues: Discrepancy[] = [];
    const seenKeywords = new Set<string>();

    for (const model of wb.models) {
      const modelName = model.export['name'] || model.export['model-name'];

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

  // ---------------------------------------------------------------------------
  // API loading — primary path
  // ---------------------------------------------------------------------------

  loadFromTcApi(id?: string | number): void {
    const warbandId = String(id ?? this.warbandIdDraft).trim();
    if (!warbandId) return;

    this.apiLoading.set(true);
    this.apiError.set(null);

    this.warbandSvc.loadFromApi(warbandId).subscribe({
      next: (json) => {
        this.jsonDraft = json;
        this.warbandSvc.load(json, 'api');
        this.kwToggle.showAll();
        this.apiLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.apiLoading.set(false);
        if (err.status === 0) {
          this.apiError.set(
            'Unable to load directly — CORS policy may be blocking this request. ' +
            'Please use the Export Data option in Trench Companion and paste the JSON manually instead.'
          );
        } else if (err.status === 404) {
          this.apiError.set('Warband not found. Check the ID and try again.');
        } else {
          this.apiError.set('Could not reach Trench Companion. Check your connection and try again.');
        }
      },
    });
  }

  refreshFromApi(): void {
    const id = this.loadedTestCaseWarbandId();
    if (id) this.loadFromTcApi(id);
  }

  // ---------------------------------------------------------------------------
  // Manual render — fallback path
  // ---------------------------------------------------------------------------

  render(): void {
    this.apiError.set(null);
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
    if (!id) {
      this.loadedTestCaseWarbandId.set(null);
      return;
    }

    this.testCaseSvc.loadTestCase(id).subscribe((tc: TestCase | null) => {
      this.testCaseSvc.loading.set(false);
      if (!tc) return;
      this.jsonDraft = JSON.stringify(tc.exportJson, null, 2);
      this.htmlDraft = tc.trenchCompanionHtml;
      this.loadedTestCaseWarbandId.set(tc.warbandId ?? null);
      if (tc.warbandId) {
        this.warbandIdDraft = String(tc.warbandId);
      }
    });
  }

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

    const warbandIdNum = this.detectedFormat() === 'api' && this.warbandIdDraft.trim()
      ? parseInt(this.warbandIdDraft.trim(), 10)
      : undefined;

    const testCase: Record<string, unknown> = {
      id,
      name: name.trim(),
      ...(warbandIdNum ? { warbandId: warbandIdNum } : {}),
      exportJson,
      trenchCompanionHtml: this.htmlDraft,
    };
    const payload = JSON.stringify(testCase, null, 2);

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
  // Dev-only: table row label for each discrepancy type
  // ---------------------------------------------------------------------------

  tableRowLabel(type: Discrepancy['type']): string {
    switch (type) {
      case 'equipment-unresolved': return 'Missing Equipment Definitions table';
      case 'ability-unresolved':   return 'Missing Ability Definitions table';
      case 'keyword-unresolved':   return 'Missing Glossary Entries table';
    }
  }

  // ---------------------------------------------------------------------------
  // Dev-only: copy a single markdown table row
  // ---------------------------------------------------------------------------

  copyTableRow(d: Discrepancy): void {
    const row = this.buildTableRow(d);
    navigator.clipboard.writeText(row).then(() => {
      this.copiedRowId.set(d.exportId);
      setTimeout(() => this.copiedRowId.update(cur => cur === d.exportId ? null : cur), 2000);
    }).catch(() => console.log('Table row (copy manually):\n', row));
  }

  private buildTableRow(d: Discrepancy): string {
    switch (d.type) {
      case 'ability-unresolved':
        return `| \`${d.exportId}\` | ${d.exportName} | ${d.modelName} (${d.warbandName}) |`;

      case 'keyword-unresolved': {
        const match   = d.notes.match(/\(from equipment "([^"]+)"\)/);
        const foundIn = match
          ? `Equipment tags (${match[1]})`
          : `${d.modelName} (${d.warbandName})`;
        return `| \`${d.exportId}\` | ${d.exportName} | ${foundIn} |`;
      }

      case 'equipment-unresolved':
        return `| \`${d.exportId}\` | ${d.exportName} | ${d.modelName} (${d.warbandName}) |`;
    }
  }

  // ---------------------------------------------------------------------------
  // Dev-only: copy all discrepancies grouped by section with headings
  // ---------------------------------------------------------------------------

  copyAllTableRows(): void {
    const report = this.validationReport();
    const byType = {
      'equipment-unresolved': report.filter(d => d.type === 'equipment-unresolved'),
      'ability-unresolved':   report.filter(d => d.type === 'ability-unresolved'),
      'keyword-unresolved':   report.filter(d => d.type === 'keyword-unresolved'),
    };

    const lines: string[] = [];

    if (byType['equipment-unresolved'].length) {
      lines.push('## Missing Equipment Definitions', '');
      lines.push('| Equipment ID | Display Name | Affected Warband / Notes |');
      lines.push('|--------------|--------------|--------------------------|');
      byType['equipment-unresolved'].forEach(d => lines.push(this.buildTableRow(d)));
      lines.push('');
    }

    if (byType['ability-unresolved'].length) {
      lines.push('## Missing Ability Definitions', '');
      lines.push('| Ability ID | Display Name | Affected Warband / Notes |');
      lines.push('|------------|--------------|--------------------------|');
      byType['ability-unresolved'].forEach(d => lines.push(this.buildTableRow(d)));
      lines.push('');
    }

    if (byType['keyword-unresolved'].length) {
      lines.push('## Missing Glossary Entries', '');
      lines.push('| Keyword ID | Keyword Name | Found In |');
      lines.push('|------------|--------------|----------|');
      byType['keyword-unresolved'].forEach(d => lines.push(this.buildTableRow(d)));
      lines.push('');
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedAll.set(true);
      setTimeout(() => this.copiedAll.set(false), 2000);
    }).catch(() => console.log('All table rows (copy manually):\n', text));
  }

  // ---------------------------------------------------------------------------
  // Dev-only: copy GitHub issue report (secondary action)
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

    navigator.clipboard.writeText(body).then(() => {
      this.copiedIssueId.set(d.exportId);
      setTimeout(() => this.copiedIssueId.update(cur => cur === d.exportId ? null : cur), 2000);
    }).catch(() => console.log('Issue report (copy manually):\n', body));
  }
}
