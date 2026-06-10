"use client";

import { useMatchStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/matches", label: "Matches" },
  { href: "/records", label: "Records" },
  { href: "/scoreboard", label: "Live board" },
  { href: "/scoring", label: "Scoring" },
] as const;

export function AppShell({
  title,
  children,
  showThemeToggle = true,
  compact = false,
  hideNav = false,
}: {
  title?: string;
  children: React.ReactNode;
  showThemeToggle?: boolean;
  /** Tighter header and main padding (setup screens). */
  compact?: boolean;
  /** Hide bottom nav pills to save vertical space. */
  hideNav?: boolean;
}) {
  const toggleTheme = useMatchStore((s) => s.toggleTheme);
  const theme = useMatchStore((s) => s.theme);
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div
          className={`mx-auto flex max-w-lg items-center justify-between gap-2 px-3 ${
            compact ? "h-9" : "h-12 px-4"
          }`}
        >
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-400"
          >
            No Blowers
          </Link>
          {title ? (
            <span className="min-w-0 truncate text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {title}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          {showThemeToggle ? (
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="shrink-0 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          ) : (
            <span className="w-12 shrink-0" />
          )}
        </div>
        {!hideNav && (
          <nav
            className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-3 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Main"
          >
            {NAV.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main
        className={`mx-auto max-w-lg ${
          compact
            ? `flex flex-col overflow-hidden px-3 pb-2 pt-1 ${
                hideNav
                  ? "h-[calc(100dvh-2.25rem)]"
                  : "h-[calc(100dvh-4.5rem)]"
              }`
            : "px-4 pb-8 pt-2"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
