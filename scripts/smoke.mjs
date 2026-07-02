import assert from "node:assert/strict";
import { buildReplayUpdates, fixtures } from "../src/sample-data.js";
import { createInitialState, ingestFixture, ingestUpdate, totalPnl } from "../src/engine.js";
import { parseSseBlock } from "../src/txline.js";

const state = createInitialState({ sensitivityBps: 70, minConfidence: 0.55, autoExecute: true });
fixtures.forEach((fixture) => ingestFixture(state, fixture));
buildReplayUpdates().forEach((update) => ingestUpdate(state, update));

assert.equal(state.fixtures.size, 3);
assert.ok(state.signals.length >= 6, "expected replay to generate qualified signals");
assert.ok(state.positions.length >= 1, "expected paper portfolio to open at least one position");
assert.equal(Number.isFinite(totalPnl(state)), true);

const sse = parseSseBlock('event: odds\nid: 42\ndata: {"FixtureId":123,"home":2.1}\n\n');
assert.equal(sse.event, "odds");
assert.equal(sse.id, "42");
assert.match(sse.data, /FixtureId/);

console.log(
  JSON.stringify(
    {
      fixtures: state.fixtures.size,
      signals: state.signals.length,
      positions: state.positions.length,
      pnl: Number(totalPnl(state).toFixed(2))
    },
    null,
    2
  )
);
