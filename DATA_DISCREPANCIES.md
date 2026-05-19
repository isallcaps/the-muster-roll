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

### Equipment (18 entries)

| ID | Name | Faction / Variant | Notes |
|----|------|-------------------|-------|
| `eq_bloodcloak` | Blood Cloak | Red Brigade | Skirmisher keyword |
| `eq_redbanner` | Red Banner | Red Brigade | Melee weapon; Block + Held |
| `eq_atonementbell` | Atonement Bell | Red Brigade | Melee weapon; Held; off-hand move mechanic |
| `eq_holysmoke` | Holy Smoke | Red Brigade | Consumable |
| `eq_vomitus` | Vomitus | Great Hunger | Ranged special; Assault + Infection Markers |
| `eq_putridshotgun` | Putrid Shotgun | Great Hunger | Ranged 2-handed; Bayonet Lug + Shield Combo + Shotgun |
| `eq_graildevotee` | Grail Devotee | Great Hunger | Equipment; stacking +1 Injury Modifier for melee |
| `eq_parasitegrenades` | Parasite Grenades | Great Hunger | Grenade; stub entry pending full rule text |
| `eq_foetidpalanquin` | Foetid Palanquin | Great Hunger | Matagot Hag equipment; stub entry |
| `eq_blackspotrifle` | Black Spot Rifle | Great Hunger | 2-Handed ranged 24"; Deadly + Reload |
| `eq_incendiaryammunition` | Incendiary Ammunition | Heretic Legion | Consumable; Fire keyword ammunition |
| `eq_greathammer` | Great Hammer/Maul | General | Remap target for `eq_doublehandedbluntweapon`; 2-Handed melee |
| `eq_sineatertenderizermaul` | Tenderiser Maul | Trench Pilgrims (Sin Eater) | 2-Handed melee; +1 Injury Modifier + Heavy; Swinging Blow mechanic |
| `eq_gasfilter` | Gas Filter | Trench Pilgrims (Anchorite) | Anchorite Shrine upgrade; incense purification |
| `eq_hallowedanchorite` | Hallowed Anchorite | Saint Methodius | Anchorite Shrine upgrade; Limit 1 |
| `eq_sacredgeometry` | Sacred Geometry | Saint Methodius | Anchorite Shrine upgrade; Limit 1 |
| `eq_puntgun` | Punt Gun | Saint Methodius | Anchorite Ranged Weapon; counts as 1-Handed on Anchorite |
| `eq_antimaterialrifle` | Anti-Materiel Rifle | Saint Methodius | Anchorite Ranged Weapon; counts as 1-Handed on Anchorite |

### Abilities (96 entries)

**Pre-existing (3):** `ab_assaultbeast`, `ab_lopingdash`, `ab_infernalbomb`

**Heretic Legion — base (1):**
`ab_unholyhymns`

**New Antioch — base (4):**
`ab_trenchmoles`, `ab_assaultdrill`, `ab_setmine`, `ab_defusemine`

**New Antioch — Prussian Stosstruppen (13):**
`ab_shockcharge`, `ab_forwardpositions`, `ab_athleticism`, `ab_rapidassault`,
`ab_absolutefaith`, `ab_aimaction`, `ab_holdyourfire`, `ab_godwithus`,
`ab_onwardchristiansoldiers`, `ab_expertmedic`, `ab_finishthefallen`,
`ab_battlefielddemolition`, `ab_fortifyaction`

**New Antioch — War Dog handlers (7):**
`ab_thedogsofwar`, `ab_fourpaws`, `ab_grenadeharness`, `ab_loyalhound`,
`ab_specialtraining`, `ab_teethandclaws`, `ab_strengththroughpain`

**Trench Pilgrims (15):**
`ab_loudspeakers`, `ab_layingonofhands`, `ab_mementomori`, `ab_bodyguard`,
`ab_enforcedorthodoxy`, `ab_whipofgod`, `ab_resurrection`, `ab_agile`,
`ab_blessedstigmata`, `ab_awaited`, `ab_feeblyflailing`, `ab_maddash`,
`ab_brokenonthewheel`, `ab_symphonyofslaughter`, `ab_zealotstrength`

**Iron Sultanate (13):**
`ab_janissaryveteran`, `ab_countercharge`, `ab_mubarizun`, `ab_masteryoftheelements`,
`ab_elementalchange`, `ab_temporalassassin`, `ab_timeslip`, `ab_lightskirmishers`,
`ab_artificiallife`, `ab_pin`, `ab_trampleaction`, `ab_pummellingblows`, `ab_recreation`

