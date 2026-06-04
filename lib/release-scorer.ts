/** Tell the server this device is no longer scoring. */
export function releaseScorerOnServer(
  matchSessionId: string | null,
  scorerToken: string | null
) {
  if (!matchSessionId || !scorerToken) return;
  const q = new URLSearchParams({
    externalId: matchSessionId,
    scorerToken,
  });
  void fetch(`/api/matches/live?${q}`, { method: "DELETE" });
}
