import {Injectable, inject, isDevMode, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin, of} from 'rxjs';
import {tap, catchError} from 'rxjs/operators';
import {EMPTY} from 'rxjs';
import type {
	AnyDataEntry,
	Equipment,
	Model,
	Addon,
	Skill,
	GameGlossaryEntry,
	Tag,
	Variant,
	VariantRule,
	UnresolvedFallback,
} from '../models/game-data.interfaces';

const BASE = 'assets/game-data/data/data';

// ---------------------------------------------------------------------------
// Modifier-string → glossary ID mapping.
// Keys are the uppercase form of modifier strings as they appear in the data.
// Used when an equipment entry has no gl_* tags — the modifiers array is
// parsed and each string is looked up here (case-insensitively).
// ---------------------------------------------------------------------------

const MODIFIER_TO_GLOSSARY_ID:Record<string, string> = {
	'ASSAULT': 'gl_assault',
	'AUTOMATIC 2': 'gl_automatic',
	'AUTOMATIC 5': 'gl_automatic',
	'BAYONET LUG': 'gl_bayonetlug',
	'BLAST 3"': 'gl_blast3',
	'BLOCK': 'gl_block',
	'CLEAVE 2': 'gl_cleavex',
	'CONSUMABLE': 'gl_consumable',
	'COVER': 'gl_cover',
	'CRITICAL': 'gl_critical',
	'CUMBERSOME': 'gl_cumbersome',
	'DEADLY': 'gl_deadly',
	'DEPLOYABLE': 'gl_deployable',
	'FIRE': 'gl_fire',
	'FLAMETHROWER': 'gl_flamethrower',
	'GAS': 'gl_gas',
	'GRENADE': 'gl_grenade',
	'HEAVY': 'gl_heavy',
	'IGNORE ARMOUR': 'gl_ignorearmour',
	'IGNORES ARMOUR': 'gl_ignorearmour',
	'IGNORE COVER': 'gl_ignoremodifiercover',
	'IGNORES COVER': 'gl_ignoremodifiercover',
	'IGNORE ELEVATED POSITION': 'gl_ignoremodifierelevated_position',
	'IGNORE LONG RANGE': 'gl_ignoremodifierlong_range',
	'IMPERVIOUS': 'gl_impervious',
	'INFECTION MARKERS': 'gl_infectionmarkers',
	'NEGATE FEAR': 'gl_negate_kw_fear',
	'NEGATE FIRE': 'gl_negate_kw_fire',
	'NEGATE GAS': 'gl_negate_kw_gas',
	'NEGATE HEAVY': 'gl_negate_kw_heavy',
	'NEGATE MINED': 'gl_negate_kw_mined',
	'NEGATE SHRAPNEL': 'gl_negate_kw_shrapnel',
	'PISTOL': 'gl_pistol',
	'RELOAD': 'gl_reload',
	'RISKY': 'gl_riskyaction',
	'SCATTER': 'gl_scatter',
	'SHIELD COMBO': 'gl_shieldcombo',
	'SHRAPNEL': 'gl_shrapnel',
	'SHOTGUN': 'gl_shotgun',
	'SKIRMISHER': 'gl_skirmisher',
	'STRONG': 'gl_strong',
	'-1 INJURY DICE': 'gl_injurydice-1',
	'+1 INJURY DICE': 'gl_injurydice1',
	'-1 INJURY MODIFIER': 'gl_injurymodifier-1',
	'-2 INJURY MODIFIER': 'gl_injurymodifier-2',
	'-3 INJURY MODIFIER': 'gl_injurymodifier-3',
	'+2 INJURY MODIFIER': 'gl_injurymodifier2',
	'-1 DICE': 'gl_minusdice1',
	'+1 DICE': 'gl_plusdice',
};

// ---------------------------------------------------------------------------
// Per-equipment keyword overrides — for keywords that are genuinely absent
// from both the tags array and the modifiers array in the data.
// These are MERGED with (not replacing) whatever the data provides.
// ---------------------------------------------------------------------------

