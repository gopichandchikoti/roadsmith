# Security validation

Evidence for the controls in `AGENTS.md` Section 3 as they apply to Roadsmith. Dated 2026-10-28, on the first build, before any
deployment. It states what was run and what happened, not that the app "is secure".

## Method

1. Read the design for its trust boundaries and listed which security rows apply (`system_design.md` section 5).
2. Built each control with an attack test in the same step: `tests/security` for the server, `tests/unit` and `tests/ui` for the
   client, `tests/build` for the built files and the compiled server.
3. Proved each control by removal (AGENTS.md TEST-14): removed it once, ran only its test, required a failure, restored the file
   byte for byte, then ran the whole suite again. Table below.
4. Ran the standards audit, the dependency audit, a scan of the built bundle, and a real-browser run with a content-security-policy
   listener, against the production build served by the compiled server.
5. Gave every scanner a positive control (PRC-10): the audit script, the bundle scan and the browser scans each have a test or a
   script that plants a fault and requires it to be reported.

## Results at a glance

| Check | Result |
|-------|--------|
| Typecheck (`tsc -b`, strict, tests included), oxlint with warnings denied, Biome format | clean |
| `pnpm test:security` | 43 tests, 43 pass |
| `pnpm test:server` | 11 tests, 11 pass |
| `pnpm test:unit`, `pnpm test:ui` | 58 and 39 tests, all pass |
| `pnpm test:build` | 27 tests, all pass (12 on the built output, 15 planted-fault controls for the audit script) |
| `pnpm audit:standards --live` against the running production server | 0 errors, 0 notices |
| `pnpm audit --prod` | no known vulnerabilities (6 production dependencies) |
| Mutation check | 21 of 21 controls fail their test when removed |
| Browser run (Chrome, 80 page states) | 0 content security policy violations, 0 console errors or warnings, 0 failed requests |

## The three audit prompts, applied

| Prompt | Applies? | What was done |
|--------|----------|---------------|
| Exposed API keys and secrets | Yes | No secret exists: the server reads five settings, none sensitive (`tests/security/config.test.ts` pins the exact set). The built bundle is scanned for seven key and token formats and for server setting names (`tests/build/artefact.test.mjs`, with a planted-sample control). `.env.example` holds names only and the audit fails on a value. The Git history scan is not applicable yet: **the repository has no commits**. Run the history search below after the first commit and before the first push |
| Database security and row level security | Not applicable | There is no database, no Supabase and no stored user data. If one is added, SEC-16, SEC-45 and SEC-46 apply from that change |
| Broken authorization and IDOR | Not applicable in the sense asked | There are no accounts, no per-user records and no server routes that take an identifier. The identifiers in addresses (`/fix/:id`, `/diagnose/:symptom/:n`) name public catalog entries. They must be lowercase slugs or one or two digits (`tests/unit/route.test.ts`, 18 hostile forms), and are only looked up in the bundled catalog, so an unknown one shows a not-found state (`tests/ui/fix.test.tsx`, `diagnose.test.tsx`) |

## Findings

| ID | Severity | Finding and evidence | Fix | Proof |
|----|----------|----------------------|-----|-------|
| SV-01 | Low | The source-map refusal tested the raw path with `endsWith('.map')`. On a case-insensitive file system (Windows, macOS) `app.js.MAP`, `app.js.Map` and `app.js%2Emap` name the same file and would have been served. Found by the first draft of the attack test. No map is ever built (`sourcemap: false`), so it could matter only if one were added | The check runs on the decoded path, without regard to case, inside the path resolver (`server/middlewares/static-assets.ts`) | `tests/security/attacks.test.ts` "a source map is never served" (7 forms); fails when the check is removed |
| SV-02 | Low | `PORT` was read with `Number()`, so `' 80'`, `'1e3'` and `'0x50'` were accepted as ports. Found by the config test | Digits only, 1 to 65535 (`server/config/index.ts`) | `tests/security/config.test.ts` "the port must be a whole number" (11 forms) |
| SV-03 | Info (tooling) | The audit script's unused-dependency check searched `package.json`, which names every dependency, so it could never report one. Found by a planted dependency | `package.json` is excluded from the search | `tests/build/audit.test.mjs` "warnings: scratch files, long files, unused dependencies". **The same check exists in `Study-entertain-library/scripts/audit-standards.mjs` and has the same flaw. It was not changed (outside this repository). Owner decision (ARCH-24)** |
| SV-04 | Info (tooling) | The browser run's overflow check read `scrollWidth`. The page uses `overflow-x: clip`, which keeps `scrollWidth` at the viewport width, so the check could not see content cut off at the edge. The planted control showed it | Replaced by a per-element bounds check | `scripts/browser-controls.mjs` plants a 2000 px element and requires it to be found |

No finding above Low. Nothing was found to be exploitable in a deployment, because nothing has been deployed.

## Controls proved by removal (TEST-14)

Each row: the guard was removed, only the named test was run, and it failed; the file was then restored byte for byte (its hash was
compared) and the full suite was run again and passed.

