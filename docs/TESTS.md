# Testing Overview

Quick reference for the current test suites, how to run them, and where new
tests should live.

## Table of Contents
- [Test Suites](#test-suites)
- [Running Tests](#running-tests)
- [Adding New Tests](#adding-new-tests)
- [Troubleshooting](#troubleshooting)

## Test Suites

### Broadcast Channel Harness
- **Path:** `src/dev-dashboard/__tests__/state-broadcaster.test.ts`
- **Type:** lightweight TypeScript script (no Jest/Vitest)
- **Purpose:** validates the typed message catalog and transport behaviour for
  the dev dashboard broadcaster.

### Game Configurator Dashboard (legacy manual test)
- **Path:** `deprecated/__tests__/game-configurator/`
- **Type:** manual dashboard harness served over HTTP.
- **Purpose:** end-to-end check of the orchestrator generation flow and visual
  inspection of LLM output.
- **Status:** still useful for exploratory testing, but not part of automated CI.

## Running Tests

### Broadcast Channel Harness
```bash
npx ts-node --swc src/dev-dashboard/__tests__/state-broadcaster.test.ts
```
This uses `ts-node` with SWC transpilation to execute the script directly. A
non-zero exit indicates a failing assertion.

### Game Configurator Dashboard (legacy)
```bash
cd deprecated/__tests__/game-configurator
python -m http.server 8080
```
Then open `http://localhost:8080` in a browser. Follow the on-screen workflow to
generate configurations and inspect results.

## Adding New Tests
- Co-locate focussed TypeScript harnesses beside the feature (`src/.../__tests__`).
- Reuse the lightweight assertion helpers pattern shown in the broadcaster test.
- If you need a full test runner (Jest/Vitest), add the dependency and create a
  separate npm script so existing tooling is unaffected.
- For manual dashboards or visual harnesses, place them under `deprecated/__tests__`
  (or a new `manual-tests/` directory) and include a README with startup steps.

## Troubleshooting
- **Missing ts-node:** `npm install --save-dev ts-node @swc/core` (or run via
  `npx` as shown above).
- **Broadcast channel script fails immediately:** ensure you compiled recent
  TypeScript changes—lint errors can prevent the harness from running.
- **Manual dashboard blank page:** confirm the HTTP server is running and that
  the browser allows cross-origin requests for local resources.
- **Need deterministic fixtures:** copy relevant mock data into the test folder
  so tests do not rely on network calls or live LLM responses.

Document any new suites here so other contributors can discover and run them
quickly.

