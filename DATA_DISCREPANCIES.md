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
corresponding entry in `data/references/glossary.json`. All entries from the
original list have been added to the fork. The remaining gap is:

| Keyword ID | Keyword Name | Status | Notes |
|------------|--------------|--------|-------|
| `gl_automatic2` | AUTOMATIC 2 | Fork uses `gl_automatic` | Weapons tagged "Automatic 2" link to the generic AUTOMATIC (X) entry; a distinct `gl_automatic2` entry is not needed |

---

## Equipment Modifier to Keyword Gaps

Several equipment entries have free-text `modifiers` values with no direct `gl_*`
keyword mapping. These are shown on the card as plain text and do not link to
glossary definitions. A fork PR should convert them to tagged glossary links.

| Modifier String | Equipment | Notes |
|-----------------|-----------|-------|
| `+1D to Hit` | Shotgun, Heavy Shotgun, Automatic Shotgun, Punt Gun, Sniper Rifle, Gun Turret | Generic +DICE; ambiguous tag target |
| `-1D to Hit` | Knife/Dagger, Unarmed | Generic −DICE; ambiguous tag target |
| `-1D to Hit for Chargers` | Polearm, Lochaber Axe | Situational modifier, no direct keyword |
| `-1D to Hit/Injuries` | Unarmed | Combined modifier, no direct keyword |
| `+1D to Hit in Cover` | Silenced Pistol | Situational, inverse of IGNORE COVER |
| `+2D to Hit` | Viscera Cannon | Would need `gl_plusdice2` (not yet in glossary) |
| `+1 to Injury` | Two-Handed Hammer | Would need `gl_injurymodifier1` |
| `1 Attack` | Mortar | May indicate RELOAD; verify against rulebook |
| `3D6 Injury Roll` | Malebranche Sword | Close to DEADLY but not identical |
| `Double Blood Marker` | Demonic Aura Grenade | No keyword; describe in rule text |
| `Ignore Shield` | Shotel | No glossary entry; describe in rule text |
| `Special` | Tormentor Chain | No keyword; rule text covers this |
| `or` | Bow Of Lethe | Noise word in multi-option modifier array |

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
in `addons.json` and not matchable as a variant rule slug. All originally listed
entries have been added to the fork. New entries appear in the live Validation
Report in the dev toolbar.

| Ability ID | Display Name | Affected Warband / Notes |
|------------|--------------|--------------------------|
| *(populate from live Validation Report in the dev toolbar)* | | |

---

## Migrated to Fork

### Commit `dfab215` — fix: add missing glossary entries, abilities and variant rules from rulebook v1.0.2

**Glossary (41):** `gl_minusdice1`, `gl_injurydice`, `gl_injurydice1`, `gl_injurydice-1`,
`gl_injurymodifier`, `gl_injurymodifier2`, `gl_injurymodifier-1`, `gl_injurymodifier-2`,
`gl_ammunition`, `gl_armourpiercing`, `gl_automatic`, `gl_bayonetlug`, `gl_blast3`,
`gl_blessed`, `gl_block`, `gl_cleavex`, `gl_cover`, `gl_deadly`, `gl_flamethrower`,
`gl_flying`, `gl_held`, `gl_ignorearmour`, `gl_ignoremodifier`, `gl_ignoremodifiercover`,
`gl_ignoremodifierlong_range`, `gl_ignoremodifierelevated_position`, `gl_ignoremodifierarmour`,
`gl_impervious`, `gl_mined`, `gl_negate`, `gl_negate_kw_fire`, `gl_negate_kw_gas`,
`gl_negate_kw_fear`, `gl_negate_kw_heavy`, `gl_negate_kw_shrapnel`, `gl_pistol`,
`gl_reload`, `gl_regenerate`, `gl_scatter`, `gl_shotgun`, `gl_shieldcombo`

**Abilities (3):** `ab_abioticlife`, `ab_artillerywitchbattery`, `ab_hereticlegionnaire`

**Variant Rules (3, added to `fv_navalraidingparty`):** `rl_closeassaultweapons`, `rl_letsleepingdogslie`, `rl_lighttroops`

### Commit `5d18354` — fix: add missing keyword tags to equipment entries from rulebook v1.0.2

**Equipment tags (59 added across 178 entries):** `gl_ignorearmour`, `gl_injurydice-1`, `gl_injurydice1`,
`gl_injurydice2`, `gl_injurymodifier2`, `gl_injurymodifier1`, `gl_ignoremodifiercover`,
`gl_ignoremodifierlong_range`, `gl_automatic` (as Automatic 2 / Automatic 3) on all applicable weapons.
Knowledge-based additions: `gl_flamethrower` on Flamethrower and Heavy Flamethrower;
`gl_automatic` (Automatic 2) and `gl_injurydice-1` on Heavy Flamethrower.

**New glossary entries (2):** `gl_injurymodifier1` (+1 Injury Modifier), `gl_injurydice2` (+2 Injury Dice)
