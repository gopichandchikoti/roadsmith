# Roadsmith

Roadside fix finder. A driver who has stopped with a car problem names it, or answers two questions about a symptom, and gets a
plain verdict: fix it here, drive carefully to a shop, or get help without driving. Each result lists the tools and parts to
have ready, short steps to tick off, a video search for the driver's vehicle and a map search for help nearby. A Help page, one
tap from every screen, walks through making the car safe, opens a map search for a tow or a mechanic and builds the few lines to
read out on the phone, with a button to copy them.

It is a web app that works from a phone to a wide desktop screen. It is two colours, signal yellow and black: the night theme is a
black page with a yellow band, and the day theme is a yellow page with a black band.
There are no accounts, no database, no uploads and no analytics. The driver's vehicle text, theme and checklist ticks stay in
their own browser, and the Help page's summary is never stored or sent.

## Run it

Requirements: Node.js 22.5 or newer and pnpm 11.

```
pnpm install
pnpm dev          # open http://localhost:4621 (the client; the server on 4620 only serves a built copy)
```

For a production-style run:

```
pnpm build        # typecheck, compile the server, bundle the client, write brotli and gzip twins
pnpm start        # serves the build on http://localhost:4620
```

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Vite dev server (4621, proxies `/api`) and the server with reload (4620) |
| `pnpm build` | Typecheck, compile `server/` to `dist-server/`, build `src/` to `dist/`, precompress |
| `pnpm start` | Run the compiled server (needs a build) |
| `pnpm typecheck` | `tsc -b` over the client, the server and the tooling, tests included |
| `pnpm lint` | oxlint with warnings treated as errors |
| `pnpm format`, `pnpm format:check` | Biome |
| `pnpm check` | Typecheck, lint and format check |
| `pnpm test` | `test:unit`, `test:ui`, `test:server`, `test:security` |
| `pnpm test:build` | The built output (budgets, files, bundle contents, the compiled server) and the audit script's planted-fault controls. Run `pnpm build` first |
| `pnpm deps:audit` | `pnpm audit --prod` |
| `pnpm audit:standards` | The standards audit (`--live <url>` also probes a running server) |
| `pnpm motion:generate` | Regenerates the spring easings in `src/themes/motion.css` |

A real-browser check of the production build (screenshots at five widths in both themes, an accessibility scan, keyboard focus,
throttled load) is `scripts/browser-check.mjs`; its header says how to run it.

## Settings

The server reads five settings, listed in `.env.example`: `NODE_ENV`, `PORT`, `HOST`, `PUBLIC_ORIGIN` and `TRUST_PROXY`. None is
a secret. **In production the server refuses to start** unless `PUBLIC_ORIGIN` is a plain `https` origin and `TRUST_PROXY` names
the proxy that ends TLS in front of it. `OPERATIONS.md` has the deployment steps.

## Where things are

| Path | Holds |
|------|-------|
| `src/` | The client: `api`, `components`, `features`, `hooks`, `pages`, `routes`, `templates`, `themes`, `utils`, `validators` |
| `src/catalog.model.json` | The 37 problems, their verdicts, tools, steps and the symptom questions |
| `src/content.model.json`, `src/legal.model.json` | Every other visible string, including the Privacy and Terms text |
| `server/` | The Express server: `config`, `middlewares`, `routes`, `helpers` |
| `tests/` | `unit`, `ui`, `server`, `security`, `build`, and `setup` helpers |
| `scripts/` | The standards audit, the spring generator, build precompression, the browser check |
| `system_design.md` | The design record, architecture, trust boundaries and the security applicability table |
| `SECURITY.md`, `SECURITY_VALIDATION.md` | The security policy and the evidence |
| `VALIDATION.md` | What was run, with counts, and what was not |
| `OPERATIONS.md` | Deployment, monitoring and the deployment actions |
| `THIRD_PARTY_NOTICES.md` | Licences of bundled third-party code and fonts |

## Important

Roadsmith gives general guidance for common problems. It cannot see a car and is not a mechanic or an emergency service. The app
says so on every result and in its Terms. If anyone is in danger, call the local emergency number first.

Contributors and coding agents: read `AGENTS.md` first.
