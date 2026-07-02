import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const packet = JSON.parse(fs.readFileSync("artifacts/submission-packet.json", "utf8"));
const packageProof = JSON.parse(fs.readFileSync("artifacts/npm-package-proof.json", "utf8"));
const proofEnvelope = JSON.parse(fs.readFileSync("artifacts/solana-proof-envelope.json", "utf8"));

assert.equal(packet.product, "TxLINE Edge Lab");
assert.equal(packet.track, "Trading Tools and Agents");
assert.equal(packet.live_contract?.verified, true);
assert.equal(packet.live_contract?.proof?.mode, "live-validation-ready");

const scorecard = {
  product: packet.product,
  track: packet.track,
  generated_at: new Date().toISOString(),
  positioning: {
    primary_claim:
      "Autonomous TxLINE odds/scores agent with deterministic signal evidence, paper-only execution, live validation readiness, CLV proxy, reproducible replay benchmark, CLI, npm tarball proof, and Solana memo attestation payload.",
    review_posture:
      "Judges can evaluate the product with no wallet funding, no real wager, no token custody, and no live-match dependency."
  },
  rubric_checks: [
    {
      area: "TxLINE data usage",
      evidence: packet.txline_endpoints,
      result: packet.txline_endpoints.includes("/api/odds/stream") && packet.txline_endpoints.includes("/api/scores/stream")
    },
    {
      area: "CLI and package distribution",
      evidence: {
        tarball: packageProof.tarball,
        bin: packageProof.bin,
        integrity: packageProof.integrity,
        cli_checks: packageProof.cli_checks
      },
      result:
        packageProof.package_name === "txline-edge-lab" &&
        packageProof.bin.includes("bin/txline-edge-lab.mjs") &&
        /^sha512-/.test(packageProof.integrity) &&
        packageProof.cli_checks.includes("txline-edge-lab replay --json")
    },
    {
      area: "Solana proof posture",
      evidence: {
        attestation_type: proofEnvelope.attestation_type,
        broadcast_status: proofEnvelope.broadcast_status,
        memo_payload: proofEnvelope.memo_payload,
        memo_program: proofEnvelope.memo_program
      },
      result:
        proofEnvelope.attestation_type === "solana_memo_payload" &&
        proofEnvelope.broadcast_status === "not_broadcast" &&
        /^txline-edge-lab:[a-f0-9]{64}$/.test(proofEnvelope.memo_payload)
    },
    {
      area: "Live validation readiness",
      evidence: packet.live_contract.proof,
      result:
        packet.live_contract.proof.mode === "live-validation-ready" &&
        /validate_odds/.test(packet.live_contract.proof.txoracle_odds_instruction) &&
        /validate_stat/.test(packet.live_contract.proof.txoracle_score_instruction)
    },
    {
      area: "Autonomous agent behavior",
      evidence: packet.agent.replay_benchmark,
      result: packet.agent.replay_benchmark.qualified_signals >= 1 && packet.agent.positions_opened >= 1
    },
    {
      area: "Risk and compliance",
      evidence: packet.compliance,
      result:
        packet.compliance.real_money_wagers === false &&
        packet.compliance.custody_or_escrow === false &&
        packet.compliance.requires_reviewer_wallet_or_payment === false
    },
    {
      area: "Reproducible evidence",
      evidence: {
        replay_sha256: packet.replay.trace_sha256,
        proof_traces: packet.agent.replay_benchmark.proof_traces,
        latest_signal_digest: packet.proof_readiness.latest_signal_proof.digest
      },
      result:
        /^[a-f0-9]{64}$/.test(packet.replay.trace_sha256) &&
        packet.agent.replay_benchmark.proof_traces === packet.agent.signals_generated
    },
    {
      area: "Strategy quality signals",
      evidence: {
        average_clv_bps: packet.agent.replay_benchmark.average_clv_bps,
        worst_marked_pnl: packet.agent.replay_benchmark.worst_marked_pnl,
        paper_gate: packet.agent.paper_gate
      },
      result:
        Number.isFinite(packet.agent.replay_benchmark.average_clv_bps) &&
        packet.agent.replay_benchmark.worst_marked_pnl >= -12 &&
        /score-chase/.test(packet.agent.paper_gate)
    }
  ],
  competitor_gap_response: [
    {
      visible_gap: "Proof-first competitors show validation artifacts instead of just a dashboard.",
      response: "Added live-contract-check.json and packet.live_contract to prove MessageId/validation URL handling in the same engine path."
    },
    {
      visible_gap: "Top competitors include judge-readable verification commands.",
      response: "npm run smoke, npm run packet, npm run package-proof, npm run verify, and npm run scorecard now generate machine-checkable artifacts."
    },
    {
      visible_gap: "Top competitors expose CLI/npm surfaces instead of only a hosted dashboard.",
      response: "Added the txline-edge-lab CLI with replay, live-check, attest, and verify commands plus a local npm tarball proof."
    },
    {
      visible_gap: "Some competitors reference Solana proof artifacts.",
      response: "Added a deterministic Solana Memo payload envelope that can be signed by a reviewer wallet without pretending a transaction already exists."
    },
    {
      visible_gap: "Trading agents can look reckless if they chase score events.",
      response: "Score-chase and overheated consensus events remain visible as signals but are blocked from paper execution."
    },
    {
      visible_gap: "Raw PnL alone is weak for trading-tool judging.",
      response: "Submission packet reports CLV proxy, capped risk, qualified signal count, and proof trace count."
    }
  ],
  residual_limits: [
    "No live TxLINE credentials or real match stream are bundled in the public repo.",
    "No Solana transaction signature is claimed; the repo ships an unsigned memo payload for honest attestation readiness.",
    "The app intentionally does not place wagers, custody funds, or automate betting execution.",
    "Replay digest is a reproducibility proof, not a claim of live on-chain attestation."
  ],
  final_recommendation:
    "Submit as a proof-aware analytics and paper-agent product. It is stronger than a visual-only dashboard because the public packet, live contract check, and replay scorecard are independently inspectable."
};

scorecard.rubric_checks.forEach((check) => assert.equal(check.result, true, check.area));

const outPath = path.resolve("artifacts", "judge-scorecard.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(scorecard, null, 2)}\n`);
console.log(JSON.stringify({ outPath, checks: scorecard.rubric_checks.length, passed: true }, null, 2));
