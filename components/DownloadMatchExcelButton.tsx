"use client";

import { timelineCompactLabel } from "@/lib/event-label";
import {
  bowlingSide,
  oversFormat,
  pairPlayerNamesFromIds,
  playerById,
} from "@/lib/scoring";
import type { BallEvent, LiveInnings, MatchConfig, Side } from "@/lib/types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function sideName(config: MatchConfig, side: Side): string {
  return side === "a" ? config.teamA.name : config.teamB.name;
}

function rosterFor(config: MatchConfig, side: Side) {
  return side === "a" ? config.teamA : config.teamB;
}

function table(title: string, headers: string[], rows: unknown[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function inningsSummaryRows(config: MatchConfig, innings: LiveInnings[]) {
  return innings.map((inn, i) => [
    i + 1,
    sideName(config, inn.battingSide),
    inn.runs,
    inn.wicketEvents,
    oversFormat(inn.legalBalls),
    inn.legalBalls,
    inn.wicketPenaltyRuns,
  ]);
}

function pairRows(config: MatchConfig, innings: LiveInnings[]) {
  return innings.flatMap((inn, i) => {
    const roster = rosterFor(config, inn.battingSide);
    return inn.completedPairs.map((p) => {
      const [player1, player2] = pairPlayerNamesFromIds(roster, p.playerIds);
      return [
        i + 1,
        sideName(config, inn.battingSide),
        p.pairNumber,
        player1,
        player2,
        p.runs,
        p.wicketEvents,
        oversFormat(p.legalBalls),
        p.legalBalls,
      ];
    });
  });
}

function deliveryRows(config: MatchConfig, innings: LiveInnings[]) {
  return innings.flatMap((inn, i) => {
    const bowlRoster = rosterFor(config, bowlingSide(inn.battingSide));
    return inn.events.map((e: BallEvent, idx) => [
      i + 1,
      idx + 1,
      sideName(config, inn.battingSide),
      e.overNumber != null && e.ballInOver != null
        ? `${e.overNumber}.${e.ballInOver + 1}`
        : oversFormat(e.legalBallsAfter),
      timelineCompactLabel(e),
      e.kind,
      e.runsDelta,
      e.totalAfter,
      e.legalBallsAfter,
      e.isLegalDelivery === false ? "No" : "Yes",
      e.extras ?? 0,
      e.extraType ?? "",
      e.batterRuns ?? "",
      e.bowlerPlayerIdAtDelivery
        ? playerById(bowlRoster, e.bowlerPlayerIdAtDelivery)
        : "",
      e.label,
    ]);
  });
}

function bowlerRows(config: MatchConfig, innings: LiveInnings[]) {
  return innings.flatMap((inn, i) => {
    const bowlSide = bowlingSide(inn.battingSide);
    const bowlRoster = rosterFor(config, bowlSide);
    return Object.entries(inn.bowlerFigures).map(([playerId, f]) => [
      i + 1,
      sideName(config, bowlSide),
      playerById(bowlRoster, playerId),
      oversFormat(f.legalBallsBowled),
      f.legalBallsBowled,
      f.runsConceded,
      f.wickets,
      f.oversCompleted,
    ]);
  });
}

function buildExcelHtml(config: MatchConfig, first: LiveInnings, second: LiveInnings) {
  const innings = [first, second];
  const matchRows = [
    ["Team A", config.teamA.name],
    ["Team B", config.teamB.name],
    ["Toss winner", sideName(config, config.tossWinner)],
    ["Batted first", sideName(config, config.batFirst)],
    ["Overs per innings", config.maxOvers],
  ];

  const content = [
    table("Match", ["Field", "Value"], matchRows),
    table(
      "Innings",
      [
        "Innings",
        "Batting team",
        "Runs",
        "Wickets",
        "Overs",
        "Legal balls",
        "Wicket penalty runs",
      ],
      inningsSummaryRows(config, innings)
    ),
    table(
      "Pairs",
      [
        "Innings",
        "Team",
        "Pair",
        "Player 1",
        "Player 2",
        "Runs",
        "Wickets",
        "Overs",
        "Legal balls",
      ],
      pairRows(config, innings)
    ),
    table(
      "Deliveries",
      [
        "Innings",
        "Seq",
        "Batting team",
        "Ball",
        "Code",
        "Type",
        "Runs delta",
        "Total after",
        "Legal balls after",
        "Legal delivery",
        "Extras",
        "Extra type",
        "Batter/additional runs",
        "Bowler",
        "Label",
      ],
      deliveryRows(config, innings)
    ),
    table(
      "Bowler figures",
      [
        "Innings",
        "Bowling team",
        "Bowler",
        "Overs",
        "Legal balls",
        "Runs conceded",
        "Wickets",
        "Completed overs",
      ],
      bowlerRows(config, innings)
    ),
  ].join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { font-size: 20px; }
        h2 { margin-top: 24px; font-size: 16px; }
        table { border-collapse: collapse; margin-bottom: 18px; }
        th, td { border: 1px solid #999; padding: 6px 8px; }
        th { background: #d9ead3; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(config.teamA.name)} vs ${escapeHtml(config.teamB.name)}</h1>
      ${content}
    </body>
  </html>`;
}

export function DownloadMatchExcelButton({
  config,
  first,
  second,
}: {
  config: MatchConfig;
  first: LiveInnings;
  second: LiveInnings;
}) {
  const download = () => {
    const html = buildExcelHtml(config, first, second);
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const matchName = `${safeFilePart(config.teamA.name)}-vs-${safeFilePart(
      config.teamB.name
    )}`;
    a.href = url;
    a.download = `${matchName || "match-scorecard"}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-emerald-600 bg-emerald-50 text-base font-bold text-emerald-800 shadow-sm active:scale-[0.99] dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      Download Excel scorecard
    </button>
  );
}
