# Validation

What was run, with counts, and what could not be. First build 2026-10-28; redesign to yellow and black, the Help screen and
tickable steps 2026-10-29. Machine: Windows 11, Node 22.13.1, pnpm 11.28.3, Google Chrome 156.0.8078.73. Where a check proves less
than it sounds like it does, it says so (PRC-04, PRC-11).

## Commands

| Command | Result |
|---------|--------|
| `pnpm typecheck` | clean: client, server and tooling projects, strict, tests included |
| `pnpm lint` | clean: oxlint, warnings denied |
| `pnpm format:check` | clean: Biome, 146 files |
| `pnpm test:unit` | 64 tests, 64 pass |
| `pnpm test:ui` | 54 tests, 54 pass (the real app in jsdom with the real router and providers) |
| `pnpm test:server` | 11 tests, 11 pass (the real app on a random port) |
| `pnpm test:security` | 43 tests, 43 pass |
| `pnpm build` | passes |
| `pnpm test:build` | 27 tests, 27 pass: 12 on the built output and the compiled server, 15 planted-fault controls for the audit |
| `pnpm deps:audit` | no known vulnerabilities |
| `pnpm audit:standards --live http://127.0.0.1:4620` | passed: 0 errors, 0 warnings, 0 notices |
| Mutation check | 38 of 38 controls fail their test when removed: the 21 from the first build, re-run on 2026-10-29 against the changed code and tests, and 17 new ones (`SECURITY_VALIDATION.md`) |

Total: 199 tests (178 before this change). Every test uses in-memory or temporary stand-ins and a random port; none calls the
network or touches anything outside a temporary folder.

## What changed on 2026-10-29, and how each part was checked

| Change | How it was checked |
|--------|--------------------|
| Palette moved from yellow, black and purple to yellow and black only. Night is a black page with a yellow band, day is a yellow page with a black band | `tests/unit/contrast.test.ts`: every colour token's hue must sit in the yellow range (fails if a purple, blue or flat grey comes back; proved by mutation), 29 measured pairs in both themes, the design record's tables equal the stylesheet, the fallback block equals the night values. Real browser: 0 axe violations at 390 and 1440 in both themes. Hallmark's pixel contrast check (below) |
| Hero band with the search, a row of common problems, the vehicle box under the search | `tests/ui/browse.test.tsx` (hero structure, the common-problem links and their hiding once a search or category is used, vehicle box present while loading). Real browser: the search box's bottom edge is at 508 px of 844 on a phone and 483 px of 900 on desktop, in both themes |
| Help screen at `/help`, linked from the safety strip on every screen: safety steps, nearby links, a summary to read out and copy | `tests/ui/help.test.tsx` (8 tests: opens and takes focus, emergency line and no self link, no catalog request, ticks and persistence, map-search links only, summary built and cleaned, copy success, refused or missing clipboard), route tests, `tests/unit/validators.test.ts` for the note cleaner. Real browser: ticks with the keyboard, a reload keeps them, the typed summary is built, and **Copy summary was pressed and the real clipboard was read back** in both themes at 390 and 1440 |
| Repair steps are tickable with the next one marked; a summary panel on results that need a shop or a tow | `tests/ui/fix.test.tsx` (4 new tests, including corrupt stored ticks and a refused copy) |
| The Help copy moved to its own file so it stays out of the first load | `tests/build/artefact.test.mjs`: the Help text is absent from the first-load scripts and present in a lazy one (the positive control, PRC-10); the budget is below |

## Bundle and budgets (PERF-02, PERF-16, PERF-17)

| Item | Measured | Budget |
|------|----------|--------|
| JavaScript on the first screen | 248,965 bytes (entry 20,380, React 218,729, two shared files 9,856) | 250,000 |
| Headroom | **1,035 bytes.** It was 3,614 before this change. Adding to the first screen needs a matching saving or another split | |
| Largest script file | 218,729 bytes (React, its own file so a deploy does not invalidate it) | 250,000 |
| Problem catalog and its check | 35,970 bytes, a separate file loaded when a screen needs it | not in the first load |
| Result, tick list, Help, diagnose, legal and not-found screens | separate files (1.9 to 7.3 kB each), prefetched when the browser is idle | not in the first load |
| First screen CSS | 19 kB before compression in two files | |
| Total transferred for the first screen, brotli | 176 KiB including the Latin font file | |
| Longest request chain the first screen waits on | 3: the document, the entry script, the catalog file | 3 |
| Font fallback | Arial at 97.9% size, ascent 89.9%, descent 21.5%, measured against Archivo in Chrome | |

How the headroom was kept: the first attempt put 250,225 bytes on the first screen and `tests/build` failed, as it should. The
Help copy (about 1.8 kB of text that only lazily loaded screens use) was moved from `content.model.json` into `help.model.json`,
the same pattern as the legal text, instead of raising the budget.

`tests/build/artefact.test.mjs` fails the build if the first-screen JavaScript passes 250,000 bytes, if any script file does, if
the catalog, legal or Help text is in the first load, if any file under `/assets` lacks a content hash, or if a brotli or gzip twin
is missing or does not decompress to the original.

## Real browser (TEST-10), Google Chrome, production build served by the compiled server

Run by `scripts/browser-check.mjs`; 100 page states = 10 screens (home, a search, the two questions, the likely cause, a fixable
result, a tow result, a shop result, Help, Privacy, not found) x 5 widths (320, 390, 768, 1024, 1440) x 2 themes. Screenshots from
the run are kept outside the repository.

