import { buildReplayUpdates, fixtures } from "./sample-data.js";

export function createReplayFeed({ intervalMs = 1200 } = {}) {
  const updates = buildReplayUpdates();
  let index = 0;
  let timer = null;
  let stopped = false;

  return {
    fixtures,
    start(onUpdate, onComplete) {
      stopped = false;
      const tick = () => {
        if (stopped) return;
        onUpdate(updates[index]);
        index = (index + 1) % updates.length;
        if (index === 0 && onComplete) onComplete();
        timer = window.setTimeout(tick, intervalMs);
      };
      tick();
    },
    pause() {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    },
    reset() {
      index = 0;
    }
  };
}

export async function connectTxlineStreams({ jwt, apiToken, baseUrl = "https://txline.txodds.com" }, onMessage, onStatus) {
  if (!jwt || !apiToken) throw new Error("Both guest JWT and API token are required.");

  const oddsUrl = `${baseUrl}/api/odds/stream`;
  const scoresUrl = `${baseUrl}/api/scores/stream`;
  const headers = {
    Authorization: `Bearer ${jwt.replace(/^Bearer\s+/i, "")}`,
    "X-Api-Token": apiToken,
    Accept: "text/event-stream",
    "Cache-Control": "no-cache"
  };

  const abortController = new AbortController();
  const stream = async (url, source) => {
    onStatus(`Connecting ${source} stream`);
    const response = await fetch(url, { headers, signal: abortController.signal });
    if (!response.ok) throw new Error(`${source} stream failed: ${response.status}`);
    onStatus(`${source} stream connected`);
    for await (const message of readSseMessages(response)) {
      onMessage({ source, message, data: parseSseData(message.data) });
    }
  };

  Promise.all([stream(oddsUrl, "odds"), stream(scoresUrl, "scores")]).catch((error) => {
    if (!abortController.signal.aborted) onStatus(error.message);
  });

  return () => abortController.abort();
}

export function normalizeTxlineMessage(packet) {
  const data = packet.data;
  const fixtureId = String(data.FixtureId ?? data.fixtureId ?? data.fixture_id ?? "unknown");
  const participant1Odds = Number(data.Participant1Odds ?? data.home ?? data.odds?.home ?? data.prices?.home);
  const drawOdds = Number(data.DrawOdds ?? data.draw ?? data.odds?.draw ?? data.prices?.draw);
  const participant2Odds = Number(data.Participant2Odds ?? data.away ?? data.odds?.away ?? data.prices?.away);

  if (!Number.isFinite(participant1Odds) || !Number.isFinite(drawOdds) || !Number.isFinite(participant2Odds)) {
    return null;
  }

  return {
    type: packet.source,
    seq: Number(data.Seq ?? data.seq ?? Date.now()),
    fixtureId,
    minute: Number(data.Minute ?? data.minute ?? 0),
    phase: String(data.GamePhase ?? data.phase ?? "LIVE"),
    score: `${data.Participant1Score ?? data.homeScore ?? 0}-${data.Participant2Score ?? data.awayScore ?? 0}`,
    ts: Number(data.Ts ?? data.ts ?? Date.now()),
    odds: {
      home: participant1Odds,
      draw: drawOdds,
      away: participant2Odds
    },
    consensusGap: Number(data.ConsensusGap ?? data.consensusGap ?? 40),
    volumeDelta: Number(data.VolumeDelta ?? data.volumeDelta ?? 40),
    sourceCount: Number(data.SourceCount ?? data.sourceCount ?? 12),
    narrative: data.EventName ?? data.narrative ?? ""
  };
}

export function parseSseBlock(block) {
  const message = { data: "" };
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;
    const separatorIndex = rawLine.indexOf(":");
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? "" : rawLine.slice(separatorIndex + 1).replace(/^ /, "");
    if (field === "data") message.data += `${value}\n`;
    if (field === "event") message.event = value;
    if (field === "id") message.id = value;
    if (field === "retry") message.retry = Number(value);
  }
  message.data = message.data.replace(/\n$/, "");
  return message.data || message.event || message.id ? message : null;
}

export async function* readSseMessages(response) {
  if (!response.body) throw new Error("Stream response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separator = buffer.match(/\r?\n\r?\n/);
      while (separator?.index !== undefined) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const message = parseSseBlock(block);
        if (message) yield message;
        separator = buffer.match(/\r?\n\r?\n/);
      }
    }
    buffer += decoder.decode();
    const message = parseSseBlock(buffer);
    if (message) yield message;
  } finally {
    reader.releaseLock();
  }
}

export function parseSseData(data) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}
