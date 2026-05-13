import { Injectable, inject, signal } from '@angular/core';
import { GameDataService } from './game-data.service';
import { isUnresolvedFallback } from '../models/game-data.interfaces';
import type {
  Addon,
  Equipment,
  GameGlossaryEntry,
  VariantRule,
  DescriptionBlock,
  UnresolvedFallback,
} from '../models/game-data.interfaces';
import type {
  WarbandExport,
  WarbandAbilityRef,
  WarbandEquipmentRef,
  WarbandKeywordRef,
  EnrichedWarband,
  EnrichedWarbandModel,
  EnrichedEquipment,
  EnrichedAbility,
  ResolvedKeyword,
} from '../models/warband.interfaces';

@Injectable({ providedIn: 'root' })
export class WarbandService {
  private gameData = inject(GameDataService);

  readonly warband    = signal<EnrichedWarband | null>(null);
  readonly rawExport  = signal<unknown>(null);
  readonly parseError = signal<string | null>(null);

  private static readonly EQUIPMENT_ID_REMAP: Record<string, string> = {
    'eq_silenecedpistol'           : 'eq_silencedpistol',
    'eq_artillerywitchinfernalbomb': 'ab_infernalbomb',
    'eq_sacrificialknife'          : 'eq_sacrificialblade',
    'eq_greatswordaxe'             : 'eq_greataxe',
    'eq_knifedagger'               : 'eq_trenchknife',
  };

  private static readonly SHORT_RANGE_KW: ResolvedKeyword = {
    exportId    : 'gl_shortrange',
    exportName  : 'SHORT RANGE',
    negated     : false,
    glossaryEntry: {
      id: 'gl_shortrange', type: 'Glossary', source: 'local', tags: [], name: 'Short Range',
      description: [{ tags: [], content: "Within half the weapon's full range. No penalty to hit.", subcontent: [], glossary: [] }],
    },
  };

  private static readonly LONG_RANGE_KW: ResolvedKeyword = {
    exportId    : 'gl_longrange',
    exportName  : 'LONG RANGE',
    negated     : false,
    glossaryEntry: {
      id: 'gl_longrange', type: 'Glossary', source: 'local', tags: [], name: 'Long Range',
      description: [{ tags: [], content: "Beyond half the weapon's full range. −1 DICE to hit.", subcontent: [], glossary: [] }],
    },
  };

  load(rawJson: string): void {
    this.parseError.set(null);

    let exported: WarbandExport;
    try {
      exported = JSON.parse(rawJson) as WarbandExport;
      this.rawExport.set(exported);
    } catch {
      this.parseError.set('Invalid JSON — please check your export and try again.');
      return;
    }

    if (!exported.models || !Array.isArray(exported.models)) {
      this.parseError.set('Export JSON must have a "models" array.');
      return;
    }

    const enrichedModels: EnrichedWarbandModel[] = exported.models.map(m => {
      m['stat-move'] = m['stat-move']?.split('/')[0] ?? m['stat-move'];

      const definition    = this.gameData.getModel(m['model-id']);
      const modelKeywords = m.keywords.map(kw => this.resolveKeyword(kw));
      const equipment: EnrichedEquipment[] = m.equipment.map(ref => this.resolveEquipment(ref));

      const weaponEquipment: EnrichedEquipment[] = [];
      const abilities: EnrichedAbility[] = [];

      for (const ref of m.abilities) {
        const enriched = this.resolveAbility(ref);
        const addon = enriched.addon;
        if (
          enriched.source === 'addon' &&
          addon &&
          !isUnresolvedFallback(addon) &&
          this.isWeaponAddon(addon as Addon)
        ) {
          weaponEquipment.push(this.weaponAddonToEquipment(addon as Addon));
        } else {
          abilities.push(enriched);
        }
      }

      const allEquipment = [...equipment, ...weaponEquipment];

      const allKeywords = this.mergeKeywords([
        ...modelKeywords,
        ...allEquipment.flatMap(e => e.keywords),
        ...abilities.flatMap(a => a.keywords),
      ]);

      return { export: m, definition, modelKeywords, equipment: allEquipment, abilities, allKeywords };
    });

    const allWarbandKeywords = this.mergeKeywords(
      enrichedModels.flatMap(m => m.allKeywords),
    );

    this.warband.set({
      name        : exported['warband-name'],
      warbandId   : exported['warband-id'],
      warbandUrl  : exported['warband-url'],
      ducatBank   : exported['ducat-bank'],
      gloryBank   : exported['glory-bank'],
      ducatRating : exported['ducat-rating'],
      gloryRating : exported['glory-rating'],
      models      : enrichedModels,
      allWarbandKeywords,
    });
  }

