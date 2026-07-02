import {
  createInitialState,
  formatBps,
  formatPercent,
  ingestFixture,
  ingestUpdate,
  latestDecision,
  outcomeLabels,
  replayBenchmark,
  totalPnl
} from "./engine.js";
import { connectTxlineStreams, createReplayFeed, normalizeTxlineMessage } from "./txline.js";

const els = {
  feedStatus: document.querySelector("#feedStatus"),
  fixtureCount: document.querySelector("#fixtureCount"),
  signalCount: document.querySelector("#signalCount"),
  paperPnl: document.querySelector("#paperPnl"),
  sessionClock: document.querySelector("#sessionClock"),
  fixtureList: document.querySelector("#fixtureList"),
  selectedFixtureTitle: document.querySelector("#selectedFixtureTitle"),
  phasePill: document.querySelector("#phasePill"),
  probabilityChart: document.querySelector("#probabilityChart"),
  marketStrip: document.querySelector("#marketStrip"),
  signalRows: document.querySelector("#signalRows"),
  lastUpdateLabel: document.querySelector("#lastUpdateLabel"),
  agentDecision: document.querySelector("#agentDecision"),
  agentState: document.querySelector("#agentState"),
  sensitivityInput: document.querySelector("#sensitivityInput"),
  sensitivityValue: document.querySelector("#sensitivityValue"),
  confidenceInput: document.querySelector("#confidenceInput"),
  confidenceValue: document.querySelector("#confidenceValue"),
  autoExecuteInput: document.querySelector("#autoExecuteInput"),
  portfolioRows: document.querySelector("#portfolioRows"),
  evidencePreview: document.querySelector("#evidencePreview"),
  exportButton: document.querySelector("#exportButton"),
  pauseButton: document.querySelector("#pauseButton"),
  pauseIcon: document.querySelector("#pauseIcon"),
  resetButton: document.querySelector("#resetButton"),
  modeReplay: document.querySelector("#modeReplay"),
  modeLive: document.querySelector("#modeLive"),
  jwtInput: document.querySelector("#jwtInput"),
  apiTokenInput: document.querySelector("#apiTokenInput"),
  connectLiveButton: document.querySelector("#connectLiveButton"),
  liveStatus: document.querySelector("#liveStatus"),
  signalEvidence: document.querySelector("#signalEvidence"),
  proofMode: document.querySelector("#proofMode"),
  proofRows: document.querySelector("#proofRows"),
  benchmarkSignals: document.querySelector("#benchmarkSignals"),
  benchmarkClv: document.querySelector("#benchmarkClv"),
  benchmarkProof: document.querySelector("#benchmarkProof")
};

const state = createInitialState();
let selectedFixtureId = null;
let replay = createReplayFeed({ intervalMs: 1200 });
let paused = false;
let liveStop = null;
let startedAt = Date.now();

replay.fixtures.forEach((fixture) => {
  ingestFixture(state, fixture);
  selectedFixtureId ??= fixture.id;
});

wireControls();
startReplay();
render();

function startReplay() {
  els.feedStatus.textContent = "Replay stream";
  replay.start((update) => {
    ingestUpdate(state, update);
    selectedFixtureId = selectedFixtureId ?? update.fixtureId;
    render();
  });
}

function wireControls() {
  els.sensitivityInput.addEventListener("input", () => {
    state.settings.sensitivityBps = Number(els.sensitivityInput.value);
    render();
  });
  els.confidenceInput.addEventListener("input", () => {
    state.settings.minConfidence = Number(els.confidenceInput.value) / 100;
    render();
  });
  els.autoExecuteInput.addEventListener("change", () => {
    state.settings.autoExecute = els.autoExecuteInput.checked;
    render();
  });
  els.pauseButton.addEventListener("click", () => {
    paused = !paused;
    if (paused) replay.pause();
    else startReplay();
    render();
  });
  els.resetButton.addEventListener("click", () => {
    replay.pause();
    replay.reset();
    selectedFixtureId = null;
    state.signals = [];
    state.positions = [];
    state.histories.clear();
    state.fixtures.forEach((fixture) => {
      fixture.phase = "NS";
      fixture.score = "0-0";
      fixture.lastOdds = null;
      fixture.lastUpdateTs = null;
      selectedFixtureId ??= fixture.id;
    });
    startedAt = Date.now();
    paused = false;
    startReplay();
    render();
  });
  els.modeReplay.addEventListener("click", () => setMode("replay"));
  els.modeLive.addEventListener("click", () => setMode("live"));
  els.connectLiveButton.addEventListener("click", connectLive);
  els.exportButton.addEventListener("click", exportEvidence);
}

