import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GameDataService } from './game-data.service';
import { isUnresolvedFallback } from '../models/game-data.interfaces';
import type {
  Addon,
  Equipment,
  GameGlossaryEntry,
  Model,
  VariantRule,
  DescriptionBlock,
  UnresolvedFallback,
} from '../models/game-data.interfaces';
import type {
  WarbandExport,
  WarbandAbilityRef,
  WarbandEquipmentRef,
  WarbandKeywordRef,
  WarbandModelExport,
  EnrichedWarband,
  EnrichedWarbandModel,
  EnrichedEquipment,
  EnrichedAbility,
  ResolvedKeyword,
} from '../models/warband.interfaces';

export type WarbandFormat = 'api' | 'full' | 'simplified';

// ---------------------------------------------------------------------------
// TC internal format types (Trench Companion API — Format 1 & Format 2)
//
// Format 1: full API wrapper  — { warband_id: number, warband_data: string }
//   warband_data is a double-serialised JSON string requiring a second parse.
//
// Format 2: pre-parsed warband_data — the inner object after the second parse
//   (detected by the presence of `faction` and models with nested `model` objects)
// ---------------------------------------------------------------------------

interface TcApiSubproperty {
  object_id: string;
  tags: Record<string, boolean>;
}

interface TcApiEquipmentItem {
  id: string;
  name: string;
  equipment_id: { object_id: string };
  tags: Record<string, boolean | string>;
}

interface TcApiEquipmentEntry {
  equipment: TcApiEquipmentItem;
}

interface TcApiModelData {
  id: string;
  name: string;
  model: string;   // model-type ID, e.g. "md_hereticpriest"
  elite: boolean;
  subproperties: TcApiSubproperty[];
  equipment: TcApiEquipmentEntry[];
}

interface TcApiModelEntry {
  purchase: { cost_value: number };
  model: TcApiModelData;
}

interface TcApiFaction {
  faction_rules: TcApiSubproperty[];
}

interface TcApiWarbandData {
  name: string;
  ducat_bank: number;
  glory_bank: number;
  faction?: TcApiFaction;
  models: TcApiModelEntry[];
}

// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class WarbandService {
  private gameData = inject(GameDataService);
  private http     = inject(HttpClient);

  readonly warband        = signal<EnrichedWarband | null>(null);
  readonly rawExport      = signal<unknown>(null);
  readonly parseError     = signal<string | null>(null);
  readonly detectedFormat = signal<WarbandFormat | null>(null);

  private static readonly TC_API =
    'https://synod.trench-companion.com/wp-json/synod/v1/warband';

  // IDs that the TC exporter uses that differ from the current data file IDs.
  private static readonly MODEL_ID_REMAP: Record<string, string> = {
    'md_annointedheavyinfantry': 'md_anointedheavyinfantry',  // TC exporter typo (double-n)
    'md_deathcommando'         : 'md_hereticdeathcommando',   // TC exporter missing 'heretic' prefix
  };

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

  // ---------------------------------------------------------------------------
  // API fetch — returns the raw JSON string so callers can populate a textarea
  // ---------------------------------------------------------------------------

  loadFromApi(warbandId: string | number): Observable<string> {
    return this.http
      .get(`${WarbandService.TC_API}/${warbandId}`)
      .pipe(map(response => JSON.stringify(response, null, 2)));
  }

  // ---------------------------------------------------------------------------
  // Main load entry point — format detection is content-based
  // ---------------------------------------------------------------------------

  load(rawJson: string, _source?: WarbandFormat): void {
    this.parseError.set(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
      this.rawExport.set(parsed);
    } catch {
      this.parseError.set('Invalid JSON — please check your export and try again.');
      this.detectedFormat.set(null);
      return;
    }

    let exported: WarbandExport;
    const rec = parsed as Record<string, unknown>;

    // ── Format 1: full API wrapper ─────────────────────────────────────────
    // Detected by: warband_id (number) + warband_data (JSON string) at root.
    // warband_data requires a second JSON.parse() to get the inner object.
    if (typeof rec['warband_id'] === 'number' && typeof rec['warband_data'] === 'string') {
      this.detectedFormat.set('api');
      let inner: unknown;
      try {
        inner = JSON.parse(rec['warband_data'] as string);
      } catch {
        this.parseError.set('warband_data could not be parsed — the data may be corrupted.');
        this.detectedFormat.set(null);
        return;
      }
      exported = this.translateTcInternal(inner as TcApiWarbandData);

    // ── Format 2: pre-parsed TC internal object ────────────────────────────
    // Detected by: faction object + models array where models[0].model is an object
    // (i.e., the inner warband_data content after it's already been parsed).
    } else if (this.isTcInternalFormat(rec)) {
      this.detectedFormat.set('full');
      exported = this.translateTcInternal(rec as unknown as TcApiWarbandData);

    // ── Format 3: simplified warband export ────────────────────────────────
    // Detected by: warband-name + flat model objects with stat-move etc.
    } else {
      this.detectedFormat.set('simplified');
      exported = parsed as WarbandExport;
    }

    if (!exported.models || !Array.isArray(exported.models)) {
      this.parseError.set('Export JSON must have a "models" array.');
      this.detectedFormat.set(null);
      return;
    }

    const enrichedModels: EnrichedWarbandModel[] = exported.models.map(m => {
      // Strip the "/Infantry" or "/Cavalry" movement suffix from simplified exports.
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
    this.detectedFormat.set(null);
  }

  // ---------------------------------------------------------------------------
  // TC internal format → WarbandExport translation
  // ---------------------------------------------------------------------------

  private translateTcInternal(data: TcApiWarbandData): WarbandExport {
    const factionRuleIds = (data.faction?.faction_rules ?? []).map(r => r.object_id);

    const models: WarbandModelExport[] = (data.models ?? []).map(entry => {
      const m        = entry.model;
      const modelId  = WarbandService.MODEL_ID_REMAP[m.model] ?? m.model;
      const def      = this.gameData.getModel(modelId);

      // Equipment: the actual equipment ID lives in equipment_id.object_id.
      // The entry.equipment.id may be a relationship ID for mandatory equipment.
      const equipment: WarbandEquipmentRef[] = m.equipment.map(eq => ({
        'equipment-name': eq.equipment.name,
        'equipment-id'  : eq.equipment.equipment_id.object_id,
        'equipment-type': this.tagsToEquipType(eq.equipment.tags),
      }));

      // Abilities: per-model subproperties, then any warband faction rules
      // that are not already listed on this model.
      const modelSubpropIds = new Set(m.subproperties.map(s => s.object_id));

      const abilities: WarbandAbilityRef[] = [
        ...m.subproperties.map(s => ({
          'ability-name': this.gameData.resolve(s.object_id).name,
          'ability-id'  : s.object_id,
        })),
        ...factionRuleIds
          .filter(id => !modelSubpropIds.has(id))
          .map(id => ({
            'ability-name': this.gameData.resolve(id).name,
            'ability-id'  : id,
          })),
      ];

      // Keywords: elite flag + any kw_* tags on the game-data model definition.
      const keywords = this.keywordsFromTcModel(m, def);

      // Stats from game-data model definition (not provided by the TC API).
      const statMove   = def ? `${def.movement.join('/')}` : '?';
      const statMelee  = def ? def.melee.join('/')         : '?';
      const statRanged = def ? def.ranged.join('/')        : '?';
      const statArmour = def ? def.armour.join('/')        : '?';

      return {
        'model-name'  : def?.name ?? m.model,
        'model-id'    : modelId,
        name          : m.name,
        'stat-move'   : statMove,
        'stat-melee'  : statMelee,
        'stat-ranged' : statRanged,
        'stat-armour' : statArmour,
        cost          : { ducats: entry.purchase?.cost_value ?? 0, glory: 0 },
        equipment,
        abilities,
        upgrades      : [],
        advancements  : [],
        injuries      : [],
        keywords,
      };
    });

    return {
      'warband-id'   : 0,
      'warband-url'  : '',
      'warband-name' : data.name ?? 'Unknown Warband',
      'ducat-bank'   : data.ducat_bank ?? 0,
      'glory-bank'   : data.glory_bank ?? 0,
      'ducat-rating' : 0,
      'glory-rating' : 0,
      models,
    };
  }

  // Detect the TC internal format (inner warband_data object, already parsed).
  // models[0] has a `model` property that is itself an object with a `model`
  // string field (the model-type ID like "md_hereticpriest").
  private isTcInternalFormat(rec: Record<string, unknown>): boolean {
    if (!Array.isArray(rec['models']) || (rec['models'] as unknown[]).length === 0) {
      return false;
    }
    const first = (rec['models'] as Record<string, unknown>[])[0];
    const modelField = first?.['model'];
    return (
      modelField !== null &&
      typeof modelField === 'object' &&
      typeof (modelField as Record<string, unknown>)['model'] === 'string'
    );
  }

  // Derive equipment type from the TC API tags object.
  private tagsToEquipType(tags: Record<string, boolean | string>): string {
    if (tags['armour'])  return 'armour';
    if (tags['shield'])  return 'shield';
    if (tags['grenade']) return 'grenade';
    if (tags['weapon'])  return 'weapon';
    if (tags['trait'])   return 'trait';
    return 'equipment';
  }

  // Extract keyword refs from the TC internal model object.
  // Uses the `elite` flag and any kw_* tags on the game-data model definition.
  private keywordsFromTcModel(
    m: TcApiModelData,
    def: Model | undefined,
  ): WarbandKeywordRef[] {
    const keywords: WarbandKeywordRef[] = [];
    const seen = new Set<string>();

    if (m.elite) {
      keywords.push({ 'keyword-name': 'ELITE', 'keyword-id': 'kw_elite' });
      seen.add('kw_elite');
    }

    if (def) {
      for (const tag of def.tags) {
        if (tag.val?.startsWith('kw_') && !seen.has(tag.val)) {
          keywords.push({
            'keyword-name': tag.tag_name.toUpperCase(),
            'keyword-id'  : tag.val,
          });
          seen.add(tag.val);
        }
      }
    }

    return keywords;
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
