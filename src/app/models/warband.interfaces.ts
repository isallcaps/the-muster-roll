import type {
  Equipment,
  Addon,
  VariantRule,
  Model,
  GameGlossaryEntry,
  UnresolvedFallback,
} from './game-data.interfaces';

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
  'keyword-name': string;
  'keyword-id': string;
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
 * A resolved keyword. glossaryEntry is always present — either a real entry
 * from glossary.json or an UnresolvedFallback (description: [], unresolved: true).
 */
export interface ResolvedKeyword {
  exportId: string;
  exportName: string;
  negated: boolean;
  glossaryEntry: GameGlossaryEntry | UnresolvedFallback;
}

/**
 * Equipment with all keyword tags resolved. item is always present —
 * either a real Equipment object or an UnresolvedFallback.
 */
export interface EnrichedEquipment {
  ref: WarbandEquipmentRef;
  item: Equipment | UnresolvedFallback;
  keywords: ResolvedKeyword[];
  shortRange: string | null;
  longRange: string | null;
}

/**
 * An ability (addon or variant rule). Source is always 'addon' or
 * 'variant-rule'; the corresponding field holds either the real entry
 * or an UnresolvedFallback — never a silent undefined/unknown.
 */
export interface EnrichedAbility {
  ref: WarbandAbilityRef;
  source: 'addon' | 'variant-rule';
  addon: Addon | UnresolvedFallback | undefined;
  variantRule: VariantRule | UnresolvedFallback | undefined;
  keywords: ResolvedKeyword[];
}

export interface EnrichedWarbandModel {
  export: WarbandModelExport;
  definition: Model | undefined;
  modelKeywords: ResolvedKeyword[];
  equipment: EnrichedEquipment[];
  abilities: EnrichedAbility[];
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
  allWarbandKeywords: ResolvedKeyword[];
}