| Control | Test that fails without it |
|---------|---------------------------|
| Source maps refused (SEC-12) | attacks: a source map is never served |
| Hidden files refused (SEC-15) | attacks: hidden files and folders are never served |
| Path confinement, normalised path and root check together (SEC-17, SEC-34) | attacks: path traversal in every encoding |
| Only GET and HEAD (SEC-09) | attacks: only GET and HEAD are answered |
| Security headers set (SEC-11) | headers-and-limits: every kind of response carries the headers |
| No `unsafe-inline` in the policy (SEC-11) | headers-and-limits: the content security policy has no unsafe-eval or unsafe-inline |
| Redirect goes to the configured origin, not the Host header (SEC-11) | production: a forged Host header cannot steer the redirect |
| Proxy hops configured, never assumed (SEC-29) | headers-and-limits: a client cannot dodge the limit by inventing forwarding headers |
| Rate limit refuses over budget (SEC-08) | headers-and-limits: a client over its budget is refused with 429 |
| Production needs a trusted proxy (SEC-23) | config: production refuses to start without a trusted proxy |
| Error text kept out of the log (SEC-25, SEC-38) | errors: a provider error that holds a key leaves it out |
| SVG served in a sandbox (SEC-30) | attacks: the type of a file comes from its name |
| Vehicle text cleaned (SEC-06) | unit: a vehicle drops markup |
| Links built with `URLSearchParams` (SEC-20) | unit: text typed by the driver can never change the host |
| Route parts must be slugs (SEC-06) | unit: anything that is not a plain lowercase slug is not found |
| Storage failures survived, every guard defeated together | ui: the app still works when the browser refuses to store anything |
| Catalog categories checked (SEC-06) | unit: the catalog loader refuses a file that is not shaped as expected |
| Stored checklist ticks range checked (SEC-06) | unit: stored checklist ticks |
| Outbound links open with no opener or referrer | ui: every link that leaves the app |
| Loading announced politely (UI-13) | ui: a skeleton with one polite status |
| Focus moves to the new heading (UI-31) | ui: following a link moves focus to the new heading |

Controls that are properties of absent code (no cookie is ever set, no body is ever parsed, no outbound request is ever made) have
no guard to remove. They are proved by tests that observe the behaviour: no `Set-Cookie` on any route, a 5 MB body is refused
unread, and the audit fails on any `fetch(` without a timeout in server code.

## Checked and found sound

- Traversal in 19 encodings plus 10 whole-segment forms, hidden files in 7 forms, private project paths, source maps in 7 forms:
  none reached a file outside the built client or a hidden or map file.
- Content types follow the file name: HTML bytes named `.png` are announced as `image/png` with `nosniff`; SVG is served with
  `default-src 'none'; sandbox`.
- CORS is closed: no `Access-Control-*` header on any reply, including to four hostile origins and a preflight, which is 405.
- No cookie is set on any route; a forged cookie is ignored.
- Production over plain http: reads are redirected to the configured origin (never the Host header); writes are 426; a forged
  `X-Forwarded-Proto` from an untrusted peer is ignored.
- The limiter is per client behind a trusted proxy, shared when no proxy is trusted, resets with an injected clock, and holds at
  most the configured number of clients.
- Errors use one body and a fixed message; a failing disk, a provider error holding a key, SQL text and a rejected string leave no
  path, key or stack in the reply or the log.
- The built bundle holds no key, no key name and no environment read, names only the two link hosts and the standard XML and error
  addresses, and ships no source map.
- Every interpolated visitor string (search, vehicle) is rendered as text by React; no raw HTML sink exists (the audit fails on one).

## Not fixed, and why

- The in-memory limiter is per process. Several copies each keep their own count; documented in `OPERATIONS.md`. Acceptable because
  the limit only stops floods and nothing depends on an exact count.
- HSTS has no `includeSubDomains`. The owner decides when the domain is known (`OPERATIONS.md`, deployment action 5).
- `jsdom` is pinned to 26.1.0 because 30.x needs a Node API that Node 22.13 lacks. A development dependency only.

## Deployment actions still required

See `OPERATIONS.md`, "Deployment actions". In short: a TLS-ending proxy, `PUBLIC_ORIGIN`, `TRUST_PROXY`, the health probe, and the
HSTS decision.

## Not covered

- Strix, the autonomous penetration test (AGENTS.md 7.4), has not been run. It needs Docker, an LLM key and the owner's written
  go-ahead.
- No deployment: nothing was tested behind a real proxy, with real TLS or on a real host.
- Only Chrome was driven. Edge, Firefox and Safari were not, so their handling of the content security policy and of
  `light-dark()` is untested here.
- Screen readers were not run by hand; accessibility was checked with axe-core and the keyboard order only.
- The Privacy and Terms text was not reviewed by a lawyer.

## How to re-run

```
pnpm check && pnpm test && pnpm build && pnpm test:build
pnpm deps:audit
pnpm start &                              # then, in another terminal:
pnpm audit:standards --live http://127.0.0.1:4620
git log -p --all | grep -E "AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY" | wc -l
```

The last line is the history search for token formats and private keys. It prints a count, never a value, and is not an entropy
scanner. Run it once there is history. The mutation check is described above; its script is a small loop that replaces one line,
runs one test and restores the file, and it is not kept in the repository.
