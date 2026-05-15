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
