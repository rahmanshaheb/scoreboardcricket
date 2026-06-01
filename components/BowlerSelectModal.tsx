"use client";

import type { TeamRoster } from "@/lib/types";

type Props = {
  open: boolean;
  bowlingRoster: TeamRoster;
  lastOverBowlerId: string | null;
  onPick: (bowlerId: string) => void;
  error: string | null;
};

export function BowlerSelectModal({
  open,
  bowlingRoster,
  lastOverBowlerId,
  onPick,
  error,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[52] flex items-end justify-center bg-black/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bowler-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl border border-zinc-700 bg-zinc-950 text-zinc-50 shadow-2xl sm:rounded-2xl">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2
            id="bowler-modal-title"
            className="text-lg font-black tracking-tight text-white"
          >
            Next bowler
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Over complete (6 legal balls). Choose who bowls the next over — not
            the same bowler as the last over.
          </p>
        </div>
        <ul className="max-h-[55dvh] overflow-y-auto p-2">
          {bowlingRoster.players.map((p) => {
            const blocked = lastOverBowlerId === p.id;
            return (
              <li key={p.id} className="p-1">
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onPick(p.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-base font-semibold ${
                    blocked
                      ? "cursor-not-allowed border-zinc-800 text-zinc-600 line-through opacity-50"
                      : "border-zinc-600 bg-zinc-900 text-white active:scale-[0.99]"
                  }`}
                >
                  {p.name || "Unnamed"}
                  {blocked ? (
                    <span className="ml-2 text-xs font-normal">(last over)</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {error ? (
          <p className="px-4 pb-3 text-sm font-medium text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
