"use client";

import { validateWicketDetail } from "@/lib/wicket-validate";
import {
  bowlingSide,
  currentPairSlotPlayerIds,
  pairPlayerNamesFromIds,
} from "@/lib/scoring";
import type {
  DismissalType,
  LiveInnings,
  MatchConfig,
  RunOutKind,
  WicketDetailInput,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const DISMISSAL_OPTIONS: { value: DismissalType; label: string }[] = [
  { value: "bowled", label: "Bowled" },
  { value: "caught", label: "Caught" },
  { value: "run_out", label: "Run Out" },
  { value: "lbw", label: "LBW" },
  { value: "stumped", label: "Stumped" },
  { value: "hit_wicket", label: "Hit Wicket" },
  { value: "other", label: "Other" },
];

const selectClass =
  "min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (detail: WicketDetailInput) => void;
  config: MatchConfig;
  live: LiveInnings;
};

export function WicketSheet({ open, onClose, onSubmit, config, live }: Props) {
  const battingSide = live.battingSide;
  const bowlSide = bowlingSide(battingSide);
  const battingRoster = battingSide === "a" ? config.teamA : config.teamB;
  const bowlingRoster = bowlSide === "a" ? config.teamA : config.teamB;
  const [dismissalType, setDismissalType] =
    useState<DismissalType>("bowled");
  const [bowlerId, setBowlerId] = useState("");
  const [batterIsStriker, setBatterIsStriker] = useState(true);
  const [catcherId, setCatcherId] = useState("");
  const [runOutKind, setRunOutKind] = useState<RunOutKind>("individual");
  const [individualFielderId, setIndividualFielderId] = useState("");
  const [jointIds, setJointIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const defaultBowler = useMemo(() => {
    return (
      live.currentBowlerPlayerId ?? bowlingRoster.players[0]?.id ?? ""
    );
  }, [live.currentBowlerPlayerId, bowlingRoster.players]);

  useEffect(() => {
    if (!open) return;
    setDismissalType("bowled");
    setBowlerId(defaultBowler);
    setBatterIsStriker(true);
    setCatcherId("");
    setRunOutKind("individual");
    setIndividualFielderId("");
    setJointIds([]);
    setNotes("");
    setFormError(null);
  }, [open, defaultBowler]);

  useEffect(() => {
    if (dismissalType !== "caught") setCatcherId("");
    if (dismissalType !== "run_out") {
      setRunOutKind("individual");
      setIndividualFielderId("");
      setJointIds([]);
    }
  }, [dismissalType]);

  const toggleJoint = useCallback((id: string) => {
    setJointIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const buildPayload = useCallback((): WicketDetailInput | null => {
    const [slot1, slot2] = currentPairSlotPlayerIds(live);
    if (!slot1 || !slot2) return null;
    const batterPlayerId = batterIsStriker ? slot1 : slot2;
    const notesTrim = notes.trim();

    if (dismissalType === "run_out") {
      const fielderPlayerIds =
        runOutKind === "individual"
          ? individualFielderId
            ? [individualFielderId]
            : []
          : [...jointIds];
      return {
        dismissalType,
        bowlerPlayerId: bowlerId.trim() ? bowlerId : null,
        batterPlayerId,
        catcherPlayerId: null,
        runOutKind,
        fielderPlayerIds,
        notes: notesTrim,
      };
    }

    if (dismissalType === "caught") {
      return {
        dismissalType,
        bowlerPlayerId: bowlerId.trim() ? bowlerId : null,
        batterPlayerId,
        catcherPlayerId: catcherId.trim() ? catcherId : null,
        runOutKind: null,
        fielderPlayerIds: [],
        notes: notesTrim,
      };
    }

    return {
      dismissalType,
      bowlerPlayerId: bowlerId.trim() ? bowlerId : null,
      batterPlayerId,
      catcherPlayerId: null,
      runOutKind: null,
      fielderPlayerIds: [],
      notes: notesTrim,
    };
  }, [
    live.currentPairPlayerIds,
    batterIsStriker,
    notes,
    dismissalType,
    bowlerId,
    catcherId,
    runOutKind,
    individualFielderId,
    jointIds,
  ]);

  const handleSubmit = () => {
    const payload = buildPayload();
    if (!payload) {
      setFormError("Could not resolve batters for this pair.");
      return;
    }
    const err = validateWicketDetail(payload, config, battingSide);
    if (err) {
      setFormError(err);
      return;
    }
    onSubmit(payload);
    onClose();
  };

  if (!open) return null;

  const [p1Name, p2Name] = pairPlayerNamesFromIds(
    battingRoster,
    live.currentPairPlayerIds
  );

  const runOut = dismissalType === "run_out";
  const caught = dismissalType === "caught";
  const bowlerRequired = !runOut;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wicket-sheet-title"
        className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-h-[85vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2
            id="wicket-sheet-title"
            className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
          >
            Wicket (−5)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-zinc-500"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 pb-8">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Dismissal type
            </span>
            <select
              className={`${selectClass} mt-1`}
              value={dismissalType}
              onChange={(e) =>
                setDismissalType(e.target.value as DismissalType)
              }
            >
              {DISMISSAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Batter out
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBatterIsStriker(true)}
                className={`min-h-14 rounded-2xl border-2 px-2 text-sm font-bold ${
                  batterIsStriker
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
                }`}
              >
                Striker
                <span className="mt-1 block text-xs font-normal opacity-80">
                  {p1Name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBatterIsStriker(false)}
                className={`min-h-14 rounded-2xl border-2 px-2 text-sm font-bold ${
                  !batterIsStriker
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
                }`}
              >
                Non-striker
                <span className="mt-1 block text-xs font-normal opacity-80">
                  {p2Name}
                </span>
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              {runOut ? "Bowler (optional)" : "Bowler"}
            </span>
            <select
              className={`${selectClass} mt-1`}
              value={bowlerId}
              onChange={(e) => setBowlerId(e.target.value)}
            >
              {runOut && <option value="">— None —</option>}
              {bowlingRoster.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {bowlerRequired && !bowlerId && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Required for this dismissal type
              </p>
            )}
          </label>

          {caught && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Fielder (catcher)
              </span>
              <select
                className={`${selectClass} mt-1`}
                value={catcherId}
                onChange={(e) => setCatcherId(e.target.value)}
              >
                <option value="">Select catcher…</option>
                {bowlingRoster.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {runOut && (
            <>
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Run out type
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRunOutKind("individual")}
                    className={`min-h-12 rounded-xl text-sm font-bold ${
                      runOutKind === "individual"
                        ? "bg-zinc-900 text-white dark:bg-emerald-600"
                        : "border border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    One fielder
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunOutKind("joint")}
                    className={`min-h-12 rounded-xl text-sm font-bold ${
                      runOutKind === "joint"
                        ? "bg-zinc-900 text-white dark:bg-emerald-600"
                        : "border border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    Joint (2+)
                  </button>
                </div>
              </div>

              {runOutKind === "individual" ? (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Fielder
                  </span>
                  <select
                    className={`${selectClass} mt-1`}
                    value={individualFielderId}
                    onChange={(e) => setIndividualFielderId(e.target.value)}
                  >
                    <option value="">Select fielder…</option>
                    {bowlingRoster.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Fielders (tap 2 or more)
                  </span>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-2 dark:border-zinc-700">
                    {bowlingRoster.players.map((p) => (
                      <li key={p.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1 active:bg-zinc-100 dark:active:bg-zinc-800">
                          <input
                            type="checkbox"
                            checked={jointIds.includes(p.id)}
                            onChange={() => toggleJoint(p.id)}
                            className="h-5 w-5 rounded border-zinc-400"
                          />
                          <span className="text-base font-medium">{p.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Notes (optional)
            </span>
            <input
              type="text"
              className={`${selectClass} mt-1`}
              placeholder="e.g. direct hit"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={120}
            />
          </label>

          {formError && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
              {formError}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            className="h-14 w-full rounded-2xl bg-red-600 text-base font-bold text-white shadow-lg active:scale-[0.99]"
          >
            Confirm wicket
          </button>
        </div>
      </div>
    </div>
  );
}
