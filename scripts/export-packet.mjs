import fs from "node:fs";
import path from "node:path";
import { buildReplayUpdates, fixtures } from "../src/sample-data.js";
import { createInitialState, ingestFixture, ingestUpdate, totalPnl } from "../src/engine.js";

const state = createInitialState({ sensitivityBps: 90, minConfidence: 0.62, autoExecute: true });
fixtures.forEach((fixture) => ingestFixture(state, fixture));
buildReplayUpdates().forEach((update) => ingestUpdate(state, update));

const packet = {
  product: "TxLINE Edge Lab",
  track: "Trading Tools and Agents",
  generated_at: new Date().toISOString(),
  demo_mode: "deterministic replay with live-ready TxLINE SSE adapter",
  txline_endpoints: ["/api/fixtures/snapshot", "/api/odds/stream", "/api/scores/stream"],
  replay: {
    fixtures: fixtures.length,
    updates: buildReplayUpdates().length
  },
  agent: {
    execution: "paper-only",
    sensitivity_bps: state.settings.sensitivityBps,
    min_confidence: state.settings.minConfidence,
    signals_generated: state.signals.length,
    positions_opened: state.positions.length,
    paper_pnl: Number(totalPnl(state).toFixed(2))
  },
  latest_signal: state.signals[0],
  compliance: {
    real_money_wagers: false,
    custody_or_escrow: false,
    requires_reviewer_wallet_or_payment: false,
    legal_posture: "analytics and paper execution only"
  },
  submission_assets: {
    repository: "TBD",
    deployed_url: "TBD",
    demo_video: "TBD",
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
