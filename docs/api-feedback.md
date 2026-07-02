# TxLINE API Feedback

## What Worked Well

- The World Cup documentation is clear about the free tier, required subscription
  activation, and the separation between guest JWT and API token.
- SSE is the right default shape for live odds and score streams. It keeps the
  product simpler than WebSocket orchestration for a one-way data feed.
- A normalized JSON schema makes it reasonable to write one adapter and run both
  replay and live streams through the same signal engine.
- Solana anchoring and Merkle-proof language gives serious teams a path to move
  from analytics to settlement verification without relying on a black-box oracle.

## Friction Found While Building

- Browser-only hackathon products need clear CORS expectations for
  `/api/odds/stream` and `/api/scores/stream`.
- Sample SSE payloads should be included near the stream docs. A single canonical
  odds packet and score packet would reduce adapter guesswork.
- The auth flow would benefit from a "judge-safe demo" note explaining whether
  participants should ship replay mode, redacted credentials, or a hosted backend
  proxy for public demos.
- The stream docs should explicitly name stable field casing for fixture id,
  participant odds, phase, score, source count, and any consensus fields.
- A short historical replay endpoint for the free tier would make judging more
  deterministic after match windows end.

## Suggested Additions

- `GET /api/fixtures/snapshot?competition=world-cup-2026`
- `GET /api/odds/replay?fixtureId=<id>&from=<ts>&to=<ts>`
- `GET /api/schema/odds-stream`
- `GET /api/schema/scores-stream`
- Example curl with both headers:

```bash
curl -N https://txline.txodds.com/api/odds/stream \
  -H "Authorization: Bearer <guest_jwt>" \
  -H "X-Api-Token: <activated_api_token>" \
  -H "Accept: text/event-stream"
```

## Product Feedback From This Build

TxLINE's strongest immediate use case is not only settlement. It is also
operator-grade market intelligence: detecting when consensus odds move, showing
why the agent acted, and preserving enough evidence for a trading team to audit
the decision later.
