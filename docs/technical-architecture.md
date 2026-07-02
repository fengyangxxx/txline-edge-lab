# Technical Architecture

## Product

`TxLINE Edge Lab` is an autonomous signal console for the Superteam / TxODDS
World Cup hackathon Trading Tools and Agents track.

It is intentionally built as a browser-first product so judges can open it as a
deployed website without installing a trading stack or creating a funded wallet.

## Data Flow

```text
TxLINE odds/scores stream or deterministic replay
  -> packet normalizer
  -> implied probability calculator
  -> signal engine
  -> paper execution ledger
  -> dashboard + evidence export
```

## TxLINE Integration Points

- `/api/fixtures/snapshot`
- `/api/odds/stream`
- `/api/scores/stream`

The code includes a live SSE adapter in `src/txline.js`. It expects:

- `Authorization: Bearer <guest_jwt>`
- `X-Api-Token: <activated_api_token>`
- `Accept: text/event-stream`

The adapter is session-only. The app does not write credentials to localStorage,
IndexedDB, cookies, or a backend.

## Replay Mode

Replay mode exists so the product remains reviewable when no live match is active
or when a judge does not have TxLINE credentials. The replay packets mirror the
same shape the normalizer expects from TxLINE:

- fixture id
- phase
- score
- decimal odds for participant 1 / draw / participant 2
- consensus gap
- volume delta
- source count
- event narrative

## Signal Model

For every fixture, the engine stores recent odds history and converts decimal odds
to implied probabilities. A signal is emitted when a new packet creates a material
change or informative event.

Confidence score:

```text
0.28 base
+ move score
+ consensus divergence score
+ volume delta score
+ source-count score
+ short trend score
+ event/narrative score
```

The engine records a full evidence object for the latest signal:

- move bps
- configured sensitivity threshold
- consensus gap
- volume delta
- source count
- score breakdown
- confidence threshold
- exact TxLINE fields used

## Execution Model

The app never places wagers. Qualified positive signals open synthetic paper
positions with fixed stake sizing. Positions are marked to current odds and can
enter `open`, `take-profit`, or `risk-cut` states.

## Why This Is Production-Oriented

- deterministic decision path;
- no hidden LLM judgment in the critical path;
- session-only credentials;
- audit-friendly evidence export;
- clean separation between feed adapter, signal engine, and UI;
- replay mode for reproducible demos;
- live mode for real TxLINE streams when credentials are available.