  clear(): void {
    this.warband.set(null);
    this.rawExport.set(null);
    this.parseError.set(null);
  }

  // ---------------------------------------------------------------------------
  // Equipment resolution
  // ---------------------------------------------------------------------------

  private resolveEquipment(ref: WarbandEquipmentRef): EnrichedEquipment {
    const rawId      = ref['equipment-id'];
    const resolvedId = WarbandService.EQUIPMENT_ID_REMAP[rawId] ?? rawId;
    const entry      = this.gameData.resolve(resolvedId);

    if (entry.type === 'Equipment') {
      const eq = entry as Equipment;
      const { shortRange, longRange } = this.parseRange(eq.range);
      const keywords: ResolvedKeyword[] = [
        ...eq.tags
          .filter(t => t.val?.startsWith('gl_'))
          .map(t => this.kwFromGlId(t.val, t.tag_name)),
        ...(shortRange !== null
          ? [WarbandService.SHORT_RANGE_KW, WarbandService.LONG_RANGE_KW]
          : []),
      ];
      return { ref, item: eq, keywords, shortRange, longRange };
    }

    if (entry.type === 'Addon') {
      const addon = entry as Addon;
      const syntheticItem: Equipment = {
        id        : addon.id,
        type      : 'Equipment',
        source    : addon.source,
        tags      : addon.tags,
        category  : this.includeToCategory(addon.eventtags?.['include']),
        name      : addon.name,
        equip_type: null,
        range     : null,
        blurb     : '',
        modifiers : null,
        eventtags : addon.eventtags,
        description: addon.description,
      };
      return { ref, item: syntheticItem, keywords: this.keywordsFromAddon(addon), shortRange: null, longRange: null };
    }

    // Unresolved fallback
    return { ref, item: entry as UnresolvedFallback, keywords: [], shortRange: null, longRange: null };
  }

  // ---------------------------------------------------------------------------
  // Range parsing
  // ---------------------------------------------------------------------------

