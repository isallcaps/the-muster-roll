# Data Discrepancies

Gaps between the Trench Companion export format, the game data submodule, and the
official v1.0.2 rulebook PDFs. Sourced against the rulebook and supplement PDFs.

This project uses a maintained fork of the upstream data repository:
https://github.com/isallcaps/trenchcrusadedata

Upstream original:
https://github.com/Bob-The-Seagull-King/trenchcrusadedata

---

## Section 1 — Resolved via Override

Entries added to `src/assets/rulebook-override.json` that patch gaps in the submodule.
These are fixed for app users. Candidates for upstreaming to the fork once validated.

### Glossary (9 entries)

| ID | Name | Notes |
|----|------|-------|
| `gl_deployable` | Deployable | Missing from submodule glossary |
| `gl_block` | Block | Missing from submodule glossary |
| `gl_injurymodifier-3` | −3 Injury Modifier | Machine Armour keyword; missing from submodule |
| `gl_negate_kw_mined` | Negate Mined | Missing from submodule glossary |
| `gl_infectionmarkers` | Infection Markers | Black Grail mechanic; missing from submodule |
| `kw_negate_kw_difficultterrain` | Negate Difficult Terrain | Export uses `kw_` prefix form |
| `gl_negate_kw_difficultterrain` | Negate Difficult Terrain | Canonical `gl_` form added alongside |
| `kw_ignoremodifieroff-hand_weapon` | Ignore Off-Hand Weapon | Export uses `kw_` prefix with hyphen in ID |
| `gl_ignoremodifieroffhand` | Ignore Off-Hand Weapon | Canonical `gl_` form; also mapped in `MODIFIER_TO_GLOSSARY_ID` |

### Equipment (7 entries)

| ID | Name | Faction / Variant | Notes |
|----|------|-------------------|-------|
| `eq_bloodcloak` | Blood Cloak | Red Brigade | Skirmisher keyword |
| `eq_redbanner` | Red Banner | Red Brigade | Melee weapon; Block + Held |
| `eq_atonementbell` | Atonement Bell | Red Brigade | Melee weapon; Held; off-hand move mechanic |
| `eq_holysmoke` | Holy Smoke | Red Brigade | Consumable |
| `eq_vomitus` | Vomitus | Great Hunger | Ranged special; Assault + Infection Markers |
| `eq_putridshotgun` | Putrid Shotgun | Great Hunger | Ranged 2-handed; Bayonet Lug + Shield Combo + Shotgun |
| `eq_graildevotee` | Grail Devotee | Great Hunger | Equipment; stacking +1 Injury Modifier for melee |

### Abilities (43 entries)

**Pre-existing (3):** `ab_assaultbeast`, `ab_lopingdash`, `ab_infernalbomb`

**New Antioch — Prussian Stosstruppen (13):**
`ab_shockcharge`, `ab_forwardpositions`, `ab_athleticism`, `ab_rapidassault`,
`ab_absolutefaith`, `ab_aimaction`, `ab_holdyourfire`, `ab_godwithus`,
`ab_onwardchristiansoldiers`, `ab_expertmedic`, `ab_finishthefallen`,
`ab_battlefielddemolition`, `ab_fortifyaction`

**New Antioch — War Dog handler abilities (7):**
`ab_thedogsofwar`, `ab_fourpaws`, `ab_grenadeharness`, `ab_loyalhound`,
`ab_specialtraining`, `ab_teethandclaws`, `ab_strengththroughpain`

**Black Grail — Great Hunger (20):**
`ab_cadreofflesh`, `ab_frenziedfollowers`, `ab_motherscall`, `ab_pestilent`,
`ab_undeadfortitude`, `ab_gluttonoushorde`, `ab_ravenousinfection`, `ab_dormanthunger`,
`ab_gnashingandtearing`, `ab_plagueriddenflesh`, `ab_unholygut`, `ab_devouringjaws`,
`ab_graspingmaw`, `ab_hellflyhoststr`, `ab_lockjawbite`, `ab_papillalhide`,
`ab_rottencutters`, `ab_unendingstarvation`, `ab_morewormthanman`, `ab_parasitictick`

Note: `ab_parasitictick` ("Parasite Host") now has confirmed rule text as of 2026-05-16.

### Variant Rules (15 entries)

| Variant | Count | Rule IDs |
|---------|-------|----------|
| Prussian Stosstruppen (`fv_prussianapplied`) | 2 | `rl_expertfireteams`, `rl_mastersofthegrenade` |
| Red Brigade (`fv_redbrigade`) | 6 | `rl_displeasureofthechurch`, `rl_furyofsaintErnest`, `rl_gloryhounds`, `rl_noretreat`, `rl_rememberthefallen`, `rl_wearandtear` |
| Great Hunger (`fv_greathunger`) | 7 | `rl_eternalappetence`, `rl_butcherknights`, `rl_cradleoffilth`, `rl_desiccatedhusks`, `rl_excruciatinghunger`, `rl_thegreatmaw`, `rl_spawnofgluttony` |

