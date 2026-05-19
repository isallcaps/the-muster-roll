import {Injectable, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, map} from 'rxjs';
import {GameDataService} from './game-data.service';
import {isUnresolvedFallback} from '../models/game-data.interfaces';
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
	object_id:string;
	tags:Record<string, boolean>;
	selections?:Array<{ selection_ID:string }>;
}

interface TcApiEquipmentItem {
	id:string;
	name:string;
	equipment_id:{ object_id:string };
	tags:Record<string, boolean | string>;
}

interface TcApiEquipmentEntry {
	equipment:TcApiEquipmentItem;
}

interface TcApiModelData {
	id:string;
	name:string;
	model:string;   // model-type ID, e.g. "md_hereticpriest"
	elite:boolean;
	subproperties:TcApiSubproperty[];
	equipment:TcApiEquipmentEntry[];
}

interface TcApiModelEntry {
	purchase:{ cost_value:number };
	model:TcApiModelData;
}

interface TcApiFaction {
	faction_rules:TcApiSubproperty[];
}

interface TcApiWarbandData {
	name:string;
	ducat_bank:number;
	glory_bank:number;
	faction?:TcApiFaction;
	models:TcApiModelEntry[];
}

// ---------------------------------------------------------------------------

@Injectable({providedIn: 'root'})
export class WarbandService {
	private gameData = inject(GameDataService);
	private http = inject(HttpClient);

	readonly warband = signal<EnrichedWarband | null>(null);
	readonly rawExport = signal<unknown>(null);
	readonly parseError = signal<string | null>(null);
	readonly detectedFormat = signal<WarbandFormat | null>(null);

	private static readonly TC_API =
		'https://synod.trench-companion.com/wp-json/synod/v1/warband';

	// IDs that the TC exporter uses that differ from the current data file IDs.
	private static readonly MODEL_ID_REMAP:Record<string, string> = {
		'md_annointedheavyinfantry': 'md_anointedheavyinfantry',  // TC exporter typo (double-n)
		'md_deathcommando': 'md_hereticdeathcommando',   // TC exporter missing 'heretic' prefix
		// Prussian Stosstruppen aliases — designer confirmed: Hauptmann = Lieutenant,
		// Feldkaplan = Trench Cleric, Stosstruppen = Shock Troopers (Prussian variant)
		'md_hauptmann': 'md_lieutenant',
		'md_feldkaplan': 'md_trenchcleric',
		'md_stosstruppen': 'md_shocktroopersstostruppenofthefreestateofprussia',
		// Red Brigade variant — TC exporter sends faction-specific ID, submodule uses generic
		'md_trenchdogredbrigade': 'md_trenchdog',
		// Great Hunger — TC exporter typo (missing 'o') and Ravenous/Cradle variants
		'md_gergorigula': 'md_gregorigula',
		'md_grailthrall_hunger': 'md_ravenous',
		'md_grailthrall_cradle_hunger': 'md_cradleravenous',
	};

	// Maps Plague Knight rank upgrade IDs (up_plagueknightrank*) to their
	// corresponding variant rule IDs in the override file.
	private static readonly PLAGUE_KNIGHT_RANK_REMAP:Record<string, string> = {
		'up_plagueknightrankbutcherking': 'rl_butcherknights',
		'up_plagueknightrankofthefeast':  'rl_butcherknights',
		'up_plagueknightrankofferocity':  'rl_butcherknights',
	};

	// Maps bare upgrade IDs that do NOT follow the up_strain_ pattern to their
	// corresponding ability IDs. Rendered with a 'strain' badge on the model card.
	private static readonly UPGRADE_ABILITY_REMAP:Record<string, string> = {
		'up_unendingstarvation': 'ab_unendingstarvation',
		'up_zealotstrength':     'ab_zealotstrength',
	};

	// Maps TC-exporter ability IDs that differ from canonical data IDs.
	// Applied before the general resolve() call in resolveAbility().
	private static readonly ABILITY_ID_REMAP:Record<string, string> = {
		'ab_layingonhands':  'ab_layingonofhands',   // TC exporter drops 'of'
		'ab_feebleflailing': 'ab_feeblyflailing',    // TC exporter missing 'ly'
	};

