import { latexToUnicode } from "./math-text.mjs";

function text(value) {
  return String(value ?? "").trim();
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function itemText(item) {
  if (typeof item === "string") return item;
  const symbol = text(item?.symbol || item?.name);
  const meaning = text(item?.meaning || item?.description);
  return [symbol, meaning].filter(Boolean).join("：");
}

function compact(items, limit = 6) {
  const values = list(items).map(itemText).filter(Boolean);
  const shown = values.slice(0, limit);
  if (values.length > limit) shown.push(`另 ${values.length - limit} 项`);
  return shown.join("；");
}

function node(id, group, label, detail, x, y, width, height, extra = {}) {
  return {
    id,
    group,
    label,
    detail,
    detail_wrap: 9,
    x,
    y,
    width,
    height,
    ...extra
  };
}

export function normalizeModelSpec(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("模型关系输入必须是 JSON 对象");
  const objective = typeof input.objective === "string"
    ? { expression: input.objective }
    : (input.objective || {});
  const normalized = {
    title: text(input.title) || "优化模型结构关系图",
    subtitle: text(input.subtitle) || "变量、目标函数、约束与求解输出",
    variables: list(input.variables),
    parameters: list(input.parameters),
    objective: {
      sense: text(objective.sense || objective.direction || "min"),
      expression: text(objective.expression || objective.formula || objective.latex),
      latex: text(objective.latex),
      meaning: text(objective.meaning || objective.description)
    },
    constraints: list(input.constraints),
    solver: typeof input.solver === "string" ? { name: input.solver } : (input.solver || {}),
    outputs: list(input.outputs),
    validation: list(input.validation),
    theme: text(input.theme) || "academic-blue"
  };
  if (!normalized.variables.length) throw new Error("至少需要一个决策变量");
  if (!normalized.objective.expression) throw new Error("必须提供目标函数 expression");
  if (!normalized.constraints.length) throw new Error("至少需要一个约束");
  if (!text(normalized.solver.name || normalized.solver.method)) throw new Error("必须提供求解方法 solver.name");
  if (!normalized.outputs.length) throw new Error("至少需要一个模型输出");
  return normalized;
}

export function planModelDiagram(input) {
  const spec = normalizeModelSpec(input);
  const groups = [
    { id: "G1", index: "01", label: "模型输入", x: 35, y: 190, width: 315, height: 770 },
    { id: "G2", index: "02", label: "优化目标", x: 375, y: 190, width: 315, height: 770 },
    { id: "G3", index: "03", label: "约束体系", x: 715, y: 190, width: 440, height: 770 },
    { id: "G4", index: "04", label: "求解与检验", x: 1180, y: 190, width: 315, height: 770 },
    { id: "G5", index: "05", label: "模型输出", x: 1520, y: 190, width: 365, height: 770 }
  ];
  const nodes = [
    node("N1", "G1", "决策变量", compact(spec.variables), 65, 300, 255, 190),
    node("N2", "G1", "参数与常量", compact(spec.parameters) || "由题目与数据给定", 65, 585, 255, 170),
    node(
      "N3",
      "G2",
      `${spec.objective.sense.toLowerCase().startsWith("max") ? "最大化" : "最小化"}目标`,
      latexToUnicode(spec.objective.latex || spec.objective.expression),
      405,
      390,
      255,
      245,
      { shape: "pill", math: true, detail_wrap: 11, detail_max_lines: 5, formula_latex: spec.objective.latex || "" }
    )
  ];
  const constraintItems = spec.constraints.slice(0, 4);
  const constraintGap = 610 / Math.max(1, constraintItems.length);
  constraintItems.forEach((constraint, index) => {
    const formula = typeof constraint === "string" ? constraint : text(constraint.latex || constraint.expression || constraint.formula);
    const content = typeof constraint === "string" ? latexToUnicode(constraint) : [
      latexToUnicode(formula),
      text(constraint.meaning || constraint.description)
    ].filter(Boolean).join("；");
    nodes.push(node(
      `N${4 + index}`,
      "G3",
      typeof constraint === "string" ? `约束 ${index + 1}` : text(constraint.name) || `约束 ${index + 1}`,
      content,
      750,
      270 + index * constraintGap,
      370,
      Math.min(130, constraintGap - 20),
      { detail_wrap: 12, math: true, formula_latex: typeof constraint === "string" ? "" : text(constraint.latex) }
    ));
  });
  const solverId = `N${4 + constraintItems.length}`;
  nodes.push(node(
    solverId,
    "G4",
    text(spec.solver.name || spec.solver.method),
    compact(spec.solver.steps || spec.solver.description ? [spec.solver.description, ...list(spec.solver.steps)] : [], 2) || "执行模型求解",
    1210,
    335,
    255,
    190
  ));
  const validationId = `N${5 + constraintItems.length}`;
  nodes.push(node(
    validationId,
    "G4",
    "结果检验",
    compact(spec.validation) || "可行性、稳健性与误差检查",
    1210,
    625,
    255,
    170
  ));
  const outputItems = spec.outputs.slice(0, 3);
  const outputGap = 565 / Math.max(1, outputItems.length);
  outputItems.forEach((output, index) => {
    nodes.push(node(
      `N${6 + constraintItems.length + index}`,
      "G5",
      typeof output === "string" ? `输出 ${index + 1}` : text(output.name) || `输出 ${index + 1}`,
      typeof output === "string" ? output : text(output.meaning || output.description || output.value),
      1555,
      290 + index * outputGap,
      295,
      Math.min(155, outputGap - 20)
    ));
  });
  const constraintIds = constraintItems.map((_, index) => `N${4 + index}`);
  const outputIds = outputItems.map((_, index) => `N${6 + constraintItems.length + index}`);
  const edges = [
    { id: "E01", from: "N1", to: "N3", kind: "flow", start_anchor: "right", end_anchor: "left" },
    { id: "E02", from: "N2", to: "N3", kind: "flow", start_anchor: "right", end_anchor: "left" }
  ];
  constraintIds.forEach((constraintId, index) => {
    edges.push({ id: `E${String(3 + index).padStart(2, "0")}`, from: "N3", to: constraintId, kind: "flow", start_anchor: "right", end_anchor: "left" });
  });
  const constraintBridgeId = constraintIds[Math.floor((constraintIds.length - 1) / 2)];
  edges.push({ id: `E${String(3 + constraintIds.length).padStart(2, "0")}`, from: constraintBridgeId, to: solverId, kind: "flow", start_anchor: "right", end_anchor: "left" });
  edges.push({ id: `E${String(4 + constraintIds.length).padStart(2, "0")}`, from: solverId, to: validationId, kind: "flow", start_anchor: "bottom", end_anchor: "top" });
  outputIds.forEach((outputId, index) => edges.push({
    id: `E${String(5 + constraintIds.length + index).padStart(2, "0")}`,
    from: validationId,
    to: outputId,
    kind: "pass",
    start_anchor: "right",
    end_anchor: "left"
  }));
  return {
    schema_version: 1,
    mode: "paper-visual",
    type: "architecture",
    title: spec.title,
    subtitle: spec.subtitle,
    theme: spec.theme,
    canvas: { width: 1920, height: 1080 },
    groups,
    nodes,
    edges,
    model_spec: spec
  };
}
