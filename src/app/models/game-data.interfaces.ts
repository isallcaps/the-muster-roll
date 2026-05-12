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
  modifiers: string[] | null; // null is present in the raw JSON for items with no modifiers
  eventtags: Record<string, boolean | string>;
  description: DescriptionBlock[];
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
}

export interface Skill {
  id: string;
  type: 'Skill';
  source: string;
  tags: Tag[];
  eventtags: Record<string, boolean | string>;
  name: string;
  description: DescriptionBlock[];
}

export interface GameGlossaryEntry {
  id: string;
  type: 'Glossary';
  source: string;
  tags: Tag[];
  name: string;
  description: DescriptionBlock[];
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

/**
 * A single named rule extracted from a Variant, keyed by its `rl_` slug.
 * The slug is derived by lowercasing the rule title and stripping non-alpha
 * characters (e.g. "Fast As Lightning:" → rl_fastaslightning).
 */
export interface VariantRule {
  id: string;           // e.g. "rl_fastaslightning"
  title: string;        // e.g. "Fast As Lightning"
  variantId: string;    // e.g. "fv_navalraidingparty"
  variantName: string;  // e.g. "Naval Raiding Party"
  description: DescriptionBlock[];
}
