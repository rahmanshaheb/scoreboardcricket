"use client";

import { makeQuickWicket, pairPlayerNamesFromIds } from "@/lib/scoring";
import { validateWicketDetail } from "@/lib/wicket-validate";
import type { LiveInnings, MatchConfig, WicketDetailInput } from "@/lib/types";
import { useEffect, useState } from "react";

export type QuickOutMode = "caught" | "run_out" | "extra_wicket";

type Props = {
  open: boolean;
  mode: QuickOutMode | null;
  onClose: () => void;
  onSubmit: (
    detail: WicketDetailInput,
    extraDelivery?: "wide" | "no_ball"
  ) => void;
  config: MatchConfig;
  live: LiveInnings;
};

const TITLES: Record<QuickOutMode, string> = {
  caught: "Caught",
  run_out: "Run out",
  extra_wicket: "Wide / No ball out",
};

export function QuickOutSheet({
  open,
  mode,
  onClose,
  onSubmit,
  config,
  live,
}: Props) {
  const [batterIsStriker, setBatterIsStriker] = useState(true);
  const [fielderId, setFielderId] = useState("");
  const [extraDelivery, setExtraDelivery] = useState<"wide" | "no_ball">("wide");
  const [formError, setFormError] = useState<string | null>(null);

  const battingSide = live.battingSide;
  const battingRoster =
    battingSide === "a" ? config.teamA : config.teamB;
  const bowlingRoster =
    battingSide === "a" ? config.teamB : config.teamA;

  useEffect(() => {
    if (!open) return;
    setBatterIsStriker(true);
    setFielderId("");
    setExtraDelivery("wide");
    setFormError(null);
  }, [open, mode]);

  if (!open || !mode) return null;

  const [p1Name, p2Name] = pairPlayerNamesFromIds(
    battingRoster,
    live.currentPairPlayerIds
  );
  const needsFielder =
    mode === "caught" || mode === "run_out" || mode === "extra_wicket";

  const handleConfirm = () => {
    const dismissal = mode === "caught" ? "caught" : "run_out";
    const payload = makeQuickWicket(live, dismissal, {
      batterIsStriker,
      fielderId: needsFielder ? fielderId : undefined,
    });
    if (!payload) {
      setFormError("Could not resolve batters.");
      return;
    }
    const err = validateWicketDetail(payload, config, battingSide);
    if (err) {
      setFormError(err);
      return;
    }
    if (mode === "extra_wicket") {
      onSubmit(payload, extraDelivery);
    } else {
      onSubmit(payload);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-2"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-out-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2
            id="quick-out-title"
            className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
          >
            {TITLES[mode]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-zinc-500"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 pb-6">
          {mode === "extra_wicket" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExtraDelivery("wide")}
                className={`min-h-11 rounded-xl text-sm font-bold ${
                  extraDelivery === "wide"
                    ? "bg-violet-600 text-white"
                    : "border border-zinc-300 dark:border-zinc-600"
                }`}
              >
                Wide
              </button>
              <button
                type="button"
                onClick={() => setExtraDelivery("no_ball")}
                className={`min-h-11 rounded-xl text-sm font-bold ${
                  extraDelivery === "no_ball"
                    ? "bg-orange-600 text-white"
                    : "border border-zinc-300 dark:border-zinc-600"
                }`}
              >
                No ball
              </button>
            </div>
          )}

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

          {needsFielder && (
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Fielder
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {bowlingRoster.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFielderId(p.id)}
                    className={`min-h-12 rounded-xl px-2 text-sm font-bold ${
                      fielderId === p.id
                        ? "bg-red-600 text-white"
                        : "border border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
                    }`}
                  >
                    {p.name || "?"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
              {formError}
            </p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className="h-14 w-full rounded-2xl bg-red-600 text-base font-bold text-white active:scale-[0.99]"
          >
            Confirm out (−5)
          </button>
        </div>
      </div>
    </div>
  );
}
