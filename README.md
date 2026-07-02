# TxLINE Edge Lab

Autonomous signal console for the Superteam / TxODDS World Cup hackathon track:
`Trading Tools and Agents`.

The app ingests World Cup odds and score-style packets, detects sharp movement and
consensus divergence, and opens a synthetic paper-trading position only when a
deterministic threshold is crossed. It does not place wagers, custody funds, or
send any betting transaction.

## Why this fits the track

- Uses TxLINE-shaped odds and scores streams as the primary input.
- Includes a live-ready adapter for `GET /api/odds/stream` and
  `GET /api/scores/stream` using `Authorization: Bearer <jwt>` and
  `X-Api-Token: <apiToken>`.
- Runs autonomously once replay or live streams are connected.
- Provides a visible decision trail, paper portfolio, and exportable evidence JSON
  for the demo video and submission packet.

## Local commands

```bash
npm install
npm run smoke
npm run live-check
npm run packet
npm run verify
npm run scorecard
npm run dev
npm run build
```

`npm run packet` writes `artifacts/submission-packet.json`, which summarizes the
deterministic replay, generated signals, latest signal evidence, proof-readiness
trace, CLV proxy, and submission assets. `npm run verify` checks that the packet
contains the required TxLINE stream/validation endpoints, replay trace SHA,
proof traces, live validation-contract evidence, and no real-money execution
posture. `npm run scorecard` writes `artifacts/judge-scorecard.json`, a
judge-readable rubric map of what the submission proves.

## Public links

- Repository: https://github.com/fengyangxxx/txline-edge-lab
- Live demo: https://fengyangxxx.github.io/txline-edge-lab/
- Demo video: https://raw.githubusercontent.com/fengyangxxx/txline-edge-lab/6f5c0632806080334598343e0c526abb65ae333f/artifacts/txline-edge-lab-demo.mp4

## Live TxLINE setup

The World Cup free tier requires:

1. a Solana subscription transaction for the free tier;
2. guest JWT from `/auth/guest/start`;
3. API token from `/api/token/activate`.

Paste the JWT and API token into the app's Live panel for a session-only
connection. The browser app does not use localStorage or persist credentials.

## Demo posture

The default replay mode is intentional: it guarantees judges can open and evaluate
the product without buying tokens, creating wallets, or waiting for a live match.
The live adapter is in the same code path and can be shown after TxLINE free-tier
credentials are activated by the human participant.

## Proof and CLV posture

Each generated signal carries a canonical digest over the normalized fixture,
market, score, selected outcome, and confidence inputs. In replay mode this is
labeled as a deterministic replay digest only. When a live TxLINE packet provides
a message id or validation URL, the same panel switches to validation-ready mode
and shows the expected odds/stat validation route and TxOracle instruction
(`validate_odds` / `validate_stat`).

The paper portfolio also records a CLV proxy for every synthetic position, using
the change in implied probability between entry odds and the current mark. That
lets judges inspect whether the agent's signals are directionally beating later
prices without requiring any real wager.

Paper execution uses explicit review-safe rails: +24 units take profit and -12
units risk limit per synthetic position. The app shows the capped state instead
of presenting uncapped mark-to-market swings as tradable results.

The agent also separates detection from execution. Score-chase moves, overheated
consensus gaps, weak source breadth, and sub-threshold confidence still appear in
the signal tape, but the paper ledger waits for confirmation instead of opening a
position.

## Judge evidence pack

The repository includes machine-checkable artifacts so reviewers do not have to
trust screenshots:

- `artifacts/submission-packet.json`: replay SHA, signal evidence, paper benchmark,
  proof traces, CLV proxy, and final submission asset refs.
- `artifacts/live-contract-check.json`: synthetic TxLINE SSE packet normalized
  through the same live adapter, proving `MessageId`, odds validation URL, score
  validation URL, and TxOracle instruction handling without secrets.
- `artifacts/judge-scorecard.json`: rubric checklist and competitor-gap response.
- `docs/judge-evidence.md`: human-readable index of the checks and limitations.

## Submission docs

- `docs/technical-architecture.md`
- `docs/api-feedback.md`
- `docs/demo-script.md`
- `docs/submission-plan.md`
- `docs/qa-checklist.md`
- `docs/deployment.md`
- `docs/submission-copy.md`
- `docs/judge-evidence.md`