**Black Grail — Great Hunger (20):**
`ab_cadreofflesh`, `ab_frenziedfollowers`, `ab_motherscall`, `ab_pestilent`,
`ab_undeadfortitude`, `ab_gluttonoushorde`, `ab_ravenousinfection`, `ab_dormanthunger`,
`ab_gnashingandwailing`, `ab_plagueriddenflesh`, `ab_unholygut`, `ab_devouringjaws`,
`ab_graspingmaw`, `ab_hellflyhoststr`, `ab_lockjawbite`, `ab_papillalhide`,
`ab_rottencutters`, `ab_unendingstarvation`, `ab_morewormthanman`, `ab_parasitictick`

**Black Grail — base faction (13):**
`ab_beelzebubstouch`, `ab_crushingblows`, `ab_plagueknightranks`, `ab_overwhelminghorde`,
`ab_diseasecarrier`, `ab_frighteningspeed`, `ab_infestedcarcasses`, `ab_infectedproboscis`,
`ab_maddeningbuzzing`, `ab_sixarmedmonstrosity`, `ab_corpulent`, `ab_unstoppable`,
`ab_gnashingandwailing`

**Court of the Seven-Headed Serpent (5):**
`ab_annihilator`, `ab_demonicaura`, `ab_poisonstingers`, `ab_hateful`, `ab_torturer`

**Mercenary (3):**
`ab_devourtheguilty`, `ab_slow`, `ab_vengefulscripture`

Notes:
- `ab_parasitictick` ("Parasite Host") has confirmed rule text as of 2026-05-16.
- `ab_gnashingandwailing` is the canonical ID. The deprecated duplicate `ab_gnashingandtearing`
  was removed during pre-sync cleanup.
- `ab_devourtheguilty`, `ab_slow`, `ab_vengefulscripture` are Sin Eater / Scripture Guardian
  mercenary abilities tagged `fc_mercenary`.

### Variant Rules (31 entries)

| Variant | Count | Rule IDs |
|---------|-------|----------|
| Prussian Stosstruppen (`fv_prussianapplied`) | 2 | `rl_expertfireteams`, `rl_mastersofthegrenade` |
| Red Brigade (`fv_redbrigade`) | 6 | `rl_displeasureofthechurch`, `rl_furyofsaintErnest`, `rl_gloryhounds`, `rl_noretreat`, `rl_rememberthefallen`, `rl_wearandtear` |
| Great Hunger (`fv_greathunger`) | 12 | `rl_eternalappetence`, `rl_butcherknights`, `rl_cradleoffilth`, `rl_desiccatedhusks`, `rl_excruciatinghunger`, `rl_thegreatmaw`, `rl_spawnofgluttony`, `rl_strainofthegreathunger`, `rl_ravenousinfection`, `rl_infectionmarkers`, `rl_grailmorale`, `rl_greathunger_equipmentrestrictions` |
| Saint Methodius (`fv_warpilgrimageofsaintmethodius`) | 8 | `rl_followersofsaintmethodius`, `rl_treasureinheaven`, `rl_mortalsin`, `rl_gunsmithmonks`, `rl_communicantheresy`, `rl_chasteorder`, `rl_anchoritecloister`, `rl_anchoritearmoury` |
| Court of the Seven-Headed Serpent (`fv_courtofthesevenserpent`) | 3 | `rl_noblesofthecourt`, `rl_goeticabilities`, `rl_goeticspells` |

Note: `rl_greathunger_equipmentrestrictions` covers equipment restrictions distinct from the
hunger mechanic in `rl_excruciatinghunger` — the `name` and `title` fields have been set to
"Equipment Restrictions" to distinguish them.

### Models (11 entries)

Stats are sourced from the supplement PDFs; abilities are handled via the export's own ability list.
Entries marked **patch** have no stats — they exist only to supply keyword tags missing from the submodule profile.

**Great Hunger (`fv_greathunger`) — 6 full profiles:**

| ID | Name | MOV | MEL | ARM | Base |
|----|------|-----|-----|-----|------|
| `md_matagothag` | Matagot Hag | 6" | 2 | 0 | 60mm |
| `md_ravenous` | Ravenous | 6" | 0 | 0 | 25mm |
| `md_gregorigula` | Gregori Gula | 6" | 2 | 0 | 60mm |
| `md_corpseguard_husk` | Desiccated Husk | 6" | 1 | 0 | 32mm |
| `md_plagueknight_butcherknight` | Butcher Knight | 6" | 2 | 0 | 32mm |
| `md_cradleravenous` | Cradle Ravenous | 6" | 0 | 0 | 25mm |

**Saint Methodius (`fv_warpilgrimageofsaintmethodius`) — 3 full profiles:**

| ID | Name | MOV | MEL | ARM | Base |
|----|------|-----|-----|-----|------|
| `md_scriptureguardian` | Scripture Guardian | 6" | — | 2 | 40mm |
| `md_stigmaticnun_saintmethodius` | Stigmatic Nun | 8" | 1 | 0 | 25mm |
| `md_anchoriteshrine_saintmethodius` | Anchorite Shrine | 6" | 2 | −3 | 60mm |

