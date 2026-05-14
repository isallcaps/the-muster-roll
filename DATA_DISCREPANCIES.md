# Data Discrepancies

Gaps found between the Trench Crusade print view and the game data.
Sourced against the official v1.0.2 rulebook PDFs.

This project uses a maintained fork of the upstream data repository:
https://github.com/isallcaps/trenchcrusadedata

Fixes confirmed against the rulebook are applied directly to the fork.
Entries in this file are gaps not yet fixed in the fork, or discrepancies
that require upstream attention at the original repository:
https://github.com/Bob-The-Seagull-King/trenchcrusadedata

---

## Equipment ID Mismatches

IDs present in Trench Companion exports that do not match any current entry in
`data/player/equipment.json`. These are handled locally in `WarbandService.EQUIPMENT_ID_REMAP`
as a workaround, but the root cause (exporter lag or data rename without a redirect) should
be fixed upstream.

| Export ID | Correct / Current ID | Status | Notes |
|-----------|----------------------|--------|-------|
| `eq_silenecedpistol` | `eq_silencedpistol` | Worked around locally | Typo in the TC exporter |
| `eq_artillerywitchinfernalbomb` | `ab_infernalbomb` | Worked around locally | Export uses a fabricated `eq_` ID; real entry lives in `addons.json` as an addon with `eventtags.include: ['category_ranged']` |
| `eq_sacrificialknife` | `eq_sacrificialblade` | Worked around locally | Data file renamed the entry; exporter not updated |
| `eq_greatswordaxe` | `eq_greataxe` | Worked around locally | Data file renamed the entry; exporter not updated |
| `eq_knifedagger` | `eq_trenchknife` | Worked around locally | Data file renamed the entry; exporter not updated |

---

## Model ID Mismatches

Model type IDs present in Trench Companion exports that do not match any entry in
`data/player/models.json`. Handled locally in `WarbandService.MODEL_ID_REMAP`. Without
the remap, all four stat values (MOV/MEL/RNG/ARM) render as `?` on the model card.

| Export ID | Correct / Current ID | Status | Notes |
|-----------|----------------------|--------|-------|
| `md_annointedheavyinfantry` | `md_anointedheavyinfantry` | Worked around locally | Typo in the TC exporter — double 'n' in "annointed" |
| `md_deathcommando` | `md_hereticdeathcommando` | Worked around locally | TC exporter omits the 'heretic' prefix used in the data file |

---

## Missing Glossary Entries

Keyword IDs referenced by equipment tags or model keyword lists that have no
corresponding entry in `data/references/glossary.json`. These keywords appear in
bold on the card but no definition text is shown.

| Keyword ID | Keyword Name | Found In |
|------------|--------------|----------|
| `gl_bayonetlug` | BAYONET LUG | Equipment tags (Bayonet) |
| `gl_shieldcombo` | SHIELD COMBO | Equipment tags (Trench Shield) |
| `gl_pistol` | PISTOL | Equipment tags (pistols) |
| `gl_deadly` | DEADLY | Equipment tags |
| `gl_reload` | RELOAD | Equipment tags (heavy weapons) |
| `gl_scatter` | SCATTER | Equipment tags (blast weapons) |
| `gl_blast3` | BLAST 3" | Equipment tags (grenades, infernal bomb) |
| `gl_flamethrower` | FLAMETHROWER | Equipment tags (Flamethrower) |
| `gl_automatic2` | AUTOMATIC 2 | Equipment tags (SMGs) |
| `gl_injurymodifier-1` | INJURY MODIFIER -1 | Equipment tags |
| `gl_injurymodifier-2` | INJURY MODIFIER -2 | Equipment tags |
| `gl_injurymodifier2` | INJURY MODIFIER +2 | Equipment tags |
| `gl_injurydice-1` | INJURY DICE -1 | Equipment tags |
| `gl_injurydice1` | INJURY DICE +1 | Equipment tags |
| `gl_ignoremodifiercover` | IGNORE MODIFIER (COVER) | Equipment tags |
| `gl_ignoremodifierlong_range` | IGNORE MODIFIER (LONG RANGE) | Equipment tags |
| `gl_ignoremodifierelevated_position` | IGNORE MODIFIER (ELEVATED POSITION) | Equipment tags |
| `gl_ignorearmour` | IGNORE ARMOUR | Equipment tags |
| `gl_ignoremodifierarmour` | IGNORE MODIFIER (ARMOUR) | Equipment tags |
| `gl_minusdice1` | MINUS DICE 1 | Equipment tags (variant of `gl_minusdice`) |

---

## Missing Equipment Definitions

Equipment IDs that appear in warband exports but have no entry anywhere in the
game data files (not in `equipment.json` and not in `addons.json`). These items
render with name only — no range, modifiers, blurb, or description.

| Equipment ID | Display Name | Affected Warband / Notes |
|--------------|--------------|--------------------------|
| *(none currently — all known mismatches handled via ID remap)* | | |

---

## Missing Ability Definitions

Ability IDs from warband exports that resolve to `source: 'unknown'` — not found
in `addons.json` and not matchable as a variant rule slug.

| Ability ID | Display Name | Affected Warband / Notes |
|------------|--------------|--------------------------|
| `ab_abioticlife` | Abiotic Life | Eris (The Wrecking Crew v2) |
| `ab_artillerywitchbattery` | Artillery Witch Battery | Eris (The Wrecking Crew v2) |
| `ab_hereticlegionnaire` | Heretic Legionnaire | Rum (The Wrecking Crew v2) |

| *(populate from live Validation Report in the dev toolbar)* | | |

---

## Migrated to Fork

Entries that were patched locally in `rulebook-override.json` and have since been
committed to the [isallcaps/trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata)
fork. The override file is now empty — these IDs are resolved by the submodule directly.

### Commit: `dfab215` — fix: add missing glossary entries, abilities and variant rules from rulebook v1.0.2

**Glossary (41 entries):** `gl_minusdice1`, `gl_injurydice`, `gl_injurydice1`, `gl_injurydice-1`,
`gl_injurymodifier`, `gl_injurymodifier2`, `gl_injurymodifier-1`, `gl_injurymodifier-2`,
`gl_ammunition`, `gl_armourpiercing`, `gl_automatic`, `gl_bayonetlug`, `gl_blast3`,
`gl_blessed`, `gl_block`, `gl_cleavex`, `gl_cover`, `gl_deadly`, `gl_flamethrower`,
`gl_flying`, `gl_held`, `gl_ignorearmour`, `gl_ignoremodifier`, `gl_ignoremodifiercover`,
`gl_ignoremodifierlong_range`, `gl_ignoremodifierelevated_position`, `gl_ignoremodifierarmour`,
`gl_impervious`, `gl_mined`, `gl_negate`, `gl_negate_kw_fire`, `gl_negate_kw_gas`,
`gl_negate_kw_fear`, `gl_negate_kw_heavy`, `gl_negate_kw_shrapnel`, `gl_pistol`,
`gl_reload`, `gl_regenerate`, `gl_scatter`, `gl_shotgun`, `gl_shieldcombo`

**Abilities (3 entries):** `ab_abioticlife` (Abiotic Life), `ab_artillerywitchbattery` (Artillery Witch Battery),
`ab_hereticlegionnaire` (Heretic Legionnaires)

**Variant Rules (3 entries, added to `fv_navalraidingparty`):** `rl_closeassaultweapons` (Close Assault Weapons),
`rl_letsleepingdogslie` (Let Sleeping Dogs Lie), `rl_lighttroops` (Light Troops)
