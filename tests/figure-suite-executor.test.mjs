import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const output = fs.mkdtempSync(path.join(os.tmpdir(), "html-ppt-figure-suite-"));
const run = spawnSync(process.execPath, [
  path.resolve(testDir, "../scripts/execute-figure-suite.mjs"),
  "--plan", path.join(testDir, "fixtures/figure-suite-execution-plan.json"),
  "--manifest", path.join(testDir, "fixtures/figure-suite-inputs.json"),
  "--output", output
], { encoding: "utf8", windowsHide: true, maxBuffer: 20 * 1024 * 1024 });

assert.equal(run.status, 0, run.error?.stack || run.stderr || run.stdout);
const report = JSON.parse(fs.readFileSync(path.join(output, "suite-execution-report.json"), "utf8"));
assert.equal(report.status, "PASS");
assert.equal(report.figures_passed, 2);
assert.ok(fs.existsSync(path.join(output, "figures/F01/index.html")));
assert.ok(fs.existsSync(path.join(output, "figures/F02/edit.html")));
process.stdout.write(`${JSON.stringify({ status: "PASS", output, figures: report.figures_passed }, null, 2)}\n`);
