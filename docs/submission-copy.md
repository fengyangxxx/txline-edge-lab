# Superteam Submission Copy

Use this as the base text for final QA and submission.

## Project Title

TxLINE Edge Lab

## Track

Trading Tools and Agents

## Public GitHub Repo

https://github.com/fengyangxxx/txline-edge-lab

## MVP / Live Demo URL

https://fengyangxxx.github.io/txline-edge-lab/

## Demo Video

https://raw.githubusercontent.com/fengyangxxx/txline-edge-lab/068cef0a28ddd742e299b39c1268e2a278f5c66d/artifacts/txline-edge-lab-demo.mp4

## Short Description

TxLINE Edge Lab is an autonomous World Cup odds-signal console. It consumes
TxLINE-shaped odds and score streams, detects sharp repricing, consensus
divergence, and score-driven market moves, then opens synthetic paper positions
only when deterministic thresholds are crossed. It is designed for analysis and
agent explainability, not wagering execution.

## What It Uses From TxLINE

- `/api/fixtures/snapshot` for fixture setup.
- `/api/odds/stream` for live odds movement.
- `/api/scores/stream` for score and phase repricing context.
- Guest JWT and API token headers for the live adapter.

## Key Highlights

- Replay-first demo so judges can evaluate without funding a wallet or waiting
  for a live match.
- Live-ready SSE adapter using TxLINE auth headers in the same app flow.
- Deterministic confidence model with visible evidence rows for every signal.
- Paper-only portfolio with no custody, deposits, payments, or betting orders.
- Exportable JSON packet for judging and technical review.

## Compliance / Risk Statement

The app does not place real-money wagers, custody funds, create betting
transactions, or require reviewers to buy tokens. Live credentials are entered
only for the browser session and are not persisted to localStorage,
sessionStorage, cookies, or backend storage.

## Verification Summary

- `npm run smoke`: PASS.
- `npm run packet`: PASS.
- `npm run build`: PASS.
- Desktop browser smoke: PASS.
- Mobile browser smoke: PASS.

## Final QA Reminder

Do not submit this form until the exact form fields have been reviewed in a QA
gate log ending with `QA_DECISION: PASS`.
