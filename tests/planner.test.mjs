import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planMaterial, validatePlan } from "../planner/plan-deck.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");
const fixtureRoot = path.join(repoRoot, "fixtures", "html-ppt-optimization");
const cases = ["math-modeling", "research-defense", "algorithm-introduction", "data-analysis", "work-summary"];
const summaries = [];

for (const caseId of cases) {
  const inputPath = path.join(fixtureRoot, `${caseId}.md`);
  const markdown = fs.readFileSync(inputPath, "utf8");
  const plan = planMaterial(markdown, { theme: "competition-blue" });
  const validation = validatePlan(plan);
  assert.equal(validation.valid, true, `${caseId} 计划必须通过验证`);
  assert.equal(plan.slides.length, 10, `${caseId} 应生成 10 页`);
  assert.equal(plan.slides[0].type, "cover");
  assert.equal(plan.slides[1].type, "agenda");
  assert.ok(new Set(plan.slides.map((slide) => slide.type)).size >= 5, `${caseId} 页面类型应至少有 5 种`);
  for (const slide of plan.slides.slice(2)) {
    assert.ok(markdown.includes(slide.title), `${caseId} 标题必须来自输入：${slide.title}`);
    assert.ok(markdown.includes(slide.keyMessage), `${caseId} 核心结论必须来自输入：${slide.keyMessage}`);
    for (const item of slide.content) assert.ok(markdown.includes(item), `${caseId} 内容必须来自输入：${item}`);
  }
  summaries.push({ caseId, slides: plan.slides.length, types: [...new Set(plan.slides.map((slide) => slide.type))], warnings: validation.warnings });
}

process.stdout.write(`${JSON.stringify({ status: "PASS", cases: summaries }, null, 2)}\n`);

