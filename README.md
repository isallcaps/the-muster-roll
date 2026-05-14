# The Muster Roll

> Know your soldiers. Know the rules.

A warband print sheet and rules reference tool for Trench Crusade. Paste your warband export JSON from Trench Companion and get a print-ready card for each model — with full inline keyword and ability definitions so beginners don't need a separate cheat sheet.

---

## Features

- **Print-ready model cards** — landscape layout, 2 cards per page, designed to be cut apart
- **Inline rule definitions** — every keyword, ability, and equipment tag shows its full rule text directly on the card
- **'I Know These Rules' toggle** — hide definitions for keywords you've memorised to keep cards compact
- **Flavour text toggle** — show or hide equipment blurb text
- **Short/long range display** — automatically calculates and displays short and long range for every ranged weapon
- **Field Intelligence** — side-by-side viewer comparing raw warband export JSON against the fully enriched data object
- **The Armoury** — browse the complete game data — equipment, abilities, keywords, models, and variant rules
- **Graceful fallbacks** — if a rule definition is missing from the data, the card still renders the item name with a note to refer to the rulebook
- **Data validation** — dev tool for comparing enriched output against Trench Companion print HTML to catch data gaps

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
git submodule update --init

# Install dependencies
npm install

# Start the dev server
ng serve
```

Then open `http://localhost:4200` in your browser.

## Game Data

Warband rule definitions are powered by a maintained fork of the
[trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata)
repository, included as a git submodule. The fork adds missing glossary
entries, abilities, and faction rules sourced from the official v1.0.2
rulebook PDFs.

To update the game data:
```bash
git submodule update --remote
git add src/assets/game-data
git commit -m "chore: update game data"
```

The original upstream repository is maintained by
[Bob-The-Seagull-King](https://github.com/Bob-The-Seagull-King/trenchcrusadedata).

---

## How To Use

### Printing a Warband

1. Go to [Trench Companion](https://trench-companion.com) and open your warband
2. Use the **Export Data** button to download your warband JSON
3. Paste the JSON into The Muster Roll's textarea and click **Render**
4. Use the **'I Know These Rules'** panel to hide definitions you don't need
5. Click **Print**

### Field Intelligence

Navigate to `/viewer` to paste a warband export and inspect the raw vs enriched data side by side. Useful for debugging data gaps or understanding how the enrichment pipeline works.

### The Armoury

Navigate to `/game-data` to browse all loaded game data by category — equipment, abilities, keywords, models, and variant rules. Use the search to find specific entries by name or ID.

---

## Built With

- [Angular 19](https://angular.dev)
- [isallcaps/trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata) — maintained fork of the open game data submodule
- [Trench Companion](https://trench-companion.com) — warband export format

---

## Data Discrepancies

During development, gaps are found between the Trench Companion export format and the game data submodule. These are tracked in [DATA_DISCREPANCIES.md](DATA_DISCREPANCIES.md) and fixed in the [isallcaps/trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata) fork where possible.

If you find a discrepancy not already listed, please open an issue or submit a pull request.

---

## Credits

- **[Trench Companion](https://trench-companion.com)** — the officially supported Trench Crusade resource, source of the warband export format
- **[Bob-The-Seagull-King](https://github.com/Bob-The-Seagull-King)** — original author of the trenchcrusadedata repository
- **[isallcaps/trenchcrusadedata](https://github.com/isallcaps/trenchcrusadedata)** — maintained fork with additional rulebook data
- **[Trench Crusade](https://www.trenchcrusade.com/)** — the game this tool is built for

---

## Disclaimer

The Muster Roll is a fan-made tool and is not affiliated with, endorsed by, or officially connected to the Trench Crusade team in any way. Trench Crusade and all associated content are the property of their respective owners.

---

## License

MIT