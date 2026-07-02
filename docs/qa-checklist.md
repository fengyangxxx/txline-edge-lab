# Submission QA Checklist

This is not a final QA PASS. It is the checklist to complete before asking for
final bounty QA.

## Required Superteam Fields

- Public GitHub repo: https://github.com/fengyangxxx/txline-edge-lab
- MVP link: https://fengyangxxx.github.io/txline-edge-lab/
- Demo video: https://raw.githubusercontent.com/fengyangxxx/txline-edge-lab/6f5c0632806080334598343e0c526abb65ae333f/artifacts/txline-edge-lab-demo.mp4
- Technical documentation: `docs/technical-architecture.md`
- X profile: optional
- TxLINE API feedback: `docs/api-feedback.md`

## Acceptance Coverage

- Working deployed website, not a mockup.
- TxLINE data is primary input path.
- Replay mode is deterministic and documented.
- Live adapter exists for `/api/odds/stream` and `/api/scores/stream`.
- Evidence packet includes `/api/odds/validation` and
  `/api/scores/stat-validation` readiness.
- Latest signal includes canonical proof digest and clearly labels replay mode
  as deterministic replay, not live chain attestation.
- Replay benchmark includes qualified signals, proof trace count, paper PnL, and
  CLV proxy.
- Paper execution gate is stricter than signal generation and documents
  anti-chase rules.
- Demo video under five minutes.
- Repo public and includes source code.
- Documentation explains core idea, highlights, and endpoints used.
- API feedback included.

## Risk Checks

- No real wagering.
- No custody or escrow.
- No request for judge to buy token, fund wallet, or pay third-party cost.
- No credentials committed.
- Browser app does not persist JWT/API token.
- Build passes.
- Smoke test passes.
- Desktop/mobile screenshots available.

## Commands

```bash
npm install
npm run smoke
npm run packet
npm run verify
npm run build
```