	// Maps the fv_ suffix of a TC faction property ID to the human-readable
	// variant name shown on the faction card. Keyed by normalised fv_ id.
	private static readonly FACTION_VARIANT_NAMES:Record<string, string> = {
		'fv_thegreathunger': 'The Great Hunger',
		'fv_greathunger': 'The Great Hunger',
		'fv_redbrigade': 'The Red Brigade',
		'fv_prussianapplied': 'Prussian Stosstruppen',
		'fv_dirgeofthegreathegemon': 'Dirge of the Great Hegemon',
		'fv_warpilgrimageofsaintmethodius': 'War Pilgrimage of Saint Methodius',
	};

	// Models whose armour stat already has mandatory armour equipment baked into
	// the game-data profile. Do NOT apply an additional armour modifier from the
	// TC API equipment list for these — it would double-count the penalty.
	private static readonly ARMOUR_INCLUDED_IN_PROFILE = new Set([
		'md_anchoriteshrine',                   // -3 built in (standard profile)
		'md_anchoriteshrine_saintmethodius',    // -3 built in (Saint Methodius variant)
		'md_desecreatedsaint',                  // -3 built in (if found in submodule)
		'md_mechanizedheavyinfantry',            // -2/-3 built in (if found)
		'md_combatengineer_prussian',            // -2 built in (if variant exists)
	]);

	private static readonly EQUIPMENT_ID_REMAP:Record<string, string> = {
		'eq_silenecedpistol': 'eq_silencedpistol',
		'eq_foetidpalaquin': 'eq_foetidpalanquin',   // typo in TC exporter
		'eq_artillerywitchinfernalbomb': 'ab_infernalbomb',
		'eq_sacrificialknife': 'eq_sacrificialblade',
		'eq_greatswordaxe': 'eq_greataxe',
		'eq_knifedagger': 'eq_trenchknife',
		'eq_pistolrevolver': 'eq_pistol',
		'eq_doublehandedbluntweapon': 'eq_greathammer',
		'eq_ironcapriote': 'eq_ironcapirote',        // TC exporter typo (capriote vs capirote)
		// Mandatory model weapons — TC API sends eq_ IDs; submodule stores them as ab_ Addon entries.
		'eq_bonebreakermace':       'ab_bonebreakermace',   // Anchorite Shrine mandatory weapon
		'eq_catherinewheel':        'ab_catherinewheel',     // Anchorite Shrine mandatory weapon
		'eq_warwolfchainmaw':       'ab_chainmaw',           // War Wolf mandatory weapon
		'eq_warwolfshreddingclaws': 'ab_shreddingclaws',     // War Wolf mandatory weapon
	};

	private static readonly SHORT_RANGE_KW:ResolvedKeyword = {
		exportId: 'gl_shortrange',
		exportName: 'SHORT RANGE',
		negated: false,
		glossaryEntry: {
			id: 'gl_shortrange', type: 'Glossary', source: 'local', tags: [], name: 'Short Range',
			description: [{tags: [], content: 'Within half the weapon\'s full range. No penalty to hit.', subcontent: [], glossary: []}],
		},
	};

	private static readonly LONG_RANGE_KW:ResolvedKeyword = {
		exportId: 'gl_longrange',
		exportName: 'LONG RANGE',
		negated: false,
		glossaryEntry: {
			id: 'gl_longrange', type: 'Glossary', source: 'local', tags: [], name: 'Long Range',
			description: [{tags: [], content: 'Beyond half the weapon\'s full range. −1 DICE to hit.', subcontent: [], glossary: []}],
		},
	};

	// ---------------------------------------------------------------------------
	// API fetch — returns the raw JSON string so callers can populate a textarea
	// ---------------------------------------------------------------------------

	loadFromApi(warbandId:string | number):Observable<string> {
		return this.http
			.get(`${WarbandService.TC_API}/${warbandId}`)
			.pipe(map(response => JSON.stringify(response, null, 2)));
	}

