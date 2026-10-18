// Records today's candidates in seen-jobs.json so they're never scored twice,
// and forgets entries older than 90 days to keep the file small.
// Usage: node scripts/mark-seen.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { markSeen } from "./lib.mjs";

const seen = JSON.parse(readFileSync("seen-jobs.json", "utf8"));
const candidates = JSON.parse(readFileSync("candidates.json", "utf8"));
const next = markSeen(seen, candidates, new Date().toISOString().slice(0, 10));

writeFileSync("seen-jobs.json", JSON.stringify(next, null, 2) + "\n");
console.log(`Marked ${candidates.length} job(s) as seen; tracking ${Object.keys(next).length} in total.`);
