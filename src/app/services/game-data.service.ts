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
        equipment.forEach(e => { try { this.equipmentMap.set(e.id, e); } catch (err) { console.warn(`[GameDataService] skipping equipment entry ${e?.id}:`, err); } });
        models.forEach(m => { try { this.modelMap.set(m.id, m); } catch (err) { console.warn(`[GameDataService] skipping model entry ${m?.id}:`, err); } });
        addons.forEach(a => { try { this.addonMap.set(a.id, a); } catch (err) { console.warn(`[GameDataService] skipping addon entry ${a?.id}:`, err); } });
        skills.forEach(s => { try { this.skillMap.set(s.id, s); } catch (err) { console.warn(`[GameDataService] skipping skill entry ${s?.id}:`, err); } });
        glossary.forEach(g => { try { this.glossaryMap.set(g.id, g); } catch (err) { console.warn(`[GameDataService] skipping glossary entry ${g?.id}:`, err); } });
        variants.forEach(v => { try { this.indexVariantRules(v); } catch (err) { console.warn(`[GameDataService] skipping variant ${v?.id}:`, err); } });

        const byName = (a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name);

        this.equipmentList.set([...this.equipmentMap.values()].sort(byName));
        this.modelList.set([...this.modelMap.values()].sort(byName));
        this.addonList.set([...this.addonMap.values()].sort(byName));
        this.skillList.set([...this.skillMap.values()].sort(byName));
        this.glossaryList.set([...this.glossaryMap.values()].sort(byName));
        this.variantRuleList.set([...this.variantRuleMap.values()].sort(byName));

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
  // Side-effect-free existence check — no signal reads or writes.
  // Use this anywhere a pure boolean lookup is needed during view rendering.
  // ---------------------------------------------------------------------------

  exists(id: string): boolean {
    if (!id) return false;
    return this.equipmentMap.has(id) || this.addonMap.has(id)   ||
           this.glossaryMap.has(id)  || this.variantRuleMap.has(id) ||
           this.modelMap.has(id)     || this.skillMap.has(id);
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
