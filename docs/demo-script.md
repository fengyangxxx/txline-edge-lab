# Demo Script

Target length: 3-4 minutes.

## 0:00 - 0:20 Opening

Open the deployed site and introduce it as `TxLINE Edge Lab`, an autonomous signal
console for World Cup odds and score streams.

State the boundary clearly: analytics and paper execution only. No real wagers,
deposits, custody, or settlement.

## 0:20 - 1:10 Replay Feed

Show the fixture board. Explain that replay uses TxLINE-shaped packets so judges
can evaluate the product after match windows or without credentials.

Let the replay run until the first signal appears.

## 1:10 - 2:00 Signal Evidence

Click through the selected fixture. Show:

- implied probability chart;
- odds strip;
- signal tape;
- agent decision panel;
- Signal Evidence panel.

Explain the deterministic confidence score and point to move bps, threshold,
consensus gap, volume delta, and source count.

## 2:00 - 2:40 Paper Portfolio

Show a paper position being opened. Explain fixed synthetic stake sizing and mark
to current odds.

Emphasize that this is an autonomous strategy simulation, not a betting bot.

## 2:40 - 3:20 Evidence Export

Click `Export JSON`. Show the evidence payload fields:

- TxLINE endpoints;
- decision rule;
- latest signal;
- latest signal evidence;
- compliance note.

## 3:20 - 4:00 Live Adapter

Switch to Live. Show the JWT/API token inputs and explain that the same engine
connects to:

- `/api/odds/stream`
- `/api/scores/stream`

Mention that credentials are session-only and are not saved in browser storage.
