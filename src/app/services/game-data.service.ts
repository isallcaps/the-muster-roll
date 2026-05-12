import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import type {
  Equipment, Model, Addon, Skill, GameGlossaryEntry, Variant, VariantRule,
} from '../models/game-data.interfaces';

const BASE = 'assets/game-data/data/data';

@Injectable({ providedIn: 'root' })
export class GameDataService {
  private http = inject(HttpClient);

  private equipmentMap   = new Map<string, Equipment>();
  private modelMap       = new Map<string, Model>();
  private addonMap       = new Map<string, Addon>();
  private skillMap       = new Map<string, Skill>();
  private glossaryMap    = new Map<string, GameGlossaryEntry>();
  private variantRuleMap = new Map<string, VariantRule>();

  // Tri-state: false = not yet attempted, true = success, 'error' = failed.
  private loadState: false | true | 'error' = false;

  load(): void {
    // Allow retry if a previous attempt errored; skip if already loaded.
    if (this.loadState === true) return;

    forkJoin({
      equipment : this.http.get<Equipment[]>(`${BASE}/player/equipment.json`),
      models    : this.http.get<Model[]>(`${BASE}/player/models.json`),
      addons    : this.http.get<Addon[]>(`${BASE}/player/addons.json`),
      skills    : this.http.get<Skill[]>(`${BASE}/general/skills.json`),
      glossary  : this.http.get<GameGlossaryEntry[]>(`${BASE}/references/glossary.json`),
      variants  : this.http.get<Variant[]>(`${BASE}/player/variants.json`),
    }).pipe(
      tap(({ equipment, models, addons, skills, glossary, variants }) => {
        equipment.forEach(e => this.equipmentMap.set(e.id, e));
        models.forEach(m => this.modelMap.set(m.id, m));

        // Index every entry in addons.json regardless of id prefix or type.
        // The file contains entries with 'ab_' and 'db_' prefixes; all must
        // be reachable by getAddon().
        addons.forEach(a => this.addonMap.set(a.id, a));
        console.log(`[GameDataService] addons loaded: ${addons.length} entries`);
        console.log('[GameDataService] addon IDs:', addons.map(a => a.id));

        skills.forEach(s => this.skillMap.set(s.id, s));
        glossary.forEach(g => this.glossaryMap.set(g.id, g));
        variants.forEach(v => this.indexVariantRules(v));

        this.loadState = true;
        console.log(
          `[GameDataService] loaded — equipment:${this.equipmentMap.size}` +
          ` models:${this.modelMap.size}` +
          ` addons:${this.addonMap.size}` +
          ` glossary:${this.glossaryMap.size}`
        );
      }),
      catchError(err => {
        this.loadState = 'error';
        console.error('[GameDataService] failed to load game data:', err);
        return EMPTY;
      })
    ).subscribe();
  }

  getEquipment(id: string)    : Equipment         | undefined { return this.equipmentMap.get(id);   }
  getModel(id: string)        : Model             | undefined { return this.modelMap.get(id);        }
  getAddon(id: string)        : Addon             | undefined { return this.addonMap.get(id);        }
  getSkill(id: string)        : Skill             | undefined { return this.skillMap.get(id);        }
  getGlossaryEntry(id: string): GameGlossaryEntry | undefined { return this.glossaryMap.get(id);    }
  getVariantRule(id: string)  : VariantRule       | undefined { return this.variantRuleMap.get(id); }

  // ---------------------------------------------------------------------------
  // Variant rule indexing
  // The companion app generates rl_ slugs from effect-type block titles:
  //   "Fast As Lightning:" → rl_fastaslightning
  // ---------------------------------------------------------------------------

  private indexVariantRules(variant: Variant): void {
    for (const ruleBlock of variant.rules) {
      for (const block of ruleBlock.description) {
        const isEffect = block.tags.some(t => t.val === 'effect');
        if (isEffect && block.content.endsWith(':')) {
          const id = this.titleToRlId(block.content);
          const description = block.subcontent ?? [];
          this.variantRuleMap.set(id, {
            id,
            title      : block.content.replace(/:$/, '').trim(),
            variantId  : variant.id,
            variantName: variant.name,
            description,
          });
        }
      }
    }
  }

  /**
   * "Fast As Lightning:" → "rl_fastaslightning"
   * Matches the slug algorithm used by trench-companion.com.
   */
  private titleToRlId(title: string): string {
    return 'rl_' + title.toLowerCase().replace(/[^a-z]/g, '');
  }
}