**Trench Pilgrims mercenary — 1 full profile:**

| ID | Name | MOV | MEL | ARM | Base |
|----|------|-----|-----|-----|------|
| `md_sineater` | Sin Eater | 6" | — | 2 | 50mm |

**Heretic Legion — 1 keyword patch:**

| ID | Name | Notes |
|----|------|-------|
| `md_wretchedheretic` | Wretched | Patch-only — no stats; adds `gl_heretic` tag missing from submodule profile. Loaded via merge so base stats from the submodule are preserved. |

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

### Model ID Remap (`WarbandService.MODEL_ID_REMAP`)

| Export ID | Canonical ID | Reason |
|-----------|--------------|--------|
| `md_annointedheavyinfantry` | `md_anointedheavyinfantry` | Typo in TC exporter (double 'n') |
| `md_deathcommando` | `md_hereticdeathcommando` | TC exporter omits 'heretic' prefix |
| `md_hauptmann` | `md_lieutenant` | Prussian Stosstruppen alias — confirmed by designer |
| `md_feldkaplan` | `md_trenchcleric` | Prussian Stosstruppen alias — confirmed by designer |
| `md_stosstruppen` | `md_shocktroopersstostruppenofthefreestateofprussia` | Prussian Stosstruppen alias |
| `md_trenchdogredbrigade` | `md_trenchdog` | Red Brigade uses faction-specific ID; submodule uses generic |
| `md_gergorigula` | `md_gregorigula` | Typo in TC exporter (missing 'o') |
| `md_grailthrall_hunger` | `md_ravenous` | Great Hunger variant — TC uses generic thrall ID |
| `md_grailthrall_cradle_hunger` | `md_cradleravenous` | Great Hunger variant — TC uses generic cradle ID |

### Faction Model Remap (`WarbandService.FACTION_MODEL_REMAP`)

Applied on top of `MODEL_ID_REMAP` when the base faction is known. Handles cases where the
same TC export ID maps to different submodule IDs depending on which faction owns the model.

| Faction | Export ID | Canonical ID | Reason |
|---------|-----------|--------------|--------|
| `fc_hereticlegion` | `md_wretched` | `md_wretchedheretic` | TC sends Court ID for Heretic Wretched; submodule has a separate profile |

### Equipment ID Remap (`WarbandService.EQUIPMENT_ID_REMAP`)

| Export ID | Canonical ID | Reason |
|-----------|--------------|--------|
| `eq_silenecedpistol` | `eq_silencedpistol` | Typo in TC exporter |
| `eq_foetidpalaquin` | `eq_foetidpalanquin` | Typo in TC exporter — target still missing (see Section 4) |
| `eq_artillerywitchinfernalbomb` | `ab_infernalbomb` | TC uses fabricated `eq_` prefix; real entry is an Addon |
| `eq_sacrificialknife` | `eq_sacrificialblade` | Data file renamed; exporter not updated |
| `eq_greatswordaxe` | `eq_greataxe` | Data file renamed; exporter not updated |
| `eq_knifedagger` | `eq_trenchknife` | Data file renamed; exporter not updated |
| `eq_pistolrevolver` | `eq_pistol` | Data file renamed; exporter not updated |
| `eq_doublehandedbluntweapon` | `eq_greathammer` | Data file renamed; exporter not updated |
| `eq_ironcapriote` | `eq_ironcapirote` | Typo in TC exporter (`capriote` vs `capirote`) |
| `eq_bonebreakermace` | `ab_bonebreakermace` | Mandatory model weapon — TC sends `eq_`; submodule stores as Addon |
| `eq_catherinewheel` | `ab_catherinewheel` | Mandatory model weapon — TC sends `eq_`; submodule stores as Addon |
| `eq_warwolfchainmaw` | `ab_chainmaw` | Mandatory model weapon — TC sends `eq_`; submodule stores as Addon |
| `eq_warwolfshreddingclaws` | `ab_shreddingclaws` | Mandatory model weapon — TC sends `eq_`; submodule stores as Addon |

### Ability ID Remap (`WarbandService.ABILITY_ID_REMAP`)

| Export ID | Canonical ID | Reason |
|-----------|--------------|--------|
| `ab_layingonhands` | `ab_layingonofhands` | TC exporter drops 'of' |
| `ab_feebleflailing` | `ab_feeblyflailing` | TC exporter missing 'ly' |
| `ab_goetics_praetor` | `ab_goeticpraetor` | TC uses `goetics_` prefix; submodule drops it |
| `ab_goetics_sorcerer` | `ab_goeticsorcerer` | TC uses `goetics_` prefix; submodule drops it |
| `ab_goetics_knight` | `ab_goetichellknight` | TC uses `goetics_` prefix and omits 'hell'; submodule uses full name |
| `ab_blessingsoftheserpentmoon` | `ab_blessingoftheserpentmoon` | TC exporter has plural 'blessings'; canonical is singular |

