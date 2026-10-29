# Roadsmith system design

This is the design record (AGENTS.md UI-01), the architecture and the trust boundaries. It is written before the components
and updated with them. Where a statement here and the code disagree, the code is checked first and this file is corrected
(PRC-11).

## 1. Purpose, audience and journeys

Roadsmith helps a driver who has stopped with a car problem decide what to do next: fix it here, drive carefully to a shop, or
stop and get help. It is read on a phone, often one handed, in glare or at night, on a weak signal and under stress. Every
decision below follows from that.

Journeys:

1. **I know the problem.** Open the app, optionally type the vehicle, search or filter, tap a problem, read the verdict, tick
   off tools, follow the steps.
2. **Help me find it.** Pick the symptom, answer one more question, read the most likely cause and the alternatives, open one.
3. **Get help.** From any "get help" result, open a map search for a tow, a mechanic or a parts store, or search video
   tutorials for the vehicle.
4. **Help now.** From a link on every screen, open one page that makes the car safe (a tickable list), opens a map search for
   a tow or a mechanic, and builds the few lines to read out on the phone, which the driver can copy.

Signature object: the **verdict ladder** on the result screen. Three rows (fix it here, drive carefully to a shop, get help)
with the current one marked, so the answer is readable at a glance and without colour.

## 2. Design record

### 2.1 Idea

