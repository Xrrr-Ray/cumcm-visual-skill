import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "examples/showcase-v2");
const indexPath = path.join(root, "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((value) => !value.startsWith("#") && !/^[a-z]+:/i.test(value));
const linkChecks = hrefs.map((value) => ({
  path: value,
  pass: fs.existsSync(path.resolve(root, value))
}));
const reportPaths = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(resolved);
    else if (["validation-report.json", "pptx-export-report.json", "suite-execution-report.json"].includes(entry.name)) reportPaths.push(resolved);
  }
}
walk(root);
const reportChecks = reportPaths.map((reportPath) => {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  return {
    path: path.relative(root, reportPath).replaceAll("\\", "/"),
    status: report.status,
    pass: report.status === "PASS"
  };
});
const pptxFiles = [];
function collectPptx(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) collectPptx(resolved);
    else if (entry.name.endsWith(".pptx")) pptxFiles.push(resolved);
  }
}
collectPptx(root);
const checks = [
  { id: "gallery_links", pass: linkChecks.every((item) => item.pass), total: linkChecks.length, missing: linkChecks.filter((item) => !item.pass).map((item) => item.path) },
  { id: "reports_pass", pass: reportChecks.every((item) => item.pass), total: reportChecks.length, failed: reportChecks.filter((item) => !item.pass) },
  { id: "pptx_count", pass: pptxFiles.length === 12, actual: pptxFiles.length },
  {
    id: "prompt_count",
    pass: hrefs.filter((value) => value.includes("showcase-v2-prompts/") && value.endsWith(".md")).length === 11,
    actual: hrefs.filter((value) => value.includes("showcase-v2-prompts/") && value.endsWith(".md")).length
  }
];
const result = {
  schema_version: 1,
  status: checks.every((check) => check.pass) ? "PASS" : "FAIL",
  checked_at: new Date().toISOString(),
  root,
  checks,
  reports: reportChecks,
  pptx_files: pptxFiles.map((file) => path.relative(root, file).replaceAll("\\", "/"))
};
fs.writeFileSync(path.join(root, "showcase-validation-report.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ status: result.status, links: linkChecks.length, reports: reportChecks.length, pptx: pptxFiles.length }, null, 2)}\n`);
process.exitCode = result.status === "PASS" ? 0 : 1;
