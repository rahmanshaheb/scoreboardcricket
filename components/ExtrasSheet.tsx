"use client";

export type ExtraSheetKind = "wide" | "no_ball";

const WIDE_OPTS: (0 | 1 | 2 | 3 | 4 | 6)[] = [0, 1, 2, 3, 4, 6];
const NB_OPTS: (0 | 1 | 2 | 3 | 4 | 6)[] = [0, 1, 2, 3, 4, 6];

type Props = {
  open: boolean;
  kind: ExtraSheetKind | null;
  onClose: () => void;
  onPickWide: (additional: 0 | 1 | 2 | 3 | 4 | 6) => void;
  onPickNoBall: (batRuns: 0 | 1 | 2 | 3 | 4 | 6) => void;
};

function labelWide(n: number) {
  if (n === 0) return "Wide only (+1)";
  return `Wide +${n} (+${1 + n})`;
}

function labelNb(n: number) {
  if (n === 0) return "No ball only (+1)";
  return `No ball +${n} (+${1 + n})`;
}

export function ExtrasSheet({
  open,
  kind,
  onClose,
  onPickWide,
  onPickNoBall,
}: Props) {
  if (!open || !kind) return null;

  const isWide = kind === "wide";
  const opts = isWide ? WIDE_OPTS : NB_OPTS;

  return (
    <div
      className="fixed inset-0 z-[45] flex items-end justify-center bg-black/55 p-2 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extras-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[70dvh] w-full max-w-md overflow-hidden rounded-t-2xl border border-zinc-700 bg-zinc-950 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="extras-title" className="text-base font-black text-white">
            {isWide ? "Wide" : "No ball"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-zinc-400"
          >
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
          {opts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                if (isWide) onPickWide(n);
                else onPickNoBall(n);
                onClose();
              }}
              className="min-h-14 rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-2 py-2 text-sm font-bold text-emerald-100 active:scale-[0.98]"
            >
              {isWide ? labelWide(n) : labelNb(n)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
