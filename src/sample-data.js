export const fixtures = [
  {
    id: "wc-101",
    competition: "World Cup 2026",
    participant1: "Canada",
    participant2: "Mexico",
    participant1IsHome: true,
    startTime: "2026-06-18T00:00:00Z"
  },
  {
    id: "wc-114",
    competition: "World Cup 2026",
    participant1: "Japan",
    participant2: "Croatia",
    participant1IsHome: false,
    startTime: "2026-06-18T03:00:00Z"
  },
  {
    id: "wc-128",
    competition: "World Cup 2026",
    participant1: "Brazil",
    participant2: "Nigeria",
    participant1IsHome: true,
    startTime: "2026-06-18T20:00:00Z"
  }
];

const pathCanadaMexico = [
  [5, "NS", "0-0", 2.46, 3.24, 2.88, 16, 18, ""],
  [12, "H1", "0-0", 2.38, 3.28, 3.02, 24, 34, "Opening tempo favors Canada"],
  [23, "H1", "0-1", 3.58, 3.44, 2.02, 41, 76, "Mexico scores"],
  [31, "H1", "0-1", 3.72, 3.38, 1.96, 34, 48, "Mexico support continues"],
  [46, "H2", "1-1", 2.64, 3.12, 2.72, 52, 94, "Canada equalizes"],
  [59, "H2", "1-1", 2.44, 3.18, 2.94, 63, 88, "Canada pressure spike"],
  [68, "H2", "1-1", 2.22, 3.30, 3.20, 71, 110, "Sharp home move"],
  [76, "H2", "1-1", 2.34, 3.22, 3.08, 28, 42, "Market cools"]
];

const pathJapanCroatia = [
  [4, "NS", "0-0", 3.10, 3.05, 2.42, 12, 16, ""],
  [14, "H1", "0-0", 2.92, 3.16, 2.48, 18, 30, "Japan starts fast"],
  [27, "H1", "0-0", 2.74, 3.18, 2.62, 37, 61, "Possession tilt"],
  [39, "H1", "0-0", 2.86, 3.10, 2.58, 20, 28, "No conversion"],
  [53, "H2", "0-0", 3.02, 2.86, 2.66, 31, 45, "Draw compresses"],
  [64, "H2", "0-1", 6.20, 3.55, 1.63, 64, 118, "Croatia scores"],
  [72, "H2", "0-1", 6.70, 3.70, 1.54, 55, 86, "Away price hardens"],
  [82, "H2", "1-1", 2.96, 2.44, 3.48, 74, 132, "Japan equalizes late"]
];

const pathBrazilNigeria = [
  [2, "NS", "0-0", 1.72, 3.92, 4.82, 18, 26, ""],
  [11, "H1", "0-0", 1.66, 4.10, 5.10, 22, 38, "Brazil steam"],
  [19, "H1", "1-0", 1.24, 5.80, 10.20, 68, 142, "Brazil scores"],
  [35, "H1", "1-0", 1.31, 5.10, 9.60, 28, 44, "Price settles"],
  [49, "H2", "1-0", 1.38, 4.80, 8.40, 21, 36, "Nigeria still dangerous"],
  [58, "H2", "1-1", 2.18, 3.42, 3.32, 79, 151, "Nigeria equalizes"],
  [67, "H2", "1-1", 2.04, 3.46, 3.62, 46, 83, "Brazil re-attack"],
  [79, "H2", "2-1", 1.20, 6.10, 13.40, 86, 164, "Brazil scores again"]
];

const fixturePaths = {
  "wc-101": pathCanadaMexico,
  "wc-114": pathJapanCroatia,
  "wc-128": pathBrazilNigeria
};

export function buildReplayUpdates() {
  const updates = [];
  Object.entries(fixturePaths).forEach(([fixtureId, rows], fixtureIndex) => {
    rows.forEach((row, rowIndex) => {
      const [minute, phase, score, home, draw, away, consensusGap, volumeDelta, narrative] = row;
      updates.push({
        type: "odds",
        seq: fixtureIndex * 100 + rowIndex + 1,
        fixtureId,
        minute,
        phase,
        score,
        ts: Date.parse("2026-06-18T00:00:00Z") + (fixtureIndex * 6_000 + rowIndex * 1_500),
        odds: { home, draw, away },
        consensusGap,
        volumeDelta,
        sourceCount: 14 + ((rowIndex + fixtureIndex) % 5),
        narrative
      });
    });
  });
  return updates.sort((a, b) => a.ts - b.ts);
}
