"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { matchStoreStorage } from "@/lib/storage";
import {
  BALLS_PER_OVER,
  MAX_UNDO,
  PLAYERS_PER_TEAM,
  STORAGE_KEY,
  STORE_VERSION,
} from "@/lib/constants";
import { newId } from "@/lib/id";
import {
  makePlayers,
  SAMPLE_TEAM_A_NAMES,
  SAMPLE_TEAM_B_NAMES,
} from "@/lib/sample-data";
import { upgradeLiveInningsV2ToV3 } from "@/lib/migrate-innings-v3";
import { upgradeLiveInningsV3ToV4 } from "@/lib/migrate-innings-v4";
import {
  addNoBall,
  addExtraWicket,
  addRuns,
  addWide,
  addWicket,
  applyNextPairSelection,
  bowlingSide,
  confirmBowlerForNextOver,
  emptyLiveInningsForMatch,
  endOver,
  isInningsComplete,
  maxLegalBalls,
  sealPartialPairIfActive,
} from "@/lib/scoring";
import type {
  AppPhase,
  LiveInnings,
  MatchConfig,
  Player,
  Side,
  TeamRoster,
  WicketDetailInput,
} from "@/lib/types";

/** Serializable undo point (no nested stacks). */
export interface UndoFrame {
  phase: AppPhase;
  config: MatchConfig | null;
  inningsNumber: 1 | 2;
  innings1Result: LiveInnings | null;
  live: LiveInnings | null;
  innings2Result: LiveInnings | null;
  setup: SetupDraft;
  /** Present from store v2; older persisted undo frames may omit. */
  matchSessionId?: string | null;
  matchSavedToDb?: boolean;
}

export interface SetupDraft {
  teamAName: string;
  teamBName: string;
  playersA: Player[];
  playersB: Player[];
  /** Opening batters for Team A (pick before match if A bats first; else at innings break). */
  openingPairA: [string, string] | null;
  /** Opening batters for Team B */
  openingPairB: [string, string] | null;
  tossWinner: Side | null;
  batFirst: Side | null;
  maxOvers: number;
}

function emptyPlayers(): Player[] {
  return Array.from({ length: PLAYERS_PER_TEAM }, (_, i) => ({
    id: newId(),
    name: "",
  }));
}

