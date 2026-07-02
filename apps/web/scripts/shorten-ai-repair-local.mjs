#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repairCandidateScript = path.join(scriptDir, "shorten-repair-candidate-local.mjs");

console.log("Using local bundled-ffmpeg shorten prototype.");
console.log("This creates smart-trim and repair-candidate files. True AI repair still needs a local model endpoint.\n");

const child = spawn(process.execPath, [repairCandidateScript, ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error.message || error);
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code || 0);
});
