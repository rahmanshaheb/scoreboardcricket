"use client";

import type { Player } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  remaining: Player[];
  pairNumber: number;
  onSubmit: (a: string, b: string) => void;
  error: string | null;
};

export function SelectNextPairModal({
  open,
  remaining,
  pairNumber,
  onSubmit,
  error,
}: Props) {
  const [picked, setPicked] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  const reset = useCallback(() => setPicked([null, null]), []);

  useEffect(() => {
    if (!open) setPicked([null, null]);
  }, [open]);

  const toggle = useCallback(
    (id: string) => {
      setPicked(([a, b]) => {
        if (a === id) return [null, b];
        if (b === id) return [a, null];
        if (!a) return [id, b];
        if (!b) return [a, id];
        return [id, b];
      });
    },
    []
  );

  if (!open) return null;

  const canConfirm = picked[0] && picked[1] && picked[0] !== picked[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="next-pair-title"
    >
      <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-2xl border border-zinc-700 bg-zinc-950 text-zinc-50 shadow-2xl sm:rounded-2xl">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2
            id="next-pair-title"
            className="text-lg font-black tracking-tight text-white"
          >
            Select next batting pair
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Pair {pairNumber} of 5 · Pick two players who have not batted yet.
          </p>
        </div>
        <div className="max-h-[50dvh] overflow-y-auto px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Remaining players ({remaining.length})
          </p>
          <ul className="mt-2 grid gap-2">
            {remaining.map((pl) => {
              const sel =
                picked[0] === pl.id
                  ? 1
                  : picked[1] === pl.id
                    ? 2
                    : 0;
              return (
                <li key={pl.id}>
                  <button
                    type="button"
                    onClick={() => toggle(pl.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
                      sel
                        ? "border-emerald-500 bg-emerald-950/60 text-emerald-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 active:scale-[0.99]"
                    }`}
                  >
                    <span>{pl.name || "Unnamed"}</span>
                    {sel > 0 ? (
                      <span className="text-xs font-bold text-emerald-400">
                        {sel === 1 ? "1st pick" : "2nd pick"}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {error ? (
          <p className="px-4 pb-2 text-sm font-medium text-red-400">{error}</p>
        ) : null}
        <div className="flex gap-2 border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={() => {
              reset();
            }}
            className="h-12 flex-1 rounded-xl border border-zinc-600 text-sm font-semibold text-zinc-300"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!picked[0] || !picked[1]) return;
              onSubmit(picked[0], picked[1]);
            }}
            className="h-12 flex-[2] rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-40"
          >
            Start scoring
          </button>
        </div>
      </div>
    </div>
  );
}