const WEAPON_KEYWORD_OVERRIDES:Record<string, string[]> = {
	'eq_heavyflamethrower': ['gl_injurydice-1', 'gl_automatic', 'gl_fire', 'gl_flamethrower', 'gl_heavy', 'gl_ignorearmour'],
	'eq_greatswordaxe': ['gl_injurydice1', 'gl_critical', 'gl_heavy'],
	'eq_greataxe': ['gl_injurydice1', 'gl_critical', 'gl_heavy'],
	'eq_sacrificialblade': ['gl_injurymodifier2', 'gl_riskyaction'],
	'eq_sacrificialknife': ['gl_injurymodifier2', 'gl_riskyaction'],
	'eq_reinforcedarmour': ['gl_injurymodifier-2'],
	'eq_gasgrenades': ['gl_ignoremodifiercover', 'gl_ignoremodifierlong_range', 'gl_ignorearmour'],
	'eq_silencedpistol': ['gl_assault', 'gl_pistol'],
	'eq_silenecedpistol': ['gl_assault', 'gl_pistol'],
	'eq_submachinegun': ['gl_assault', 'gl_bayonetlug', 'gl_shieldcombo'],
	'eq_swordaxe': ['gl_critical'],
	'eq_trenchshield': ['gl_injurymodifier-1'],
	'eq_infernalbrandmark': ['gl_negate_kw_fire'],
	'eq_bayonet': ['gl_cumbersome', 'gl_shieldcombo'],
	'eq_trenchknife': ['gl_minusdice1'],
	'eq_knifedagger': ['gl_minusdice1'],
	'eq_standardarmour': ['gl_injurymodifier-1'],
	'eq_combathelmet': ['gl_negate_kw_shrapnel'],
	'eq_gasmask': ['gl_negate_kw_gas'],
	'eq_fraggrenades': ['gl_blast3', 'gl_grenade', 'gl_scatter', 'gl_shrapnel'],
	'eq_engineerbodyarmour': ['gl_injurymodifier-2', 'gl_negate_kw_shrapnel'],
	'eq_heavyballisticshield': ['gl_cover'],
	'eq_machinearmour': ['gl_injurymodifier-3'],
	'eq_iconshield': ['gl_injurymodifier-1', 'gl_impervious'],
	'eq_ironcapirotecombathelmet': ['gl_negate_kw_fear', 'gl_negate_kw_shrapnel'],
	'eq_puntgun': ['gl_plusdice', 'gl_injurydice1', 'gl_heavy', 'gl_shotgun', 'gl_shrapnel'],
	'eq_chainmaw': ['gl_plusdice', 'gl_injurydice1', 'gl_ignorearmour', 'gl_riskyaction'],
	'eq_shreddingclaws': ['gl_injurydice1', 'gl_cumbersome', 'gl_riskyaction'],
	'eq_warwolfchainmaw': ['gl_plusdice', 'gl_injurydice1', 'gl_ignorearmour', 'gl_riskyaction'],
	'eq_warwolfshreddingclaws': ['gl_injurydice1', 'gl_cumbersome', 'gl_riskyaction'],
	'eq_pistol': ['gl_pistol'],
};


interface RulebookOverride {
	version:string;
	source:string;
	lastUpdated:string;
	glossary:Record<string, GameGlossaryEntry>;
	equipment:Record<string, Equipment>;
	abilities:Record<string, Addon>;
	variantRules:Record<string, VariantRule>;
	models?:Record<string, Model>;
}

@Injectable({providedIn: 'root'})
export class GameDataService {
	private http = inject(HttpClient);

	private equipmentMap = new Map<string, Equipment>();
	private modelMap = new Map<string, Model>();
	private addonMap = new Map<string, Addon>();
	private skillMap = new Map<string, Skill>();
	private glossaryMap = new Map<string, GameGlossaryEntry>();
	private variantRuleMap = new Map<string, VariantRule>();
	private overrideIds = new Set<string>();