	// ---------------------------------------------------------------------------
	// Main load entry point — format detection is content-based
	// ---------------------------------------------------------------------------

	load(rawJson:string, _source?:WarbandFormat):void {
		this.parseError.set(null);

		let parsed:unknown;
		try {
			parsed = JSON.parse(rawJson);
			this.rawExport.set(parsed);
		} catch {
			this.parseError.set('Invalid JSON — please check your export and try again.');
			this.detectedFormat.set(null);
			return;
		}

		let exported:WarbandExport;
		let tcData:TcApiWarbandData | undefined;
		const rec = parsed as Record<string, unknown>;

		// ── Format 1: full API wrapper ─────────────────────────────────────────
		// Detected by: warband_id (number) + warband_data (JSON string) at root.
		// warband_data requires a second JSON.parse() to get the inner object.
		if (typeof rec['warband_id'] === 'number' && typeof rec['warband_data'] === 'string') {
			this.detectedFormat.set('api');
			let inner:unknown;
			try {
				inner = JSON.parse(rec['warband_data'] as string);
			} catch {
				this.parseError.set('warband_data could not be parsed — the data may be corrupted.');
				this.detectedFormat.set(null);
				return;
			}
			tcData = inner as TcApiWarbandData;
			exported = this.translateTcInternal(tcData);

			// ── Format 2: pre-parsed TC internal object ────────────────────────────
			// Detected by: faction object + models array where models[0].model is an object
			// (i.e., the inner warband_data content after it's already been parsed).
		}
		else if (this.isTcInternalFormat(rec)) {
			this.detectedFormat.set('full');
			tcData = rec as unknown as TcApiWarbandData;
			exported = this.translateTcInternal(tcData);

			// ── Format 3: simplified warband export ────────────────────────────────
			// Detected by: warband-name + flat model objects with stat-move etc.
		}
		else {
			this.detectedFormat.set('simplified');
			exported = parsed as WarbandExport;
		}

		if (!exported.models || !Array.isArray(exported.models)) {
			this.parseError.set('Export JSON must have a "models" array.');
			this.detectedFormat.set(null);
			return;
		}

		const enrichedModels:EnrichedWarbandModel[] = exported.models.map(m => {

			const definition = this.gameData.getModel(m['model-id'], m['model-name']);
			const modelKeywords = m.keywords.map(kw => this.resolveKeyword(kw));
			const equipment:EnrichedEquipment[] = m.equipment.map(ref => this.resolveEquipment(ref));

			const weaponEquipment:EnrichedEquipment[] = [];
			const abilities:EnrichedAbility[] = [];

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
				}
				else {
					abilities.push(enriched);
				}
			}

			const allEquipment = this.sortEquipment([...equipment, ...weaponEquipment]);

			const allKeywords = this.mergeKeywords([
				...modelKeywords,
				...allEquipment.flatMap(e => e.keywords),
				...abilities.flatMap(a => a.keywords),
			]);

			return {export: m, definition, modelKeywords, equipment: allEquipment, abilities, allKeywords};
		});

		const allWarbandKeywords = this.mergeKeywords(
			enrichedModels.flatMap(m => m.allKeywords),
		);

		this.warband.set({
			name: exported['warband-name'],
			warbandId: exported['warband-id'],
			warbandUrl: exported['warband-url'],
			ducatBank: exported['ducat-bank'],
			gloryBank: exported['glory-bank'],
			ducatRating: exported['ducat-rating'],
			gloryRating: exported['glory-rating'],
			models: enrichedModels,
			allWarbandKeywords,
			variantName: tcData ? this.detectVariantName(tcData) : undefined,
		});
	}

	clear():void {
		this.warband.set(null);
		this.rawExport.set(null);
		this.parseError.set(null);
		this.detectedFormat.set(null);
	}

	// ---------------------------------------------------------------------------
	// TC internal format → WarbandExport translation
	// ---------------------------------------------------------------------------

	private translateTcInternal(data:TcApiWarbandData):WarbandExport {
		// Filter out faction identifier subproperties (fc_* IDs) — these are property
		// IDs encoding the faction/variant combination, not resolvable ability refs.
		const factionRules = (data.faction?.faction_rules ?? [])
			.filter(r => !r.object_id.startsWith('fc_'));
		const factionRuleIds = factionRules.map(r => r.object_id);

		const models:WarbandModelExport[] = (data.models ?? []).map(entry => {
			const m = entry.model;
			const modelId = WarbandService.MODEL_ID_REMAP[m.model] ?? m.model;
			const def = this.gameData.getModel(modelId);

			// Equipment: the actual equipment ID lives in equipment_id.object_id.
			// The entry.equipment.id may be a relationship ID for mandatory equipment.
			const equipment:WarbandEquipmentRef[] = m.equipment.map(eq => ({
				'equipment-name': eq.equipment.name,
				'equipment-id': eq.equipment.equipment_id.object_id,
				'equipment-type': this.tagsToEquipType(eq.equipment.tags),
			}));

			// Abilities: per-model subproperties, then any warband faction rules
			// that are not already listed on this model.
			const modelSubpropIds = new Set(m.subproperties.map(s => s.object_id));

			const abilities:WarbandAbilityRef[] = [
				...m.subproperties.map(s => {
					const remappedId = WarbandService.ABILITY_ID_REMAP[s.object_id] ?? s.object_id;
					return {
						'ability-name': this.gameData.resolve(remappedId).name,
						'ability-id': s.object_id,
						'ability-tags': s.tags,
					};
				}),
				...factionRules
					.filter(r => !modelSubpropIds.has(r.object_id))
					.map(r => {
						const remappedId = WarbandService.ABILITY_ID_REMAP[r.object_id] ?? r.object_id;
						return {
							'ability-name': this.gameData.resolve(remappedId).name,
							'ability-id': r.object_id,
							'ability-tags': r.tags,
						};
					}),
			];

			// Keywords: elite flag + any kw_* tags on the game-data model definition.
			const keywords = this.keywordsFromTcModel(m, def);

			// Stats from game-data model definition (not provided by the TC API).
			// The TC API gives only the model-type ID; movement distance and type
			// come entirely from game data. Reconstruct the canonical display string
			// '{n}"/Infantry' (or '/Flying' for models with eventtags.flying).
			const movDist = def ? def.movement[0] : null;
			const movType = def?.eventtags['flying'] ? 'Flying' : 'Infantry';
			const statMove = movDist != null ? `${movDist}"/${movType}` : '?';
			let statMelee = def ? def.melee.join('/') : '?';
			let statRanged = def ? def.ranged.join('/') : '?';

			// ── Bug 1 — Armour modifier from mandatory equipment ─────────────────
			// Most models have armour 0 in game data; the actual modifier comes from
			// the equipment they carry (Standard Armour = -1, Reinforced = -2, etc.).
			// Models in ARMOUR_INCLUDED_IN_PROFILE already have it baked in — skip
			// them to avoid double-counting.
			let armourBase:number | null = def ? (def.armour[0] ?? 0) : null;
			if (armourBase !== null && !WarbandService.ARMOUR_INCLUDED_IN_PROFILE.has(modelId)) {
				for (const eq of m.equipment) {
					if (!eq.equipment.tags['armour']) continue;
					const rawEqId = eq.equipment.equipment_id.object_id;
					const resolvedEqId = WarbandService.EQUIPMENT_ID_REMAP[rawEqId] ?? rawEqId;
					const eqEntry = this.gameData.resolve(resolvedEqId);
					if (eqEntry.type === 'Equipment') {
						const mod = (eqEntry as Equipment).eventtags?.['armour'];
						if (typeof mod === 'number') armourBase += mod;
					}
				}
			}
			const statArmour = armourBase !== null
				? (def && def.armour.length > 1 ? def.armour.join('/') : String(armourBase))
				: '?';

			// ── Bug 2 — Heretic Legionnaire upgrade: +1 to melee or ranged ───────
			// TC sends this as a subproperty with a selection indicating which stat
			// the player chose to upgrade. Mark modified stats with '*' so the card
			// can indicate the stat has been upgraded from the base profile.
			for (const sub of m.subproperties) {
				if (sub.object_id !== 'up_heretictrooper_hereticlegionnaire') continue;
				const sel = sub.selections?.[0]?.selection_ID;
				if (sel === 'up_heretictrooper_hereticlegionnaire_ranged' && statRanged !== '?') {
					const base = parseInt(statRanged, 10);
					statRanged = `${isNaN(base) ? statRanged : base + 1}*`;
				} else if (sel === 'up_heretictrooper_hereticlegionnaire_melee' && statMelee !== '?') {
					const base = parseInt(statMelee, 10);
					statMelee = `${isNaN(base) ? statMelee : base + 1}*`;
				}
			}

			return {
				'model-name': def?.name ?? m.model,
				'model-id': modelId,
				name: m.name,
				'stat-move': statMove,
				'stat-melee': statMelee,
				'stat-ranged': statRanged,
				'stat-armour': statArmour,
				cost: {ducats: entry.purchase?.cost_value ?? 0, glory: 0},
				equipment,
				abilities,
				upgrades: [],
				advancements: [],
				injuries: [],
				keywords,
			};
		});

		return {
			'warband-id': 0,
			'warband-url': '',
			'warband-name': data.name ?? 'Unknown Warband',
			'ducat-bank': data.ducat_bank ?? 0,
			'glory-bank': data.glory_bank ?? 0,
			'ducat-rating': 0,
			'glory-rating': 0,
			models,
		};
	}

	// Extract the human-readable variant name from a TC API warband object.
	// The TC exporter stores the faction/variant identity as a fc_*_fv_* subproperty
	// in faction_rules. Parse the fv_ suffix and look it up in FACTION_VARIANT_NAMES.
	private detectVariantName(data:TcApiWarbandData):string | undefined {
		const fcRule = (data.faction?.faction_rules ?? [])
			.find(r => r.object_id.startsWith('fc_'));
		if (!fcRule) return undefined;
		const match = fcRule.object_id.match(/_fv_(.+)$/);
		if (!match) return undefined;
		return WarbandService.FACTION_VARIANT_NAMES[`fv_${match[1]}`];
	}

	// Detect the TC internal format (inner warband_data object, already parsed).
	// models[0] has a `model` property that is itself an object with a `model`
	// string field (the model-type ID like "md_hereticpriest").
	private isTcInternalFormat(rec:Record<string, unknown>):boolean {
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
	private tagsToEquipType(tags:Record<string, boolean | string>):string {
		if (tags['armour']) return 'armour';
		if (tags['shield']) return 'shield';
		if (tags['grenade']) return 'grenade';
		if (tags['weapon']) return 'weapon';
		if (tags['trait']) return 'trait';
		return 'equipment';
	}

	// Extract keyword refs from the TC internal model object.
	// Uses the `elite` flag and any kw_* tags on the game-data model definition.
	private keywordsFromTcModel(
		m:TcApiModelData,
		def:Model | undefined,
	):WarbandKeywordRef[] {
		const keywords:WarbandKeywordRef[] = [];
		const seen = new Set<string>();

		if (m.elite) {
			keywords.push({'keyword-name': 'ELITE', 'keyword-id': 'kw_elite'});
			seen.add('kw_elite');
		}

		if (def) {
			for (const tag of def.tags) {
				// Submodule model tags use gl_* vals (e.g. gl_tough, gl_leader).
				// Convert to kw_* so resolveKeyword() can map back to the glossary entry.
				// Also support the kw_* format for forward compatibility.
				let kwId:string | undefined;
				if (tag.val?.startsWith('kw_')) kwId = tag.val;
				else if (tag.val?.startsWith('gl_')) kwId = `kw_${tag.val.slice(3)}`;

				if (kwId && !seen.has(kwId)) {
					keywords.push({
						'keyword-name': tag.tag_name.toUpperCase(),
						'keyword-id': kwId,
					});
					seen.add(kwId);
				}
			}
		}

		return keywords;
	}

	// ---------------------------------------------------------------------------
	// Equipment resolution
	// ---------------------------------------------------------------------------

	// ---------------------------------------------------------------------------
	// Equipment sort order: ranged → melee → everything else.
	// Within each group the original export order is preserved (stable sort).
	// ---------------------------------------------------------------------------

	private static equipSortKey(eq:EnrichedEquipment):number {
		if (!isUnresolvedFallback(eq.item)) {
			const cat = (eq.item as Equipment).category ?? '';
			if (cat === 'ranged') return 0;
			if (cat === 'melee') return 1;
			// grenade stays with other, shield/armour/field/equipment → 2
		}
		// Fallback for unresolved items: use range info derived during resolution
		if (eq.longRange !== null && eq.longRange !== 'Melee') return 0; // has distance = ranged
		if (eq.longRange === 'Melee') return 1;
		return 2;
	}

	private sortEquipment(items:EnrichedEquipment[]):EnrichedEquipment[] {
		// Stable sort — items at the same priority keep their original relative order.
		return items
			.map((item, i) => ({item, i}))
			.sort((a, b) => {
				const ka = WarbandService.equipSortKey(a.item);
				const kb = WarbandService.equipSortKey(b.item);
				return ka !== kb ? ka - kb : a.i - b.i;
			})
			.map(({item}) => item);
	}

	private resolveEquipment(ref:WarbandEquipmentRef):EnrichedEquipment {
		const rawId = ref['equipment-id'];
		const resolvedId = WarbandService.EQUIPMENT_ID_REMAP[rawId] ?? rawId;
		const entry = this.gameData.resolve(resolvedId, ref['equipment-name']);

		if (entry.type === 'Equipment') {
			const eq = entry as Equipment;
			const {shortRange, longRange} = this.parseRange(eq.range);
			const keywords:ResolvedKeyword[] = [
				...this.gameData.effectiveEquipmentTags(eq)
					.map(t => this.kwFromGlId(t.val, t.tag_name)),
				...(shortRange !== null
					? [WarbandService.SHORT_RANGE_KW, WarbandService.LONG_RANGE_KW]
					: []),
			];
			return {ref, item: eq, keywords, shortRange, longRange};
		}

		if (entry.type === 'Addon') {
			const addon = entry as Addon;
			const syntheticItem:Equipment = {
				id: addon.id,
				type: 'Equipment',
				source: addon.source,
				tags: addon.tags,
				category: this.includeToCategory(addon.eventtags?.['include']),
				name: addon.name,
				equip_type: null,
				range: null,
				blurb: '',
				modifiers: null,
				eventtags: addon.eventtags,
				description: addon.description,
			};
			return {ref, item: syntheticItem, keywords: this.keywordsFromAddon(addon), shortRange: null, longRange: null};
		}

		// Unresolved fallback
		return {ref, item: entry as UnresolvedFallback, keywords: [], shortRange: null, longRange: null};
	}

	// ---------------------------------------------------------------------------
	// Range parsing
	// ---------------------------------------------------------------------------

	private parseRange(rangeStr:string | null | undefined):{ shortRange:string | null; longRange:string | null } {
		if (!rangeStr) return {shortRange: null, longRange: null};
		const trimmed = rangeStr.trim();
		if (trimmed.toLowerCase() === 'melee') return {shortRange: null, longRange: 'Melee'};
		const numMatch = trimmed.match(/^(\d+)"/);
		if (numMatch) {
			const full = parseInt(numMatch[1], 10);
			const short = Math.floor(full / 2);
			return {
				shortRange: `${short}"`,
				longRange: /melee/i.test(trimmed) ? `${full}" / Melee` : `${full}"`,
			};
		}
		return {shortRange: null, longRange: trimmed};
	}

	// ---------------------------------------------------------------------------
	// Keyword resolution
	// ---------------------------------------------------------------------------

	private resolveKeyword(kwRef:WarbandKeywordRef):ResolvedKeyword {
		const rawId = kwRef['keyword-id'];
		const name = kwRef['keyword-name'];

		const negateMatch = rawId.match(/^kw_negate_kw_(.+)$/);
		if (negateMatch) {
			const baseGlId = `gl_${negateMatch[1]}`;
			const entry = this.gameData.resolve(baseGlId, name);
			const glossaryEntry = entry.type === 'Glossary'
				? entry as GameGlossaryEntry
				: entry as UnresolvedFallback;
			return {exportId: rawId, exportName: name, negated: true, glossaryEntry};
		}

		const glId = `gl_${rawId.slice(3)}`;
		const entry = this.gameData.resolve(glId, name);
		const glossaryEntry = entry.type === 'Glossary'
			? entry as GameGlossaryEntry
			: entry as UnresolvedFallback;
		return {exportId: rawId, exportName: name, negated: false, glossaryEntry};
	}

	private kwFromGlId(glId:string, label:string):ResolvedKeyword {
		const entry = this.gameData.resolve(glId);
		const glossaryEntry = entry.type === 'Glossary'
			? entry as GameGlossaryEntry
			: entry as UnresolvedFallback;
		return {exportId: glId, exportName: label.toUpperCase(), negated: false, glossaryEntry};
	}

	// ---------------------------------------------------------------------------
	// Ability resolution
	// ---------------------------------------------------------------------------

	private resolveAbility(ref:WarbandAbilityRef):EnrichedAbility {
		const id = ref['ability-id'];

		// ── Hunger Strain upgrades: up_strain_{name} → ab_{name} ──────────────
		// TC exporter sends strains as up_strain_* IDs rather than ab_* ability IDs.
		// Strip the prefix, look up the corresponding addon, and surface it as an
		// ability with a 'strain' badge so the model card can render it distinctly.
		if (id.startsWith('up_strain_')) {
			const abId = `ab_${id.slice('up_strain_'.length)}`;
			const strainEntry = this.gameData.resolve(abId);
			if (strainEntry.type === 'Addon') {
				const addon = strainEntry as Addon;
				const modifiedRef:WarbandAbilityRef = {...ref, 'ability-name': addon.name, 'ability-id': abId};
				return {ref: modifiedRef, source: 'addon', addon, variantRule: undefined,
					keywords: this.keywordsFromAddon(addon), isGameplayRule: true, badge: 'strain'};
			}
		}

		// ── Bare upgrade IDs without up_strain_ prefix ────────────────────────
		// e.g. up_unendingstarvation → ab_unendingstarvation
		const bareAbId = WarbandService.UPGRADE_ABILITY_REMAP[id];
		if (bareAbId) {
			const bareEntry = this.gameData.resolve(bareAbId);
			if (bareEntry.type === 'Addon') {
				const addon = bareEntry as Addon;
				const modifiedRef:WarbandAbilityRef = {...ref, 'ability-name': addon.name, 'ability-id': bareAbId};
				return {ref: modifiedRef, source: 'addon', addon, variantRule: undefined,
					keywords: this.keywordsFromAddon(addon), isGameplayRule: true, badge: 'strain'};
			}
		}

		// ── Plague Knight rank upgrades: up_plagueknightrank* → rl_* ──────────
		// TC exporter sends rank upgrades as up_plagueknightrank* IDs. Map to the
		// corresponding variant rule and surface with a 'rank' badge.
		const rankRlId = WarbandService.PLAGUE_KNIGHT_RANK_REMAP[id];
		if (rankRlId) {
			const rankEntry = this.gameData.resolve(rankRlId);
			if (rankEntry.type === 'VariantRule') {
				const variantRule = rankEntry as VariantRule;
				const modifiedRef:WarbandAbilityRef = {...ref, 'ability-name': variantRule.name, 'ability-id': rankRlId};
				return {ref: modifiedRef, source: 'variant-rule', addon: undefined, variantRule,
					keywords: this.keywordsFromVariantRule(variantRule), isGameplayRule: true, badge: 'rank'};
			}
		}

		// ── Ability ID aliases: TC exporter IDs that differ from canonical IDs ──
		const remappedAbId = WarbandService.ABILITY_ID_REMAP[id];
		const resolvedId = remappedAbId ?? id;

		const entry = this.gameData.resolve(resolvedId, ref['ability-name']);

		if (resolvedId.startsWith('rl_') || entry.type === 'VariantRule') {
			const variantRule = entry.type === 'VariantRule'
				? entry as VariantRule
				: entry as UnresolvedFallback;
			// isGameplayRule: if tags present, true only when bonus===true; otherwise default true (backward compat)
			const isGameplayRule = ref['ability-tags'] ? ref['ability-tags']['bonus'] === true : true;
			return {
				ref,
				source: 'variant-rule',
				addon: undefined,
				variantRule,
				keywords: entry.type === 'VariantRule'
					? this.keywordsFromVariantRule(entry as VariantRule)
					: [],
				isGameplayRule,
			};
		}

		if (entry.type === 'Addon') {
			const addon = entry as Addon;
			return {ref, source: 'addon', addon, variantRule: undefined, keywords: this.keywordsFromAddon(addon), isGameplayRule: true};
		}

		// Unresolved — surface as an addon-shaped fallback
		return {ref, source: 'addon', addon: entry as UnresolvedFallback, variantRule: undefined, keywords: [], isGameplayRule: true};
	}

	private keywordsFromAddon(addon:Addon):ResolvedKeyword[] {
		return this.keywordsFromDescriptionBlocks(addon.description);
	}

	private keywordsFromVariantRule(rule:VariantRule):ResolvedKeyword[] {
		return this.keywordsFromDescriptionBlocks(rule.description);
	}

	private keywordsFromDescriptionBlocks(blocks:DescriptionBlock[]):ResolvedKeyword[] {
		const seen = new Map<string, ResolvedKeyword>();
		const visit = (block:DescriptionBlock) => {
			for (const ref of block.glossary ?? []) {
				if (seen.has(ref.id)) continue;
				const entry = this.gameData.resolve(ref.id);
				const glossaryEntry = entry.type === 'Glossary'
					? entry as GameGlossaryEntry
					: entry as UnresolvedFallback;
				seen.set(ref.id, {
					exportId: ref.id,
					exportName: entry.name.toUpperCase(),
					negated: false,
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

	private isWeaponAddon(addon:Addon):boolean {
		const include = addon.eventtags?.['include'];
		return (
			Array.isArray(include) &&
			include.some((c:unknown) => typeof c === 'string' && c.startsWith('category_'))
		);
	}

	private includeToCategory(include:unknown):string {
		if (!Array.isArray(include)) return 'weapon';
		const cat = (include as string[]).find(c => c.startsWith('category_'));
		return cat ? cat.replace('category_', '') : 'weapon';
	}

	private weaponAddonToEquipment(addon:Addon):EnrichedEquipment {
		const category = this.includeToCategory(addon.eventtags?.['include']);
		const syntheticItem:Equipment = {
			id: addon.id,
			type: 'Equipment',
			source: addon.source,
			tags: addon.tags,
			category,
			name: addon.name,
			equip_type: null,
			range: null,
			blurb: '',
			modifiers: null,
			eventtags: addon.eventtags,
			description: addon.description,
		};
		const syntheticRef:WarbandEquipmentRef = {
			'equipment-name': addon.name,
			'equipment-id': addon.id,
			'equipment-type': category,
		};
		return {ref: syntheticRef, item: syntheticItem, keywords: this.keywordsFromAddon(addon), shortRange: null, longRange: null};
	}

	// ---------------------------------------------------------------------------
	// Merge / dedup helpers
	// ---------------------------------------------------------------------------

	private mergeKeywords(keywords:ResolvedKeyword[]):ResolvedKeyword[] {
		const seen = new Map<string, ResolvedKeyword>();
		for (const kw of keywords) seen.set(kw.exportId, kw);
		return [...seen.values()].sort((a, b) => a.exportName.localeCompare(b.exportName));
	}
}
