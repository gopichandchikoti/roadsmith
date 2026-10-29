# Operations

How to run, deploy and watch Roadsmith. The app holds no data of its own: there is nothing to back up or restore.

## What runs

One Node process (`node dist-server/index.js`) serves the built client from `dist/` and one API route, `GET /api/health`. It
makes no outbound requests, has no database and writes nothing to disk. It listens on `HOST:PORT` (default `0.0.0.0:4620` in
production). Any number of copies can run side by side, because no state is shared.

## Settings

| Name | Production rule | Default |
|------|-----------------|---------|
| `NODE_ENV` | Set to `production` | development |
| `PUBLIC_ORIGIN` | Required. A plain `https` origin with no path, for example `https://roadsmith.example.com` | none |
| `TRUST_PROXY` | Required. Proxy IPs or CIDR ranges, comma separated, or `loopback`. A hop count is refused | none |
| `PORT` | Digits only, 1 to 65535 | 4620 |
| `HOST` | Any interface address | `0.0.0.0` in production, `127.0.0.1` otherwise |

No setting is a secret. A start-up error names the setting and never prints its value.

## Deployment actions

Everything that must be set or done before a version is deployed (AGENTS.md PRC-12). This is the first deployment, so all of it is
new.

1. **Put the server behind a reverse proxy or platform router that ends TLS.** The server does not terminate TLS itself.
2. **Set `NODE_ENV=production`, `PUBLIC_ORIGIN` and `TRUST_PROXY`.** Without any of the last two the process exits with a message
   naming the setting. `TRUST_PROXY` must be the address the proxy connects from, so client addresses (and with them the rate
   limit) are read from the proxy's forwarded header and from nowhere else. Never a bare number.
3. **Make the proxy overwrite `X-Forwarded-For` and set `X-Forwarded-Proto`.** A request that arrives without
   `X-Forwarded-Proto: https` is treated as plain http: reads are redirected (308) to `PUBLIC_ORIGIN`, writes are refused (426).
4. **Point the platform's health probe at `/api/health`.** It answers over plain http as well, so a probe works without TLS.
5. **Decide HSTS scope.** The server sends `Strict-Transport-Security: max-age=31536000` without `includeSubDomains`. Add that
   directive at the proxy only if every subdomain of the domain is https.
6. **Build in the pipeline, not on the server:** `pnpm install --frozen-lockfile`, `pnpm build`, then ship `dist/`, `dist-server/`
   and `package.json` with the production dependencies.

Sessions that end: none, because there are no sessions. Rollback: redeploy the previous build; nothing stored needs undoing.

## Caching and compression

`/assets/*` files carry a content hash and are sent `public, max-age=31536000, immutable`. The HTML shell and every other file
are sent `no-cache` with an `ETag`, so a deploy is seen at once. A `.br` or `.gz` file written at build time is sent when the
browser accepts it. If a CDN sits in front, let it cache `/assets/*` and revalidate everything else.

## Monitoring

`GET /api/health` answers `{ "status": "ok", "service": "roadsmith", "signInRequired": false }` and nothing else. The server's own
log is stderr only, one JSON line per server fault with a request id, the method, the path and the error name and code. It never
logs a request body, a header, a cookie or an error message. The request id is also returned in the `X-Request-Id` header and in
every error body, so a reported failure can be found in the log. The platform or proxy may keep its own access log; the Privacy
page says so.

## Limits

A client is allowed 600 requests a minute; past that it receives 429 with `Retry-After` and `RateLimit-*` headers. The count is
held in memory for at most 5000 clients and is lost on restart. Only `GET` and `HEAD` are answered; every other method is 405.

## Changing the catalog

The problems are in `src/catalog.model.json`. `pnpm test:unit` checks its shape, its wording rules and the safety rule that a
problem marked `help` never tells the driver to drive. Add a problem there, add any new symptom to `triage`, run the tests,
rebuild and redeploy.
