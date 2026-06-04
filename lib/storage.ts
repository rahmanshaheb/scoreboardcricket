import { createJSONStorage, type StateStorage } from "zustand/middleware";

/** No-op storage for SSR (persist must not touch localStorage on the server). */
const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export function matchStoreStorage() {
  return createJSONStorage(() =>
    typeof window !== "undefined" ? localStorage : serverStorage
  );
}
