import assert from "node:assert/strict";
import fs from "node:fs";

const packet = JSON.parse(fs.readFileSync("artifacts/submission-packet.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");

assert.equal(packet.product, "TxLINE Edge Lab");
assert.equal(packet.track, "Trading Tools and Agents");
assert.equal(packet.compliance.real_money_wagers, false);
assert.equal(packet.compliance.custody_or_escrow, false);
assert.equal(packet.compliance.requires_reviewer_wallet_or_payment, false);

assert.ok(packet.txline_endpoints.includes("/api/odds/stream"));
assert.ok(packet.txline_endpoints.includes("/api/scores/stream"));
assert.ok(packet.txline_endpoints.includes("/api/odds/validation"));
assert.ok(packet.txline_endpoints.includes("/api/scores/stat-validation"));

assert.match(packet.replay.trace_sha256, /^[a-f0-9]{64}$/);
assert.ok(packet.agent.signals_generated >= 6, "expected replay signals");
assert.ok(packet.agent.replay_benchmark.qualified_signals >= 1, "expected qualified signals");
assert.ok(packet.agent.replay_benchmark.proof_traces >= 6, "expected proof traces");

const proof = packet.proof_readiness.latest_signal_proof;
assert.ok(proof.digest.startsWith("fnv1a32:"), "latest signal proof digest missing");
assert.equal(proof.mode, "replay-digest");
assert.match(proof.replayNotice, /not presented as on-chain/i);
assert.match(packet.proof_readiness.live_validation_contract.odds_validation, /validate_odds/);
assert.match(packet.proof_readiness.live_validation_contract.score_validation, /validate_stat/);

assert.ok(!readme.includes("Current submission blockers"), "README still contains stale blocker text");

console.log(
  JSON.stringify(
    {
      verified: true,
      replay_trace_sha256: packet.replay.trace_sha256,
      latest_signal_digest: proof.digest,
      qualified_signals: packet.agent.replay_benchmark.qualified_signals,
      proof_traces: packet.agent.replay_benchmark.proof_traces
    },
    null,
    2
  )
);
