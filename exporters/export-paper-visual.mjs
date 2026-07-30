import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) result[argv[i]?.replace(/^--/, "")] = argv[i + 1]; return result; }
function findChrome(explicit) { return [explicit, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find(fs.existsSync) || null; }
function pngInfo(file, width, height) { const data = fs.readFileSync(file); const signature = data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])); const actualWidth = data.readUInt32BE(16); const actualHeight = data.readUInt32BE(20); return { signature, width: actualWidth, height: actualHeight, bytes: data.length, pass: signature && actualWidth === width && actualHeight === height }; }

const args = parseArgs(process.argv.slice(2));
if (!args.html || !args.output) { process.stderr.write("用法：node exporters/export-paper-visual.mjs --html index.html --output exports [--width 1920] [--height 1080] [--scale 1] [--chrome path]\n"); process.exit(2); }
const html = path.resolve(args.html), output = path.resolve(args.output), chrome = findChrome(args.chrome);
const width = Number(args.width || 1920), height = Number(args.height || 1080), scale = Number(args.scale || 1);
if (!chrome) { process.stderr.write("BLOCKED：未找到 Chrome\n"); process.exit(3); }
if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error(`导出目录非空，拒绝覆盖：${output}`);
fs.mkdirSync(output, { recursive: true });
const target = path.join(output, "diagram.png");
const result = spawnSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--disable-background-networking", "--no-sandbox", `--window-size=${width},${height}`, `--force-device-scale-factor=${scale}`, "--virtual-time-budget=1200", `--screenshot=${target}`, pathToFileURL(html).href], { encoding: "utf8", windowsHide: true, timeout: 60000 });
const expectedWidth = Math.round(width * scale), expectedHeight = Math.round(height * scale);
const validation = fs.existsSync(target) ? pngInfo(target, expectedWidth, expectedHeight) : { pass: false, reason: "PNG 未生成" };
const report = { status: result.status === 0 && validation.pass ? "PASS" : "FAIL", checkedAt: new Date().toISOString(), chrome, html, output, viewport: { width, height, scale }, commandExitCode: result.status, stdout: result.stdout || "", stderr: result.stderr || "", validation };
fs.writeFileSync(path.join(output, "export-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.status === "PASS" ? 0 : 1;
