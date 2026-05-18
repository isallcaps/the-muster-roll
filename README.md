# The Muster Roll

> Know your soldiers. Know the rules.

A warband print sheet tool for Trench Crusade. Paste your warband export from Trench Companion and get a print-ready card for each model — with inline keyword and ability definitions so you don't need a separate rulebook at the table.

Built by a new player, for new players.

Since the site is now live, update it to:

> ⚠️ **Work in progress.** The site is live at [musterroll.isallcaps.com](https://musterroll.isallcaps.com) but expect rough edges while development continues. Feedback and contributions welcome.
---

## What It Does

- **Print-ready model cards** — landscape layout, one model per page with a keyword cheat sheet alongside it. Designed to be cut apart and brought to the table
- **Keyword cheat sheet** — every keyword, ability, and equipment tag for that model collected in one place with compact definitions. No rulebook required mid-game
- **Inline rule definitions** — keyword and ability rule text displayed directly on the card
- **'I Know These Rules' toggle** — hide definitions for keywords you've already memorised to keep cards compact
- **Equipment ordering** — ranged weapons first, then melee, then wearables — the way you actually think about a model
- **Graceful fallbacks** — if a rule definition is missing from the data, the card still renders with a note to check the rulebook

---

## Getting Started

### Prerequisites

- Node.js 18+
- Angular CLI 19
- Git

### Installation

```bash
# Clone the repo
git clone https://github.com/isallcaps/the-muster-roll.git
cd the-muster-roll

# Initialize the game data submodule
git submodule update --init --recursive

# Install dependencies
npm install

# Start the dev server
ng serve
```

Then open `http://localhost:4200` in your browser.

---

## How To Use

1. Go to [Trench Companion](https://trench-companion.com) and open your warband
2. Click the API link for your warband — it looks like `https://synod.trench-companion.com/wp-json/synod/v1/warband/{id}` — and copy the full JSON response
3. Paste the JSON into The Muster Roll and click **Render**
4. Use the print options panel to toggle what appears on your cards
5. Click **Print**

> **Tip:** The API JSON format gives the best results. The TTS export format is also supported as a fallback.

---

## Developer Tools

Two additional tools are available in development mode (`ng serve`) only — they're not accessible in production builds.

**Field Intelligence** (`/viewer`) — paste a warband export and inspect the raw vs enriched data side by side. Useful for debugging data gaps or understanding how the enrichment pipeline works.

**The Armoury** (`/game-data`) — browse all loaded game data by category — equipment, abilities, keywords, models, and variant rules. Search by name or ID.

These routes are gated behind `isDevMode()` and redirect to `/` in production.

---

## Game Data

Rule definitions are powered by a maintained fork of the [trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata) repository, included as a git submodule. The fork patches missing glossary entries, abilities, and faction rules sourced from the official v1.0.2 rulebook PDFs — including The Great Hunger, The Red Brigade, Prussian Stosstruppen, and Sniper Priests supplements.

To update the game data submodule:

```bash
git submodule update --remote
git add src/assets/game-data
git commit -m "chore: update game data"
```

The original upstream repository is maintained by [Bob-The-Seagull-King](https://github.com/Bob-The-Seagull-King/trenchcrusadedata).

Data discrepancies between the Trench Companion export format and the game data submodule are tracked in [DATA_DISCREPANCIES.md](DATA_DISCREPANCIES.md).

---

## Built With

- [Angular 19](https://angular.dev)
- [isallcaps/trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata) — maintained fork of the open game data submodule
- [Trench Companion](https://trench-companion.com) — warband export format

---

## Credits

- **[Trench Companion](https://trench-companion.com)** — fan-made warband builder and campaign tracker for Trench Crusade
- **[Bob-The-Seagull-King](https://github.com/Bob-The-Seagull-King)** — original author of the trenchcrusadedata repository
- **[Trench Crusade](https://www.trenchcrusade.com/)** — creators of Trench Crusade
---

## Disclaimer

This project is an independent production created under the terms of the [Trench Crusade Community License](https://www.trenchcrusade.com/community-license/) and is not affiliated with or endorsed by Factory Fortress Inc. Trench Crusade and all associated content are the intellectual property of Factory Fortress Inc. Factory Fortress Inc. makes no representation or warranty regarding this product.

---

## License

MIT