### Models (5 entries)

All five are Great Hunger (`fv_greathunger`) models absent from the submodule.
Stats are sourced from the supplement PDF; abilities are handled via the export's own ability list.

| ID | Name | MOV | MEL | ARM | Base |
|----|------|-----|-----|-----|------|
| `md_matagothag` | Matagot Hag | 6" | 2 | 0 | 60mm |
| `md_ravenous` | Ravenous | 6" | 0 | 0 | 25mm |
| `md_gregorigula` | Gregori Gula | 6" | 2 | 0 | 60mm |
| `md_corpseguard_husk` | Desiccated Husk | 6" | 1 | 0 | 32mm |
| `md_plagueknight_butcherknight` | Butcher Knight | 6" | 2 | 0 | 32mm |

---

## Section 2 — Resolved in Fork

Changes applied directly to `src/assets/game-data/` (the isallcaps fork).

### Commit `dfab215` — missing glossary, abilities, variant rules (rulebook v1.0.2)

**Glossary (41 entries added):** `gl_minusdice1`, `gl_injurydice`, `gl_injurydice1`,
`gl_injurydice-1`, `gl_injurymodifier`, `gl_injurymodifier2`, `gl_injurymodifier-1`,
`gl_injurymodifier-2`, `gl_ammunition`, `gl_armourpiercing`, `gl_automatic`,
`gl_bayonetlug`, `gl_blast3`, `gl_blessed`, `gl_block`, `gl_cleavex`, `gl_cover`,
`gl_deadly`, `gl_flamethrower`, `gl_flying`, `gl_held`, `gl_ignorearmour`,
`gl_ignoremodifier`, `gl_ignoremodifiercover`, `gl_ignoremodifierlong_range`,
`gl_ignoremodifierelevated_position`, `gl_ignoremodifierarmour`, `gl_impervious`,
`gl_mined`, `gl_negate`, `gl_negate_kw_fire`, `gl_negate_kw_gas`, `gl_negate_kw_fear`,
`gl_negate_kw_heavy`, `gl_negate_kw_shrapnel`, `gl_pistol`, `gl_reload`,
`gl_regenerate`, `gl_scatter`, `gl_shotgun`, `gl_shieldcombo`

**Abilities (3):** `ab_abioticlife`, `ab_artillerywitchbattery`, `ab_hereticlegionnaire`

**Variant Rules (3, for `fv_navalraidingparty`):** `rl_closeassaultweapons`,
`rl_letsleepingdogslie`, `rl_lighttroops`

### Commit `2230eb1` — fix gl_blast3 on Gas Grenades

Fork's `equipment.json` had `gl_blastx` on `eq_gasgrenades`; corrected to `gl_blast3`.
`WEAPON_KEYWORD_OVERRIDES` entry for `eq_gasgrenades` simplified to the three keywords
not provided by fork data. The unreachable `eq_infernalbomb` override entry removed.

### Commit `5d18354` — add missing keyword tags to equipment entries

**59 equipment tag additions** across 178 entries: `gl_ignorearmour`, `gl_injurydice-1`,
`gl_injurydice1`, `gl_injurydice2`, `gl_injurymodifier2`, `gl_injurymodifier1`,
`gl_ignoremodifiercover`, `gl_ignoremodifierlong_range`, `gl_automatic` on all
applicable weapons; `gl_flamethrower` on Flamethrower and Heavy Flamethrower.

**2 new glossary entries:** `gl_injurymodifier1` (+1 Injury Modifier), `gl_injurydice2` (+2 Injury Dice)

### App-side workarounds (not in fork)

Applied in `GameDataService` to handle gaps the fork hasn't addressed:

- **`MODIFIER_TO_GLOSSARY_ID`** — 51-entry table mapping free-text `modifiers` strings
  (e.g. `"IGNORE COVER"`, `"IGNORE OFF-HAND WEAPON"`) to `gl_*` glossary IDs. Used when
  an equipment entry has no `gl_*` tags and must synthesise keywords from its modifiers array.

- **`WEAPON_KEYWORD_OVERRIDES`** — 30-entry per-equipment override table for weapons whose
  keywords are absent from both `tags` and `modifiers` in the data file. Merged on top of
  whatever the data provides.

**Equipment audit result:** 106/178 entries PASS · 0 FAIL · 72 no-keywords (genuinely
keywordless misc items, banners, relics, campaign equipment). 4 unmapped modifier strings
remain — all are raw dice expressions with no keyword equivalent (`+1D to Hit`, `-1D to Hit`,
`-1D to Hit/Injuries` on unarmed).

---

## Section 3 — Known ID Remaps

