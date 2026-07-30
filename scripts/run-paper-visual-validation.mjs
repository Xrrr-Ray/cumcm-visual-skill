import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

function argsOf(argv) { const args = {}; for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1]; return args; }
function write(file, value) { fs.writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function runNode(argumentsList, cwd) { return spawnSync(process.execPath, argumentsList, { cwd, encoding: "utf8", windowsHide: true, timeout: 90000 }); }

const args = argsOf(process.argv.slice(2));
if (!args.root || !args.spec || !args.output) {
  process.stderr.write("用法：node scripts/run-paper-visual-validation.mjs --root output-dir --spec spec.json --output validation-dir [--browser yes]\n");
  process.exit(2);
}
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1))), "../..");
const root = path.resolve(args.root), spec = path.resolve(args.spec), output = path.resolve(args.output);
if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error(`验证目录非空，拒绝覆盖：${output}`);
fs.mkdirSync(output, { recursive: true });
const html = path.join(root, "index.html");
const startedAt = new Date();

const staticArguments = [path.join(repoRoot, "scripts", "validate-paper-visual.mjs"), "--file", html, "--spec", spec, "--output-root", root];
write(path.join(output, "static-command.json"), { executable: process.execPath, arguments: staticArguments, cwd: repoRoot });
const staticResult = runNode(staticArguments, repoRoot);
write(path.join(output, "static-stdout.json"), staticResult.stdout || "");
write(path.join(output, "static-stderr.txt"), staticResult.stderr || staticResult.error?.message || "");
write(path.join(output, "static-state.json"), { exitCode: staticResult.status, signal: staticResult.signal, error: staticResult.error?.message || null });

let browserResult = null;
if (args.browser === "yes") {
  const profile = path.join(os.tmpdir(), `html-ppt-paper-visual-${Date.now()}-${path.basename(root)}`);
  const browserArguments = [
    path.join(repoRoot, "scripts", "check-paper-visual-browser.mjs"),
    "--file", html, "--spec", spec, "--profile", profile,
    "--report", path.join(output, "browser-report.json"),
    "--screenshot", path.join(output, "browser-render.png"),
    "--chrome-stderr", path.join(output, "browser-chrome-stderr.txt"),
    "--wait-ms", "700"
  ];
  write(path.join(output, "browser-command.json"), { executable: process.execPath, arguments: browserArguments, cwd: repoRoot });
  browserResult = runNode(browserArguments, repoRoot);
  write(path.join(output, "browser-stdout.json"), browserResult.stdout || "");
  write(path.join(output, "browser-stderr.txt"), browserResult.stderr || browserResult.error?.message || "");
  write(path.join(output, "browser-state.json"), { exitCode: browserResult.status, signal: browserResult.signal, error: browserResult.error?.message || null, temporaryProfile: profile });
}

const endedAt = new Date();
const status = staticResult.status === 0 && (!browserResult || browserResult.status === 0) ? "PASS" : "FAIL";
const summary = { status, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), root, spec, staticExitCode: staticResult.status, browserExitCode: browserResult?.status ?? null, node: process.version, platform: `${process.platform} ${process.arch}` };
write(path.join(output, "validation-summary.json"), summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.exitCode = status === "PASS" ? 0 : 1;
