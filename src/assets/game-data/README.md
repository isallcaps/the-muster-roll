# trenchcrusadedata (isallcaps fork)

A maintained fork of [Bob-The-Seagull-King/trenchcrusadedata](https://github.com/Bob-The-Seagull-King/trenchcrusadedata), the open game data repository for [Trench Crusade](https://trenchcrusade.com).

This fork adds missing and corrected entries sourced directly from the official v1.0.2 rulebook PDFs, for use as a git submodule in [The Muster Roll](https://github.com/isallcaps/the-muster-roll).

---

## What's Different From Upstream

All changes are additions or corrections based on the official **Trench Crusade Digital Rulebook v1.0.2**, **Warbands of Trench Crusade**, and **Changelog 1.0.2**.

### Added — Glossary / Keywords
69 keyword definitions added or corrected, including:
- All +/- Dice and Injury Dice/Modifier variants
- ASSAULT, BLAST, SCATTER, CLEAVE (updated for v1.0.2)
- FLAMETHROWER, SHOTGUN, RELOAD, PISTOL
- BAYONET LUG and SHIELD COMBO (from Warbands of Trench Crusade)
- All NEGATE variants (FIRE, GAS, FEAR, HEAVY, SHRAPNEL)
- All IGNORE variants (COVER, LONG RANGE, ELEVATED POSITION, ARMOUR)
- TOUGH, ELITE, LEADER, INFILTRATOR, STRONG, FEAR, ARTIFICIAL, DEADLY, and more

### Added — Heretic Legion Abilities
- `ab_puppetmaster` — Puppet Master ACTION
- `ab_stealthgenerator` — Stealth Generator
- `ab_hide` — Hide ACTION
- `ab_abioticlife` — Abiotic Life
- `ab_artillerywitchbattery` — Artillery Witch Battery
- `ab_levitate` — Levitate
- `ab_hereticlegionnaire` — Heretic Legionnaires upgrade rule
- `ab_chattel` — Chattel
- `ab_darkblessing` — Dark Blessing
- `ab_lawofhell` — Law of Hell
- `ab_infiltratordeathcommando` — Infiltrator (Death Commando)

### Added — Heretic Naval Raiders Variant Rules
- `rl_fastaslightning` — Fast as Lightning
- `rl_closeassaultweapons` — Close Assault Weapons
- `rl_letsleepingdogslie` — Let Sleeping Dogs Lie
- `rl_lighttroops` — Light Troops
- `rl_unseenadvance` — Unseen Advance

### Added — Supplement Abilities (Warbands of Trench Crusade)

**Heretic Legion (1):** `ab_assaultbeast`

**New Antioch — base (3):** `ab_trenchmoles`, `ab_setmine`, `ab_defusemine`

**New Antioch — Prussian Stosstruppen (5):**
`ab_athleticism`, `ab_rapidassault`, `ab_aimaction`, `ab_holdyourfire`,
`ab_godwithus`, `ab_fortifyaction`

**New Antioch — War Dog handlers (6):**
`ab_thedogsofwar`, `ab_grenadeharness`, `ab_loyalhound`,
`ab_specialtraining`, `ab_teethandclaws`

**Trench Pilgrims (6):**
`ab_layingonofhands`, `ab_bodyguard`, `ab_resurrection`,
`ab_feeblyflailing`, `ab_symphonyofslaughter`, `ab_zealotstrength`

**Iron Sultanate (7):**
`ab_janissaryveteran`, `ab_elementalchange`, `ab_lightskirmishers`,
`ab_pin`, `ab_trampleaction`, `ab_pummellingblows`

**Black Grail — Great Hunger (20):**
`ab_cadreofflesh`, `ab_frenziedfollowers`, `ab_motherscall`, `ab_pestilent`,
`ab_gluttonoushorde`, `ab_ravenousinfection`, `ab_dormanthunger`, `ab_gnashingandwailing`,
`ab_plagueriddenflesh`, `ab_unholygut`, `ab_devouringjaws`, `ab_graspingmaw`,
`ab_hellflyhoststr`, `ab_lockjawbite`, `ab_papillalhide`, `ab_rottencutters`,
`ab_morewormthanman`, `ab_unendingstarvation`, `ab_devourtheguilty`, `ab_slow`,
`ab_vengefulscripture`

**Black Grail — base (5):**
`ab_crushingblows`, `ab_plagueknightranks`, `ab_infestedcarcasses`,
`ab_maddeningbuzzing`, `ab_sixarmedmonstrosity`

**Court of the Seven-Headed Serpent (2):**
`ab_annihilator`, `ab_poisonstingers`

### Added — Supplement Equipment (Warbands of Trench Crusade)

**Red Brigade:** `eq_atonementbell`, `eq_holysmoke`

**Great Hunger:** `eq_vomitus`, `eq_parasitegrenades`, `eq_foetidpalanquin`, `eq_blackspotrifle`

**Heretic Legion:** `eq_incendiaryammunition`

**General:** `eq_greathammer` (remap target for `eq_doublehandedbluntweapon`)

**Trench Pilgrims:** `eq_sineatertenderizermaul`

### Added — Supplement Glossary

`gl_deployable`, `gl_injurymodifier-3`, `gl_negate_kw_mined`, `gl_infectionmarkers`,
`kw_negate_kw_difficultterrain`, `gl_negate_kw_difficultterrain`,
`kw_ignoremodifieroff-hand_weapon`, `gl_ignoremodifieroffhand`

### Added — Supplement Models (Warbands of Trench Crusade)

**Great Hunger (`fv_greathunger`) — 6 models:**
`md_matagothag`, `md_ravenous`, `md_gregorigula`, `md_corpseguard_husk`,
`md_plagueknight_butcherknight`, `md_cradleravenous`

**Saint Methodius (`fv_warpilgrimageofsaintmethodius`) — 2 models:**
`md_stigmaticnun_saintmethodius`, `md_anchoriteshrine_saintmethodius`

### Corrected — Existing Model Entries

- `md_wretchedheretic` — added missing `gl_heretic` keyword tag
- `md_scriptureguardian` — corrected to ranged-only profile: `melee=[]`, `armour=2`
- `md_sineater` — corrected to ranged-only profile: `ranged=2`, `melee=[]`, `armour=2`

---

## Syncing With Upstream

To pull upstream changes into this fork:

```bash
git remote add upstream https://github.com/Bob-The-Seagull-King/trenchcrusadedata.git
git fetch upstream
git merge upstream/main
git push origin main
```

Review any conflicts carefully — upstream changes may overwrite fixes made in this fork.

---

## Used By

- [The Muster Roll](https://github.com/isallcaps/the-muster-roll) — a warband print sheet and rules reference tool for Trench Crusade

---

## Credits

All game content belongs to the Trench Crusade team. This fork contains no original creative content — only structured data representations of official rules text for use by community tools.

Original repository maintained by [Bob-The-Seagull-King](https://github.com/Bob-The-Seagull-King).

---

## Disclaimer

This is an unofficial fan-maintained fork and is not affiliated with or endorsed by the Trench Crusade team.
