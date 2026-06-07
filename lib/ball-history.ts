import type { BallEvent } from "@/lib/types";

const DELIVERY_KINDS = new Set<BallEvent["kind"]>([
  "runs",
  "wicket",
  "wide",
  "no_ball",
  "end_over",
]);

export function isDeliveryEvent(e: BallEvent): boolean {
  return DELIVERY_KINDS.has(e.kind);
}

/** Last N scorable deliveries (oldest → newest). */
export function lastDeliveryEvents(events: BallEvent[], n: number): BallEvent[] {
  return events.filter(isDeliveryEvent).slice(-n);
}
