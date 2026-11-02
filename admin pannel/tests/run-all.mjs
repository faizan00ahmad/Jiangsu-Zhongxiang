// Runs every admin QA suite in order and exits non-zero if any check fails: node "admin pannel/tests/run-all.mjs" [baseUrl]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { HERE } from "./lib.mjs";

const base = process.argv[2] || process.env.BASE || "http://localhost:3000";
let failed = 0;
for (const f of ["foundation.mjs", "demo-logins.mjs", "features.mjs", "commerce.mjs"]) {
  const r = spawnSync(process.execPath, [path.join(HERE, f), base], { stdio: "inherit" });
  if (r.status) failed++;
}
console.log(failed ? `\n${failed} suite(s) have failures` : "\nAll suites passed");
process.exit(failed ? 1 : 0);
