"use client";

import { useMatchStore } from "@/lib/store";

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useMatchStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center text-sm text-zinc-500">
        Loading match…
      </div>
    );
  }
  return <>{children}</>;
}
