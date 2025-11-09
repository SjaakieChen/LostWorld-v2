# Dev Dashboard Message Bus

The dev dashboard relies on a typed message bus to exchange data with the running
game. The system lives under `src/dev-dashboard/` and is made up of three pieces:

1. `messages.ts` – the single source of truth for message types, payload shapes,
   and helpers (`buildMessage`, `summarizeMessage`, etc.).
2. `state-broadcaster.ts` – the producer-side helper used inside the game
   contexts. It consumes the catalog, handles logging, and writes to an injected
   transport.
3. `transport.ts` – the transport abstraction. A BroadcastChannel transport is
   provided for runtime usage and a `MemoryTransport` powers unit tests.

## Table of Contents
- [Adding a new message type](#adding-a-new-message-type)
- [Running the broadcaster tests](#running-the-broadcaster-tests)

## Adding a new message type

1. **Extend the catalog** – add a payload interface and register it inside
   `DashboardMessagePayloadMap` in `messages.ts`. Provide a `summarize` helper
   that logs a one-line description of the payload.
2. **Expose a broadcast helper** – if game code needs a convenience helper,
   extend `StateBroadcaster` with a strongly typed method that ultimately calls
   `this.send(type, payload)`.
3. **Handle it in the dashboard** – import the typed message in
   `DashboardApp.tsx` and update the switch statement so the UI reflects the new
    data.
4. **Capture it in tests** – update or add assertions in
   `src/dev-dashboard/__tests__/state-broadcaster.test.ts` to keep the broadcast
   helper covered by the in-memory transport.

## Running the broadcaster tests

The test suite is a lightweight harness that exercises the broadcaster with the
mock transport. Run it with `ts-node` (fetched automatically via `npx`):

```bash
npx ts-node --swc src/dev-dashboard/__tests__/state-broadcaster.test.ts
```

All tests must pass before shipping changes to the message bus.

