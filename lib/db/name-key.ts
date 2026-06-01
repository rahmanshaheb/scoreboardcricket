/** Normalize player name for grouping stats across matches. */
export function playerNameKey(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, " ");
}
