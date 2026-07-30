import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function findChrome(explicit) {
  const candidates = [explicit, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function pngInfo(file) {
  if (!fs.existsSync(file)) return { pass: false, reason: "文件不存在" };
  const data = fs.readFileSync(file);
  const signature = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = data.length >= 24 ? data.readUInt32BE(16) : 0;
  const height = data.length >= 24 ? data.readUInt32BE(20) : 0;
  return { signature, width, height, bytes: data.length, pass: signature && width === 1920 && height === 1080 };
}

function pdfInfo(file, expectedPages) {
  if (!fs.existsSync(file)) return { pass: false, reason: "文件不存在" };
  const data = fs.readFileSync(file);
  const signature = data.subarray(0, 5).toString("ascii") === "%PDF-";
  const pages = (data.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  return { signature, pages, bytes: data.length, expectedPages, pass: signature && pages === expectedPages };
}

function runChrome(chrome, args) {
  const result = spawnSync(chrome, args, { encoding: "utf8", windowsHide: true, timeout: 60000 });
  return { exitCode: result.status, signal: result.signal, error: result.error?.message || null, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const args = parseArgs(process.argv.slice(2));
if (!args.html || !args.output) { process.stderr.write("usage: node exporters/export-deck.mjs --html index.html --output export-dir [--format png|pdf|both] [--chrome path]\n"); process.exit(2); }
const htmlPath = path.resolve(args.html);
const outputDir = path.resolve(args.output);
const format = args.format || "both";
const chrome = findChrome(args.chrome);
if (!chrome) { process.stderr.write("BLOCKED: Chrome not found\n"); process.exit(3); }
if (!fs.existsSync(htmlPath)) throw new Error(`HTML 不存在：${htmlPath}`);
if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`导出目录非空，拒绝覆盖：${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });
const html = fs.readFileSync(htmlPath, "utf8");
const slideCount = (html.match(/<section\s+class="[^"]*\bslide\b/g) || []).length;
const baseUrl = pathToFileURL(htmlPath).href;
const common = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--disable-background-networking", "--no-sandbox", "--force-device-scale-factor=1", "--window-size=1920,1080", "--virtual-time-budget=1800"];
const runs = [];
const validations = [];

if (format === "png" || format === "both") {
  const pngDir = path.join(outputDir, "png"); fs.mkdirSync(pngDir, { recursive: true });
  for (let index = 1; index <= slideCount; index += 1) {
    const target = path.join(pngDir, `slide-${String(index).padStart(2, "0")}.png`);
    const result = runChrome(chrome, [...common, `--screenshot=${target}`, `${baseUrl}?export=1#/${index}`]);
    runs.push({ type: "png", index, ...result });
    validations.push({ file: path.relative(process.cwd(), target).replaceAll("\\", "/"), type: "png", ...pngInfo(target) });
  }
}

if (format === "pdf" || format === "both") {
  const target = path.join(outputDir, "deck.pdf");
  const result = runChrome(chrome, [...common, "--print-to-pdf-no-header", `--print-to-pdf=${target}`, `${baseUrl}?export=1`]);
  runs.push({ type: "pdf", ...result });
  validations.push({ file: path.relative(process.cwd(), target).replaceAll("\\", "/"), type: "pdf", ...pdfInfo(target, slideCount) });
}

const report = { checkedAt: new Date().toISOString(), chrome, html: path.relative(process.cwd(), htmlPath).replaceAll("\\", "/"), slideCount, format, status: runs.every((run) => run.exitCode === 0) && validations.every((item) => item.pass) ? "PASS" : "FAIL", runs, validations };
fs.writeFileSync(path.join(outputDir, "export-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.status === "PASS" ? 0 : 1;

