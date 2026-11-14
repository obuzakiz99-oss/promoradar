# QA — live-site audits

Three suites that test the deployed site (https://obuzakiz99-oss.github.io/promoradar/) in a real Chrome. They were
written for the 3-round audit of 14.11.2026 and are meant to be re-run after bigger changes. Not part of the site build
(CI never installs this folder).

```sh
cd qa && npm install                 # playwright-core + axe-core (uses your installed Chrome)
ROUND=r4 node func.mjs               # ~1,300 functional checks: filters, search, counters, menus, keyboard, tablet, en/ru
node a11y-visual.mjs --out out/r4    # axe (WCAG 2.2 AA) + screenshots at 390/768/1280/1440 + 200 % zoom, open states
node texts.mjs r4                    # page text captures (uk/en/ru) for copy review and diffs
```

- Output goes to `qa/out/<round>/` (git-ignored). `func.mjs` prints one PASS/FAIL/INFO line per check and writes
  `func.json`; `SEED=…` picks other random promo pages; `node func.mjs home search` runs only some sections.
- Chrome path: set `CHROME=/path/to/chrome` if it is not the default macOS location.
- Wait until the GitHub Pages deploy has finished before running — the suites test whatever is live.
