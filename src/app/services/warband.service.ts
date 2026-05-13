import { Injectable, inject, signal } from '@angular/core';
import { GameDataService } from './game-data.service';
import type { Addon, Equipment, VariantRule, GameGlossaryEntry, DescriptionBlock } from '../models/game-data.interfaces';
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

  /**
   * The export format produced by trench-companion.com lags behind the game-data
   * files: IDs get renamed or corrected in the data files without a matching
   * update to the exporter. Any stale export ID that no longer exists in the
   * equipment or addon maps goes here so the enrichment pipeline can find the
   * real entry transparently.
   *
   * Format: { '<stale export id>': '<current data file id>' }
   */
  private static readonly EQUIPMENT_ID_REMAP: Record<string, string> = {
    // Typo in the exporter — data file has the correct spelling.
    'eq_silenecedpistol'           : 'eq_silencedpistol',
    // Export uses a warband-specific fabricated ID; real entry is an addon.
    'eq_artillerywitchinfernalbomb': 'ab_infernalbomb',
    // Equipment IDs renamed in the data files.
    'eq_sacrificialknife'          : 'eq_sacrificialblade',
    'eq_greatswordaxe'             : 'eq_greataxe',
    'eq_knifedagger'               : 'eq_trenchknife',
  };

  /**
   * Synthetic ResolvedKeyword entries for SHORT RANGE and LONG RANGE.
   * These are added to any equipment item that has a numeric range so they
   * appear in the "I Know These Rules" toggle panel for beginners.
   */
  private static readonly SHORT_RANGE_KW: ResolvedKeyword = {
    exportId   : 'gl_shortrange',
    exportName : 'SHORT RANGE',
    negated    : false,
    glossaryEntry: {
      id: 'gl_shortrange', type: 'Glossary', source: 'local', tags: [], name: 'Short Range',
      description: [{ tags: [], content: 'Within half the weapon\'s full range. No penalty to hit.', subcontent: [], glossary: [] }],
    },
  };

  private static readonly LONG_RANGE_KW: ResolvedKeyword = {
    exportId   : 'gl_longrange',
    exportName : 'LONG RANGE',
    negated    : false,
    glossaryEntry: {
      id: 'gl_longrange', type: 'Glossary', source: 'local', tags: [], name: 'Long Range',
      description: [{ tags: [], content: 'Beyond half the weapon\'s full range. −1 DICE to hit.', subcontent: [], glossary: [] }],
    },
  };

  /**
   * Parse a raw JSON string from trench-companion.com, cross-reference all
   * IDs against GameDataService, and store the fully enriched result in the
   * `warband` signal.
   */
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
      // Strip movement-type suffix exported by trench-companion (e.g. '6"/Infantry' → '6"').
      m['stat-move'] = m['stat-move']?.split('/')[0] ?? m['stat-move'];

      const definition = this.gameData.getModel(m['model-id']);

      // Keywords come directly from the export (kw_ IDs)
      const modelKeywords = m.keywords.map(kw => this.resolveKeyword(kw));

      // Regular equipment from the export's equipment array
      const equipment: EnrichedEquipment[] = m.equipment.map(ref => this.resolveEquipment(ref));

      // Abilities — weapon addons (eventtags.include: ['category_*']) are
      // routed to the equipment section; everything else stays as an ability.
      const weaponEquipment: EnrichedEquipment[] = [];
      const abilities: EnrichedAbility[] = [];

      for (const ref of m.abilities) {
        const enriched = this.resolveAbility(ref);
        if (
          enriched.source === 'addon' &&
          enriched.addon &&
          this.isWeaponAddon(enriched.addon)
        ) {
          weaponEquipment.push(this.weaponAddonToEquipment(enriched.addon));
        } else {
          abilities.push(enriched);
        }
      }

      // Weapon addons follow the regular equipment entries on the card
      const allEquipment = [...equipment, ...weaponEquipment];

      // Union of all keywords across the whole model, deduped by glossary id
      const allKeywords = this.mergeKeywords([
        ...modelKeywords,
        ...allEquipment.flatMap(e => e.keywords),
        ...abilities.flatMap(a => a.keywords),
      ]);

      return { export: m, definition, modelKeywords, equipment: allEquipment, abilities, allKeywords };
    });

    // Deduplicated warband-wide keyword list — built once here so components
    // don't each re-derive it independently.
    const allWarbandKeywords = this.mergeKeywords(
      enrichedModels.flatMap(m => m.allKeywords)
    );

    this.warband.set({
      name             : exported['warband-name'],
      warbandId        : exported['warband-id'],
      warbandUrl       : exported['warband-url'],
      ducatBank        : exported['ducat-bank'],
      gloryBank        : exported['glory-bank'],
      ducatRating      : exported['ducat-rating'],
      gloryRating      : exported['glory-rating'],
      models           : enrichedModels,
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

    const item = this.gameData.getEquipment(resolvedId);
    if (item) {
      const { shortRange, longRange } = this.parseRange(item.range);
      const keywords = [
        ...item.tags
          .filter(t => t.val?.startsWith('gl_'))
          .map(t => this.kwFromGlId(t.val, t.tag_name)),
        ...(shortRange !== null ? [WarbandService.SHORT_RANGE_KW, WarbandService.LONG_RANGE_KW] : []),
      ];
      return { ref, item, keywords, shortRange, longRange };
    }

    // Fallback: some exports place weapon addons in the equipment array.
    const addon = this.gameData.getAddon(resolvedId);
    if (addon) {
      const { shortRange, longRange } = this.parseRange(null); // addons don't carry a range field
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
      return { ref, item: syntheticItem, keywords: this.keywordsFromAddon(addon), shortRange, longRange };
    }

    return { ref, item: undefined, keywords: [], shortRange: null, longRange: null };
  }

  // ---------------------------------------------------------------------------
  // Range parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse an equipment range string into display-ready short and long values.
   *
   * Examples:
   *   "24\""        → shortRange: '12"',  longRange: '24"'
   *   "Melee"       → shortRange: null,   longRange: 'Melee'
   *   "12\"/Melee"  → shortRange: '6"',   longRange: '12" / Melee'
   *   null          → shortRange: null,   longRange: null
   */
  private parseRange(rangeStr: string | null): { shortRange: string | null; longRange: string | null } {
    if (!rangeStr) return { shortRange: null, longRange: null };

    const trimmed = rangeStr.trim();

    if (trimmed.toLowerCase() === 'melee') {
      return { shortRange: null, longRange: 'Melee' };
    }

    const numMatch = trimmed.match(/^(\d+)"/);
    if (numMatch) {
      const full  = parseInt(numMatch[1], 10);
      const short = Math.floor(full / 2);
      const hasMelee = /melee/i.test(trimmed);
      return {
        shortRange: `${short}"`,
        longRange : hasMelee ? `${full}" / Melee` : `${full}"`,
      };
    }

    // Non-standard range (e.g. 'Template', 'Special') — display as-is, no halving.
    return { shortRange: null, longRange: trimmed };
  }

  // ---------------------------------------------------------------------------
  // Keyword resolution
  // ---------------------------------------------------------------------------

  private resolveKeyword(kwRef: WarbandKeywordRef): ResolvedKeyword {
    const rawId = kwRef['keyword-id'];
    const name  = kwRef['keyword-name'];

    // NEGATE pattern: kw_negate_kw_<base>
    const negateMatch = rawId.match(/^kw_negate_kw_(.+)$/);
    if (negateMatch) {
      const baseGlId = `gl_${negateMatch[1]}`;
      return {
        exportId: rawId,
        exportName: name,
        negated: true,
        glossaryEntry: this.gameData.getGlossaryEntry(baseGlId),
      };
    }

    // Simple keyword: kw_X → gl_X
    const glId = `gl_${rawId.slice(3)}`;
    return {
      exportId: rawId,
      exportName: name,
      negated: false,
      glossaryEntry: this.gameData.getGlossaryEntry(glId),
    };
  }

  private kwFromGlId(glId: string, label: string): ResolvedKeyword {
    return {
      exportId: glId,
      exportName: label.toUpperCase(),
      negated: false,
      glossaryEntry: this.gameData.getGlossaryEntry(glId),
    };
  }

  // ---------------------------------------------------------------------------
  // Ability resolution
  // ---------------------------------------------------------------------------

  private resolveAbility(ref: WarbandAbilityRef): EnrichedAbility {
    const id = ref['ability-id'];

    if (id.startsWith('rl_')) {
      const rule = this.gameData.getVariantRule(id);
      return {
        ref,
        source     : 'variant-rule',
        addon      : undefined,
        variantRule: rule,
        keywords   : rule ? this.keywordsFromVariantRule(rule) : [],
      };
    }

    const addon = this.gameData.getAddon(id);
    if (addon) {
      return {
        ref,
        source     : 'addon',
        addon,
        variantRule: undefined,
        keywords   : this.keywordsFromAddon(addon),
      };
    }

    return { ref, source: 'unknown', addon: undefined, variantRule: undefined, keywords: [] };
  }

  private keywordsFromAddon(addon: Addon): ResolvedKeyword[] {
    return this.keywordsFromDescriptionBlocks(addon.description);
  }

  private keywordsFromVariantRule(rule: VariantRule): ResolvedKeyword[] {
    return this.keywordsFromDescriptionBlocks(rule.description);
  }

  private keywordsFromDescriptionBlocks(blocks: DescriptionBlock[]): ResolvedKeyword[] {
    const entries: GameGlossaryEntry[] = [];
    const visit = (block: DescriptionBlock) => {
      for (const ref of block.glossary ?? []) {
        const entry = this.gameData.getGlossaryEntry(ref.id);
        if (entry) entries.push(entry);
      }
      for (const sub of block.subcontent ?? []) visit(sub);
    };
    blocks.forEach(visit);

    const seen = new Map<string, GameGlossaryEntry>();
    for (const e of entries) seen.set(e.id, e);
    return [...seen.values()].map(e => ({
      exportId    : e.id,
      exportName  : e.name.toUpperCase(),
      negated     : false,
      glossaryEntry: e,
    }));
  }

  // ---------------------------------------------------------------------------
  // Weapon addon → equipment promotion
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
    const category = this.includeToCategory(addon.eventtags?.['include']);

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

    return {
      ref       : syntheticRef,
      item      : syntheticItem,
      keywords  : this.keywordsFromAddon(addon),
      shortRange: null,
      longRange : null,
    };
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
