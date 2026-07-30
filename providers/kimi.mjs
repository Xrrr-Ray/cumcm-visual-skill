import { PAPER_VISUAL_SEMANTIC_SCHEMA } from "../planner/paper-visual-semantic.mjs";

export const KIMI_CHANNELS = {
  "open-platform": {
    provider: "kimi",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    model: "kimi-k3",
    apiKeyEnv: "MOONSHOT_API_KEY"
  },
  "code-membership": {
    provider: "kimi-code",
    endpoint: "https://api.kimi.com/coding/v1/chat/completions",
    model: "k3",
    apiKeyEnv: "KIMI_CODE_API_KEY"
  }
};
export const KIMI_API_URL = KIMI_CHANNELS["open-platform"].endpoint;
export const KIMI_DEFAULT_MODEL = KIMI_CHANNELS["open-platform"].model;

export const KIMI_SEMANTIC_SYSTEM_PROMPT = `你是国赛论文可视化规划器。你的任务是把用户提供的论文材料整理为一张流程图、思维导图、架构图、层次图、反馈回路或时间线的语义规划。

硬性要求：
1. 只使用输入材料中明确存在的事实，不补造模型、数据、公式、指标、结论或引用。
2. 每个分组、节点和边使用稳定且唯一的 G1/N1/E1 格式 ID。
3. 节点文字适合论文插图：标题简洁，detail 只保留必要说明。
4. pass、reject、feedback 的语义必须同时体现在 kind、label 和箭头关系中，不能只依赖颜色。
5. 若信息不足，使用“待确认”，不得猜测。
6. subtitle、detail、tag 或边 label 没有内容时输出空字符串，不要输出 null。
7. 只输出符合给定 JSON Schema 的对象，不输出 Markdown、解释或坐标。`;

export function buildKimiSemanticUserPrompt({ input, prompt, includeSchema = false }) {
  if (!input?.trim()) throw new Error("论文材料不能为空");
  const sections = [
    `完整绘图要求：\n${prompt?.trim() || "请生成一张适合国赛论文正文的单图可视化。"}`,
    `论文材料：\n${input.trim()}`
  ];
  if (includeSchema) {
    sections.push(`必须严格遵守的 JSON Schema：\n${JSON.stringify(PAPER_VISUAL_SEMANTIC_SCHEMA, null, 2)}`);
  }
  return sections.join("\n\n");
}

function extractContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => typeof item === "string" ? item : item?.text || "").join("");
  }
  throw new Error("Kimi 响应缺少 choices[0].message.content");
}

export async function requestKimiSemanticPlan({
  input,
  prompt,
  channel = "open-platform",
  apiKey,
  model,
  endpoint,
  fetchImpl = globalThis.fetch,
  timeoutMs = 120000
}) {
  const profile = KIMI_CHANNELS[channel];
  if (!profile) throw new Error(`不支持的 Kimi 通道：${channel}`);
  const resolvedApiKey = apiKey ?? process.env[profile.apiKeyEnv];
  const resolvedModel = model || profile.model;
  const resolvedEndpoint = endpoint || profile.endpoint;
  if (!resolvedApiKey) {
    const error = new Error(`缺少 ${profile.apiKeyEnv}；${channel === "code-membership" ? "请使用 Kimi Code 会员控制台创建的 Key" : "请使用 Kimi API 开放平台创建的 Key"}`);
    error.code = "KIMI_API_KEY_MISSING";
    throw error;
  }
  if (typeof fetchImpl !== "function") throw new Error("当前 Node.js 环境不支持 fetch");
  if (!input?.trim()) throw new Error("论文材料不能为空");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(resolvedEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: resolvedModel,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: KIMI_SEMANTIC_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildKimiSemanticUserPrompt({ input, prompt })
          }
        ],
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "paper_visual_semantic_plan",
            strict: true,
            schema: PAPER_VISUAL_SEMANTIC_SCHEMA
          }
        }
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Kimi 请求超时（${timeoutMs} ms）`);
    throw new Error(`Kimi 请求失败：${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  const rawText = await response.text();
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error(`Kimi 返回了非 JSON 响应（HTTP ${response.status}）`);
  }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    const error = new Error(`Kimi API 错误：${message}`);
    error.status = response.status;
    throw error;
  }
  let plan;
  try {
    plan = JSON.parse(extractContent(payload));
  } catch (error) {
    throw new Error(`Kimi 结构化内容解析失败：${error.message}`);
  }
  return {
    plan,
    metadata: {
      channel,
      provider: profile.provider,
      model: payload.model || resolvedModel,
      request_id: response.headers?.get?.("x-request-id") || payload.id || null,
      usage: payload.usage || null
    },
    raw: payload
  };
}
