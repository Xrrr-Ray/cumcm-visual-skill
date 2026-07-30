import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const pageTypes = JSON.parse(fs.readFileSync(path.join(currentDir, "..", "templates", "page-types.json"), "utf8"));
const allowedTypes = new Set(Object.keys(pageTypes.types));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function cleanSentence(value) {
  return value.replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim();
}

export function parseMaterial(markdown) {
  const lines = markdown.split(/\r?\n/);
  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim() || "未命名汇报";
  const audience = lines.find((line) => line.startsWith("受众："))?.slice(3).trim() || "未指定受众";
  const purpose = lines.find((line) => line.startsWith("目的："))?.slice(3).trim() || "说明材料中的关键事实";
  const requestedSlides = Number(lines.find((line) => line.startsWith("建议页数："))?.slice(5).trim()) || 10;
  const sections = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), paragraphs: [] };
      sections.push(current);
    } else if (current && line && !/^(受众|目的|建议页数)：/.test(line)) {
      current.paragraphs.push(cleanSentence(line));
    }
  }
  return { title, audience, purpose, requestedSlides, sections };
}

function splitFacts(section) {
  const text = section.paragraphs.join(" ");
  const facts = text.split(/(?<=[。！？；])/u).map(cleanSentence).filter(Boolean);
  return facts.length ? facts : section.paragraphs.map(cleanSentence).filter(Boolean);
}

function chooseType(section, index, total) {
  const signal = `${section.title} ${section.paragraphs.join(" ")}`;
  if (index === total - 1) return "summary";
  if (/(技术路线|建模框架|算法框架|求解流程|协作机制|治理流程|流程)/.test(signal)) return "flowchart";
  if (/(时间线|进度|里程碑|Q1|Q2|Q3|Q4|阶段)/.test(signal)) return "timeline";
  if (/(对比|比较|相较|分群)/.test(signal)) return "comparison";
  if (/(研究问题|项目背景|问题定义|分析范围|设计动机)/.test(section.title)) return "single-message";
  if (/(主要问题|年度目标|研究目标|方法创新|关键算子|核心交付)/.test(section.title)) return "three-columns";
  if (/(指标|结果|表现|收益|数据|准确率|F1|能耗|同比|下降|提升)/.test(signal) && /\d/.test(signal)) return /(趋势|同比|全年|构成|分群)/.test(signal) ? "data-chart" : "metric-overview";
  if (/(目标|创新|关键算子|核心交付|问题)/.test(section.title)) return "three-columns";
  if (/(背景|定义|范围|动机)/.test(section.title)) return "single-message";
  return index % 2 === 0 ? "single-message" : "three-columns";
}

function visualSuggestion(type) {
  return {
    cover: "克制的学术主视觉与受众信息", agenda: "编号目录，避免卡片墙", "section-divider": "大章节编号与单句过渡",
    "single-message": "大字结论与少量证据", "text-image": "左文右图，图像使用真实证据", "image-text": "左图右文，突出图像证据",
    "three-columns": "三个结构化并列模块", comparison: "左右对比或同维度表格", timeline: "水平时间轴与阶段节点",
    flowchart: "可编辑节点与动态边界连线", "data-chart": "只使用输入中的数值绘制条形证据", "metric-overview": "关键数字与上下文标签",
    summary: "核心结论、边界与下一步"
  }[type];
}

export function planMaterial(markdown, options = {}) {
  const material = parseMaterial(markdown);
  const slides = [
    { index: 1, type: "cover", title: material.title, keyMessage: material.purpose, content: [material.audience], visualSuggestion: visualSuggestion("cover"), source: "文档标题、受众与目的" },
    { index: 2, type: "agenda", title: "汇报结构", keyMessage: "按问题、方法、证据与结论推进", content: material.sections.map((section) => section.title), visualSuggestion: visualSuggestion("agenda"), source: "章节标题" }
  ];
  material.sections.forEach((section, sectionIndex) => {
    const facts = splitFacts(section);
    const type = chooseType(section, sectionIndex, material.sections.length);
    slides.push({ index: slides.length + 1, type, title: section.title, keyMessage: facts[0] || section.title, content: facts.slice(1, 5), visualSuggestion: visualSuggestion(type), source: `章节：${section.title}` });
  });
  const plan = { schemaVersion: 1, presentation: { title: material.title, audience: material.audience, purpose: material.purpose, slideCount: slides.length, requestedSlideCount: material.requestedSlides, theme: options.theme || "competition-blue", language: "zh-CN" }, slides };
  const validation = validatePlan(plan);
  if (!validation.valid) throw new Error(`页面计划无效：${validation.errors.join("；")}`);
  return plan;
}

export function validatePlan(plan) {
  const errors = [];
  const warnings = [];
  const slides = Array.isArray(plan?.slides) ? plan.slides : [];
  if (slides.length < 8 || slides.length > 12) errors.push(`页数 ${slides.length} 不在 8～12 页范围内`);
  const titles = new Set();
  const messages = new Set();
  slides.forEach((slide, index) => {
    if (slide.index !== index + 1) errors.push(`第 ${index + 1} 页索引不连续`);
    if (!allowedTypes.has(slide.type)) errors.push(`第 ${index + 1} 页类型 ${slide.type} 不受支持`);
    if (!slide.title?.trim()) errors.push(`第 ${index + 1} 页缺少标题`);
    if (!slide.keyMessage?.trim()) errors.push(`第 ${index + 1} 页缺少核心结论`);
    if (titles.has(slide.title) && slide.type !== "section-divider") warnings.push(`标题重复：${slide.title}`);
    if (messages.has(slide.keyMessage)) errors.push(`核心结论重复：${slide.keyMessage}`);
    titles.add(slide.title); messages.add(slide.keyMessage);
    if (slide.type !== "cover" && slide.title.length > 20) warnings.push(`第 ${index + 1} 页标题超过 20 个字符`);
    const chars = [slide.keyMessage, ...(slide.content || [])].join("").length;
    const limit = pageTypes.types[slide.type]?.recommendedChars || 180;
    if (chars > limit) warnings.push(`第 ${index + 1} 页内容 ${chars} 字，超过 ${slide.type} 建议值 ${limit}`);
    if (index >= 2 && slides[index - 1]?.type === slide.type && slides[index - 2]?.type === slide.type) errors.push(`第 ${index - 1}～${index + 1} 页连续使用 ${slide.type}`);
  });
  return { valid: errors.length === 0, errors, warnings };
}

if (path.resolve(process.argv[1] || "") === currentFile) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) { process.stderr.write("usage: node planner/plan-deck.mjs --input material.md --output plan.json [--theme competition-blue]\n"); process.exit(2); }
  const markdown = fs.readFileSync(path.resolve(args.input), "utf8");
  const plan = planMaterial(markdown, { theme: args.theme });
  const output = path.resolve(args.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "PASS", output, validation: validatePlan(plan) }, null, 2)}\n`);
}