Road signage translated into a help desk. A warning sign is a black symbol on signal yellow (ISO 3864-4 assigns signal yellow
to warning signs, with black for the symbol), so the palette is two hues and nothing else: **signal yellow** and a **warm black**.
Every neutral is a tint or shade of one of them (a test checks each colour's hue). Type is a heavy, condensed grotesque for the
verdict and the headings. No decoration: no gradient, no pattern, no hazard stripe.

The two themes share one structure and swap which hue is the plate:

- **Night** is a black page. Yellow is the highlight: the hero band, the primary action, the get-help verdict, links, selection
  edges, progress and the focus ring. Reading text is a pale butter, not pure yellow, because long text in full yellow glares.
- **Day** paints the page signal yellow with black text, the sign-board look that stays legible in sun. The plates flip: the hero
  band, the primary action and the get-help verdict become black with yellow text, and panels are a lighter butter.

The verdict is also carried by wording, row position, icon and the weight of its surface (hairline, heavy edge, solid plate),
never by hue, because there is only one hue. A selected control keeps the same ink in every state and shows its selection as a
raised tint with a heavy edge, so its text never depends on a layer behind it.

Posture (Hallmark): committed. Large yellow or black areas are surface tokens (`--color-band`, `--color-accent`, `--color-paper`),
not an accent sprinkled on a neutral page. Two themes from one set of tokens (UI-03): **night** (dark) and **day** (light).
Both follow `prefers-color-scheme`; a three-way control (system, light, dark) overrides it and is stored in the browser.

Research that informed it (read 2026-10-29; general guidance, not measurements of this app): the safety-sign standard above;
design write-ups that describe yellow as the accent on a black ground, for buttons and highlights, with the advice to test the
exact pairs because pure yellow text on black glares; and roadside-assistance write-ups that ask for calm, structured, short
intake with no forced sign-in. The measured numbers below are this app's own.

### 2.2 Colour tokens and measured contrast (UI-02, UI-30)

Measured with the WCAG 2.2 relative luminance formula. `tests/unit/contrast.test.ts` recomputes every pair below from
`src/themes/tokens.css` and fails the build if one drops under its minimum.

| Role | Token | Night | Day |
|------|-------|-------|-----|
| Page | `--color-paper` | `#0E0C07` | `#FCDE4D` |
| Panel, input | `--color-paper-2` | `#17150D` | `#FEF0A9` |
| Raised, selected | `--color-paper-3` | `#232016` | `#FFF9D3` |
| Hairline | `--color-rule` | `#35301F` | `#C8AD3F` |
| Control edge | `--color-rule-strong` | `#877738` | `#61510C` |
| Text | `--color-ink` | `#F8F2CC` | `#0E0C07` |
| Secondary text | `--color-ink-2` | `#D8CFA2` | `#352E11` |
| Quiet text | `--color-muted` | `#B1A572` | `#52471F` |
| Primary action fill | `--color-accent` | `#FFD21F` | `#0E0C07` |
| Text on the primary action | `--color-accent-ink` | `#0E0C07` | `#FFD21F` |
| Hero band | `--color-band` | `#FFD21F` | `#0E0C07` |
| Text on the band, and the search field inside it | `--color-band-ink` | `#0E0C07` | `#FFD21F` |
| Links, selection edge, progress, brand mark | `--color-highlight` | `#FFD21F` | `#0E0C07` |
| Caution surface | `--color-signal-tint` | `#302701` | `#FFF9D3` |
| Focus ring | `--color-focus` | `#FFD21F` | `#0E0C07` |

| Pair | Minimum | Night | Day |
|------|---------|-------|-----|
| ink on paper | 4.5 | 17.28 | 14.61 |
| ink on paper-2 | 4.5 | 16.15 | 16.99 |
| ink on paper-3 | 4.5 | 14.39 | 18.38 |
| ink-2 on paper | 4.5 | 12.44 | 10.12 |
| ink-2 on paper-2 | 4.5 | 11.63 | 11.77 |
| ink-2 on paper-3 | 4.5 | 10.36 | 12.74 |
| muted on paper-2 | 4.5 | 7.39 | 8.01 |
| muted on paper-3 | 4.5 | 6.59 | 8.66 |
| highlight on paper | 4.5 | 13.49 | 14.61 |
| highlight on paper-3 | 4.5 | 11.24 | 18.38 |
| accent-ink on accent | 4.5 | 13.49 | 13.49 |
| band-ink on band | 4.5 | 13.49 | 13.49 |
| ink on band-ink | 4.5 | 17.28 | 13.49 |
| muted on band-ink | 4.5 | 7.91 | 6.36 |
| ink on signal-tint | 4.5 | 13.11 | 18.38 |
| highlight on signal-tint | 3 | 10.23 | 18.38 |
| paper on ink | 4.5 | 17.28 | 14.61 |
| rule-strong on paper (control edge) | 3 | 4.40 | 5.83 |
| rule-strong on paper-2 | 3 | 4.11 | 6.78 |
| rule-strong on paper-3 | 3 | 3.66 | 7.34 |
| accent on paper (the button against the page) | 3 | 13.49 | 14.61 |
| band on paper (the band against the page) | 3 | 13.49 | 14.61 |
| focus on paper | 3 | 13.49 | 14.61 |
| focus on paper-2 | 3 | 12.61 | 16.99 |

Rules that follow from the numbers: the accent and the band are the same two colours, swapped between themes, so the loudest
thing on a screen is always the one that is not the page colour (night: yellow on black, day: black on yellow). Signal yellow is
never text on the day paper (1.08:1 against it), so on day yellow is only ever the text on a black plate. Inside the hero band the
focus ring takes the band's text colour, because the page's ring is the band colour. The page colours are never pure white or pure
black (Hallmark 7a), and no neutral is a flat grey (22): each is a tint of the yellow, and `tests/unit/contrast.test.ts` fails
if any colour's hue leaves the yellow range.

### 2.3 Verdict treatment

| Verdict | Wording | Mark | Surface |
|---------|---------|------|---------|
| `fix` | Fix it here | one filled segment, wrench icon | raised tint, hairline edge |
| `limp` | Drive carefully to a shop | two filled segments, road icon | caution tint, heavy highlight edge |
| `help` | Get help | three filled segments, stop icon | solid plate (yellow at night, black by day), reversed text |

With one hue, colour cannot rank the three, so the weight of the surface does: a hairline, then a heavy edge, then a solid plate.
Each verdict also has its own words, its own icon and its own number of filled segments, and the ladder lists all three so the
position says how serious it is.

### 2.4 Type (UI-02, PERF-25)

One family, **Archivo** (variable, weight 100 to 900, width 62 to 125, OFL 1.1), self-hosted as a Latin WOFF2 subset with
`font-display: swap` and a fallback measured against it (Arial at 97.9% size with ascent 89.9% and descent 21.5%, measured in
Chrome, so the swap does not move the page). Width is the second voice: the wordmark and headings run condensed and heavy
(width 78, weight 800, with the word gap opened to 0.14em because the condensed width closes it); the two-way switch runs at
width 86 so its labels do not wrap at 320 px; body and the rest run at width 100. No other family loads. Three weights are in
use: 400 for reading, 700 for controls and labels, 800 for headings. Headings are one weight and one colour; labels are the body
face a step smaller, in sentence case, untracked (nothing is set in tracked capitals). Archivo is not in the usual defaults list
of the design tells (item 10).

Scale (ratio 1.2): 0.875, 1, 1.2, 1.44, 1.728 and 2.074 rem; body 1 rem at line height 1.55; running text is capped at 65ch.

### 2.5 Space, shape, depth

Spacing scale: 2, 4, 8, 12, 16, 24, 40, 64 and 96 px as `--space-*` tokens; component CSS uses no raw spacing length. Radius
scale: control 8 px, panel 12 px, pill for status chips. Depth comes from borders and tint steps, never from shadow. There are
no floating layers, so no shadow token is in use. Controls are at least 44 px tall.

### 2.6 Icons

**Tabler Icons** (MIT), imported only from `src/components/icons.ts`, stroke width 2, 24 px grid. They are chosen for their car
and road set (engine, brake, battery, tow truck), which a general set lacks. Icons that carry meaning have a text label beside
them; decorative ones are `aria-hidden`.

### 2.7 Motion (UI-20 to UI-24)

The three springs of AGENTS.md 2.4 are the only motion, generated into `src/themes/motion.css` by `pnpm motion:generate` from
`src/utils/spring.ts`.

| Spring | Use here |
|--------|----------|
| snappy | The sliding highlight on the two-way switch (a raised tint with a heavy edge), the checklist progress bars |
| smooth | A new screen settling in after navigation (a short rise and fade). The first screen of a visit does not animate |
| bouncy | Reserved for menus and dialogs; none exist, so it is generated and unused |

Only `transform` and `opacity` animate. There are no overlays, so the presence hook of UI-23 is not needed yet; the first
dialog or menu added must use it. Under `prefers-reduced-motion: reduce` travel and scale stop and no animation or transition runs
longer than 0.01 ms (the browser check measured the screen entrance at 1e-05 s). Nothing blocks input or delays content.

### 2.8 Voice

Plain, short, active, sentence case, second person. A step says what to do. Copy has no slogans, no dashes used as
punctuation, no middle-dot lists and no arrows in link text. Every visible string is in `src/content.model.json` or, for the
problem catalog, `src/catalog.model.json` (the content model for problems, loaded on demand). Units are given in both systems
where a figure matters (UI-11).

### 2.9 States (UI-13)

| Region | Loading | Empty | Error | Offline | Success |
|--------|---------|-------|-------|---------|---------|
| Problem list and result (catalog chunk) | skeleton rows and one polite status | no match for the search, with a clear action | plain message and a retry button | same message, says the signal may be weak | list or result |
| Search | none (local) | no problems match | none | none | filtered list |
| Checklist | none | none | none | none | "Everything is ready" announced politely |
| Unauthorised | not applicable: there are no accounts | | | | |

### 2.10 Design tells (AGENTS.md 2.2): decisions

An open-source design lint (Hallmark, app-screen scope) was also run over the code and the rendered screens; its result is in
`VALIDATION.md`.

| # | Decision |
|---|----------|
| 1 | No gradient anywhere. |
| 2 | Tabler, a considered choice for the car and road glyphs (2.6). |
| 3 | Paper is a tint of the yellow (a warm black at night, signal yellow by day), never pure white or black. |
| 4 | Signal yellow, warm black and tints of them only; no status colours at all. |
| 5 | No shadows; borders and tint steps. |
| 6 | The home screen is a search band, a row of common-problem links and a grouped list, not a row of cards. |
| 7 | No emoji. |
| 8 | No glass. |
| 9 | No em or en dashes in copy (checked by a test and the audit script). |
| 10 | Archivo, chosen for width and weight range (2.4). |
| 11 | No one-edge colour stripes; full borders and tints. |
| 12 | No invented testimonials, logos, statistics, video titles, channels or run times. |
| 13 | No bento grid. |
| 14 | No fake terminal or window chrome. |
| 15 | Copy states what a control does. |
| 16 | Plain list markers; no check-mark bullets (the checklist is a real checklist control). |
| 17 | No pricing. |
| 18 | The real app is the first screen. |
| 19 | Two radii and a pill. |
| 20 | Palette drawn from the subject: the warning-sign pair of signal yellow and black, not purple on black. |
| 21 | Skeleton rows and an announced status. |
| 22 | No orbs. |
| 23 | No grid or line backgrounds. |
| 24 | No sparkle icons. |
| 25 | No animated arrows. |
| 26 | Terms page, linked from the footer. |
| 27 | Privacy page, linked from the footer, accurate to the code. |
| 28 | Colour and border change on hover; no lift or tilt. |
| 29 | Accents pass contrast in both themes (2.2). |
| 30 | Palette chosen for the subject and measured. |

## 3. Architecture

### 3.1 Client (`src/`)

React 19 and TypeScript (strict), bundled by Vite. Layers follow ARCH-01: `pages` use `features` and `components`; `features`
use `components`, `hooks`, `api`, `utils`; `utils` use nothing.

- **Routes** (History API, ARCH-03): `/` (find by problem; `?q=` and `?category=` hold the search and filter), `/diagnose`,
  `/diagnose/:symptom`, `/diagnose/:symptom/:option`, `/fix/:id`, `/help`, `/privacy`, `/terms`; anything else is the not-found
  page. A tiny router in `src/routes` handles links, Back and Forward and moves focus to the page heading on navigation.
- **Code splitting** (PERF-10, PERF-15): only the shell and the browse screen are in the first load. The result, help, diagnose,
  legal and not-found screens are separate files, prefetched when the browser is idle (`src/routes/prefetch.ts`). A screen
  whose file cannot be downloaded shows an announced error with a retry, not a blank page (`ChunkBoundary`). React is its own
  file, so a deploy of the app does not make a visitor download it again.
- **Catalog** (`src/api/catalog.ts`, `catalog-file.ts`): the problem catalog and the code that checks it are one lazily loaded
  file. The check (`src/validators/catalog.ts`, no unchecked casts) runs when the file loads, so a malformed file is a failed load,
  never a half-drawn screen. The request is shared and cached for the session (PERF-23), its source is injected so tests can make
  it slow or fail (CODE-08), and hashed files are immutable for a year, so a second visit is served from the browser cache.
- **Preferences** (`src/features/preferences`, `src/hooks/usePreferences.ts`): vehicle text, theme choice. Stored in
  `localStorage` behind a guarded wrapper and re-validated on read, because stored text is untrusted input. Ticks (tools, repair
  steps and the safety list) live in `sessionStorage`, each under its own key, and are read back through one validator that drops
  anything that is not a small in-range number.
- **Help screen and the call sheet** (`src/pages/HelpPage.tsx`, `src/components/CallSheet.tsx`, `src/utils/summary.ts`): the
  summary a driver reads out is built on the screen from the vehicle text and a short note typed there (cleaned by
  `normalizeNote`, 120 characters at most). It is shown in a read-only text box and copied with the browser's clipboard API only
  when the button is pressed. It is never stored and never sent. A browser that refuses the copy says so and leaves the text
  selectable. The page reads nothing from the catalog, so it works when the catalog file cannot load.
- **Outbound links** (`src/utils/external-links.ts`): the only code that builds an address leaving the app. It builds two
  shapes, a YouTube results search and a Google Maps search, from fixed words and the validated vehicle text, with
  `URLSearchParams`.

### 3.2 Server (`server/`)

Node and Express 5. `createApp(config, deps)` returns the app without listening (ARCH-11), so tests start it on a random port.
It serves the built client and one API route, `GET /api/health`. It has no database, no outbound calls and no body parsing.
Order of middleware: request id, security headers, HTTPS rule (production), compression, flood guard, API, static files,
not-found, error handler. `config/` is the only reader of `process.env` (ARCH-10).

### 3.3 Build

`pnpm build` typechecks, compiles the server to `dist-server/`, builds the client to `dist/` with content-hashed files and
writes brotli and gzip twins. The server sends a twin when the browser accepts it, caches `/assets/*` for a year as immutable
and sends the HTML shell as `no-cache`.

## 4. Trust boundaries, roles and stored data

Boundaries: browser to server (requests are untrusted), browser storage to the app (stored text is untrusted and
re-validated), app to other sites (links the driver taps; nothing is sent by the app itself). There is no server to provider
boundary, no upload boundary and no account boundary.

Roles: one, an anonymous visitor. SEC-52: there is no shared writable data; the catalog changes only through a code change.

Stored data:

| Data | Where | Lifetime | Sent to the server |
|------|-------|----------|--------------------|
| Vehicle text | `localStorage` | until the visitor clears it | never |
| Theme choice | `localStorage` | until cleared | never |
| Tool, step and safety ticks | `sessionStorage` | until the tab closes | never |
| The note typed on the Help screen and the summary built from it | page memory only | until the page is left or reloaded | never |
| Server error lines (request id, method, path, error name) | server stderr | the host's log policy | not applicable |

The server sets no cookies. It reads no cookie, no body and no query string.

## 5. Security applicability

Every SEC row is either built and proved, or marked not applicable with the reason (AGENTS.md Section 3). Proof is in
`SECURITY_VALIDATION.md`.

| Rows | Status |
|------|--------|
| SEC-01, 02, 19, 25, 38, 48 | Applicable. No secrets exist; the bundle and the tracked files are scanned. |
| SEC-03, 04, 05, 21, 28, 43, 44 | Not applicable: no accounts, sessions or cookies. A test proves no `Set-Cookie`. |
| SEC-06, 41 | Applicable to the vehicle text and the route parameters; the server parses no body. |
| SEC-07 | Applicable. No raw HTML sinks; the audit script fails on one. |
| SEC-08, 40 | Applicable as the flood guard. No sign-in, upload, export or provider routes exist, so no tighter layers. |
| SEC-09, 37, 39 | Applicable: methods, one error body, a fixed health body. |
| SEC-10, 26, 27 | Applicable as closed CORS (no CORS headers at all) and no cookie-authenticated writes. |
| SEC-11, 12, 15, 17, 29, 30, 36 | Applicable: headers, no debug output, static confinement, proxy hops, content types by extension. |
| SEC-13, 14, 47 | Applicable: dependency audit and unused dependency scan. |
| SEC-16, 45, 46 | Not applicable: no database. |
| SEC-18, 31 to 35 | Not applicable: no uploads or destinations. Path confinement for static files (SEC-17, 34) is applicable. |
| SEC-20, 42 | Not applicable: the server makes no outbound requests. |
| SEC-22 | Applicable: every release records the audit. Strix has not run. |
| SEC-23, 24 | Applicable: production refuses a missing or non-https `PUBLIC_ORIGIN` and a bad `TRUST_PROXY`. No signing secret exists. |
| SEC-49 to 51 | Not applicable: no mobile build. |
| SEC-52 | Decided: no shared writable data. |

## 6. Performance budget

Initial JavaScript 250 KB or less before compression; every chunk 250 KB or less; no request chain longer than three on the
first screen; one preloaded font; no third-party request. `tests/build` fails the build when a budget is passed. The first
build measured 246,386 bytes of first-screen JavaScript; after the 2026-10-29 change (hero band, common problems, the shared safety
strip and the Help route) it is 248,965 bytes, 1,035 under the budget, with a longest first-screen chain of three requests (the
document, the entry script, the catalog file) and no third-party request. The headroom is thin on purpose to see: the Help screen's
text lives in `src/help.model.json` and the legal text in `src/legal.model.json`, both used only by lazily loaded screens, because
putting them in the main content file pushed the first screen to 250,225 bytes and failed the budget test. New first-screen code
needs a matching saving. Largest contentful paint, interaction delay and layout shift are measured
in a real browser and recorded in `VALIDATION.md`.

## 7. Accessibility

WCAG 2.2 AA. One `main` landmark, a skip link, a visible focus ring on every control that appears instantly, labels for every
input and icon button, full keyboard operation, touch targets of at least 44 px, layout from 320 px to 2560 px, zoom to 200%.
Route changes move focus to the page heading and update the document title. Loading and success messages use one polite live
region each.
