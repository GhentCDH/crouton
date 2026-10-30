# Security Policy

## Supported versions

crouton is pre-1.0 (`0.0.1-alpha.*`). Only the **latest published alpha** of each `@ghentcdh/crouton-*` package
receives security fixes. Please upgrade before reporting.

| Version              | Supported |
| -------------------- | --------- |
| latest `0.0.1-alpha` | ✅        |
| older alphas         | ❌        |

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for security problems.**

Report privately through GitHub:
[**Report a vulnerability**](https://github.com/GhentCDH/crouton/security/advisories/new)
(Security tab → _Advisories_ → _Report a vulnerability_).

Please include:

- the affected package(s) and version
- a description of the issue and its impact
- steps to reproduce or a minimal proof of concept (e.g. a `resource.json` + request)
- any suggested fix, if you have one

## What to expect

- Acknowledgement within **5 working days**.
- An initial assessment (accepted / needs more info / declined) within **10 working days**.
- For accepted reports we prepare a fix, publish a new alpha, and disclose via a GitHub Security Advisory.
  You are credited unless you ask not to be.

## Scope

In scope: the packages in this repository (`packages/*`) and the code they generate (API routes, Prisma access,
schema endpoints, Vue components).

Out of scope: the `examples/` apps when run with their default demo credentials, the dev-only resource editor
endpoints when exposed outside local development, and vulnerabilities in third-party dependencies that have no
crouton-specific impact (report those upstream).
