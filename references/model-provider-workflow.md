# 外部模型规划接入

## 设计边界

外部模型只负责从论文材料提取图型、分组、节点和边，不负责生成 HTML、SVG、PPTX 或最终坐标。Skill 使用统一的 `paper-visual-semantic-plan` Schema 接收模型结果，再通过确定性布局器生成现有 `visual-plan.json`。渲染器、编辑器和导出器不感知模型品牌。

不得把 API Key、OAuth Token 写入提示词、输出、日志或仓库文件。缺少登录、Key、额度、网络或权限时，状态必须记录为 `BLOCKED`。

## Kimi K3

Kimi Code 会员与 Kimi API 开放平台是两个独立通道，登录方式、模型 ID 和计费权益不能混用：

| 通道 | provider | 身份凭证 | 调用方式 | K3 模型 ID |
| --- | --- | --- | --- | --- |
| Kimi Code 会员（推荐） | `kimi-cli` | 官方 CLI 的 `kimi login` | 本机 `kimi` CLI | `kimi-code/k3` |
| Kimi API 开放平台 | `kimi` | `MOONSHOT_API_KEY` | `https://api.moonshot.cn/v1` | `kimi-k3` |

会员通道不要再把网页会员 Key 当作 API Key 直接请求接口。当前推荐适配器使用：

- 会员 provider：`kimi-cli`
- 会员默认模型别名：`kimi-code/k3`
- 身份验证：官方 Kimi Code CLI 的设备登录
- 非交互输出：`-p` 与 `--output-format stream-json`
- 安全边界：CLI 只在空白隔离目录中运行；提示词禁止工具调用；一旦输出包含工具调用立即失败
- 开放平台 provider：`kimi`
- 开放平台默认模型：`kimi-k3`
- 开放平台接口：`https://api.moonshot.cn/v1/chat/completions`
- 输出约束：`response_format.type=json_schema`

首次使用先安装并登录官方 Kimi Code CLI：

```bash
npm install -g @moonshot-ai/kimi-code@latest
kimi login
kimi --version
```

登录成功后，在 Skill 根目录执行：

```bash
node scripts/plan-paper-visual-with-model.mjs \
  --provider kimi-cli \
  --model kimi-code/k3 \
  --input input.md \
  --prompt prompt.md \
  --output output/kimi-member-planning
```

每次重跑必须使用新的空输出目录。开放平台通道把 provider 改为 `kimi`、模型改为 `kimi-k3`，并设置 `MOONSHOT_API_KEY`。

旧的 `kimi-code` 直连接口仅为历史兼容保留，不作为会员接入推荐方案；它需要独立有效的 API 凭证，不能复用 Kimi 网页会员或 CLI 登录。

成功输出：

- `input.md`、`prompt.md`
- `model-response.json`、`model-metadata.json`
- `semantic-plan.json`、`semantic-validation.json`
- `visual-plan.json`、`visual-plan-validation.json`

CLI 原始 JSONL 事件和 stderr 保存在 `model-response.json`；实际长提示词不会写入命令参数记录。

随后把规划结果送入既有渲染链：

```bash
node scripts/generate-paper-visual.mjs \
  --plan output/kimi-planning/visual-plan.json \
  --source input.md \
  --prompt prompt.md \
  --output output/kimi-visual
```

## 新增其他模型

新增模型时只增加 `providers/<provider>.mjs`，并保持和 Kimi 适配器相同的返回形状：

```js
{
  plan: semanticPlan,
  metadata: { provider, model, request_id, usage },
  raw: providerResponse
}
```

提供方必须使用同一份 `schemas/paper-visual-semantic-plan.schema.json`，并在进入布局器前调用 `validateSemanticPlan()`。禁止为了适配某个模型而修改最终渲染 Schema。
