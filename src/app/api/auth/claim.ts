import type { DB } from "@/lib/types";

/** Quotes a guest generated on this device (ids kept in localStorage) move into the account on login/sign-up. */
export function claimQuotes(db: DB, userId: string, ids: unknown) {
  if (!Array.isArray(ids)) return;
  const wanted = new Set(ids.filter((x): x is string => typeof x === "string").slice(0, 50));
  for (const q of db.quotes) if (q.userId === null && wanted.has(q.id)) q.userId = userId;
}
