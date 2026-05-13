export interface Tag {
  tag_name: string;
  val: string;
}

export interface GlossaryRef {
  val: string;
  id: string;
}

export interface DescriptionBlock {
  tags: Tag[];
  content: string;
  subcontent?: DescriptionBlock[];
  glossary?: GlossaryRef[];
}

export interface Equipment {
  id: string;
  type: 'Equipment';
  source: string;
  tags: Tag[];
  category: string;
  name: string;
  equip_type: string | null;
  range: string | null;
  blurb: string;
  modifiers: string[] | null;
  eventtags: Record<string, boolean | string>;
  description: DescriptionBlock[];
  unresolved?: boolean;
}

export interface ModelAbilityRef {
  tags: Tag[];
  content: string;
}

export interface Model {
  id: string;
  type: 'Model';
  source: string;
  tags: Tag[];
  promotion: number;
  movement: number[];
  ranged: number[];
  melee: number[];
  armour: number[];
  base: number[];
  faction_id: string;
  team: string;
  variant_id: string;
  eventtags: Record<string, boolean | string>;
  name: string;
  blurb: DescriptionBlock[];
  equipment: DescriptionBlock[];
  abilities: ModelAbilityRef[];
  unresolved?: boolean;
}

export interface Addon {
  id: string;
  type: 'Addon';
  source: string;
  tags: Tag[];
  faction_id: string;
  name: string;
  eventtags: Record<string, boolean | string>;
  description: DescriptionBlock[];
  unresolved?: boolean;
}

export interface Skill {
  id: string;
  type: 'Skill';
  source: string;
  tags: Tag[];
  eventtags: Record<string, boolean | string>;
  name: string;
  description: DescriptionBlock[];
  unresolved?: boolean;
}

export interface GameGlossaryEntry {
  id: string;
  type: 'Glossary';
  source: string;
  tags: Tag[];
  name: string;
  description: DescriptionBlock[];
  unresolved?: boolean;
}

// ---------------------------------------------------------------------------
// Variant rules (from variants.json)
// ---------------------------------------------------------------------------

export interface VariantRuleBlock {
  title: string;
  description: DescriptionBlock[];
}

export interface Variant {
  id: string;
  type: 'Variant';
  source: string;
  tags: Tag[];
  faction_id: string;
  name: string;
  flavour: DescriptionBlock[];
  rules: VariantRuleBlock[];
}

export interface VariantRule {
  id: string;
  type: 'VariantRule';
  name: string;
  title: string;
  variantId: string;
  variantName: string;
  description: DescriptionBlock[];
  unresolved?: boolean;
}

// ---------------------------------------------------------------------------
// Universal fallback returned by GameDataService.resolve() on a miss.
// ---------------------------------------------------------------------------

export interface UnresolvedFallback {
  id: string;
  name: string;
  source: 'unknown';
  type: 'Unknown';
  description: DescriptionBlock[];
  tags: Tag[];
  unresolved: true;
  // Optional compatibility shims so templates can access common fields without casts
  range?: string | null;
  blurb?: string;
  modifiers?: string[] | null;
  equip_type?: string | null;
  eventtags?: Record<string, boolean | string>;
  category?: string;
  faction_id?: string;
  title?: string;
  variantId?: string;
  variantName?: string;
}

export type AnyDataEntry =
  | Equipment
  | Model
  | Addon
  | Skill
  | GameGlossaryEntry
  | VariantRule
  | UnresolvedFallback;

export function isUnresolvedFallback(entry: unknown): entry is UnresolvedFallback {
  return (
    entry !== null &&
    entry !== undefined &&
    typeof entry === 'object' &&
    (entry as { unresolved?: boolean }).unresolved === true
  );
}
