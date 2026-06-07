import { isDeliveryEvent } from "@/lib/ball-history";
import type { UndoFrame } from "@/lib/store";
import type { BallEvent, LiveInnings } from "@/lib/types";

/** Undo stack index whose frame is the state immediately before `eventId` was added. */
export function findUndoIndexBeforeEvent(
  undoStack: UndoFrame[],
  live: LiveInnings,
  eventId: string
): number {
  for (let i = undoStack.length - 1; i >= 0; i--) {
    const before = undoStack[i].live;
    if (!before) continue;
    if (before.events.some((e) => e.id === eventId)) continue;
    const afterLive =
      i + 1 < undoStack.length ? undoStack[i + 1].live : live;
    if (afterLive?.events.some((e) => e.id === eventId)) return i;
  }
  return -1;
}

/** First delivery event added between two live snapshots (usually the scored ball). */
export function firstNewDeliveryEvent(
  prev: LiveInnings,
  next: LiveInnings
): BallEvent | undefined {
  const added = next.events.slice(prev.events.length);
  return added.find(isDeliveryEvent);
}

export function pruneDeliveryRewindFrames(
  frames: Record<string, UndoFrame>,
  events: BallEvent[]
): Record<string, UndoFrame> {
  const keep = new Set(events.map((e) => e.id));
  const out: Record<string, UndoFrame> = {};
  for (const [id, frame] of Object.entries(frames)) {
    if (keep.has(id)) out[id] = frame;
  }
  return out;
}
