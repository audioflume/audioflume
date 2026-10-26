import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const analyzerDir = path.join(repoRoot, "apps", "web", "audio-analyzer");
const analyzerPython = path.join(analyzerDir, ".venv", "bin", "python");

try {
  await access(analyzerPython, constants.X_OK);
} catch {
  console.error(
    "MERIT analyzer virtual environment is missing. Run: " +
      "cd apps/web/audio-analyzer && python3 -m venv .venv && " +
      "source .venv/bin/activate && python -m pip install -r requirements.txt",
  );
  process.exit(1);
}

const children = [];

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    detached: true,
    ...options,
  });

  children.push(child);
  return child;
}

function stopAll(signal = "SIGTERM") {
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;

    try {
      process.kill(-child.pid, signal);
    } catch {
      // Child may already have exited.
    }
  }
}

const analyzer = start(
  analyzerPython,
  ["-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
  { cwd: analyzerDir },
);

const web = start(
  "npm",
  ["--prefix", "apps/web", "run", "dev"],
);

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopAll(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

analyzer.on("exit", (code, signal) => {
  if (shuttingDown) return;

  console.error(
    `MERIT analyzer stopped unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
  );
  shutdown("SIGTERM");
});

web.on("exit", (code, signal) => {
  if (shuttingDown) return;

  stopAll("SIGTERM");
  process.exitCode = code ?? (signal ? 1 : 0);
  shuttingDown = true;
});

await Promise.all([
  new Promise((resolve) => analyzer.on("close", resolve)),
  new Promise((resolve) => web.on("close", resolve)),
]);
