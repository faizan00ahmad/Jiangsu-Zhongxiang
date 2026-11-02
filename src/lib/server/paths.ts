import os from "node:os";
import path from "node:path";

/** Where the admin panel keeps everything it produces. On a normal server that is the "admin pannel" folder next to the app. */
const ON_VERCEL = !!process.env.VERCEL;
export const ADMIN_HOME = path.join(process.cwd(), "admin pannel");
export const DATA_DIR = process.env.DATA_DIR || (ON_VERCEL ? path.join(os.tmpdir(), "zx-ev") : path.join(ADMIN_HOME, "data"));
export const DB_FILE = path.join(DATA_DIR, "db.json");
export const LEGACY_DB_FILE = path.join(process.cwd(), "data", "db.json");
export const BACKUP_DIR = process.env.BACKUP_DIR || (ON_VERCEL ? path.join(os.tmpdir(), "zx-ev-backups") : path.join(ADMIN_HOME, "backups"));
export const EXPORT_DIR = ON_VERCEL ? path.join(os.tmpdir(), "zx-ev-exports") : path.join(ADMIN_HOME, "exports");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const OUTBOX_DIR = path.join(DATA_DIR, "outbox");
export { ON_VERCEL };
