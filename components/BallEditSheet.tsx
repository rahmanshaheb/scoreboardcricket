"use client";

import { RUNS_PAD, WICKET_PENALTY } from "@/lib/constants";
import type { DeliveryEdit } from "@/lib/delivery-edit";
import { extraRunsFromEvent, runsFromEvent } from "@/lib/delivery-edit";
import { timelineCompactLabel } from "@/lib/event-label";
import type { BallEvent } from "@/lib/types";
import { useEffect, useState } from "react";

const EXTRA_RUNS_PAD = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const padBtn =
  "flex min-h-11 items-center justify-center rounded-xl text-base font-bold active:scale-[0.97]";
const runBtn = `${padBtn} bg-zinc-800 text-zinc-100`;
const extraBtn = `${padBtn} border-2 border-violet-500/60 bg-violet-950/40 text-violet-100`;
const extraNbBtn = `${padBtn} border-2 border-orange-500/60 bg-orange-950/40 text-orange-100`;
const wicketBtn = `${padBtn} border-2 border-red-500/70 bg-red-950/50 text-red-100`;

type Props = {
  open: boolean;
  event: BallEvent | null;
  onClose: () => void;
  onApply: (edit: DeliveryEdit) => void;
};

export function BallEditSheet({ open, event, onClose, onApply }: Props) {
  const [extraType, setExtraType] = useState<"wide" | "no_ball">("wide");

  useEffect(() => {
    if (!event) return;
    if (event.kind === "no_ball" || event.extraType === "no_ball") {
      setExtraType("no_ball");
    } else {
      setExtraType("wide");
    }
  }, [event]);

  if (!open || !event) return null;

  const currentRuns = runsFromEvent(event);
  const currentExtra = extraRunsFromEvent(event);
  const isWicket = event.kind === "wicket";

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/55 p-2"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ball-edit-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="ball-edit-title" className="text-base font-bold text-white">
            Edit ball
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-zinc-400"
          >
            Cancel
          </button>
        </div>

        <p className="mb-1 text-center text-2xl font-black text-emerald-300">
          {timelineCompactLabel(event)}
        </p>
        <p className="mb-3 text-center text-xs text-zinc-500">
          Other balls are kept — totals update automatically
        </p>

        <section aria-label="Runs" className="mb-3">
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Runs
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {RUNS_PAD.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onApply({ kind: "runs", runs: n });
                  onClose();
                }}
                className={`${runBtn} ${
                  event.kind === "runs" && n === currentRuns
                    ? "ring-2 ring-emerald-400"
                    : ""
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Extra runs" className="mb-3">
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Extra runs
          </h3>
          <div className="mb-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setExtraType("wide")}
              className={`min-h-9 flex-1 rounded-xl text-sm font-bold ${
                extraType === "wide"
                  ? "bg-violet-600 text-white"
                  : "border border-zinc-600 text-zinc-300"
              }`}
            >
              Wide
            </button>
            <button
              type="button"
              onClick={() => setExtraType("no_ball")}
              className={`min-h-9 flex-1 rounded-xl text-sm font-bold ${
                extraType === "no_ball"
                  ? "bg-orange-600 text-white"
                  : "border border-zinc-600 text-zinc-300"
              }`}
            >
              No ball
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {EXTRA_RUNS_PAD.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onApply(
                    extraType === "wide"
                      ? { kind: "wide", additionalRuns: n }
                      : { kind: "no_ball", batRuns: n }
                  );
                  onClose();
                }}
                className={`${
                  extraType === "wide" ? extraBtn : extraNbBtn
                } ${
                  (event.kind === "wide" || event.kind === "no_ball") &&
                  n === currentExtra &&
                  (extraType === "wide"
                    ? event.kind === "wide"
                    : event.kind === "no_ball")
                    ? "ring-2 ring-violet-400"
                    : ""
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-[10px] text-zinc-500">
            Total on extra (incl. 1 for{" "}
            {extraType === "wide" ? "wide" : "no ball"})
          </p>
        </section>

        <section aria-label="Wicket">
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Wicket
          </h3>
          <button
            type="button"
            onClick={() => {
              onApply({
                kind: "wicket",
                detail: event.wicket,
              });
              onClose();
            }}
            className={`${wicketBtn} w-full ${isWicket ? "ring-2 ring-red-400" : ""}`}
          >
            −{WICKET_PENALTY}
          </button>
        </section>
      </div>
    </div>
  );
}