async function connectLive() {
  try {
    if (liveStop) liveStop();
    replay.pause();
    paused = true;
    setMode("live");
    const stop = await connectTxlineStreams(
      {
        jwt: els.jwtInput.value.trim(),
        apiToken: els.apiTokenInput.value.trim()
      },
      (packet) => {
        const update = normalizeTxlineMessage(packet);
        if (!update) return;
        if (!state.fixtures.has(update.fixtureId)) {
          ingestFixture(state, {
            id: update.fixtureId,
            competition: "TxLINE live",
            participant1: `Fixture ${update.fixtureId} P1`,
            participant2: `Fixture ${update.fixtureId} P2`,
            participant1IsHome: true,
            startTime: new Date(update.ts).toISOString()
          });
        }
        ingestUpdate(state, update);
        selectedFixtureId = update.fixtureId;
        render();
      },
      (message) => {
        els.liveStatus.textContent = message;
      }
    );
    liveStop = stop;
    els.feedStatus.textContent = "TxLINE live";
  } catch (error) {
    els.liveStatus.textContent = error.message;
    paused = false;
    startReplay();
  }
}

function setMode(mode) {
  els.modeReplay.classList.toggle("is-active", mode === "replay");
  els.modeLive.classList.toggle("is-active", mode === "live");
}

function render() {
  const fixtures = [...state.fixtures.values()];
  const selected = state.fixtures.get(selectedFixtureId) ?? fixtures[0];
  selectedFixtureId = selected?.id;
  const selectedHistory = state.histories.get(selectedFixtureId) ?? [];
  const pnl = totalPnl(state);

  els.fixtureCount.textContent = String(fixtures.length);
  els.signalCount.textContent = String(state.signals.length);
  els.paperPnl.textContent = `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`;
  els.paperPnl.className = pnl >= 0 ? "profit" : "loss";
  els.pauseIcon.textContent = paused ? ">" : "||";
  els.sessionClock.textContent = formatSessionClock(Date.now() - startedAt);
  els.sensitivityValue.textContent = `${state.settings.sensitivityBps} bps`;
  els.confidenceValue.textContent = `${Math.round(state.settings.minConfidence * 100)}%`;
  els.agentState.textContent = state.settings.autoExecute ? "armed" : "observe";
  els.lastUpdateLabel.textContent = selected?.lastUpdateTs ? new Date(selected.lastUpdateTs).toLocaleTimeString() : "No updates yet";

  renderFixtures(fixtures);
  renderSelected(selected, selectedHistory);
  renderSignals();
  renderDecision();
  renderSignalEvidence();
  renderProofReadiness();
  renderBenchmark();
  renderPortfolio();
  renderEvidence();
}

function renderFixtures(fixtures) {
  els.fixtureList.innerHTML = fixtures
    .map((fixture) => {
      const isSelected = fixture.id === selectedFixtureId;
      const odds = fixture.lastOdds;
      return `
        <button class="fixture-row ${isSelected ? "is-selected" : ""}" type="button" data-fixture-id="${fixture.id}">
          <span class="fixture-teams">${fixture.participant1} vs ${fixture.participant2}</span>
          <span class="fixture-meta">${fixture.phase ?? "NS"} ${fixture.score ?? "0-0"}</span>
          <span class="fixture-odds">${odds ? `${odds.home.toFixed(2)} / ${odds.draw.toFixed(2)} / ${odds.away.toFixed(2)}` : "waiting"}</span>
        </button>
      `;
    })
    .join("");

  els.fixtureList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedFixtureId = button.dataset.fixtureId;
      render();
    });
  });
}