	/**
	 * Secondary lookup: normalised display name → entry.
	 * Populated after every data load, covering equipment, addons, glossary,
	 * and variant rules. Used as a fallback when an exact ID lookup misses.
	 * Models and skills are excluded — the fallback only applies to top-level
	 * entity types that appear in warband exports with a human-readable name.
	 */
	private nameToEntryMap = new Map<string, AnyDataEntry>();

	/** Deduplicated set of IDs that could not be found in any data map. */
	readonly unresolvedIds = signal<Set<string>>(new Set());

	/** Full sorted lists for each data type — populated once after load. */
	readonly equipmentList = signal<Equipment[]>([]);
	readonly modelList = signal<Model[]>([]);
	readonly addonList = signal<Addon[]>([]);
	readonly skillList = signal<Skill[]>([]);
	readonly glossaryList = signal<GameGlossaryEntry[]>([]);
	readonly variantRuleList = signal<VariantRule[]>([]);

	private loadState:false | true | 'error' = false;

	load():void {
		if (this.loadState === true) return;

		forkJoin({
			equipment: this.http.get<Equipment[]>(`${BASE}/player/equipment.json`),
			models: this.http.get<Model[]>(`${BASE}/player/models.json`),
			addons: this.http.get<Addon[]>(`${BASE}/player/addons.json`),
			skills: this.http.get<Skill[]>(`${BASE}/general/skills.json`),
			glossary: this.http.get<GameGlossaryEntry[]>(`${BASE}/references/glossary.json`),
			variants: this.http.get<Variant[]>(`${BASE}/player/variants.json`),
			override: this.http.get<RulebookOverride>('assets/rulebook-override.json').pipe(
				catchError(() => of({} as RulebookOverride)),
			),
		}).pipe(
			tap(({equipment, models, addons, skills, glossary, variants, override}) => {
				equipment.forEach(e => {
					try {
						this.equipmentMap.set(e.id, e);
					} catch (err) {
						console.warn(`[GameDataService] skipping equipment entry ${e?.id}:`, err);
					}
				});
				models.forEach(m => {
					try {
						this.modelMap.set(m.id, m);
					} catch (err) {
						console.warn(`[GameDataService] skipping model entry ${m?.id}:`, err);
					}
				});
				addons.forEach(a => {
					try {
						this.addonMap.set(a.id, a);
					} catch (err) {
						console.warn(`[GameDataService] skipping addon entry ${a?.id}:`, err);
					}
				});
				skills.forEach(s => {
					try {
						this.skillMap.set(s.id, s);
					} catch (err) {
						console.warn(`[GameDataService] skipping skill entry ${s?.id}:`, err);
					}
				});
				glossary.forEach(g => {
					try {
						this.glossaryMap.set(g.id, g);
					} catch (err) {
						console.warn(`[GameDataService] skipping glossary entry ${g?.id}:`, err);
					}
				});
				variants.forEach(v => {
					try {
						this.indexVariantRules(v);
					} catch (err) {
						console.warn(`[GameDataService] skipping variant ${v?.id}:`, err);
					}
				});

				// Apply rulebook overrides — take precedence over submodule data
				let ovGlossary = 0, ovEquipment = 0, ovAbilities = 0, ovVariantRules = 0;
				for (const [id, entry] of Object.entries(override?.glossary ?? {})) {
					this.glossaryMap.set(id, {...entry, id, source: 'rulebook-override'});
					this.overrideIds.add(id);
					ovGlossary++;
				}
				for (const [id, entry] of Object.entries(override?.equipment ?? {})) {
					this.equipmentMap.set(id, {...entry, id, source: 'rulebook-override'});
					this.overrideIds.add(id);
					ovEquipment++;
				}
				for (const [id, entry] of Object.entries(override?.abilities ?? {})) {
					this.addonMap.set(id, {...entry, id, source: 'rulebook-override'});
					this.overrideIds.add(id);
					ovAbilities++;
				}
				for (const [id, entry] of Object.entries(override?.variantRules ?? {})) {
					this.variantRuleMap.set(id, {...entry, id});
					this.overrideIds.add(id);
					ovVariantRules++;
				}
				let ovModels = 0;
				for (const [id, entry] of Object.entries(override?.models ?? {})) {
					this.modelMap.set(id, {...entry, id, source: 'rulebook-override'} as Model);
					this.overrideIds.add(id);
					ovModels++;
				}

				const byName = (a:{ name:string }, b:{ name:string }) =>
					a.name.localeCompare(b.name);

				this.equipmentList.set([...this.equipmentMap.values()].sort(byName));
				this.modelList.set([...this.modelMap.values()].sort(byName));
				this.addonList.set([...this.addonMap.values()].sort(byName));
				this.skillList.set([...this.skillMap.values()].sort(byName));
				this.glossaryList.set([...this.glossaryMap.values()].sort(byName));
				this.variantRuleList.set([...this.variantRuleMap.values()].sort(byName));

				// Build secondary name→entry map for display-name fallback lookups.
				// Later entries win on collision (override data loads last, so it
				// correctly shadows base data with the same display name).
				this.nameToEntryMap.clear();
				const addToNameMap = (e:AnyDataEntry) => {
					if (e.name) this.nameToEntryMap.set(this.normalizeName(e.name), e);
				};
				this.equipmentMap.forEach(addToNameMap);
				this.addonMap.forEach(addToNameMap);
				this.glossaryMap.forEach(addToNameMap);
				this.variantRuleMap.forEach(addToNameMap);
				// Only add override-defined models to avoid polluting the name map
				// with all 200+ base game models (risk of name collisions).
				for (const id of this.overrideIds) {
					const m = this.modelMap.get(id);
					if (m) addToNameMap(m);
				}

				this.loadState = true;
				console.log(
					`[GameDataService] loaded — equipment:${this.equipmentMap.size}` +
					` models:${this.modelMap.size}` +
					` addons:${this.addonMap.size}` +
					` glossary:${this.glossaryMap.size}`,
				);
				console.log(
					`[MusterRoll] Rulebook overrides applied: ${ovGlossary} glossary,` +
					` ${ovAbilities} abilities, ${ovEquipment} equipment, ${ovVariantRules} variant rules, ${ovModels} models`,
				);
				if (isDevMode()) {
					this.auditEquipmentTags();
				}
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

	/**
	 * Universal resolver. Never returns null/undefined.
	 *
	 * Lookup order:
	 *   1. Exact ID match across all primary maps.
	 *   2. If `displayName` is provided and the ID misses, try a normalised
	 *      name match in the secondary nameToEntryMap. Logs in dev mode.
	 *   3. Last resort: UnresolvedFallback (tracked in unresolvedIds signal).
	 *
	 * Pass `displayName` only for top-level entity lookups (abilities, glossary
	 * keywords, equipment, variant rules). Do NOT pass it for internal gl_* ID
	 * lookups — those are always exact-match-only.
	 */
	resolve(id:string, displayName?:string):AnyDataEntry {
		// 1. Primary — exact ID
		const e = this.equipmentMap.get(id);
		if (e) return e;
		const a = this.addonMap.get(id);
		if (a) return a;
		const g = this.glossaryMap.get(id);
		if (g) return g;
		const v = this.variantRuleMap.get(id);
		if (v) return v;
		const m = this.modelMap.get(id);
		if (m) return m;
		const s = this.skillMap.get(id);
		if (s) return s;

		// 2. Name-based fallback
		if (displayName) {
			const byName = this.nameToEntryMap.get(this.normalizeName(displayName));
			if (byName) {
				if (isDevMode()) {
					console.log(`[MusterRoll] ID '${id}' not found — resolved via name match '${displayName}'`);
				}
				return byName;
			}
		}

		// 3. Last resort
		this.recordUnresolved(id);
		return this.makeFallback(id);
	}

	// ---------------------------------------------------------------------------
	// Side-effect-free existence check — no signal reads or writes.
	// Use this anywhere a pure boolean lookup is needed during view rendering.
	// ---------------------------------------------------------------------------

	exists(id:string):boolean {
		if (!id) return false;
		return this.equipmentMap.has(id) || this.addonMap.has(id) ||
			this.glossaryMap.has(id) || this.variantRuleMap.has(id) ||
			this.modelMap.has(id) || this.skillMap.has(id);
	}

	isOverride(id:string):boolean {
		return this.overrideIds.has(id);
	}

	// ---------------------------------------------------------------------------
	// Typed convenience accessors — each calls resolve() so all misses are logged.
	// ---------------------------------------------------------------------------

	getEquipment(id:string):Equipment | undefined {
		const e = this.resolve(id);
		return e.type === 'Equipment' ? e as Equipment : undefined;
	}

	getModel(id:string, displayName?:string):Model | undefined {
		const e = this.resolve(id, displayName);
		return e.type === 'Model' ? e as Model : undefined;
	}

	getAddon(id:string):Addon | undefined {
		const e = this.resolve(id);
		return e.type === 'Addon' ? e as Addon : undefined;
	}

	getSkill(id:string):Skill | undefined {
		const e = this.resolve(id);
		return e.type === 'Skill' ? e as Skill : undefined;
	}

	getGlossaryEntry(id:string):GameGlossaryEntry | undefined {
		const e = this.resolve(id);
		return e.type === 'Glossary' ? e as GameGlossaryEntry : undefined;
	}

	getVariantRule(id:string):VariantRule | undefined {
		const e = this.resolve(id);
		return e.type === 'VariantRule' ? e as VariantRule : undefined;
	}

	// ---------------------------------------------------------------------------
	// Effective keyword tags for an equipment entry.
	//
	// Resolution order:
	//   1. gl_* tags already present in eq.tags (from the data file).
	//   2. If none, synthesise from eq.modifiers via MODIFIER_TO_GLOSSARY_ID.
	//      Unmapped modifier strings are logged in dev mode.
	//   3. WEAPON_KEYWORD_OVERRIDES are merged on top of whatever steps 1/2 found.
	//
	// Returns a deduplicated Tag[] where every val is a gl_* glossary ID.
	// ---------------------------------------------------------------------------

	effectiveEquipmentTags(eq:Equipment):Tag[] {
		const seen = new Set<string>();
		const result:Tag[] = [];

		const add = (glId:string, label:string) => {
			if (seen.has(glId)) return;
			seen.add(glId);
			result.push({val: glId, tag_name: label});
		};

		// 1. gl_* tags from data file
		for (const t of eq.tags) {
			if (t.val?.startsWith('gl_')) add(t.val, t.tag_name);
		}

		// 2. If data has no gl_* tags, synthesise from modifier strings
		if (result.length === 0 && eq.modifiers?.length) {
			for (const mod of eq.modifiers) {
				const glId = MODIFIER_TO_GLOSSARY_ID[mod.toUpperCase()];
				if (glId) {
					add(glId, mod);
				}
				else if (isDevMode()) {
					console.warn(`[MusterRoll] Unmapped modifier: '${mod}' on equipment '${eq.id}'`);
				}
			}
		}

		// 3. Merge per-equipment overrides (always, not conditional on steps 1/2)
		for (const glId of WEAPON_KEYWORD_OVERRIDES[eq.id] ?? []) {
			const label = this.glossaryMap.get(glId)?.name ?? glId;
			add(glId, label);
		}

		return result;
	}

	// ---------------------------------------------------------------------------
	// Fallback factory — public so WarbandService can use it for edge cases.
	// ---------------------------------------------------------------------------

	makeFallback(id:string):UnresolvedFallback {
		return {
			id,
			name: this.formatIdAsName(id),
			source: 'unknown',
			type: 'Unknown',
			description: [],
			tags: [],
			unresolved: true,
		};
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	/**
	 * Normalise a display name for secondary lookup.
	 * Strips everything that isn't a lowercase letter or digit.
	 * Examples: 'Chain Maw' → 'chainmaw', 'Assault Beast' → 'assaultbeast'
	 */
	private normalizeName(name:string):string {
		return name.toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	private recordUnresolved(id:string):void {
		if (this.unresolvedIds().has(id)) return;
		this.unresolvedIds.update(prev => new Set([...prev, id]));
		if (isDevMode()) {
			console.warn(`[MusterRoll] Unresolved ID: ${id} — add to DATA_DISCREPANCIES.md`);
		}
	}

	private formatIdAsName(id:string):string {
		const body = id.replace(/^[a-z]+_/, '');
		const words = body.split('_').filter(Boolean);
		if (words.length === 0) return id;
		return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	}

	// ---------------------------------------------------------------------------
	// Variant rule indexing
	// ---------------------------------------------------------------------------

	private indexVariantRules(variant:Variant):void {
		for (const ruleBlock of variant.rules) {
			for (const block of ruleBlock.description) {
				const isEffect = block.tags.some(t => t.val === 'effect');
				if (isEffect && block.content.endsWith(':')) {
					const id = this.titleToRlId(block.content);
					const title = block.content.replace(/:$/, '').trim();
					this.variantRuleMap.set(id, {
						id,
						type: 'VariantRule',
						name: title,
						title,
						variantId: variant.id,
						variantName: variant.name,
						description: block.subcontent ?? [],
					});
				}
			}
		}
	}

	private titleToRlId(title:string):string {
		return 'rl_' + title.toLowerCase().replace(/[^a-z]/g, '');
	}

	// ---------------------------------------------------------------------------
	// Dev-only: equipment tag audit — runs once at startup
	// Logs every equipment entry whose tags don't resolve to a glossary entry,
	// and every entry with no tags at all when similar weapons have them.
	// ---------------------------------------------------------------------------

	private auditEquipmentTags():void {
		const fails:string[] = [];
		const unmapped:string[] = [];
		const noKeywords:string[] = [];
		let pass = 0;

		for (const eq of this.equipmentMap.values()) {
			// Collect unmapped modifier strings for this entry before resolving effective tags
			if ((!eq.tags || eq.tags.length === 0) && eq.modifiers?.length) {
				for (const mod of eq.modifiers) {
					if (!MODIFIER_TO_GLOSSARY_ID[mod.toUpperCase()]) {
						unmapped.push(`'${mod}' on ${eq.name} (${eq.id})`);
					}
				}
			}

			const effectiveTags = this.effectiveEquipmentTags(eq);

			if (effectiveTags.length === 0) {
				noKeywords.push(eq.name);
				continue;
			}

			let itemFail = false;
			for (const tag of effectiveTags) {
				if (!this.glossaryMap.has(tag.val)) {
					fails.push(`${eq.name} — tag ${tag.val} not in glossary`);
					itemFail = true;
				}
			}
			if (!itemFail) pass++;
		}

		const total = this.equipmentMap.size;
		console.log(
			`[MusterRoll] Equipment audit — ${total} entries:` +
			` ${pass} PASS, ${fails.length} FAIL, ${noKeywords.length} no-keywords`,
		);
		if (fails.length) console.warn('[MusterRoll] Equipment tag FAILs:\n  ' + fails.join('\n  '));
		if (unmapped.length) console.warn('[MusterRoll] Unmapped modifier strings:\n  ' + unmapped.join('\n  '));
		if (noKeywords.length) console.info('[MusterRoll] Equipment with no keywords (expected for misc/armour/shield):\n  ' + noKeywords.join(', '));
	}
}
