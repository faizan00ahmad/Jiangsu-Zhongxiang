import type { AdminRole } from "./types";

/** What each role may open in the admin panel. Dealers only see their own store. */
export const ROLE_ACCESS: Record<AdminRole, string[]> = {
  super: ["dashboard", "models", "options", "inventory", "orders", "logistics", "users", "admins", "settings"],
  operator: ["dashboard", "models", "options", "inventory", "orders", "logistics", "users"],
  dealer: ["dashboard", "inventory", "orders"],
};
