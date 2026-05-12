import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import type {
  Equipment, Model, Addon, Skill, GameGlossaryEntry, Variant, VariantRule,
} from '../models/game-data.interfaces';

const BASE = 'assets/game-data/data/data';

@Injectable({ providedIn: 'root' })
export class GameDataService {
  private http = inject(HttpClient);

  private equipmentMap    = new Map<string, Equipment>();
  private modelMap        = new Map<string, Model>();
  private addonMap        = new Map<string, Addon>();
  private skillMap        = new Map<string, Skill>();
  private glossaryMap     = new Map<string, GameGlossaryEntry>();
  private variantRuleMap  = new Map<string, VariantRule>();

  private loaded = false;

  load(): void {
    if (this.loaded) return;

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
        addons.forEach(a => this.addonMap.set(a.id, a));
        skills.forEach(s => this.skillMap.set(s.id, s));
        glossary.forEach(g => this.glossaryMap.set(g.id, g));
        variants.forEach(v => this.indexVariantRules(v));
        this.loaded = true;
      })
    ).subscribe();
  }

  getEquipment(id: string)   : Equipment     | undefined { return this.equipmentMap.get(id);   }
  getModel(id: string)       : Model         | undefined { return this.modelMap.get(id);        }
  getAddon(id: string)       : Addon         | undefined { return this.addonMap.get(id);        }
  getSkill(id: string)       : Skill         | undefined { return this.skillMap.get(id);        }
  getGlossaryEntry(id: string): GameGlossaryEntry | undefined { return this.glossaryMap.get(id);   }
  getVariantRule(id: string) : VariantRule   | undefined { return this.variantRuleMap.get(id); }

  /** Convenience alias — abilities are Addon records. */
  getAbility(id: string): Addon | undefined { return this.addonMap.get(id); }

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
          // Collect this block's subcontent as the rule description
          const description = block.subcontent ?? [];
          this.variantRuleMap.set(id, {
            id,
            title: block.content.replace(/:$/, '').trim(),
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
