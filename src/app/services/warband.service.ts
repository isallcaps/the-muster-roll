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
  readonly parseError = signal<string | null>(null);

  /**
   * Parse a raw JSON string from trench-companion.com, cross-reference all
   * IDs against GameDataService, and store the fully enriched result in the
   * `warband` signal.
   *
   * Each EnrichedWarbandModel is completely self-contained:
   *  - equipment items carry keyword rule text
   *  - abilities (ab_ and rl_) carry their full description + keyword refs
   *  - modelKeywords carry the full rule text for every model tag
   *  - allKeywords is a deduped alphabetical index for a per-card sidebar
   */
  load(rawJson: string): void {
    this.parseError.set(null);

    let exported: WarbandExport;
    try {
      exported = JSON.parse(rawJson) as WarbandExport;
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
      const equipment: EnrichedEquipment[] = m.equipment.map(ref => {
        const item = this.gameData.getEquipment(ref['equipment-id']);
        const keywords = item
          ? item.tags
              .filter(t => t.val?.startsWith('gl_'))
              .map(t => this.kwFromGlId(t.val, t.tag_name))
          : [];
        return { ref, item, keywords };
      });

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

    this.warband.set({
      name        : exported['warband-name'],
      warbandId   : exported['warband-id'],
      warbandUrl  : exported['warband-url'],
      ducatBank   : exported['ducat-bank'],
      gloryBank   : exported['glory-bank'],
      ducatRating : exported['ducat-rating'],
      gloryRating : exported['glory-rating'],
      models      : enrichedModels,
    });
  }

  clear(): void {
    this.warband.set(null);
    this.parseError.set(null);
  }

  // ---------------------------------------------------------------------------
  // Keyword resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve a kw_ keyword from the export to a ResolvedKeyword with full
   * glossary rule text.
   *
   * NEGATE keywords (kw_negate_kw_X) don't have their own glossary entry.
   * Instead we resolve the base keyword (gl_X) so the print card can show
   * what the model is immune to.
   *
   * Simple keywords (kw_elite, kw_tough, …) map directly to gl_elite etc.
   */
  private resolveKeyword(kwRef: WarbandKeywordRef): ResolvedKeyword {
    const rawId = kwRef['keyword-id'];   // e.g. "kw_elite" or "kw_negate_kw_fire"
    const name  = kwRef['keyword-name']; // e.g. "ELITE"   or "NEGATE FIRE"

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
    const glId = `gl_${rawId.slice(3)}`; // strip "kw_"
    return {
      exportId: rawId,
      exportName: name,
      negated: false,
      glossaryEntry: this.gameData.getGlossaryEntry(glId),
    };
  }

  /** Build a ResolvedKeyword from a raw gl_ id and a human-readable label. */
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

    if (id.startsWith('ab_')) {
      const addon = this.gameData.getAddon(id);
      return {
        ref,
        source     : 'addon',
        addon,
        variantRule: undefined,
        keywords   : addon ? this.keywordsFromAddon(addon) : [],
      };
    }

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

    return { ref, source: 'unknown', addon: undefined, variantRule: undefined, keywords: [] };
  }

  /** Collect all glossary refs embedded in an Addon's description. */
  private keywordsFromAddon(addon: Addon): ResolvedKeyword[] {
    return this.keywordsFromDescriptionBlocks(addon.description);
  }

  /** Collect all glossary refs from a VariantRule's description blocks. */
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

    // Dedupe and convert to ResolvedKeyword
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

  /**
   * An addon is treated as a weapon — and promoted to the equipment section —
   * when its eventtags carry an `include` array with at least one `category_*`
   * entry (e.g. `category_ranged`, `category_melee`).
   */
  private isWeaponAddon(addon: Addon): boolean {
    const include = addon.eventtags?.['include'];
    return (
      Array.isArray(include) &&
      include.some((c: unknown) => typeof c === 'string' && c.startsWith('category_'))
    );
  }

  /** Derive a human-readable category string from the include array. */
  private includeToCategory(include: unknown): string {
    if (!Array.isArray(include)) return 'weapon';
    const cat = (include as string[]).find(c => c.startsWith('category_'));
    return cat ? cat.replace('category_', '') : 'weapon';
  }

  /**
   * Adapt a weapon addon into an EnrichedEquipment so the card template can
   * render it in the equipment section alongside regular gear. The addon's
   * description blocks become the rule text; range/equip_type/modifiers/blurb
   * are unavailable in the addon data and left null/empty.
   */
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
      ref     : syntheticRef,
      item    : syntheticItem,
      keywords: this.keywordsFromAddon(addon),
    };
  }

  // ---------------------------------------------------------------------------
  // Merge / dedup helpers
  // ---------------------------------------------------------------------------

  /**
   * Merge keyword arrays, deduplicate by exportId, sort alphabetically by
   * exportName. NEGATE keywords sort after their base keyword.
   */
  private mergeKeywords(keywords: ResolvedKeyword[]): ResolvedKeyword[] {
    const seen = new Map<string, ResolvedKeyword>();
    for (const kw of keywords) seen.set(kw.exportId, kw);
    return [...seen.values()].sort((a, b) => a.exportName.localeCompare(b.exportName));
  }
}
