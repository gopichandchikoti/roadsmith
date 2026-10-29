# Validation

What was run on the first build, with counts, and what could not be. Dated 2026-10-28. Machine: Windows 11, Node 22.13.1,
pnpm 11.28.3, Google Chrome 156.0.8078.73. Where a check proves less than it sounds like it does, it says so (PRC-04, PRC-11).

## Commands

| Command | Result |
|---------|--------|
| `pnpm typecheck` | clean: client, server and tooling projects, strict, tests included |
| `pnpm lint` | clean: oxlint, warnings denied |
| `pnpm format:check` | clean: Biome, 132 files |
| `pnpm test:unit` | 58 tests, 58 pass |
| `pnpm test:ui` | 39 tests, 39 pass (the real app in jsdom with the real router and providers) |
| `pnpm test:server` | 11 tests, 11 pass (the real app on a random port) |
| `pnpm test:security` | 43 tests, 43 pass |
| `pnpm build` | passes |
| `pnpm test:build` | 27 tests, 27 pass: 12 on the built output and the compiled server, 15 planted-fault controls for the audit |
| `pnpm deps:audit` | no known vulnerabilities |
| `pnpm audit:standards --live http://127.0.0.1:4620` | passed: 0 errors, 0 warnings, 0 notices |
| Mutation check | 21 of 21 controls fail their test when removed (`SECURITY_VALIDATION.md`) |

Total: 178 tests. Every test uses in-memory or temporary stand-ins and a random port; none calls the network or touches anything
outside a temporary folder.

## Bundle and budgets (PERF-02, PERF-16, PERF-17)

| Item | Measured | Budget |
|------|----------|--------|
| JavaScript on the first screen | 246,386 bytes (entry 17,909, React 218,729, two shared files 9,748) | 250,000 |
| Largest script file | 218,729 bytes (React, its own file so a deploy does not invalidate it) | 250,000 |
| Problem catalog and its check | 35,970 bytes, a separate file loaded when a screen needs it | not in the first load |
| Result, diagnose, legal and not-found screens | separate files (3.4 to 9.4 kB), prefetched when the browser is idle | not in the first load |
| First screen CSS | 17 kB before compression | |
| Total transferred for the first screen, brotli | 173 KiB including the Latin font file | |
| Longest request chain the first screen waits on | 3: the document, the entry script, the catalog file. Idle prefetches add a level, but nothing waits on them (measured from the browser's network events) | 3 |
| Font fallback | Arial at 97.9% size, ascent 89.9%, descent 21.5%, measured against Archivo in Chrome. An earlier estimate of 104% was wrong and was replaced | |

`tests/build/artefact.test.mjs` fails the build if the first-screen JavaScript passes 250,000 bytes, if any script file does, if
the catalog or legal text is in the first load, if any file under `/assets` lacks a content hash, or if a brotli or gzip twin is
missing or does not decompress to the original.

## Real browser (TEST-10), Google Chrome, production build served by the compiled server

Run by `scripts/browser-check.mjs`; 80 page states = 8 screens × 5 widths (320, 390, 768, 1024, 1440) × 2 themes. A representative
28 files are in `validation/screenshots/` with the full machine-readable report.

| Check | Result |
|-------|--------|
| Content pushed past the screen edge (per-element bounds, not `scrollWidth`) | 0 in 80 states |
| Console errors or warnings | 0 |
| Failed requests (status 400 or more, or a network failure) | 0 |
| Content security policy violations (a listener in each page) | 0 |
| axe-core, WCAG 2.0, 2.1 and 2.2 level A and AA plus best-practice rules, at 390 and 1440, both themes | 0 violations |
| Keyboard | Tab starts at the skip link, then the wordmark, theme, vehicle, the two ways in, search, category, then each problem; every focused control has a solid 3 px ring |
| Reduced motion | the screen entrance animation shortens to 0.01 ms |
| Throttled load: 4× CPU slowdown, 1.6 Mbit/s, 150 ms latency, 390 px wide | LCP 440 to 492 ms over three runs, CLS 0, slowest interaction 40 to 48 ms |

What these do not prove: axe reports overlapping layers as "needs review" rather than a violation, so contrast was also checked
by recomputing every colour pair from the stylesheet (`tests/unit/contrast.test.ts`) and by Hallmark's pixel check below. The
interaction figure is the slowest of the few clicks and keystrokes the script makes, not a field INP. The throttled numbers are one
machine's lab numbers, not field data.

Positive controls (`scripts/browser-controls.mjs`): a planted image with no alt text and a nameless button are reported by axe, a
planted 2000 px element is found by the bounds check (and the old `scrollWidth` check is blind to it, because the page clips), and
a planted inline script and a script from another origin each raise a policy violation and the inline one does not run.

## Design lint

Hallmark (open source, MIT; commit 8f6969f, skill version 2.0.0) was run in its app-screen scope with `--genre modern-minimal`.

| Run | Result |
|-----|--------|
| Static tier over `src/` (55 files) | 0 FAIL, 0 REFLEX, 0 WARN |
| Render tier on six screens at widths from 320 to 1920 (its own list: 320, 375, 414, 768, 1024, 1280 and 1920, with folds at 1280, 1440 and 1920) | 0 FAIL, 0 REFLEX, 0 WARN on five; one WARN on the get-help result (yellow covers 5.6% of a 1280 × 800 viewport against a 5% guide) dismissed on the record in `src/themes/tokens.css`, because the solid yellow verdict row is the one signal that screen exists to give |

Findings the render tier made and that were fixed: a selected label whose legibility depended on a layer behind it (now a tint
with an edge and the same ink in every state), a control label that wrapped at 320 px, a fourth font weight, no `:active` or
`:disabled` styling. Its fresh-context finish review (a subagent) was not run, and its judged gates were not walked beyond what the
lint measures.

## What the stand-ins and the lab cannot prove

- A real reverse proxy and real TLS. The https rules are proved against forwarded headers from a trusted and an untrusted peer.
- Browsers other than Chrome, a real phone, real network conditions, and a screen reader in use.
- That the advice is right for a given vehicle. The catalog's wording rules and the rule that no `help` problem tells the driver
  to drive are tested; the facts were written from general knowledge and have not been reviewed by a mechanic.
- Field performance. No users exist yet.

## Not verified

Strix; a deployment; the Privacy and Terms text with a lawyer; the name "Roadsmith" against trademarks (a web search found no
product of that name, which is not a clearance); the advice with a qualified mechanic; Edge, Firefox and Safari.

## Re-running

```
pnpm check && pnpm test && pnpm build && pnpm test:build && pnpm audit:standards
pnpm start                                    # then the browser check, in another terminal:
TOOLS_DIR=<folder with puppeteer-core and axe-core> CHROME_PATH=<chrome> OUT=<folder> node scripts/browser-check.mjs
```
