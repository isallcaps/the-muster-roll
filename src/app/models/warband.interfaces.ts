import type { Equipment, Addon, VariantRule, Model, GameGlossaryEntry } from './game-data.interfaces';

// ---------------------------------------------------------------------------
// Raw export shape (from trench-companion.com)
// ---------------------------------------------------------------------------

export interface WarbandEquipmentRef {
  'equipment-name': string;
  'equipment-id': string;
  'equipment-type': string;
}

export interface WarbandAbilityRef {
  'ability-name': string;
  'ability-id': string;
}

export interface WarbandKeywordRef {
  'keyword-name': string;  // e.g. "ELITE", "NEGATE FIRE"
  'keyword-id': string;    // e.g. "kw_elite", "kw_negate_kw_fire"
}

export interface WarbandModelExport {
  'model-name': string;
  'model-id': string;
  name: string;
  'stat-move': string;
  'stat-melee': string;
  'stat-ranged': string;
  'stat-armour': string;
  cost: { ducats: number; glory: number };
  equipment: WarbandEquipmentRef[];
  abilities: WarbandAbilityRef[];
  upgrades: unknown[];
  advancements: unknown[];
  injuries: unknown[];
  keywords: WarbandKeywordRef[];
}

export interface WarbandExport {
  'warband-id': number;
  'warband-url': string;
  'warband-name': string;
  'ducat-bank': number;
  'glory-bank': number;
  'ducat-rating': number;
  'glory-rating': number;
  models: WarbandModelExport[];
}

// ---------------------------------------------------------------------------
// Enriched / resolved shapes (ready for rendering)
// ---------------------------------------------------------------------------

/**
 * A resolved keyword with its full glossary rule text.
 * For NEGATE keywords (e.g. NEGATE FIRE), `negated` is true and
 * `glossaryEntry` points to the base keyword being negated (gl_fire) —
 * so a print card can show what the model is immune to.
 */
export interface ResolvedKeyword {
  exportId: string;                     // kw_elite / kw_negate_kw_fire
  exportName: string;                   // "ELITE" / "NEGATE FIRE"
  negated: boolean;
  glossaryEntry: GameGlossaryEntry | undefined;
}

/** Equipment with all keyword tags resolved to their full glossary entries. */
export interface EnrichedEquipment {
  ref: WarbandEquipmentRef;
  item: Equipment | undefined;
  /** One ResolvedKeyword per equipment tag that carries a gl_ val. */
  keywords: ResolvedKeyword[];
  /**
   * Calculated short range (half of the weapon's full range), e.g. `'12"'`.
   * Null for melee-only weapons or items with no parseable numeric range.
   * Calculated in WarbandService — do not derive in templates.
   */
  shortRange: string | null;
  /**
   * Display string for the weapon's full range, e.g. `'24"'` or `'12" / Melee'`.
   * For melee-only items this is `'Melee'`. Null when the item has no range field.
   */
  longRange: string | null;
}

/**
 * An ability that may come from addons.json (ab_ prefix) or from
 * a variant rule in variants.json (rl_ prefix).
 */
export interface EnrichedAbility {
  ref: WarbandAbilityRef;
  source: 'addon' | 'variant-rule' | 'unknown';
  addon: Addon | undefined;
  variantRule: VariantRule | undefined;
  /** Glossary entries referenced inside the ability description, deduped. */
  keywords: ResolvedKeyword[];
}

/**
 * Fully self-contained enriched model. Everything needed to play this model
 * is present — no external lookups required at render time.
 */
export interface EnrichedWarbandModel {
  export: WarbandModelExport;
  /** Static definition from models.json — undefined if model-id not found. */
  definition: Model | undefined;
  /** Model-level keywords resolved to full rule text (+ NEGATE handling). */
  modelKeywords: ResolvedKeyword[];
  equipment: EnrichedEquipment[];
  abilities: EnrichedAbility[];
  /**
   * Deduplicated, alphabetically sorted union of every unique keyword
   * referenced anywhere on this model. Useful for a per-card inline index.
   */
  allKeywords: ResolvedKeyword[];
}

export interface EnrichedWarband {
  name: string;
  warbandId: number;
  warbandUrl: string;
  ducatBank: number;
  gloryBank: number;
  ducatRating: number;
  gloryRating: number;
  models: EnrichedWarbandModel[];
  /**
   * Deduplicated, alphabetically sorted union of every unique keyword
   * referenced across the entire warband (model tags, equipment tags, ability
   * descriptions). Built once in WarbandService so components just read it.
   */
  allWarbandKeywords: ResolvedKeyword[];
}