IDs in the Trench Companion export that do not match the game data. Handled in
`WarbandService` and `GameDataService` — no data file changes needed.

### Equipment ID Remap (`WarbandService.EQUIPMENT_ID_REMAP`)

| Export ID | Resolved ID | Reason |
|-----------|-------------|--------|
| `eq_silenecedpistol` | `eq_silencedpistol` | Typo in TC exporter |
| `eq_artillerywitchinfernalbomb` | `ab_infernalbomb` | Export uses fabricated `eq_` prefix; real entry is an Addon |
| `eq_sacrificialknife` | `eq_sacrificialblade` | Data file renamed; exporter not updated |
| `eq_greatswordaxe` | `eq_greataxe` | Data file renamed; exporter not updated |
| `eq_knifedagger` | `eq_trenchknife` | Data file renamed; exporter not updated |
| `eq_foetidpalaquin` | `eq_foetidpalanquin` | Typo in TC exporter — `eq_foetidpalanquin` target is still missing (see Section 4) |

### Model ID Remap (`WarbandService.MODEL_ID_REMAP`)

| Export ID | Resolved ID | Reason |
|-----------|-------------|--------|
| `md_annointedheavyinfantry` | `md_anointedheavyinfantry` | Typo in TC exporter (double 'n') |
| `md_deathcommando` | `md_hereticdeathcommando` | TC exporter omits 'heretic' prefix |
| `md_hauptmann` | `md_lieutenant` | Prussian Stosstruppen alias — confirmed by designer |
| `md_feldkaplan` | `md_trenchcleric` | Prussian Stosstruppen alias — confirmed by designer |
| `md_stosstruppen` | `md_shocktroopersstostruppenofthefreestateofprussia` | Prussian Stosstruppen alias |
| `md_trenchdogredbrigade` | `md_trenchdog` | Red Brigade uses faction-specific ID; submodule uses generic |

### Upgrade ID Handling (`WarbandService.resolveAbility`)

Special pipeline — these IDs are not `ab_*` or `rl_*` but appear in the abilities list.

| Pattern | Resolution | Rendered as |
|---------|------------|-------------|
| `up_strain_*` | Strip prefix → look up `ab_{name}` in addon map | Ability with `[strain]` badge |
| `up_plagueknightrankbutcherking` | → `rl_butcherknights` (explicit remap) | Faction rule with `[rank]` badge |

---

## Section 4 — Still Missing

Known gaps not yet resolved in either the override or the submodule.

### Equipment — no definition anywhere

These IDs appear in Great Hunger warband exports and render with name only (no stats, no
keywords, no description). The remap entry for `eq_foetidpalaquin` is in place; the target
itself is missing.

| ID | Display Name | Notes |
|----|--------------|-------|
| `eq_foetidpalanquin` | Foetid Palanquin | Great Hunger equipment; needs full entry in override |
| `eq_blackspotrifle` | Black Spot Rifle | Great Hunger ranged weapon; needs full entry in override |

### Plague Knight rank upgrades — partial coverage

The `PLAGUE_KNIGHT_RANK_REMAP` table currently only covers `up_plagueknightrankbutcherking`.
Other rank upgrade IDs (e.g. additional Butcher Knight sub-ranks) will fall through to
unresolved if encountered in a real export.

### Unmapped modifier strings

Four modifier strings in the equipment data have no `gl_*` keyword equivalent and no
`WEAPON_KEYWORD_OVERRIDES` entry. They express raw dice mechanics:

| Modifier String | Equipment | Notes |
|-----------------|-----------|-------|
| `+1D to Hit` | Shotgun (`eq_shotgun`), Flail (`eq_flail`) | Generic +DICE; no keyword covers this exactly |
| `-1D to Hit` | Trench Knife (`eq_trenchknife`) | Superseded by `WEAPON_KEYWORD_OVERRIDES` → `gl_minusdice1`; warning fires in dev but is harmless |
| `-1D to Hit/Injuries` | Unarmed (`eq_unarmed`) | Combined modifier; no single keyword equivalent |

---

## Section 5 — Needs Full Extraction

The **Warbands of Trench Crusade** PDF contains ability and variant rule text for all
supplement factions. The entries currently in `rulebook-override.json` represent a partial
extraction covering:

- New Antioch: Prussian Stosstruppen (full), War Dog handlers (full)
- Black Grail: Great Hunger (full abilities + variant rules)
- Red Brigade: full variant rules; equipment partial

**Factions with zero extraction so far:**
Heretic Legion supplements, Iron Sultanate, Court of the Seven-Headed Serpent, Principality
of New Antioch non-Prussian variants, and any faction-specific variant rules not yet
encountered in a real export.

The recommended workflow: load a real TC export for each faction, observe which IDs hit the
unresolved fallback path (dev-mode console warnings), then extract the matching rule text
from the PDF into `rulebook-override.json`.
