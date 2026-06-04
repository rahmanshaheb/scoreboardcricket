"use client";

import { LiveScoreDbSync } from "@/components/LiveScoreDbSync";
import { STORAGE_KEY, STORE_VERSION } from "@/lib/constants";
import { useMatchStore } from "@/lib/store";
import { useEffect } from "react";

type StoreSnapshot = ReturnType<typeof useMatchStore.getState>;

/** Rehydrate persisted match + sync theme class on <html>. */
export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useMatchStore((s) => s.theme);

  useEffect(() => {
    const done = useMatchStore.persist.onFinishHydration(() => {
      useMatchStore.getState().setHydrated(true);
    });
    void useMatchStore.persist.rehydrate();
    return done;
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as {
          state?: Partial<StoreSnapshot>;
          version?: number;
        };
        if (!parsed.state || typeof parsed.state !== "object") return;
        if (
          parsed.version !== undefined &&
          parsed.version !== STORE_VERSION
        ) {
          void useMatchStore.persist.rehydrate();
          return;
        }
        useMatchStore.setState((current) => ({
          ...current,
          ...parsed.state,
        }));
      } catch {
        /* ignore corrupt payload */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <>
      <LiveScoreDbSync />
      {children}
    </>
  );
}
