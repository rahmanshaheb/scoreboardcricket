import { SCORER_LOCK_MS } from "@/lib/constants";

export function isScorerLockActive(
  row: {
    scorerToken: string | null;
    scorerHeartbeat: Date | null;
    updatedAt: Date;
  },
  myToken: string | null
): boolean {
  if (!row.scorerToken) return false;
  if (myToken && row.scorerToken === myToken) return false;
  const last = row.scorerHeartbeat ?? row.updatedAt;
  const now = Date.now();
  return now - last.getTime() < SCORER_LOCK_MS;
}
