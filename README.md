# Playwright Concepts

Published Playwright lessons for QA engineers. Each lesson explains one idea, then points at a TypeScript script you can run.

This repository grows one published lesson at a time. The list below contains only the lessons already pushed.

## Layout

| Path | Purpose |
| --- | --- |
| `Articles/` | One published lesson per file, in learning order. |
| `Automation Scripts/` | The Playwright test for that lesson. |
| `fixtures/` | The local demo server, sample order, and files used by the tests. |
| `support/` | Shared test helpers used as later lessons are published. |
| `Config/env.example` | Environment variable names. Playwright does not load this file. |

The demo listens on `127.0.0.1` only. The tests do not call a public website.

## Local demo account

This account exists only inside the fixture process. It is not a production credential.

| Username | Password | Name |
| --- | --- | --- |
| `ada` | `local-demo` | Ada Lovelace |

The values live in `fixtures/accounts.json`. Do not reuse the password anywhere else.

## Install

From this directory, with Node.js 20 or newer:

```text
npm install
npm run install:browsers
npm run typecheck
```

`npm install` installs the pinned dev dependencies, including Playwright. `install:browsers` downloads Chromium for that Playwright version. `typecheck` runs `tsc --noEmit`. Playwright transforms TypeScript itself when you run tests.

## Run

`playwright.config.ts` starts the demo server when you run tests. You can also start it alone with `npm run demo`.

```text
npm test
npm run typecheck
```

## Lessons

1. [Assertions in Playwright](Articles/01-assertions-in-playwright.md) — [script](Automation%20Scripts/01-assertions-in-playwright.spec.ts)
2. [Locators and Strict Mode](Articles/02-locators-and-strict-mode.md) — [script](Automation%20Scripts/02-locators-and-strict-mode.spec.ts)