| Check | Result |
|-------|--------|
| Content pushed past the screen edge (per-element bounds, not `scrollWidth`) | 0 in 100 states |
| Console errors or warnings | 0 |
| Failed requests (status 400 or more, or a network failure) | 0 |
| Content security policy violations (a listener in each page) | 0 |
| axe-core, WCAG 2.0, 2.1 and 2.2 level A and AA plus best-practice rules, at 390 and 1440, both themes, plus the Help screen after interaction | 0 violations |
| Interactions in a real browser (ticking, typing, the common-problem link, a real copy to the clipboard read back) | 32 of 32 pass |
| Keyboard | Tab starts at the skip link, then the wordmark, theme, the Help link, the two ways in, search, vehicle, then each common problem; every focused control has a solid 3 px ring |
| Reduced motion | the screen entrance animation shortens to 0.01 ms |
| Throttled load: 4x CPU slowdown, 1.6 Mbit/s, 150 ms latency, 390 px wide | LCP 444 to 472 ms over four runs, CLS 0, slowest interaction 40 to 48 ms |

What these do not prove: axe reports overlapping layers as "needs review" rather than a violation, so contrast was also checked
by recomputing every colour pair from the stylesheet (`tests/unit/contrast.test.ts`) and by Hallmark's pixel check. The
interaction figure is the slowest of the few clicks and keystrokes the script makes, not a field INP. The throttled numbers are one
machine's lab numbers, not field data. Windows returns clipboard text with CRLF line breaks, so the clipboard check compares the
words with line endings made alike; the app writes plain line feeds.

Two harness faults were found and fixed while building the check, and are recorded so they are not mistaken for app faults: the
script first granted the wrong clipboard permission names, which made Chrome deny the write (the app correctly showed "Could not
copy", which also exercised the refusal path in a real browser), and it used Puppeteer's `$eval` helper, which the standards audit
flags because its `eval(` scan cannot tell it from the real thing. The audit rule was left strict and the script changed.

Positive controls (`scripts/browser-controls.mjs`, unchanged): a planted image with no alt text and a nameless button are reported
by axe, a planted 2000 px element is found by the bounds check, and a planted inline script and a script from another origin each
raise a policy violation. The new interaction block was seen to report failures in this work (eight false failures from the two
faults above), so it cannot pass silently.

## Design lint

Hallmark (open source, MIT; commit 8f6969f, skill version 2.0.0) was run in its app-screen scope with `--genre modern-minimal`.

| Run | Result |
|-----|--------|
| Static tier over `src/` (65 files) | 0 FAIL, 0 REFLEX, 0 WARN |
| Render tier on nine live screens (home, a search, the two questions, the likely cause, a fixable, a tow and a shop result, Help, Privacy) at 1280, 1440 and 1920 wide plus full pages at 1440 and 375 | 0 FAIL, 0 REFLEX, 0 WARN |
| Positive controls | the same two tiers run on Hallmark's own known-bad fixtures report 10 FAIL and more, so a clean result is not a tool that cannot fail |

How the render tier was run, and why: it reads the colour posture from the stylesheet. The production build strips the stamp
comment from its minified CSS, so run against the built server it falls back to its strict "restrained" default and reported three
REFLEX findings on gate 23 (the accent covered 13 to 16% of the screen, which is the yellow hero band doing what the design says).
The stamp declares `posture: committed`, so the render tier was pointed at the Vite dev server, which serves the stylesheet with its
comments, and the stamp is not shipped to visitors. Declaring the posture is the tool's own mechanism for a design whose colour is a
surface, not an accent sprinkled on a neutral page.

Hallmark's finish review reads the rendered screens for what no script measures. It prescribes a fresh-context subagent; none was
spawned, so it was done in-thread and is recorded as such. It found two things, both fixed: the home screen on a wide display left
a side rail holding only the two-way switch beside an empty column, and the safety strip on result screens was wider than the
content under it. The home is now one centred column like the Help screen, and the strip is capped to the content width.

## What the stand-ins and the lab cannot prove

- A real reverse proxy and real TLS. The https rules are proved against forwarded headers from a trusted and an untrusted peer.
- Browsers other than Chrome. Edge and Brave were driven through the same journeys earlier on 2026-10-29, on the previous purple
  design, and passed; they were not re-run on the yellow and black design. Firefox could not be launched headless in this
  environment and has not been tested. Also untested: Safari, a real phone, real network conditions, and a screen reader in use.
- That the advice is right for a given vehicle. The catalog's wording rules and the rule that no `help` problem tells the driver
  to drive are tested; the facts were written from general knowledge and have not been reviewed by a mechanic.
- That the Copy button works in every browser. It was proved in Chrome on Windows. The clipboard API needs a secure context (https
  or localhost); on a page that lacks one the button reports that it could not copy and leaves the text selectable.
- Field performance. No users exist yet.

## Not verified

Strix; a deployment; the Privacy and Terms text with a lawyer; the name "Roadsmith" against trademarks (a web search found no
product of that name, which is not a clearance); the advice with a qualified mechanic; Firefox and Safari; the yellow and black
design in Edge and Brave.

## Re-running

```
pnpm check && pnpm test && pnpm build && pnpm test:build && pnpm audit:standards
pnpm start                                    # then the browser check, in another terminal:
TOOLS_DIR=<folder with puppeteer-core and axe-core> CHROME_PATH=<chrome> OUT=<folder> node scripts/browser-check.mjs
```
