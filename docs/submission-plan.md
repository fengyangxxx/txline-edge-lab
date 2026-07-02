# Superteam Submission Plan - TxLINE Edge Lab

## Track

Trading Tools and Agents

## Product thesis

Trading desks need a calm console that converts a raw sports data feed into an
auditable decision trail. TxLINE Edge Lab watches World Cup odds and score updates,
detects unusual implied-probability movement, and records the exact reason an
autonomous paper-trading agent would act or stand down.

## MVP scope

- Replay and live-ready TxLINE feed adapter.
- Sharp movement detector.
- Consensus divergence detector.
- Deterministic confidence score.
- Paper-only execution ledger.
- Exportable evidence JSON for demo and QA.
- No user funds, no wagers, no custody, no third-party wallet requirement for a
  reviewer.

## TxLINE endpoints referenced

- `/api/fixtures/snapshot`
- `/api/odds/stream`
- `/api/scores/stream`

## Submission assets still needed

- Public GitHub repo.
- Deployed website.
- Demo video under five minutes.
- Technical docs describing the agent model, TxLINE endpoints, and feedback on API
  ergonomics.
- Human-owned Superteam submission by an eligible participant.

## Demo video outline

1. Open dashboard in replay mode.
2. Show the fixture board and implied probability chart.
3. Let an odds update trigger a sharp movement signal.
4. Show the agent decision, confidence score, and paper position.
5. Export evidence JSON.
6. Switch to Live panel and explain how TxLINE JWT/API token connects the same
   engine to `/api/odds/stream` and `/api/scores/stream`.

## Compliance guardrail

The tool is analytics and paper execution only. It does not solicit bets, place
orders, transfer assets, escrow funds, or settle wagers.