function initialSetup(): SetupDraft {
  return {
    teamAName: "",
    teamBName: "",
    playersA: emptyPlayers(),
    playersB: emptyPlayers(),
    openingPairA: null,
    openingPairB: null,
    tossWinner: null,
    batFirst: null,
    maxOvers: 20,
  };
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function rosterFromSetup(s: SetupDraft, side: Side): TeamRoster {
  if (side === "a") {
    return {
      name: s.teamAName.trim() || "Team A",
      players: s.playersA,
      pairs: [],
    };
  }
  return {
    name: s.teamBName.trim() || "Team B",
    players: s.playersB,
    pairs: [],
  };
}

function validateSetup(s: SetupDraft): string | null {
  const namesA = s.playersA.map((p) => p.name.trim());
  const namesB = s.playersB.map((p) => p.name.trim());
  if (namesA.some((n) => !n)) return "Enter all 10 names for Team A.";
  if (namesB.some((n) => !n)) return "Enter all 10 names for Team B.";
  if (!s.tossWinner) return "Select toss winner.";
  if (!s.batFirst) return "Select who bats first.";
  if (s.maxOvers < 1 || s.maxOvers > 120) return "Overs must be between 1 and 120.";
  const first = s.batFirst === "a" ? s.openingPairA : s.openingPairB;
  if (!first?.[0] || !first?.[1]) return "Select the opening batting pair.";
  if (first[0] === first[1]) return "Opening pair must be two different players.";
  const roster = s.batFirst === "a" ? s.playersA : s.playersB;
  const ids = new Set(roster.map((p) => p.id));
  if (!ids.has(first[0]) || !ids.has(first[1]))
    return "Opening pair must use players from the batting team.";
  return null;
}

export interface MatchStore {
  version: number;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  theme: "dark" | "light";
  toggleTheme: () => void;

  phase: AppPhase;
  config: MatchConfig | null;
  inningsNumber: 1 | 2;
  innings1Result: LiveInnings | null;
  live: LiveInnings | null;
  innings2Result: LiveInnings | null;
  setup: SetupDraft;
  undoStack: UndoFrame[];
  /** Stable id for this match (DB idempotency). */
  matchSessionId: string | null;
  /** After POST /api/matches succeeds for this session. */
  matchSavedToDb: boolean;

  /** Go to team setup from home */
  beginNewMatch: () => void;
  loadSampleMatch: () => void;
  updateSetup: (patch: Partial<SetupDraft>) => void;
  setPlayerName: (side: Side, index: number, name: string) => void;
  /** Set opening pair slot; swaps if player already selected in other slot */
  setOpeningPairSlot: (side: Side, slot: 0 | 1, playerId: string) => void;
  goToPairSetup: () => string | null;
  startMatch: () => string | null;

  scoreRuns: (n: number) => void;
  scoreWide: (additionalRuns: number) => void;
  scoreNoBall: (batRuns: number) => void;
  scoreWicketWithDetail: (detail: WicketDetailInput) => void;
  scoreExtraWicketWithDetail: (
    extraType: "wide" | "no_ball",
    detail: WicketDetailInput
  ) => void;
  swapStrikerManually: () => void;
  setCurrentBowler: (playerId: string | null) => void;
  /** After a completed over (6 legal balls); cannot be same bowler as previous over */
  submitNextOverBowler: (bowlerId: string) => string | null;
  scoreEndOver: () => void;
  /** After 4 overs on pairs 1–4; `playerIds` must be unused batters */
  submitNextPairSelection: (playerIds: [string, string]) => string | null;
  undo: () => void;
  endInningsManually: () => void;

  startSecondInnings: () => void;
  goHome: () => void;
  resetAll: () => void;

  /** Set after successful POST /api/matches (idempotent per session). */
  markMatchSavedToDb: () => void;
  /** Legacy / resumed matches: create a session id before DB save. */
  ensureMatchSessionForArchive: () => void;

  pushUndo: () => void;
  afterLiveUpdate: (next: LiveInnings) => void;
}

function frameFromStore(s: MatchStore): UndoFrame {
  return {
    phase: s.phase,
    config: s.config ? deepClone(s.config) : null,
    inningsNumber: s.inningsNumber,
    innings1Result: s.innings1Result ? deepClone(s.innings1Result) : null,
    live: s.live ? deepClone(s.live) : null,
    innings2Result: s.innings2Result ? deepClone(s.innings2Result) : null,
    setup: deepClone(s.setup),
    matchSessionId: s.matchSessionId,
    matchSavedToDb: s.matchSavedToDb,
  };
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      version: STORE_VERSION,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      phase: "home",
      config: null,
      inningsNumber: 1,
      innings1Result: null,
      live: null,
      innings2Result: null,
      setup: initialSetup(),
      undoStack: [],
      matchSessionId: null,
      matchSavedToDb: false,

      markMatchSavedToDb: () => set({ matchSavedToDb: true }),

      ensureMatchSessionForArchive: () =>
        set((s) =>
          s.matchSessionId ? s : { matchSessionId: newId() }
        ),

      pushUndo: () => {
        const cur = get();
        const frame = frameFromStore(cur);
        set((s) => ({
          undoStack: [...s.undoStack, frame].slice(-MAX_UNDO),
        }));
      },

      beginNewMatch: () => {
        set({
          phase: "setup_teams",
          config: null,
          inningsNumber: 1,
          innings1Result: null,
          live: null,
          innings2Result: null,
          setup: initialSetup(),
          undoStack: [],
          matchSessionId: null,
          matchSavedToDb: false,
        });
      },

      loadSampleMatch: () => {
        const playersA = makePlayers(SAMPLE_TEAM_A_NAMES);
        const playersB = makePlayers(SAMPLE_TEAM_B_NAMES);
        set({
          phase: "setup_pairs",
          config: null,
          inningsNumber: 1,
          innings1Result: null,
          live: null,
          innings2Result: null,
          undoStack: [],
          matchSessionId: null,
          matchSavedToDb: false,
          setup: {
            teamAName: "North XI",
            teamBName: "South XI",
            playersA,
            playersB,
            openingPairA: [playersA[0].id, playersA[1].id],
            openingPairB: [playersB[0].id, playersB[1].id],
            tossWinner: "a",
            batFirst: "a",
            maxOvers: 8,
          },
        });
      },

      updateSetup: (patch) =>
        set((s) => ({ setup: { ...s.setup, ...patch } })),

      setPlayerName: (side, index, name) =>
        set((s) => {
          const key = side === "a" ? "playersA" : "playersB";
          const list = [...s.setup[key]];
          if (index < 0 || index >= list.length) return s;
          list[index] = { ...list[index], name };
          return { setup: { ...s.setup, [key]: list } };
        }),

      setOpeningPairSlot: (side, slot, playerId) =>
        set((s) => {
          const k = side === "a" ? "openingPairA" : "openingPairB";
          const players = side === "a" ? s.setup.playersA : s.setup.playersB;
          const prev = s.setup[k];
          const valid = new Set(players.map((p) => p.id));
          if (!valid.has(playerId)) return s;
          let a = prev?.[0] ?? "";
          let b = prev?.[1] ?? "";
          if (slot === 0) {
            if (playerId === b) b = a;
            a = playerId;
          } else {
            if (playerId === a) a = b;
            b = playerId;
          }
          return {
            setup: { ...s.setup, [k]: [a, b] as [string, string] },
          };
        }),

      goToPairSetup: () => {
        const s = get().setup;
        const err = (() => {
          const namesA = s.playersA.map((p) => p.name.trim());
          const namesB = s.playersB.map((p) => p.name.trim());
          if (namesA.some((n) => !n)) return "Enter all 10 names for Team A.";
          if (namesB.some((n) => !n)) return "Enter all 10 names for Team B.";
          if (!s.tossWinner) return "Select toss winner.";
          if (!s.batFirst) return "Select who bats first.";
          if (s.maxOvers < 1 || s.maxOvers > 120)
            return "Overs must be between 1 and 120.";
          return null;
        })();
        if (err) return err;
        set({ phase: "setup_pairs" });
        return null;
      },

      startMatch: () => {
        const s = get();
        const draft = s.setup;
        const err = validateSetup(draft);
        if (err) return err;
        const config: MatchConfig = {
          teamA: rosterFromSetup(draft, "a"),
          teamB: rosterFromSetup(draft, "b"),
          maxOvers: draft.maxOvers,
          tossWinner: draft.tossWinner!,
          batFirst: draft.batFirst!,
        };
        const open =
          config.batFirst === "a"
            ? draft.openingPairA!
            : draft.openingPairB!;
        const live = emptyLiveInningsForMatch(config.batFirst, open, config);
        set({
          phase: "live",
          config,
          inningsNumber: 1,
          innings1Result: null,
          innings2Result: null,
          live,
          setup: draft,
          undoStack: [],
          matchSessionId: newId(),
          matchSavedToDb: false,
        });
        return null;
      },

      afterLiveUpdate: (next) => {
        const { config, inningsNumber } = get();
        if (!config) return;
        let out = next;
        const cap = maxLegalBalls(config.maxOvers);
        const wouldComplete = isInningsComplete(out, config.maxOvers);
        if (
          wouldComplete &&
          out.currentPairNumber <= 5 &&
          out.currentPairPlayerIds[0] &&
          out.currentPairPlayerIds[1]
        ) {
          out = sealPartialPairIfActive(out);
        }
        if (isInningsComplete(out, config.maxOvers)) {
          if (inningsNumber === 1) {
            set({
              innings1Result: deepClone(out),
              live: null,
              phase: "innings_break",
            });
          } else {
            set({
              innings2Result: deepClone(out),
              live: null,
              phase: "summary",
            });
          }
        } else {
          set({ live: out });
        }
      },

      scoreRuns: (n) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        if (live.legalBalls >= maxLegalBalls(config.maxOvers)) return;
        if (!live.currentBowlerPlayerId) return;
        pushUndo();
        const next = addRuns(live, inningsNumber, n);
        afterLiveUpdate(next);
      },

      scoreWide: (additionalRuns) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        if (live.legalBalls >= maxLegalBalls(config.maxOvers)) return;
        if (!live.currentBowlerPlayerId) return;
        pushUndo();
        const next = addWide(live, inningsNumber, additionalRuns);
        afterLiveUpdate(next);
      },

      scoreNoBall: (batRuns) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        if (live.legalBalls >= maxLegalBalls(config.maxOvers)) return;
        if (!live.currentBowlerPlayerId) return;
        pushUndo();
        const next = addNoBall(live, inningsNumber, batRuns);
        afterLiveUpdate(next);
      },

      scoreWicketWithDetail: (detail) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        if (live.legalBalls >= maxLegalBalls(config.maxOvers)) return;
        pushUndo();
        const next = addWicket(live, inningsNumber, config, detail);
        afterLiveUpdate(next);
      },

      scoreExtraWicketWithDetail: (extraType, detail) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        if (live.legalBalls >= maxLegalBalls(config.maxOvers)) return;
        pushUndo();
        const next = addExtraWicket(
          live,
          inningsNumber,
          config,
          extraType,
          detail
        );
        afterLiveUpdate(next);
      },

      swapStrikerManually: () => {
        const { live, pushUndo } = get();
        if (!live) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        pushUndo();
        set({ live: { ...live, strikerIsFirst: !live.strikerIsFirst } });
      },

      setCurrentBowler: (playerId) =>
        set((s) => {
          if (!s.live) return s;
          const live = s.live;
          if (live.awaitingBowlerSelection || live.awaitingNextPairSelection)
            return s;
          const inMidOver =
            live.legalBalls % BALLS_PER_OVER !== 0 && live.legalBalls > 0;
          if (inMidOver) return s;
          if (
            playerId &&
            live.lastCompletedOverBowlerPlayerId === playerId &&
            live.legalBalls > 0 &&
            live.legalBalls % BALLS_PER_OVER === 0
          ) {
            return s;
          }
          return {
            live: { ...live, currentBowlerPlayerId: playerId },
          };
        }),

      submitNextOverBowler: (bowlerId) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } =
          get();
        if (!live || !config) return "No live match.";
        if (!live.awaitingBowlerSelection)
          return "Pick a bowler only after an over completes.";
        const bowl = bowlingSide(live.battingSide);
        const roster = bowl === "a" ? config.teamA : config.teamB;
        if (!roster.players.some((p) => p.id === bowlerId)) {
          return "Bowler must be on the fielding team.";
        }
        if (
          live.lastCompletedOverBowlerPlayerId &&
          live.lastCompletedOverBowlerPlayerId === bowlerId
        ) {
          return "That bowler just finished the last over — pick someone else.";
        }
        pushUndo();
        const next = confirmBowlerForNextOver(live, bowlerId);
        afterLiveUpdate(next);
        return null;
      },

      scoreEndOver: () => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return;
        if (live.awaitingNextPairSelection || live.awaitingBowlerSelection) return;
        if (!live.currentPairPlayerIds[0] || !live.currentPairPlayerIds[1])
          return;
        if (live.currentPairNumber > 5) return;
        if (!live.currentBowlerPlayerId) return;
        pushUndo();
        const next = endOver(live, inningsNumber);
        afterLiveUpdate(next);
      },

      submitNextPairSelection: (playerIds) => {
        const { live, config, inningsNumber, pushUndo, afterLiveUpdate } = get();
        if (!live || !config) return "No live match.";
        if (!live.awaitingNextPairSelection)
          return "Not waiting for a new pair.";
        const [a, b] = playerIds;
        if (!a || !b || a === b) return "Pick two different players.";
        const roster =
          live.battingSide === "a" ? config.teamA : config.teamB;
        const allowed = new Set(roster.players.map((p) => p.id));
        if (!allowed.has(a) || !allowed.has(b))
          return "Players must be on the batting team.";
        const used = new Set<string>();
        for (const c of live.completedPairs) {
          used.add(c.playerIds[0]);
          used.add(c.playerIds[1]);
        }
        if (used.has(a) || used.has(b)) return "Those players already batted.";
        pushUndo();
        const next = applyNextPairSelection(live, [a, b]);
        afterLiveUpdate(next);
        return null;
      },

      endInningsManually: () => {
        const { live, config, inningsNumber, pushUndo } = get();
        if (!live || !config) return;
        pushUndo();
        let frozen = deepClone(live);
        frozen = sealPartialPairIfActive(frozen);
        if (inningsNumber === 1) {
          set({
            innings1Result: frozen,
            live: null,
            phase: "innings_break",
          });
        } else {
          set({
            innings2Result: frozen,
            live: null,
            phase: "summary",
          });
        }
      },

      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        const last = undoStack[undoStack.length - 1];
        const rest = undoStack.slice(0, -1);
        set({
          phase: last.phase,
          config: last.config,
          inningsNumber: last.inningsNumber,
          innings1Result: last.innings1Result,
          live: last.live,
          innings2Result: last.innings2Result,
          setup: last.setup,
          undoStack: rest,
          matchSessionId: last.matchSessionId ?? null,
          matchSavedToDb: last.matchSavedToDb ?? false,
        });
      },

      startSecondInnings: () => {
        const { config, innings1Result, setup } = get();
        if (!config || !innings1Result) return;
        const bat = bowlingSide(innings1Result.battingSide);
        const open = bat === "a" ? setup.openingPairA : setup.openingPairB;
        if (!open?.[0] || !open?.[1] || open[0] === open[1]) return;
        const roster = bat === "a" ? setup.playersA : setup.playersB;
        const ids = new Set(roster.map((p) => p.id));
        if (!ids.has(open[0]) || !ids.has(open[1])) return;
        const live = emptyLiveInningsForMatch(bat, open, config);
        set({
          phase: "live",
          inningsNumber: 2,
          live,
          undoStack: [],
        });
      },

      goHome: () => {
        set({
          phase: "home",
          config: null,
          inningsNumber: 1,
          innings1Result: null,
          live: null,
          innings2Result: null,
          setup: initialSetup(),
          undoStack: [],
          matchSessionId: null,
          matchSavedToDb: false,
        });
      },

      resetAll: () => {
        get().goHome();
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: matchStoreStorage(),
      partialize: (s) => ({
        version: s.version,
        theme: s.theme,
        phase: s.phase,
        config: s.config,
        inningsNumber: s.inningsNumber,
        innings1Result: s.innings1Result,
        live: s.live,
        innings2Result: s.innings2Result,
        setup: s.setup,
        undoStack: s.undoStack,
        matchSessionId: s.matchSessionId,
        matchSavedToDb: s.matchSavedToDb,
      }),
      migrate: (persisted: unknown, fromVersion: number) => {
        const p = persisted as Record<string, unknown>;
        if (fromVersion < 2) {
          p.matchSessionId = null;
          p.matchSavedToDb = false;
        }
        if (fromVersion < 3) {
          const st = p as Record<string, unknown>;
          if (st && typeof st === "object") {
            const cfg = st.config as MatchConfig | null | undefined;
            const rosterFor = (side: Side): TeamRoster | null => {
              if (!cfg) return null;
              return side === "a" ? cfg.teamA : cfg.teamB;
            };
            const fix = (inn: unknown) => {
              if (!inn || typeof inn !== "object") return inn;
              const side = (inn as LiveInnings).battingSide;
              return upgradeLiveInningsV2ToV3(
                inn as Record<string, unknown>,
                rosterFor(side)
              );
            };
            st.live = fix(st.live);
            st.innings1Result = fix(st.innings1Result);
            st.innings2Result = fix(st.innings2Result);
            const setup = st.setup as Record<string, unknown> | undefined;
            if (setup && !setup.openingPairA) {
              const pairsA = setup.pairsA as { playerIds: [string, string] }[] | undefined;
              const pairsB = setup.pairsB as { playerIds: [string, string] }[] | undefined;
              setup.openingPairA = pairsA?.[0]?.playerIds
                ? [...pairsA[0].playerIds]
                : null;
              setup.openingPairB = pairsB?.[0]?.playerIds
                ? [...pairsB[0].playerIds]
                : null;
              delete setup.pairsA;
              delete setup.pairsB;
            }
            const undo = st.undoStack as UndoFrame[] | undefined;
            if (Array.isArray(undo)) {
              for (const fr of undo) {
                if (fr.live) fr.live = fix(fr.live) as LiveInnings;
                if (fr.innings1Result)
                  fr.innings1Result = fix(fr.innings1Result) as LiveInnings;
                if (fr.innings2Result)
                  fr.innings2Result = fix(fr.innings2Result) as LiveInnings;
                const su = fr.setup as unknown as Record<string, unknown> | undefined;
                if (su && !su.openingPairA) {
                  const pa = su.pairsA as { playerIds: [string, string] }[] | undefined;
                  const pb = su.pairsB as { playerIds: [string, string] }[] | undefined;
                  su.openingPairA = pa?.[0]?.playerIds
                    ? [...pa[0].playerIds]
                    : null;
                  su.openingPairB = pb?.[0]?.playerIds
                    ? [...pb[0].playerIds]
                    : null;
                  delete su.pairsA;
                  delete su.pairsB;
                }
              }
            }
          }
        }
        if (fromVersion < 4) {
          const st = p as Record<string, unknown>;
          if (st && typeof st === "object") {
            const fix4 = (inn: unknown) => {
              if (!inn || typeof inn !== "object") return inn;
              return upgradeLiveInningsV3ToV4(inn);
            };
            st.live = fix4(st.live);
            st.innings1Result = fix4(st.innings1Result);
            st.innings2Result = fix4(st.innings2Result);
            const undo = st.undoStack as UndoFrame[] | undefined;
            if (Array.isArray(undo)) {
              for (const fr of undo) {
                if (fr.live) fr.live = fix4(fr.live) as LiveInnings;
                if (fr.innings1Result)
                  fr.innings1Result = fix4(fr.innings1Result) as LiveInnings;
                if (fr.innings2Result)
                  fr.innings2Result = fix4(fr.innings2Result) as LiveInnings;
              }
            }
          }
        }
        return p;
      },
      onRehydrateStorage: () => (state, err) => {
        if (!err) state?.setHydrated(true);
      },
      skipHydration: true,
    }
  )
);
