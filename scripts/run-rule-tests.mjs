import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
const tests = join(root, ".rule-tests", "scripts", "rule-tests.js");

run(process.execPath, [tsc, "-p", "tsconfig.rules.json"]);
run(process.execPath, [tests]);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
