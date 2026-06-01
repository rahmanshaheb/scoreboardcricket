import type { LiveInnings } from "@/lib/types";

/** Add v4 bowling / extras fields to persisted innings. */
export function upgradeLiveInningsV3ToV4(inn: unknown): LiveInnings {
  if (!inn || typeof inn !== "object") return inn as LiveInnings;
  const o = inn as Record<string, unknown>;
  if (typeof o.awaitingBowlerSelection === "boolean") {
    return inn as LiveInnings;
  }
  const base = inn as LiveInnings;
  return {
    ...base,
    awaitingBowlerSelection: false,
    lastCompletedOverBowlerPlayerId: null,
    bowlerFigures: {},
  };
}
