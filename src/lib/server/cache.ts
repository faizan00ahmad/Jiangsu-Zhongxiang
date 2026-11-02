import { revalidatePath } from "next/cache";

/** Small tagged in-memory cache for content the public site reads on every request (banners, menus, pages, rates).
 *  Saving anything in the admin clears the tags it touches, so edits show up at once; "Cache management" can clear everything. */

type Entry = { v: unknown; exp: number; tags: string[] };
type Cache = { map: Map<string, Entry>; hits: number; misses: number; clearedAt: string | null; clearedBy: string | null };
const g = globalThis as typeof globalThis & { __zxCache?: Cache };
const c: Cache = (g.__zxCache ??= { map: new Map(), hits: 0, misses: 0, clearedAt: null, clearedBy: null });

export const CACHE_TAGS = ["content", "catalogue", "currency", "settings"] as const;

export async function cached<T>(tags: string[], key: string, fn: () => Promise<T> | T, ttlMs = 60_000): Promise<T> {
  const hit = c.map.get(key);
  if (hit && hit.exp > Date.now()) {
    c.hits++;
    return hit.v as T;
  }
  c.misses++;
  const v = await fn();
  c.map.set(key, { v, exp: Date.now() + ttlMs, tags });
  return v;
}

/** Drops every entry carrying one of `tags`. */
export function invalidate(...tags: string[]) {
  for (const [k, e] of c.map) if (e.tags.some((t) => tags.includes(t))) c.map.delete(k);
}

/** After an admin change: clear the app cache by tag and tell Next to rebuild the pages that show it. */
export function bust(tags: string[], paths: string[] = ["/"]) {
  invalidate(...tags);
  for (const p of paths) {
    try {
      revalidatePath(p, p === "/" ? "layout" : "page");
    } catch {
      // outside a request (scripts): nothing to revalidate
    }
  }
}

export function clearAll(by: string) {
  c.map.clear();
  c.clearedAt = new Date().toISOString();
  c.clearedBy = by;
  try {
    revalidatePath("/", "layout");
  } catch {
    // outside a request
  }
}

export function cacheStats() {
  const byTag: Record<string, number> = {};
  for (const e of c.map.values()) for (const t of e.tags) byTag[t] = (byTag[t] ?? 0) + 1;
  return { entries: c.map.size, hits: c.hits, misses: c.misses, byTag, clearedAt: c.clearedAt, clearedBy: c.clearedBy };
}
