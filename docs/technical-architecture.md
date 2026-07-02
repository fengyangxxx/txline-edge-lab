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
- `/api/odds/validation`
- `/api/scores/stat-validation`

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
- execution gate result
- exact TxLINE fields used
- canonical proof digest over the normalized signal payload
- live validation readiness fields when TxLINE message ids or validation URLs are
  present

## Proof Readiness

The app does not claim replay data is a live chain proof. Replay packets receive
a deterministic digest so judges can verify that the UI, exported evidence JSON,
and submission packet are all describing the same normalized signal payload.

When the live TxLINE adapter receives `MessageId`, SSE id, or explicit validation
URLs, the same proof panel switches to `live-validation-ready` and records:

- the message id or stream id;
- an odds validation route suitable for a `validate_odds` check;
- a score/stat validation route suitable for a `validate_stat` check;
- the canonical normalized payload used by the agent decision.

This keeps the demo honest while making the live path ready for the validation
style used by proof-first competitors.

## Execution Model

The app never places wagers. Qualified positive signals open synthetic paper
positions with fixed stake sizing. Positions are marked to current odds and can
enter `open`, `take-profit`, or `risk-cut` states. The ledger applies explicit
paper-only rails: +24 units take profit and -12 units risk limit per synthetic
position, so the replay benchmark reflects capped agent behavior instead of
uncapped mark-to-market swings.

The execution gate is intentionally stricter than signal generation. A signal is
visible whenever the model detects movement, but paper execution requires:

- positive implied-probability movement;
- confidence above the configured minimum;
- non-score-chase trigger;
- at least 16 source books/providers;
- consensus gap at or below 50 synthetic bps, to avoid chasing overheated moves.

Each synthetic position also records a CLV proxy:

```text
(current implied probability - entry implied probability) * 10,000
```

Positive CLV means the paper entry beat the later marked price; negative CLV is
shown directly rather than hidden.

## Why This Is Production-Oriented

- deterministic decision path;
- proof-readiness panel with replay digest and live validation routes;
- CLV proxy and replay benchmark in the evidence packet;
- no hidden LLM judgment in the critical path;
- session-only credentials;
- audit-friendly evidence export;
- clean separation between feed adapter, signal engine, and UI;
- replay mode for reproducible demos;
- live mode for real TxLINE streams when credentials are available.
