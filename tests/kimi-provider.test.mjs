import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { requestKimiSemanticPlan } from "../providers/kimi.mjs";
import { layoutSemanticPlan, PAPER_VISUAL_SEMANTIC_SCHEMA, validateSemanticPlan } from "../planner/paper-visual-semantic.mjs";
import { validateVisualPlan } from "../paper-visual/render-paper-visual.mjs";

const moonshotSupportedKeywords = new Set([
  "type", "properties", "additionalProperties", "items", "enum", "required",
  "anyOf", "description", "$defs", "$ref", "default", "pattern",
  "maxLength", "minLength", "maximum", "minimum", "maxItems", "minItems"
]);

function assertMoonshotSchemaNode(schema, schemaPath = "root") {
  assert.equal(typeof schema, "object", `${schemaPath} 必须是对象 schema`);
  assert.ok(!Array.isArray(schema), `${schemaPath} 不能是数组 schema`);
  for (const keyword of Object.keys(schema)) {
    assert.ok(moonshotSupportedKeywords.has(keyword), `${schemaPath} 含 MFJS 不支持的关键字：${keyword}`);
  }
  if (schema.enum) {
    assert.equal(typeof schema.type, "string", `${schemaPath} 使用 enum 时必须显式声明 type`);
  }
  if (schema.type) assert.equal(typeof schema.type, "string", `${schemaPath}.type 必须是字符串`);
  for (const [name, child] of Object.entries(schema.properties || {})) {
    assertMoonshotSchemaNode(child, `${schemaPath}.properties.${name}`);
  }
  if (schema.items) assertMoonshotSchemaNode(schema.items, `${schemaPath}.items`);
  for (const [index, child] of (schema.anyOf || []).entries()) {
    assertMoonshotSchemaNode(child, `${schemaPath}.anyOf[${index}]`);
  }
}

assertMoonshotSchemaNode(PAPER_VISUAL_SEMANTIC_SCHEMA);

const semanticPlan = {
  schema_version: 1,
  mode: "paper-visual-semantic",
  type: "feedback-loop",
  title: "数据驱动的闭环优化",
  subtitle: "数据处理—建模—检验—反馈修正",
  theme: "academic-blue",
  groups: [
    { id: "G1", label: "数据准备" },
    { id: "G2", label: "模型构建" },
    { id: "G3", label: "结果检验" }
  ],
  nodes: [
    { id: "N1", group: "G1", label: "数据清洗", detail: "处理缺失值与异常值", shape: "process", tag: "输入" },
    { id: "N2", group: "G2", label: "参数估计", detail: "基于训练数据求解参数", shape: "process", tag: "建模" },
    { id: "N3", group: "G3", label: "误差是否达标", detail: "依据既定阈值检验", shape: "decision", tag: "判定" },
    { id: "N4", group: "G3", label: "输出结果", detail: "形成论文图表与结论", shape: "pill", tag: "输出" }
  ],
  edges: [
    { id: "E1", from: "N1", to: "N2", kind: "flow", label: "标准化数据", start_arrow: "none", end_arrow: "triangle" },
    { id: "E2", from: "N2", to: "N3", kind: "flow", label: "预测结果", start_arrow: "none", end_arrow: "triangle" },
    { id: "E3", from: "N3", to: "N4", kind: "pass", label: "通过", start_arrow: "none", end_arrow: "triangle" },
    { id: "E4", from: "N3", to: "N2", kind: "feedback", label: "未通过：修正", start_arrow: "none", end_arrow: "triangle" }
  ]
};

const mockFetch = async (url, options) => {
  assert.equal(url, "https://api.moonshot.cn/v1/chat/completions");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer offline-test-key");
  const body = JSON.parse(options.body);
  assert.equal(body.model, "kimi-k3");
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
  return new Response(JSON.stringify({
    id: "offline-request",
    model: "kimi-k3",
    choices: [{ message: { role: "assistant", content: JSON.stringify(semanticPlan) } }],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
  }), { status: 200, headers: { "x-request-id": "offline-request" } });
};

const membershipMockFetch = async (url, options) => {
  assert.equal(url, "https://api.kimi.com/coding/v1/chat/completions");
  assert.equal(options.headers.Authorization, "Bearer offline-membership-key");
  const body = JSON.parse(options.body);
  assert.equal(body.model, "k3");
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.response_format.type, "json_schema");
  return new Response(JSON.stringify({
    id: "offline-membership-request",
    model: "k3",
    choices: [{ message: { role: "assistant", content: JSON.stringify(semanticPlan) } }],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
  }), { status: 200 });
};

const result = await requestKimiSemanticPlan({
  input: "这是离线适配器测试材料。",
  prompt: "生成闭环优化图。",
  apiKey: "offline-test-key",
  fetchImpl: mockFetch
});
assert.equal(result.metadata.provider, "kimi");
assert.equal(result.metadata.model, "kimi-k3");
assert.equal(validateSemanticPlan(result.plan).status, "PASS");
const visualPlan = layoutSemanticPlan(result.plan);
assert.equal(validateVisualPlan(visualPlan).status, "PASS");
assert.equal(visualPlan.edges.find((edge) => edge.id === "E4").route.length, 2);
for (const type of ["flowchart", "mindmap", "architecture", "hierarchy", "feedback-loop", "timeline"]) {
  const typePlan = layoutSemanticPlan({ ...result.plan, type });
  assert.equal(validateVisualPlan(typePlan).status, "PASS", `${type} 应通过最终规划校验`);
}

const membershipResult = await requestKimiSemanticPlan({
  input: "这是 Kimi Code 会员通道离线测试材料。",
  prompt: "生成闭环优化图。",
  channel: "code-membership",
  apiKey: "offline-membership-key",
  fetchImpl: membershipMockFetch
});
assert.equal(membershipResult.metadata.provider, "kimi-code");
assert.equal(membershipResult.metadata.channel, "code-membership");
assert.equal(membershipResult.metadata.model, "k3");
assert.equal(validateSemanticPlan(membershipResult.plan).status, "PASS");

await assert.rejects(
  () => requestKimiSemanticPlan({ input: "材料", prompt: "要求", apiKey: "" }),
  (error) => error.code === "KIMI_API_KEY_MISSING"
);
await assert.rejects(
  () => requestKimiSemanticPlan({ input: "材料", prompt: "要求", channel: "code-membership", apiKey: "" }),
  (error) => error.code === "KIMI_API_KEY_MISSING" && error.message.includes("KIMI_CODE_API_KEY")
);

const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0) {
  const outputDir = path.resolve(process.argv[outputIndex + 1]);
  if (!process.argv[outputIndex + 1]) throw new Error("--output 缺少目录");
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) throw new Error(`输出目录非空，拒绝覆盖：${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "semantic-plan.json"), `${JSON.stringify(result.plan, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "visual-plan.json"), `${JSON.stringify(visualPlan, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "mock-model-metadata.json"), `${JSON.stringify(result.metadata, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "mock-membership-metadata.json"), `${JSON.stringify(membershipResult.metadata, null, 2)}\n`, "utf8");
}

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  provider: result.metadata.provider,
  model: result.metadata.model,
  membershipProvider: membershipResult.metadata.provider,
  membershipModel: membershipResult.metadata.model,
  semantic: validateSemanticPlan(result.plan),
  visual: validateVisualPlan(visualPlan)
}, null, 2)}\n`);
