#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures, buildReplayUpdates } from "../src/sample-data.js";
import {
  canonicalJson,
  createInitialState,
  ingestFixture,
  ingestUpdate,
  replayBenchmark,
  totalPnl
} from "../src/engine.js";
import { writeLiveContractCheck } from "../scripts/live-contract-check.mjs";
import { writeProofEnvelope } from "../scripts/proof-envelope.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args[0] ?? "help";

function optionValue(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function buildReplayState() {
  const state = createInitialState({ sensitivityBps: 90, minConfidence: 0.62, autoExecute: true });
  fixtures.forEach((fixture) => ingestFixture(state, fixture));
  buildReplayUpdates().forEach((update) => ingestUpdate(state, update));
  return state;
}

function writeJson(target, value) {
  const fullPath = path.resolve(root, target);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
  return fullPath;
}

function print(value) {
  if (hasFlag("--json")) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(value.summary ?? JSON.stringify(value, null, 2));
}

if (command === "replay") {
  const state = buildReplayState();
  const output = {
    product: "TxLINE Edge Lab",
    mode: "deterministic-replay",
    fixtures: state.fixtures.size,
    signals: state.signals.length,
    positions: state.positions.length,
    paper_pnl: Number(totalPnl(state).toFixed(2)),
    replay_benchmark: replayBenchmark(state),
    latest_signal: state.signals[0],
    trace_digest: state.signals[0]?.evidence?.proof?.digest,
    summary: `TxLINE replay generated ${state.signals.length} signals and ${state.positions.length} paper positions.`
  };
  const out = optionValue("--out");
  if (out) output.wrote = writeJson(out, output);
  print(output);
} else if (command === "live-check") {
  const result = writeLiveContractCheck();
  print({
    ...result.check,
    wrote: result.outPath,
    summary: `Live contract check ${result.check.verified ? "passed" : "failed"} for ${
      result.check.normalized_update?.messageId ?? "synthetic TxLINE packet"
    }.`
  });
} else if (command === "attest") {
  const out = optionValue("--out", "artifacts/solana-proof-envelope.json");
  const envelope = writeProofEnvelope({ outPath: out });
  print({
    ...envelope,
    summary: `Proof envelope wrote ${out}; memo payload is unsigned and not broadcast.`
  });
} else if (command === "verify") {
  const packetPath = path.resolve(root, "artifacts/submission-packet.json");
  const envelopePath = path.resolve(root, "artifacts/solana-proof-envelope.json");
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
  const envelope = fs.existsSync(envelopePath) ? JSON.parse(fs.readFileSync(envelopePath, "utf8")) : null;
  const checks = {
    replay_trace: /^[a-f0-9]{64}$/.test(packet.replay.trace_sha256),
    live_contract: packet.live_contract?.verified === true,
    paper_only: packet.compliance?.real_money_wagers === false,
    proof_envelope: envelope
      ? envelope.broadcast_status === "not_broadcast" && envelope.memo_payload?.startsWith("txline-edge-lab:")
      : "not bundled in npm tarball; run txline-edge-lab attest --json in repo mode"
  };
  const ok = Object.values(checks).every((check) => check === true || typeof check === "string");
  if (!ok) {
    console.error(JSON.stringify({ ok, checks }, null, 2));
    process.exit(1);
  }
  print({ ok, checks, canonical_packet_digest: packet.live_contract?.proof?.digest, summary: "Verification passed." });
} else {
  console.log(`TxLINE Edge Lab CLI

Usage:
  txline-edge-lab replay [--json] [--out artifacts/replay.json]
  txline-edge-lab live-check [--json]
  txline-edge-lab attest [--json] [--out artifacts/solana-proof-envelope.json]
  txline-edge-lab verify [--json]

The CLI is paper-only. It never places wagers, signs transactions, or stores live TxLINE credentials.`);
}
