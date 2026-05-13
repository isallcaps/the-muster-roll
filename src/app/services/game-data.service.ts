import { Injectable, inject, isDevMode, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import type {
  AnyDataEntry,
  Equipment,
  Model,
  Addon,
  Skill,
  GameGlossaryEntry,
  Variant,
  VariantRule,
  UnresolvedFallback,
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

  /** Deduplicated set of IDs that could not be found in any data map. */
  readonly unresolvedIds = signal<Set<string>>(new Set());

  /** Full sorted lists for each data type — populated once after load. */
  readonly equipmentList   = signal<Equipment[]>([]);
  readonly modelList       = signal<Model[]>([]);
  readonly addonList       = signal<Addon[]>([]);
  readonly skillList       = signal<Skill[]>([]);
  readonly glossaryList    = signal<GameGlossaryEntry[]>([]);
  readonly variantRuleList = signal<VariantRule[]>([]);

  private loadState: false | true | 'error' = false;

  load(): void {
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
        addons.forEach(a => this.addonMap.set(a.id, a));
        skills.forEach(s => this.skillMap.set(s.id, s));
        glossary.forEach(g => this.glossaryMap.set(g.id, g));
        variants.forEach(v => this.indexVariantRules(v));

        this.loadState = true;
        console.log(
          `[GameDataService] loaded — equipment:${this.equipmentMap.size}` +
          ` models:${this.modelMap.size}` +
          ` addons:${this.addonMap.size}` +
          ` glossary:${this.glossaryMap.size}`,
        );
      }),
      catchError(err => {
        this.loadState = 'error';
        console.error('[GameDataService] failed to load game data:', err);
        return EMPTY;
      }),
    ).subscribe();
  }

  // ---------------------------------------------------------------------------
  // Universal resolver — the single entry point for all ID lookups.
  // Never returns null or undefined. Logs and tracks every miss.
  // ---------------------------------------------------------------------------

  resolve(id: string): AnyDataEntry {
    const e = this.equipmentMap.get(id);   if (e) return e;
    const a = this.addonMap.get(id);       if (a) return a;
    const g = this.glossaryMap.get(id);    if (g) return g;
    const v = this.variantRuleMap.get(id); if (v) return v;
    const m = this.modelMap.get(id);       if (m) return m;
    const s = this.skillMap.get(id);       if (s) return s;

    this.recordUnresolved(id);
    return this.makeFallback(id);
  }

  // ---------------------------------------------------------------------------
  // Typed convenience accessors — each calls resolve() so all misses are logged.
  // ---------------------------------------------------------------------------

  getEquipment(id: string)    : Equipment         | undefined {
    const e = this.resolve(id); return e.type === 'Equipment'    ? e as Equipment         : undefined;
  }
  getModel(id: string)        : Model             | undefined {
    const e = this.resolve(id); return e.type === 'Model'        ? e as Model             : undefined;
  }
  getAddon(id: string)        : Addon             | undefined {
    const e = this.resolve(id); return e.type === 'Addon'        ? e as Addon             : undefined;
  }
  getSkill(id: string)        : Skill             | undefined {
    const e = this.resolve(id); return e.type === 'Skill'        ? e as Skill             : undefined;
  }
  getGlossaryEntry(id: string): GameGlossaryEntry | undefined {
    const e = this.resolve(id); return e.type === 'Glossary'     ? e as GameGlossaryEntry : undefined;
  }
  getVariantRule(id: string)  : VariantRule       | undefined {
    const e = this.resolve(id); return e.type === 'VariantRule'  ? e as VariantRule       : undefined;
  }

  // ---------------------------------------------------------------------------
  // Fallback factory — public so WarbandService can use it for edge cases.
  // ---------------------------------------------------------------------------

  makeFallback(id: string): UnresolvedFallback {
    return {
      id,
      name       : this.formatIdAsName(id),
      source     : 'unknown',
      type       : 'Unknown',
      description: [],
      tags       : [],
      unresolved : true,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private recordUnresolved(id: string): void {
    if (this.unresolvedIds().has(id)) return;
    this.unresolvedIds.update(prev => new Set([...prev, id]));
    if (isDevMode()) {
      console.warn(`[MusterRoll] Unresolved ID: ${id} — add to DATA_DISCREPANCIES.md`);
    }
  }

  private formatIdAsName(id: string): string {
    const body = id.replace(/^[a-z]+_/, '');
    const words = body.split('_').filter(Boolean);
    if (words.length === 0) return id;
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // ---------------------------------------------------------------------------
  // Variant rule indexing
  // ---------------------------------------------------------------------------

  private indexVariantRules(variant: Variant): void {
    for (const ruleBlock of variant.rules) {
      for (const block of ruleBlock.description) {
        const isEffect = block.tags.some(t => t.val === 'effect');
        if (isEffect && block.content.endsWith(':')) {
          const id = this.titleToRlId(block.content);
          const title = block.content.replace(/:$/, '').trim();
          this.variantRuleMap.set(id, {
            id,
            type       : 'VariantRule',
            name       : title,
            title,
            variantId  : variant.id,
            variantName: variant.name,
            description: block.subcontent ?? [],
          });
        }
      }
    }
  }

  private titleToRlId(title: string): string {
    return 'rl_' + title.toLowerCase().replace(/[^a-z]/g, '');
  }
}