### Upgrade ID Handling (`WarbandService.resolveAbility`)

Special pipeline — these IDs are not `ab_*` or `rl_*` but appear in the abilities list.

| Pattern / Export ID | Canonical ID | Rendered as |
|---------------------|--------------|-------------|
| `up_strain_*` | `ab_{name}` (strip prefix) | Ability with `[strain]` badge |
| `up_unendingstarvation` | `ab_unendingstarvation` | Ability with `[strain]` badge |
| `up_zealotstrength` | `ab_zealotstrength` | Ability with `[strain]` badge |
| `up_plagueknightrankbutcherking` | `rl_butcherknights` | Faction rule with `[rank]` badge |
| `up_plagueknightrankofthefeast` | `rl_butcherknights` | Faction rule with `[rank]` badge |
| `up_plagueknightrankofferocity` | `rl_butcherknights` | Faction rule with `[rank]` badge |

---

## Section 4 — Still Missing

Known gaps not yet resolved in either the override or the submodule.

### Equipment — stub entries (present but incomplete)

These IDs now have entries in `rulebook-override.json` so they resolve without hitting the
unresolved fallback, but their entries are stubs — no full stats, keywords, or rule text.

| ID | Display Name | Notes |
|----|--------------|-------|
| `eq_foetidpalanquin` | Foetid Palanquin | Great Hunger; stub entry only — full rule text not yet extracted |
| `eq_parasitegrenades` | Parasite Grenades | Great Hunger; stub entry — rule text deferred |
| `eq_hallowedanchorite` | Hallowed Anchorite | Saint Methodius; stub entry pointing to supplement PDF |
| `eq_sacredgeometry` | Sacred Geometry | Saint Methodius; stub entry pointing to supplement PDF |
| `eq_puntgun` | Punt Gun | Saint Methodius; stub entry pointing to supplement PDF |
| `eq_antimaterialrifle` | Anti-Materiel Rifle | Saint Methodius; stub entry pointing to supplement PDF |

### Unmapped modifier strings

Four modifier strings in the equipment data have no `gl_*` keyword equivalent and no
`WEAPON_KEYWORD_OVERRIDES` entry. They express raw dice mechanics:

| Modifier String | Equipment | Notes |
|-----------------|-----------|-------|
| `+1D to Hit` | Shotgun (`eq_shotgun`), Flail (`eq_flail`) | Generic +DICE; no keyword covers this exactly |
| `-1D to Hit` | Trench Knife (`eq_trenchknife`) | Superseded by `WEAPON_KEYWORD_OVERRIDES` → `gl_minusdice1`; warning fires in dev but is harmless |
| `-1D to Hit/Injuries` | Unarmed (`eq_unarmed`) | Combined modifier; no single keyword equivalent |

---

## Section 5 — Extraction Status

The **Warbands of Trench Crusade** PDF contains ability and variant rule text for all
supplement factions. Current extraction status per faction:

| Faction / Variant | Abilities | Variant Rules | Models | Status |
|-------------------|-----------|---------------|--------|--------|
| New Antioch — base | 4 | — | — | Partial — base upgrade abilities only |
| New Antioch — Prussian Stosstruppen | 13 | 2 | — | Full |
| New Antioch — War Dog handlers | 7 | — | — | Full |
| New Antioch — Saint Methodius | — | 8 | 3 + equipment | Full (models + rules; abilities in submodule) |
| Trench Pilgrims — base | 15 | — | — | Full abilities; no variant rules extracted |
| Trench Pilgrims — Saint Methodius mercenaries | 3 (`fc_mercenary`) | — | 1 | Partial |
| Iron Sultanate — base | 13 | — | — | Full abilities; variant rules not yet extracted |
| Heretic Legion — base | 1 | — | 1 (patch) | Minimal — only `ab_unholyhymns` + Wretched patch |
| Black Grail — Great Hunger | 20 | 13 | 6 | Full |
| Black Grail — base faction | 13 | — | — | Full abilities; variant rules not yet extracted |
| Court of the Seven-Headed Serpent | 5 | 3 | — | Partial — Goetic Powers block only |
| Red Brigade | — | 6 | — | Full variant rules; equipment partial |

**Still needs extraction:**
- Heretic Legion supplement abilities and variant rules
- Iron Sultanate variant rules
- Black Grail base faction variant rules
- Court of the Seven-Headed Serpent — remaining abilities (Praetor, Sorcerer, Hell Knight, etc.)
- Any faction-specific rules encountered in real exports but not yet in the override

The recommended workflow: load a real TC export for each faction, observe which IDs hit the
unresolved fallback path (dev-mode console warnings), then extract the matching rule text
from the PDF into `rulebook-override.json`.
