# The Muster Roll

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.10.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

---

## Dev Tooling

### Test Case Library

The dev toolbar (visible only in `ng serve` / development builds via `isDevMode()`) includes a
persistent test case library so you can save warbands locally and reload them without re-pasting.

**Folder:** `src/assets/test-cases/`
- `index.json` — list of saved test cases; committed as an empty array
- `<id>.json` — individual test case files; **gitignored** (may contain copyrighted Trench Companion HTML)

**Saving a test case:**

1. Paste the warband export JSON and (optionally) the Trench Companion reference HTML into the toolbar textareas.
2. Click **Save Current**, enter a name when prompted — the JSON is copied to your clipboard.
3. In your terminal, run:
   ```bash
   # macOS
   pbpaste | node scripts/save-test-case.mjs

   # Linux
   xclip -selection clipboard -o | node scripts/save-test-case.mjs
   ```
   The script writes `src/assets/test-cases/<id>.json` and updates `index.json`.
4. The warband appears in the **Load saved test case** dropdown on the next page load.

**Production builds** never include `src/assets/test-cases/` (excluded from `angular.json` production
assets config) and the entire toolbar is absent from production bundles (`@if (devMode)` guard).

---

### Validation Report & Discrepancy Tracking

After rendering a warband, the dev toolbar shows a **Validation Report** that scans the enriched
warband object for items that failed to resolve against the game data:

| Severity | Meaning |
|----------|---------|
| **FAIL** | An equipment or ability ID in the export has no matching entry anywhere in the game data files — the item renders with name only. |
| **WARN** | A keyword tag has no glossary entry — the keyword name appears on the card but no definition text is shown. |

Click **Copy Issue** next to any finding to copy a pre-formatted GitHub issue body to your clipboard.
Paste it into a new issue at:
**https://github.com/Bob-The-Seagull-King/trenchcrusadedata/issues**

Known persistent gaps (IDs that exist in Trench Companion exports but are absent or renamed in the
game data submodule) are catalogued in [`DATA_DISCREPANCIES.md`](DATA_DISCREPANCIES.md).
Add new findings there so they can be tracked and batched into upstream reports.
