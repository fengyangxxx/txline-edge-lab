import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeProofEnvelope } from "./proof-envelope.mjs";

const artifactDir = path.resolve("artifacts");
fs.mkdirSync(artifactDir, { recursive: true });

for (const file of fs.readdirSync(artifactDir)) {
  if (/^txline-edge-lab-.*\.tgz$/.test(file)) {
    fs.rmSync(path.join(artifactDir, file));
  }
}

const npmCommand = process.env.npm_execpath
  ? { bin: process.execPath, args: [process.env.npm_execpath] }
  : { bin: "npm", args: [] };
const packOutput = execFileSync(npmCommand.bin, [...npmCommand.args, "pack", "--pack-destination", artifactDir, "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});
const [packInfo] = JSON.parse(packOutput);
const packedFilename = path.basename(packInfo.filename);
const tarballPath = path.join(artifactDir, packedFilename);
const tarballBytes = fs.readFileSync(tarballPath);

const proof = {
  product: "TxLINE Edge Lab",
  generated_at: new Date().toISOString(),
  package_name: packInfo.name,
  version: packInfo.version,
  tarball: path.relative(process.cwd(), tarballPath).replace(/\\/g, "/"),
  tarball_sha256: crypto.createHash("sha256").update(tarballBytes).digest("hex"),
  shasum: packInfo.shasum,
  integrity: packInfo.integrity,
  unpacked_size: packInfo.unpackedSize,
  packed_size: packInfo.size,
  file_count: packInfo.files.length,
  bin: packInfo.files.filter((file) => file.path.startsWith("bin/")).map((file) => file.path),
  included_artifacts: packInfo.files
    .map((file) => file.path)
    .filter((file) => file.startsWith("artifacts/") && !file.endsWith(".tgz")),
  install_hint: "npm install ./artifacts/txline-edge-lab-0.1.0.tgz && npx txline-edge-lab replay --json",
  cli_checks: [
    "txline-edge-lab replay --json",
    "txline-edge-lab live-check --json",
    "txline-edge-lab attest --json",
    "txline-edge-lab verify --json"
  ]
};

const proofPath = path.join(artifactDir, "npm-package-proof.json");
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
writeProofEnvelope({ packageProof: proof });

console.log(JSON.stringify({ proof: path.relative(process.cwd(), proofPath), tarball: proof.tarball, files: proof.file_count }, null, 2));
