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

Free-text `modifiers` strings that have no `gl_*` mapping in `MODIFIER_TO_GLOSSARY_ID`
and no entry in `WEAPON_KEYWORD_OVERRIDES`. These log a dev-mode warning at startup and
are shown on cards only through fallback rule text, not as keyword chips.

The four remaining unmapped strings have no direct glossary keyword equivalent —
they express raw dice modifiers that are purely descriptive:

| Modifier String | Equipment | Notes |
|-----------------|-----------|-------|
| `+1D to Hit` | Shotgun (eq_shotgun), Flail/Scourge (eq_flail) | Generic +DICE to hit; no keyword maps to this exact mechanic |
| `-1D to Hit` | Knife/Dagger (eq_trenchknife) | eq_trenchknife gets `gl_minusdice1` via WEAPON_KEYWORD_OVERRIDES; warning fires but is superseded |
| `-1D to Hit/Injuries` | Unarmed (eq_unarmed) | Combined modifier; no single keyword covers both |

All other previously-listed gaps have been resolved via `MODIFIER_TO_GLOSSARY_ID`,
`WEAPON_KEYWORD_OVERRIDES`, or glossary entries in `rulebook-override.json`.

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

### Rulebook-override.json additions (2026-05-15)

**5 new glossary entries:** `gl_deployable`, `gl_block`, `gl_injurymodifier-3`,
`gl_negate_kw_mined`, `gl_infectionmarkers`

**App-side mapping expanded:** `MODIFIER_TO_GLOSSARY_ID` extended from 33 to 51 entries;
`WEAPON_KEYWORD_OVERRIDES` extended from 1 to 30 entries covering all major weapons,
armour, shields, grenades, and equipment with missing keyword coverage.

**Audit result:** 106/178 equipment entries now PASS (up from 99); 0 FAIL; 72 no-keywords
(these are genuinely keywordless misc items, banners, relics, and campaign equipment).
4 unmapped modifier strings remain — all are raw dice expressions with no keyword equivalent.

---

### Commit `2230eb1` — fix: replace gl_blastx with gl_blast3 on Gas Grenades (eq_gasgrenades)

Fork's `equipment.json` had `gl_blastx` on Gas Grenades; changed to `gl_blast3` to match the
actual Blast 3" keyword. The `WEAPON_KEYWORD_OVERRIDES` entry for `eq_gasgrenades` was
simplified to only the three keywords not provided by the fork data:
`gl_ignoremodifiercover`, `gl_ignoremodifierlong_range`, `gl_ignorearmour`.

The unreachable `eq_infernalbomb` entry in `WEAPON_KEYWORD_OVERRIDES` was also removed.
The Infernal Bomb resolves as Addon `ab_infernalbomb` (not Equipment), so `effectiveEquipmentTags`
never fires for it. Keywords are now injected via `ab_infernalbomb` in `rulebook-override.json`
abilities, using clean glossary refs: `gl_blast3`, `gl_scatter`, `gl_reload`,
`gl_ignoremodifiercover`, `gl_ignoremodifierlong_range`, `gl_ignoremodifierelevated_position`,
`gl_shrapnel`. The existing `keywordsFromDescriptionBlocks` mechanism surfaces these as chips.

---

### Commit `5d18354` — fix: add missing keyword tags to equipment entries from rulebook v1.0.2

**Equipment tags (59 added across 178 entries):** `gl_ignorearmour`, `gl_injurydice-1`, `gl_injurydice1`,
`gl_injurydice2`, `gl_injurymodifier2`, `gl_injurymodifier1`, `gl_ignoremodifiercover`,
`gl_ignoremodifierlong_range`, `gl_automatic` (as Automatic 2 / Automatic 3) on all applicable weapons.
Knowledge-based additions: `gl_flamethrower` on Flamethrower and Heavy Flamethrower;
`gl_automatic` (Automatic 2) and `gl_injurydice-1` on Heavy Flamethrower.

**New glossary entries (2):** `gl_injurymodifier1` (+1 Injury Modifier), `gl_injurydice2` (+2 Injury Dice)
