"use client";

import { useMatchStore } from "@/lib/store";
import Link from "next/link";

export function AppShell({
  title,
  children,
  showThemeToggle = true,
}: {
  title?: string;
  children: React.ReactNode;
  showThemeToggle?: boolean;
}) {
  const toggleTheme = useMatchStore((s) => s.toggleTheme);
  const theme = useMatchStore((s) => s.theme);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-400"
            >
              Scoreboard
            </Link>
            <Link
              href="/records"
              className="truncate text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Records
            </Link>
            <Link
              href="/scoreboard"
              className="truncate text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Live board
            </Link>
            <Link
              href="/scoring"
              className="truncate text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Scoring
            </Link>
          </div>
          {title ? (
            <span className="truncate text-center text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {title}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          {showThemeToggle ? (
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          ) : (
            <span className="w-14" />
          )}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-10 pt-4">{children}</main>
    </div>
  );
}
