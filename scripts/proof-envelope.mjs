import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../src/engine.js";

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function buildProofEnvelope({ packageProof = null } = {}) {
  const packetPath = path.resolve("artifacts", "submission-packet.json");
  const liveContractPath = path.resolve("artifacts", "live-contract-check.json");
  const packageProofPath = path.resolve("artifacts", "npm-package-proof.json");
  const resolvedPackageProof = packageProof ?? readJsonIfExists(packageProofPath);
  const packet = readJsonIfExists(packetPath);
  const liveContract = readJsonIfExists(liveContractPath);

  const evidence = {
    product: "TxLINE Edge Lab",
    track: "Trading Tools and Agents",
    repository: "https://github.com/fengyangxxx/txline-edge-lab",
    live_demo: "https://fengyangxxx.github.io/txline-edge-lab/",
    submission_packet_sha256: fs.existsSync(packetPath) ? sha256File(packetPath) : null,
    live_contract_check_sha256: fs.existsSync(liveContractPath) ? sha256File(liveContractPath) : null,
    replay_trace_sha256: packet?.replay?.trace_sha256 ?? null,
    live_contract_digest: liveContract?.check?.proof?.digest ?? packet?.live_contract?.proof?.digest ?? null,
    package: resolvedPackageProof
      ? {
          tarball: resolvedPackageProof.tarball,
          shasum: resolvedPackageProof.shasum,
          integrity: resolvedPackageProof.integrity,
          unpacked_size: resolvedPackageProof.unpacked_size,
          file_count: resolvedPackageProof.file_count
        }
      : null,
    compliance: {
      paper_only: true,
      no_wagers: true,
      no_custody: true,
      no_broadcast_without_reviewer_wallet: true
    },
    generated_at: new Date().toISOString()
  };

  const evidenceDigest = crypto.createHash("sha256").update(canonicalJson(evidence)).digest("hex");

  return {
    attestation_type: "solana_memo_payload",
    broadcast_status: "not_broadcast",
    broadcast_reason:
      "No wallet signing or funded transaction is performed in the public repo. This avoids fake on-chain claims while preserving a deterministic memo payload for a reviewer or maintainer to sign.",
    network: "solana",
    memo_program: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    memo_payload: `txline-edge-lab:${evidenceDigest}`,
    evidence_digest_sha256: evidenceDigest,
    evidence,
    signing_instructions: [
      "Run npm run live-check && npm run packet && npm run package-proof && npm run scorecard && npm run verify to refresh artifacts.",
      "Review artifacts/solana-proof-envelope.json.",
      "Use the memo_payload as the Solana Memo instruction data if a reviewer wants an on-chain timestamp.",
      "Attach the resulting transaction signature as an additional attestation; do not claim one exists before broadcast."
    ]
  };
}

export function writeProofEnvelope({ outPath = "artifacts/solana-proof-envelope.json", packageProof = null } = {}) {
  const envelope = buildProofEnvelope({ packageProof });
  const fullPath = path.resolve(outPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(envelope, null, 2)}\n`);
  return envelope;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const envelope = writeProofEnvelope();
  console.log(JSON.stringify({ outPath: "artifacts/solana-proof-envelope.json", memo_payload: envelope.memo_payload }, null, 2));
}
