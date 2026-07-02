import assert from "node:assert/strict";
import fs from "node:fs";

const packet = JSON.parse(fs.readFileSync("artifacts/submission-packet.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");
const packageProof = JSON.parse(fs.readFileSync("artifacts/npm-package-proof.json", "utf8"));
const proofEnvelope = JSON.parse(fs.readFileSync("artifacts/solana-proof-envelope.json", "utf8"));

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

assert.equal(packet.live_contract.verified, true);
assert.equal(packet.live_contract.proof.mode, "live-validation-ready");
assert.match(packet.live_contract.proof.canonical_payload_sha256, /^[a-f0-9]{64}$/);
assert.match(packet.live_contract.proof.odds_validation, /\/api\/odds\/validation/);
assert.match(packet.live_contract.proof.score_validation, /\/api\/scores\/stat-validation/);
assert.equal(packet.live_contract.engine_decision.action, "paper-long");

assert.equal(packageProof.package_name, "txline-edge-lab");
assert.equal(packageProof.version, "0.1.0");
assert.ok(packageProof.bin.includes("bin/txline-edge-lab.mjs"), "CLI bin missing from package");
assert.match(packageProof.tarball_sha256, /^[a-f0-9]{64}$/);
assert.match(packageProof.integrity, /^sha512-/);
assert.ok(packageProof.cli_checks.includes("txline-edge-lab replay --json"));

assert.equal(proofEnvelope.attestation_type, "solana_memo_payload");
assert.equal(proofEnvelope.broadcast_status, "not_broadcast");
assert.match(proofEnvelope.memo_payload, /^txline-edge-lab:[a-f0-9]{64}$/);
assert.equal(proofEnvelope.evidence.compliance.paper_only, true);
assert.equal(proofEnvelope.evidence.compliance.no_broadcast_without_reviewer_wallet, true);

assert.ok(!readme.includes("Current submission blockers"), "README still contains stale blocker text");

console.log(
  JSON.stringify(
    {
      verified: true,
      replay_trace_sha256: packet.replay.trace_sha256,
      live_contract_digest: packet.live_contract.proof.digest,
      package_tarball_sha256: packageProof.tarball_sha256,
      solana_memo_payload: proofEnvelope.memo_payload,
      latest_signal_digest: proof.digest,
      qualified_signals: packet.agent.replay_benchmark.qualified_signals,
      proof_traces: packet.agent.replay_benchmark.proof_traces
    },
    null,
    2
  )
);
