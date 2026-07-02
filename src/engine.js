export const outcomeLabels = {
  home: "P1 win",
  draw: "Draw",
  away: "P2 win"
};

export function impliedProbability(decimalOdds) {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return 0;
  return 1 / decimalOdds;
}

export function formatBps(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)} bps`;
}

export function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function stableDigest(value) {
  const text = typeof value === "string" ? value : canonicalJson(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createInitialState(settings = {}) {
  return {
    fixtures: new Map(),
    histories: new Map(),
    signals: [],
    positions: [],
    settings: {
      sensitivityBps: settings.sensitivityBps ?? 90,
      minConfidence: settings.minConfidence ?? 0.62,
      autoExecute: settings.autoExecute ?? true
    }
  };
}

export function ingestFixture(state, fixture) {
  state.fixtures.set(fixture.id, {
    ...fixture,
    phase: "NS",
    score: "0-0",
    lastOdds: null,
    lastUpdateTs: null
  });
}

export function ingestUpdate(state, update) {
  const fixture = state.fixtures.get(update.fixtureId);
  if (!fixture) return null;

  const history = state.histories.get(update.fixtureId) ?? [];
  const previous = history.at(-1);
  const enriched = {
    ...update,
    probabilities: Object.fromEntries(
      Object.entries(update.odds).map(([outcome, odds]) => [outcome, impliedProbability(odds)])
    )
  };

  history.push(enriched);
  state.histories.set(update.fixtureId, history.slice(-80));

  fixture.phase = update.phase;
  fixture.score = update.score;
  fixture.lastOdds = update.odds;
  fixture.lastUpdateTs = update.ts;
  fixture.minute = update.minute;
  fixture.narrative = update.narrative;

  const signal = previous ? detectSignal(fixture, enriched, previous, state.settings, history) : null;
  if (signal) {
    state.signals.unshift(signal);
    state.signals = state.signals.slice(0, 60);
    if (state.settings.autoExecute && signal.confidence >= state.settings.minConfidence) {
      openOrUpdatePosition(state, signal, enriched, fixture);
    }
  }

  markPositions(state, enriched, fixture);
  return signal;
}

function detectSignal(fixture, update, previous, settings, history) {
  const moves = Object.keys(update.odds).map((outcome) => {
    const now = update.probabilities[outcome];
    const before = previous.probabilities[outcome];
    return {
      outcome,
      moveBps: (now - before) * 10_000,
      odds: update.odds[outcome]
    };
  });

  const strongest = moves.sort((a, b) => Math.abs(b.moveBps) - Math.abs(a.moveBps))[0];
  const absMove = Math.abs(strongest.moveBps);
  const trend = trendScore(history, strongest.outcome);
  const sourceScore = Math.min(0.12, Math.max(0, (update.sourceCount - 12) / 100));
  const consensusScore = Math.min(0.22, update.consensusGap / 320);
  const volumeScore = Math.min(0.18, update.volumeDelta / 900);
  const moveScore = Math.min(0.36, Math.max(0, (absMove - settings.sensitivityBps) / 340));
  const eventScore = update.narrative ? 0.06 : 0;
  const confidence = clamp(0.28 + moveScore + consensusScore + volumeScore + sourceScore + trend + eventScore, 0, 0.97);

  let trigger = "Baseline drift";
  if (absMove >= settings.sensitivityBps) trigger = "Sharp movement";
  if (update.consensusGap >= 70) trigger = "Consensus divergence";
  if (update.narrative?.toLowerCase().includes("scores")) trigger = "Score repricing";

  const executionGate = {
    positiveMove: strongest.moveBps > 0,
    confidencePassed: confidence >= settings.minConfidence,
    notScoreChase: trigger !== "Score repricing",
    sourceCountPassed: update.sourceCount >= 16,
    consensusNotOverheated: update.consensusGap <= 50
  };
  executionGate.paperEligible = Object.values(executionGate).every(Boolean);

  const action = executionGate.paperEligible ? "paper-long" : strongest.moveBps < 0 ? "hedge-watch" : "wait-confirmation";

  return {
    id: `${update.fixtureId}-${update.seq}-${strongest.outcome}`,
    fixtureId: update.fixtureId,
    fixtureTitle: `${fixture.participant1} vs ${fixture.participant2}`,
    ts: update.ts,
    minute: update.minute,
    trigger,
    outcome: strongest.outcome,
    moveBps: strongest.moveBps,
    confidence,
    action,
    odds: strongest.odds,
    narrative: update.narrative || "Market-only update",
    score: update.score,
    phase: update.phase,
    evidence: {
      sensitivityBps: settings.sensitivityBps,
      minimumConfidence: settings.minConfidence,
      rawMoveBps: strongest.moveBps,
      absoluteMoveBps: absMove,
      consensusGap: update.consensusGap,
      volumeDelta: update.volumeDelta,
      sourceCount: update.sourceCount,
      scoreBreakdown: {
        base: 0.28,
        move: Number(moveScore.toFixed(3)),
        consensus: Number(consensusScore.toFixed(3)),
        volume: Number(volumeScore.toFixed(3)),
        source: Number(sourceScore.toFixed(3)),
        trend: Number(trend.toFixed(3)),
        event: Number(eventScore.toFixed(3))
      },
      thresholdPassed: absMove >= settings.sensitivityBps,
      confidencePassed: confidence >= settings.minConfidence,
      executionGate,
      proof: buildProofReadiness(update, strongest),
      txlineFields: [
        "fixtureId",
        "seq",
        "ts",
        "odds.home",
        "odds.draw",
        "odds.away",
        "score",
        "phase",
        "consensusGap",
        "volumeDelta"
      ]
    }
  };
}

function buildProofReadiness(update, strongest) {
  const messageId = update.messageId ?? update.streamId ?? null;
  const validationTs = update.validationTs ?? update.ts;
  const canonicalPayload = {
    fixtureId: update.fixtureId,
    seq: update.seq,
    ts: update.ts,
    source: update.source ?? update.type ?? "replay",
    minute: update.minute,
    phase: update.phase,
    score: update.score,
    odds: update.odds,
    selectedOutcome: strongest.outcome,
    selectedOdds: strongest.odds,
    selectedMoveBps: Number(strongest.moveBps.toFixed(2)),
    consensusGap: update.consensusGap,
    volumeDelta: update.volumeDelta,
    sourceCount: update.sourceCount,
    liveMessageId: messageId
  };
  const oddsValidation =
    update.oddsValidationUrl ??
    (messageId
      ? `/api/odds/validation?messageId=${encodeURIComponent(messageId)}&ts=${encodeURIComponent(validationTs)}`
      : null);
  const scoreValidation =
    update.scoreValidationUrl ??
    (messageId
      ? `/api/scores/stat-validation?fixtureId=${encodeURIComponent(update.fixtureId)}&ts=${encodeURIComponent(validationTs)}`
      : null);

  return {
    mode: messageId || update.oddsValidationUrl || update.scoreValidationUrl ? "live-validation-ready" : "replay-digest",
    digestAlgorithm: "fnv1a32 over canonical signal payload",
    digest: stableDigest(canonicalPayload),
    liveMessageId: messageId,
    validation: {
      odds: oddsValidation ?? "requires live TxLINE messageId or validation URL",
      score: scoreValidation ?? "requires live TxLINE stat-validation fields",
      txoracleOddsInstruction: messageId ? "validate_odds" : "not asserted in replay mode",
      txoracleScoreInstruction: messageId ? "validate_stat" : "not asserted in replay mode"
    },
    replayNotice: messageId
      ? null
      : "Replay digest proves deterministic demo reproducibility only; it is not presented as on-chain TxLINE attestation.",
    canonicalPayload
  };
}

function trendScore(history, outcome) {
  const last = history.slice(-4);
  if (last.length < 3) return 0;
  let sameDirection = 0;
  for (let index = 1; index < last.length; index += 1) {
    const delta = last[index].probabilities[outcome] - last[index - 1].probabilities[outcome];
    if (Math.abs(delta) > 0.0025) sameDirection += Math.sign(delta);
  }
  return Math.min(0.09, Math.abs(sameDirection) * 0.03);
}

function openOrUpdatePosition(state, signal, update, fixture) {
  if (signal.action !== "paper-long") return;
  const existing = state.positions.find(
    (position) => position.fixtureId === signal.fixtureId && position.outcome === signal.outcome && position.state === "open"
  );
  if (existing) return;

  state.positions.unshift({
    id: `pos-${signal.id}`,
    fixtureId: signal.fixtureId,
    fixtureTitle: `${fixture.participant1} vs ${fixture.participant2}`,
    outcome: signal.outcome,
    entryOdds: update.odds[signal.outcome],
    markOdds: update.odds[signal.outcome],
    entryProbability: impliedProbability(update.odds[signal.outcome]),
    markProbability: impliedProbability(update.odds[signal.outcome]),
    clvBps: 0,
    entryTs: update.ts,
    stake: 100,
    takeProfit: 24,
    riskLimit: -12,
    pnl: 0,
    state: "open",
    reason: signal.trigger
  });
  state.positions = state.positions.slice(0, 12);
}

function markPositions(state, update) {
  state.positions.forEach((position) => {
    if (position.fixtureId !== update.fixtureId || position.state !== "open") return;
    const markOdds = update.odds[position.outcome];
    position.markOdds = markOdds;
    position.markProbability = impliedProbability(markOdds);
    position.clvBps = (position.markProbability - position.entryProbability) * 10_000;
    const markedPnl = position.stake * (position.entryOdds / markOdds - 1);
    if (markedPnl >= position.takeProfit) {
      position.pnl = position.takeProfit;
      position.state = "take-profit";
      return;
    }
    if (markedPnl <= position.riskLimit) {
      position.pnl = position.riskLimit;
      position.state = "risk-cut";
      return;
    }
    position.pnl = markedPnl;
  });
}

export function totalPnl(state) {
  return state.positions.reduce((sum, position) => sum + position.pnl, 0);
}

export function latestDecision(state) {
  return (
    state.signals[0] ?? {
      trigger: "Waiting",
      fixtureTitle: "No signal yet",
      outcome: "home",
      confidence: 0,
      action: "observe",
      narrative: "The agent is waiting for a qualified odds move."
    }
  );
}

export function replayBenchmark(state) {
  const signals = state.signals;
  const positions = state.positions;
  const qualifiedSignals = signals.filter((signal) => signal.action === "paper-long").length;
  const averageConfidence = average(signals.map((signal) => signal.confidence));
  const averageClvBps = average(positions.map((position) => position.clvBps ?? 0));
  const positiveMarkRate =
    positions.length === 0 ? 0 : positions.filter((position) => position.pnl > 0).length / positions.length;
  const worstMarkedPnl = positions.length === 0 ? 0 : Math.min(...positions.map((position) => position.pnl));

  return {
    signals_generated: signals.length,
    qualified_signals: qualifiedSignals,
    paper_positions: positions.length,
    paper_pnl: Number(totalPnl(state).toFixed(2)),
    average_confidence: Number(averageConfidence.toFixed(3)),
    average_clv_bps: Number(averageClvBps.toFixed(1)),
    positive_mark_rate: Number(positiveMarkRate.toFixed(3)),
    worst_marked_pnl: Number(worstMarkedPnl.toFixed(2)),
    proof_traces: signals.filter((signal) => signal.evidence?.proof?.digest).length
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  if (Number.isFinite(value)) return Number(value.toFixed(6));
  return value;
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
