import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, createInitialState, ingestFixture, ingestUpdate } from "../src/engine.js";
import { normalizeTxlineMessage } from "../src/txline.js";

const liveFixture = {
  id: "txline-live-contract",
  competition: "World Cup 2026",
  participant1: "Argentina",
  participant2: "France",
  participant1IsHome: true,
  startTime: "2026-06-18T21:00:00Z"
};

const baselineUpdate = {
  type: "odds",
  source: "odds",
  seq: 9001,
  fixtureId: liveFixture.id,
  minute: 44,
  phase: "H1",
  score: "0-0",
  ts: Date.parse("2026-06-18T21:44:00Z"),
  odds: { home: 2.2, draw: 3.22, away: 3.14 },
  consensusGap: 32,
  volumeDelta: 52,
  sourceCount: 18,
  narrative: "Baseline live odds packet"
};

const liveTxlinePacket = {
  source: "odds",
  message: {
    event: "odds",
    id: "sse-odds-9002"
  },
  data: {
    FixtureId: liveFixture.id,
    Seq: 9002,
    Minute: 48,
    GamePhase: "H2",
    Participant1Score: 0,
    Participant2Score: 0,
    Ts: Date.parse("2026-06-18T21:48:00Z"),
    Participant1Odds: 2.0,
    DrawOdds: 3.28,
    Participant2Odds: 3.42,
    ConsensusGap: 42,
    VolumeDelta: 124,
    SourceCount: 20,
    EventName: "Sharp home-side liquidity move",
    MessageId: "odds-msg-9002",
    ValidationTs: Date.parse("2026-06-18T21:48:01Z"),
    OddsValidationUrl: "/api/odds/validation?messageId=odds-msg-9002",
    ScoreValidationUrl: "/api/scores/stat-validation?fixtureId=txline-live-contract&ts=1781819281000"
  }
};

export function buildLiveContractCheck() {
  const state = createInitialState({ sensitivityBps: 90, minConfidence: 0.62, autoExecute: true });
  ingestFixture(state, liveFixture);
  ingestUpdate(state, baselineUpdate);

  const normalized = normalizeTxlineMessage(liveTxlinePacket);
  assert.ok(normalized, "live TxLINE packet should normalize");
  const signal = ingestUpdate(state, normalized);
  assert.ok(signal, "live TxLINE packet should generate a signal");

  const proof = signal.evidence.proof;
  assert.equal(proof.mode, "live-validation-ready");
  assert.equal(proof.liveMessageId, "odds-msg-9002");
  assert.equal(proof.validation.odds, "/api/odds/validation?messageId=odds-msg-9002");
  assert.equal(
    proof.validation.score,
    "/api/scores/stat-validation?fixtureId=txline-live-contract&ts=1781819281000"
  );
  assert.equal(proof.validation.txoracleOddsInstruction, "validate_odds");
  assert.equal(proof.validation.txoracleScoreInstruction, "validate_stat");
  assert.equal(signal.action, "paper-long");

  const proofPayloadSha256 = crypto
    .createHash("sha256")
    .update(canonicalJson(proof.canonicalPayload))
    .digest("hex");

  return {
    check: "TxLINE live validation contract",
    verified: true,
    generated_at: new Date().toISOString(),
    input_shape: {
      source: liveTxlinePacket.source,
      sse_event: liveTxlinePacket.message.event,
      sse_id: liveTxlinePacket.message.id,
      required_fields: [
        "FixtureId",
        "Seq",
        "Minute",
        "GamePhase",
        "Participant1Odds",
        "DrawOdds",
        "Participant2Odds",
        "MessageId",
        "OddsValidationUrl",
        "ScoreValidationUrl"
      ]
    },
    normalized_update: normalized,
    engine_decision: {
      trigger: signal.trigger,
      action: signal.action,
      confidence: Number(signal.confidence.toFixed(3)),
      execution_gate: signal.evidence.executionGate
    },
    proof: {
      mode: proof.mode,
      digest: proof.digest,
      canonical_payload_sha256: proofPayloadSha256,
      odds_validation: proof.validation.odds,
      score_validation: proof.validation.score,
      txoracle_odds_instruction: proof.validation.txoracleOddsInstruction,
      txoracle_score_instruction: proof.validation.txoracleScoreInstruction
    },
    compliance: {
      uses_real_credentials: false,
      stores_tokens: false,
      places_wagers: false,
      note: "Synthetic packet validates the browser adapter and engine contract without secrets or real betting execution."
    }
  };
}

export function writeLiveContractCheck(outPath = path.resolve("artifacts", "live-contract-check.json")) {
  const check = buildLiveContractCheck();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(check, null, 2)}\n`);
  return { outPath, check };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const { outPath, check } = writeLiveContractCheck();
  console.log(JSON.stringify({ outPath, verified: check.verified, mode: check.proof.mode }, null, 2));
}