  private parseRange(rangeStr: string | null | undefined): { shortRange: string | null; longRange: string | null } {
    if (!rangeStr) return { shortRange: null, longRange: null };
    const trimmed = rangeStr.trim();
    if (trimmed.toLowerCase() === 'melee') return { shortRange: null, longRange: 'Melee' };
    const numMatch = trimmed.match(/^(\d+)"/);
    if (numMatch) {
      const full  = parseInt(numMatch[1], 10);
      const short = Math.floor(full / 2);
      return {
        shortRange: `${short}"`,
        longRange : /melee/i.test(trimmed) ? `${full}" / Melee` : `${full}"`,
      };
    }
    return { shortRange: null, longRange: trimmed };
  }

  // ---------------------------------------------------------------------------
  // Keyword resolution
  // ---------------------------------------------------------------------------

  private resolveKeyword(kwRef: WarbandKeywordRef): ResolvedKeyword {
    const rawId = kwRef['keyword-id'];
    const name  = kwRef['keyword-name'];

    const negateMatch = rawId.match(/^kw_negate_kw_(.+)$/);
    if (negateMatch) {
      const baseGlId    = `gl_${negateMatch[1]}`;
      const entry       = this.gameData.resolve(baseGlId);
      const glossaryEntry = entry.type === 'Glossary'
        ? entry as GameGlossaryEntry
        : entry as UnresolvedFallback;
      return { exportId: rawId, exportName: name, negated: true, glossaryEntry };
    }

    const glId        = `gl_${rawId.slice(3)}`;
    const entry       = this.gameData.resolve(glId);
    const glossaryEntry = entry.type === 'Glossary'
      ? entry as GameGlossaryEntry
      : entry as UnresolvedFallback;
    return { exportId: rawId, exportName: name, negated: false, glossaryEntry };
  }

  private kwFromGlId(glId: string, label: string): ResolvedKeyword {
    const entry       = this.gameData.resolve(glId);
    const glossaryEntry = entry.type === 'Glossary'
      ? entry as GameGlossaryEntry
      : entry as UnresolvedFallback;
    return { exportId: glId, exportName: label.toUpperCase(), negated: false, glossaryEntry };
  }

  // ---------------------------------------------------------------------------
  // Ability resolution
  // ---------------------------------------------------------------------------

  private resolveAbility(ref: WarbandAbilityRef): EnrichedAbility {
    const id    = ref['ability-id'];
    const entry = this.gameData.resolve(id);

    if (id.startsWith('rl_') || entry.type === 'VariantRule') {
      const variantRule = entry.type === 'VariantRule'
        ? entry as VariantRule
        : entry as UnresolvedFallback;
      return {
        ref,
        source     : 'variant-rule',
        addon      : undefined,
        variantRule,
        keywords   : entry.type === 'VariantRule'
          ? this.keywordsFromVariantRule(entry as VariantRule)
          : [],
      };
    }

    if (entry.type === 'Addon') {
      const addon = entry as Addon;
      return { ref, source: 'addon', addon, variantRule: undefined, keywords: this.keywordsFromAddon(addon) };
    }

    // Unresolved — surface as an addon-shaped fallback
    return { ref, source: 'addon', addon: entry as UnresolvedFallback, variantRule: undefined, keywords: [] };
  }

  private keywordsFromAddon(addon: Addon): ResolvedKeyword[] {
    return this.keywordsFromDescriptionBlocks(addon.description);
  }

  private keywordsFromVariantRule(rule: VariantRule): ResolvedKeyword[] {
    return this.keywordsFromDescriptionBlocks(rule.description);
  }

  private keywordsFromDescriptionBlocks(blocks: DescriptionBlock[]): ResolvedKeyword[] {
    const seen = new Map<string, ResolvedKeyword>();
    const visit = (block: DescriptionBlock) => {
      for (const ref of block.glossary ?? []) {
        if (seen.has(ref.id)) continue;
        const entry       = this.gameData.resolve(ref.id);
        const glossaryEntry = entry.type === 'Glossary'
          ? entry as GameGlossaryEntry
          : entry as UnresolvedFallback;
        seen.set(ref.id, {
          exportId    : ref.id,
          exportName  : entry.name.toUpperCase(),
          negated     : false,
          glossaryEntry,
        });
      }
      for (const sub of block.subcontent ?? []) visit(sub);
    };
    blocks.forEach(visit);
    return [...seen.values()];
  }

  // ---------------------------------------------------------------------------
  // Weapon-addon → equipment promotion
  // ---------------------------------------------------------------------------

  private isWeaponAddon(addon: Addon): boolean {
    const include = addon.eventtags?.['include'];
    return (
      Array.isArray(include) &&
      include.some((c: unknown) => typeof c === 'string' && c.startsWith('category_'))
    );
  }

  private includeToCategory(include: unknown): string {
    if (!Array.isArray(include)) return 'weapon';
    const cat = (include as string[]).find(c => c.startsWith('category_'));
    return cat ? cat.replace('category_', '') : 'weapon';
  }

  private weaponAddonToEquipment(addon: Addon): EnrichedEquipment {
    const category    = this.includeToCategory(addon.eventtags?.['include']);
    const syntheticItem: Equipment = {
      id        : addon.id,
      type      : 'Equipment',
      source    : addon.source,
      tags      : addon.tags,
      category,
      name      : addon.name,
      equip_type: null,
      range     : null,
      blurb     : '',
      modifiers : null,
      eventtags : addon.eventtags,
      description: addon.description,
    };
    const syntheticRef: WarbandEquipmentRef = {
      'equipment-name': addon.name,
      'equipment-id'  : addon.id,
      'equipment-type': category,
    };
    return { ref: syntheticRef, item: syntheticItem, keywords: this.keywordsFromAddon(addon), shortRange: null, longRange: null };
  }

  // ---------------------------------------------------------------------------
  // Merge / dedup helpers
  // ---------------------------------------------------------------------------

  private mergeKeywords(keywords: ResolvedKeyword[]): ResolvedKeyword[] {
    const seen = new Map<string, ResolvedKeyword>();
    for (const kw of keywords) seen.set(kw.exportId, kw);
    return [...seen.values()].sort((a, b) => a.exportName.localeCompare(b.exportName));
  }
}
