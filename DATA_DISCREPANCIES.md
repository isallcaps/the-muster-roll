# Data Discrepancies

Gaps found between the Trench Companion print view and the game data submodule
([trenchcrusadedata](https://github.com/Bob-The-Seagull-King/trenchcrusadedata)).
Intended to be reported as issues to the data maintainers.

Use the **Copy for Issue Report** button in the dev toolbar's Validation Report
section to generate a pre-formatted GitHub issue body for any live discrepancy.

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
| *(populate from live Validation Report in the dev toolbar)* | | |
