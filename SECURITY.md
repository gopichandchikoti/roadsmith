# Security policy

## What Roadsmith protects

Roadsmith has no accounts, no database and no secrets, so the things worth protecting are narrow: the integrity of the safety
advice a driver is shown, the privacy of what the driver types (a vehicle name, kept in the browser only), and the server from
being used to reach files it should not serve or to hurt other people's service.

## Controls

The controls are named by the rule they meet in `AGENTS.md` Section 3, and each has an attack test in `tests/security` (or, for
the client, in `tests/unit` and `tests/ui`). The mapping, with the rows that do not apply and why, is in `system_design.md`
section 5. In summary: production start-up fails fast without a public https origin and a named proxy (SEC-23, SEC-29); no secret
exists (SEC-01, SEC-24); every response carries a strict content security policy with no inline script or style, no framing, no
referrer and a locked-down permissions policy (SEC-11); the server answers only `GET` and `HEAD`, sends no CORS header and sets no
cookie (SEC-09, SEC-10, SEC-27, SEC-28); static files are confined to the built client, hidden files and source maps are never
served and the content type follows the file name (SEC-12, SEC-15, SEC-17, SEC-30, SEC-34); requests are rate limited per client
with a bounded memory (SEC-08, SEC-40); errors use one fixed body and logs never hold an error message (SEC-25, SEC-37, SEC-38);
text the visitor controls is cleaned before it is stored or put in a link, and links go only to two fixed hosts (SEC-06, SEC-20).

## Reporting a vulnerability

Report it privately to the owner of this repository. **No private reporting address has been named yet**: until the owner adds
one here, contact the owner directly and do not open a public issue with details. Please include what you did, what you saw and
the address of the deployment. Do not test against a deployment you do not have permission to test.

## Supported versions

Only the latest commit on the default branch is supported. The project has not had a tagged release.

## Running the security checks

```
pnpm test:security     # the attack tests
pnpm test:build        # the built bundle and the compiled server, and the audit script's own controls
pnpm audit:standards   # add --live <url> to probe a running server
pnpm deps:audit        # advisories for production dependencies
```

`SECURITY_VALIDATION.md` records what was run, what it found and how to run it again.

## Known limits

- The autonomous penetration test described in `AGENTS.md` 7.4 has not been run.
- The server has not been run behind a real reverse proxy, and nothing has been deployed.
- The dependency audit covers production dependencies only. Build tools were not audited for advisories, and none ships in the
  bundle (checked in `tests/build`).
- The app cannot prove that advice is right for every vehicle. It says so, and treats anything uncertain as a reason to get help.
- The Privacy and Terms text has not been reviewed by a lawyer.