function renderSelected(fixture, history) {
  if (!fixture) return;
  els.selectedFixtureTitle.textContent = `${fixture.participant1} vs ${fixture.participant2}`;
  els.phasePill.textContent = `${fixture.phase ?? "NS"} ${fixture.score ?? "0-0"}`;
  renderChart(history);
  renderMarketStrip(fixture);
}

function renderChart(history) {
  const width = 720;
  const height = 260;
  const pad = 34;
  const outcomes = ["home", "draw", "away"];
  const colors = { home: "#1f7a5f", draw: "#8a5c00", away: "#3659a8" };
  const pointsFor = (outcome) =>
    history.map((update, index) => {
      const x = pad + (index / Math.max(1, history.length - 1)) * (width - pad * 2);
      const y = height - pad - update.probabilities[outcome] * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

  els.probabilityChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="0" fill="#f7f8f4"></rect>
    ${[0.2, 0.4, 0.6, 0.8]
      .map((tick) => {
        const y = height - pad - tick * (height - pad * 2);
        return `<line x1="${pad}" x2="${width - pad}" y1="${y}" y2="${y}" stroke="#d9ded3" stroke-width="1"></line><text x="8" y="${y + 4}" class="chart-label">${Math.round(tick * 100)}%</text>`;
      })
      .join("")}
    ${outcomes
      .map((outcome) => {
        const points = pointsFor(outcome);
        return points.length > 1
          ? `<polyline fill="none" stroke="${colors[outcome]}" stroke-width="3" points="${points.join(" ")}"></polyline>`
          : "";
      })
      .join("")}
    ${outcomes
      .map((outcome, index) => `<circle cx="${width - 140 + index * 48}" cy="24" r="5" fill="${colors[outcome]}"></circle><text x="${width - 130 + index * 48}" y="28" class="chart-label">${outcomeLabels[outcome]}</text>`)
      .join("")}
  `;
}

function renderMarketStrip(fixture) {
  const odds = fixture.lastOdds;
  if (!odds) {
    els.marketStrip.innerHTML = `<div class="market-cell"><span>Waiting for first odds packet</span></div>`;
    return;
  }
  els.marketStrip.innerHTML = Object.entries(odds)
    .map(
      ([outcome, value]) => `
        <div class="market-cell">
          <span>${outcomeLabels[outcome]}</span>
          <strong>${value.toFixed(2)}</strong>
        </div>
      `
    )
    .join("");
}

function renderSignals() {
  els.signalRows.innerHTML = state.signals
    .slice(0, 12)
    .map(
      (signal) => `
        <tr>
          <td>${new Date(signal.ts).toLocaleTimeString()}</td>
          <td>${signal.trigger}</td>
          <td>${outcomeLabels[signal.outcome]}</td>
          <td class="${signal.moveBps >= 0 ? "profit" : "loss"}">${formatBps(signal.moveBps)}</td>
          <td>${formatPercent(signal.confidence)}</td>
          <td><span class="action-pill">${signal.action}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderDecision() {
  const decision = latestDecision(state);
  els.agentDecision.innerHTML = `
    <span class="decision-trigger">${decision.trigger}</span>
    <strong>${decision.fixtureTitle}</strong>
    <p>${decision.narrative}</p>
    <div class="decision-grid">
      <span>Outcome</span><b>${outcomeLabels[decision.outcome] ?? decision.outcome}</b>
      <span>Confidence</span><b>${formatPercent(decision.confidence)}</b>
      <span>Action</span><b>${decision.action}</b>
    </div>
  `;
}

function renderSignalEvidence() {
  const signal = state.signals[0];
  if (!signal?.evidence) {
    els.signalEvidence.innerHTML = `<p class="helper-text">No signal evidence yet.</p>`;
    return;
  }
  const rows = [
    ["Move", `${formatBps(signal.evidence.rawMoveBps)} vs ${signal.evidence.sensitivityBps} bps threshold`],
    ["Consensus gap", `${signal.evidence.consensusGap} synthetic bps`],
    ["Volume delta", `${signal.evidence.volumeDelta} feed units`],
    ["Sources", `${signal.evidence.sourceCount} books/providers`],
    ["Confidence", `${formatPercent(signal.confidence)} vs ${formatPercent(signal.evidence.minimumConfidence)}`],
    ["Execution gate", signal.evidence.executionGate.paperEligible ? "paper eligible" : "wait for confirmation"],
    ["Trace digest", signal.evidence.proof.digest],
    ["Fields", signal.evidence.txlineFields.join(", ")]
  ];
  els.signalEvidence.innerHTML = rows
    .map(
      ([label, value]) => `
        <div class="evidence-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");
}

function renderProofReadiness() {
  const proof = state.signals[0]?.evidence?.proof;
  if (!proof) {
    els.proofMode.textContent = "waiting";
    els.proofRows.innerHTML = `<p class="helper-text">No signal proof trace yet.</p>`;
    return;
  }
  els.proofMode.textContent = proof.mode;
  const rows = [
    ["Digest", proof.digest],
    ["Odds validation", proof.validation.odds],
    ["Score validation", proof.validation.score],
    ["TxOracle odds", proof.validation.txoracleOddsInstruction],
    ["TxOracle score", proof.validation.txoracleScoreInstruction],
    ["Posture", proof.replayNotice ?? "Live packet includes validation-ready identifiers."]
  ];
  els.proofRows.innerHTML = rows
    .map(
      ([label, value]) => `
        <div class="evidence-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");
}

function renderBenchmark() {
  const benchmark = replayBenchmark(state);
  els.benchmarkSignals.textContent = `${benchmark.qualified_signals}/${benchmark.signals_generated} qualified`;
  els.benchmarkClv.textContent = `${formatBps(benchmark.average_clv_bps)} avg CLV proxy`;
  els.benchmarkProof.textContent = `${benchmark.proof_traces} trace digests`;
}

function renderPortfolio() {
  els.portfolioRows.innerHTML =
    state.positions.length === 0
      ? `<tr><td colspan="7">No paper positions opened yet.</td></tr>`
      : state.positions
          .map(
            (position) => `
              <tr>
                <td>${position.fixtureTitle}</td>
                <td>${outcomeLabels[position.outcome]}</td>
                <td>${position.entryOdds.toFixed(2)}</td>
                <td>${position.markOdds.toFixed(2)}</td>
                <td>${position.stake.toFixed(0)}</td>
                <td class="${position.pnl >= 0 ? "profit" : "loss"}">${position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}</td>
                <td>${position.state} / ${formatBps(position.clvBps ?? 0)} CLV</td>
              </tr>
            `
          )
          .join("");
}

function renderEvidence() {
  const packet = buildEvidencePacket();
  els.evidencePreview.textContent = JSON.stringify(packet, null, 2);
}

function buildEvidencePacket() {
  return {
    product: "TxLINE Edge Lab",
    mode: els.modeLive.classList.contains("is-active") ? "live-ready" : "replay",
    txline_endpoints: ["/api/fixtures/snapshot", "/api/odds/stream", "/api/scores/stream"],
    signals_generated: state.signals.length,
    open_positions: state.positions.filter((position) => position.state === "open").length,
    paper_pnl: Number(totalPnl(state).toFixed(2)),
    decision_rule: {
      sensitivity_bps: state.settings.sensitivityBps,
      min_confidence: state.settings.minConfidence,
      execution: "paper-only",
      paper_take_profit: 24,
      paper_risk_limit: -12,
      paper_gate:
        "positive move, confidence pass, not score-chase, sourceCount >= 16, consensusGap <= 50"
    },
    replay_benchmark: replayBenchmark(state),
    proof_readiness: state.signals[0]?.evidence?.proof ?? null,
    latest_signal: state.signals[0] ?? null,
    latest_signal_evidence: state.signals[0]?.evidence ?? null,
    compliance_note: "No wagers, deposits, custody, user funds, or automated betting execution."
  };
}

function exportEvidence() {
  const data = JSON.stringify(buildEvidencePacket(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "txline-edge-lab-evidence.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatSessionClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
