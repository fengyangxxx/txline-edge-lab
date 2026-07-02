import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildReplayUpdates, fixtures } from "../src/sample-data.js";
import { canonicalJson, createInitialState, ingestFixture, ingestUpdate, replayBenchmark, totalPnl } from "../src/engine.js";

const state = createInitialState({ sensitivityBps: 90, minConfidence: 0.62, autoExecute: true });
fixtures.forEach((fixture) => ingestFixture(state, fixture));
const replayUpdates = buildReplayUpdates();
replayUpdates.forEach((update) => ingestUpdate(state, update));

const replayTraceSha256 = crypto.createHash("sha256").update(canonicalJson(replayUpdates)).digest("hex");
const latestProof = state.signals[0]?.evidence?.proof ?? null;

const packet = {
  product: "TxLINE Edge Lab",
  track: "Trading Tools and Agents",
  generated_at: new Date().toISOString(),
  demo_mode: "deterministic replay with live-ready TxLINE SSE adapter",
  txline_endpoints: [
    "/api/fixtures/snapshot",
    "/api/odds/stream",
    "/api/scores/stream",
    "/api/odds/validation",
    "/api/scores/stat-validation"
  ],
  replay: {
    fixtures: fixtures.length,
    updates: replayUpdates.length,
    trace_sha256: replayTraceSha256,
    posture:
      "Replay SHA proves deterministic demo reproducibility. It is not claimed as a live TxLINE chain attestation."
  },
  agent: {
    execution: "paper-only",
    sensitivity_bps: state.settings.sensitivityBps,
    min_confidence: state.settings.minConfidence,
    paper_take_profit: 24,
    paper_risk_limit: -12,
    paper_gate: "positive move, confidence pass, not score-chase, sourceCount >= 16, consensusGap <= 50",
    signals_generated: state.signals.length,
    positions_opened: state.positions.length,
    paper_pnl: Number(totalPnl(state).toFixed(2)),
    replay_benchmark: replayBenchmark(state)
  },
  proof_readiness: {
    latest_signal_proof: latestProof,
    live_validation_contract: {
      odds_validation: "Use TxLINE live message id or validation URL, then run txoracle validate_odds.",
      score_validation: "Use TxLINE score/stat validation packet, then run txoracle validate_stat.",
      replay_guardrail: "When no live validation identifiers exist, the app labels proof mode as replay-digest only."
    }
  },
  latest_signal: state.signals[0],
  compliance: {
    real_money_wagers: false,
    custody_or_escrow: false,
    requires_reviewer_wallet_or_payment: false,
    legal_posture: "analytics and paper execution only"
  },
  submission_assets: {
    repository: "https://github.com/fengyangxxx/txline-edge-lab",
    deployed_url: "https://fengyangxxx.github.io/txline-edge-lab/",
    demo_video:
      "https://raw.githubusercontent.com/fengyangxxx/txline-edge-lab/6f5c0632806080334598343e0c526abb65ae333f/artifacts/txline-edge-lab-demo.mp4",
    technical_docs: "docs/technical-architecture.md",
    api_feedback: "docs/api-feedback.md",
    demo_script: "docs/demo-script.md"
  }
};

const outDir = path.resolve("artifacts");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "submission-packet.json");
fs.writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`);
console.log(outPath);
