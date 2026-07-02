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
npm run packet
npm run dev
npm run build
```

`npm run packet` writes `artifacts/submission-packet.json`, which summarizes the
deterministic replay, generated signals, latest signal evidence, and remaining
submission asset placeholders.

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

## Submission docs

- `docs/technical-architecture.md`
- `docs/api-feedback.md`
- `docs/demo-script.md`
- `docs/submission-plan.md`
- `docs/qa-checklist.md`
- `docs/deployment.md`
- `docs/submission-copy.md`

## Current submission blockers

- Public GitHub repository URL is still `TBD`.
- Deployed demo URL is still `TBD`.
- Demo video URL is still `TBD`.
- Final Superteam form submission must not happen until the QA gate passes.
