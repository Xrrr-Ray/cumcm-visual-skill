import fs from "node:fs";
import { fileURLToPath } from "node:url";

const schemaPath = fileURLToPath(new URL("../schemas/paper-visual-semantic-plan.schema.json", import.meta.url));
export const PAPER_VISUAL_SEMANTIC_SCHEMA = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const SUPPORTED_TYPES = new Set(["flowchart", "mindmap", "architecture", "hierarchy", "feedback-loop", "timeline"]);
const SUPPORTED_THEMES = new Set(["academic-blue", "academic-green", "academic-orange", "minimal-gray"]);
const SUPPORTED_SHAPES = new Set(["process", "decision", "pill"]);
const SUPPORTED_KINDS = new Set(["flow", "pass", "reject", "feedback"]);
const SUPPORTED_ARROWS = new Set(["none", "triangle", "dot", "diamond"]);

const THEME_PALETTES = {
  "academic-blue": {
    groupFills: ["#EEF4FB", "#F4F7FB", "#EEF7F8", "#F7F4FB", "#F8F6EF"],
    groupStroke: "#A8BCD3",
    nodeFill: "#FFFFFF",
    nodeStroke: "#4D6F91",
    accent: "#1F5A94",
    text: "#17324D"
  },
  "academic-green": {
    groupFills: ["#EEF7F2", "#F4F8F2", "#EEF8F7", "#F5F7EF", "#F6F5ED"],
    groupStroke: "#A8C8B5",
    nodeFill: "#FFFFFF",
    nodeStroke: "#4C8061",
    accent: "#28734A",
    text: "#183B2A"
  },
  "academic-orange": {
    groupFills: ["#FFF4EA", "#FAF6EF", "#FFF8EC", "#F8F2EC", "#F7F5EF"],
    groupStroke: "#D8B89B",
    nodeFill: "#FFFFFF",
    nodeStroke: "#A76A36",
    accent: "#B75A16",
    text: "#4D2F18"
  },
  "minimal-gray": {
    groupFills: ["#F3F5F7", "#F7F7F6", "#F1F4F5", "#F5F3F4", "#F4F4F1"],
    groupStroke: "#B8C0C7",
    nodeFill: "#FFFFFF",
    nodeStroke: "#626F79",
    accent: "#394B59",
    text: "#26333D"
  }
};

function isTextOrNull(value, maxLength) {
  return value === null || (typeof value === "string" && value.length <= maxLength);
}

export function validateSemanticPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { status: "FAIL", errors: ["语义规划必须是对象"] };
  }
  if (plan.schema_version !== 1) errors.push("schema_version 必须为 1");
  if (plan.mode !== "paper-visual-semantic") errors.push("mode 必须为 paper-visual-semantic");
  if (!SUPPORTED_TYPES.has(plan.type)) errors.push(`不支持的图型：${plan.type}`);
  if (typeof plan.title !== "string" || !plan.title.trim() || plan.title.length > 40) errors.push("title 必须是 1—40 字符的文本");
  if (!isTextOrNull(plan.subtitle, 80)) errors.push("subtitle 必须为 null 或不超过 80 字符的文本");
  if (!SUPPORTED_THEMES.has(plan.theme)) errors.push(`不支持的主题：${plan.theme}`);
  if (!Array.isArray(plan.groups) || plan.groups.length < 1 || plan.groups.length > 5) errors.push("groups 必须包含 1—5 个分组");
  if (!Array.isArray(plan.nodes) || plan.nodes.length < 2 || plan.nodes.length > 18) errors.push("nodes 必须包含 2—18 个节点");
  if (!Array.isArray(plan.edges) || plan.edges.length > 32) errors.push("edges 必须是最多 32 条边的数组");
  if (errors.length) return { status: "FAIL", errors };

  const groupIds = new Set();
  for (const group of plan.groups) {
    if (!group || typeof group !== "object" || !/^G[1-9][0-9]*$/.test(group.id || "") || groupIds.has(group.id)) {
      errors.push(`分组 id 缺失、重复或格式错误：${group?.id || "(空)"}`);
    }
    if (typeof group.label !== "string" || !group.label.trim() || group.label.length > 16) errors.push(`分组 ${group.id || ""} 的 label 无效`);
    groupIds.add(group.id);
  }
  const nodeIds = new Set();
  for (const node of plan.nodes) {
    if (!node || typeof node !== "object" || !/^N[1-9][0-9]*$/.test(node.id || "") || nodeIds.has(node.id)) {
      errors.push(`节点 id 缺失、重复或格式错误：${node?.id || "(空)"}`);
    }
    if (!groupIds.has(node.group)) errors.push(`节点 ${node.id || ""} 引用了未知分组：${node.group}`);
    if (typeof node.label !== "string" || !node.label.trim() || node.label.length > 24) errors.push(`节点 ${node.id || ""} 的 label 无效`);
    if (!isTextOrNull(node.detail, 60)) errors.push(`节点 ${node.id || ""} 的 detail 无效`);
    if (!SUPPORTED_SHAPES.has(node.shape)) errors.push(`节点 ${node.id || ""} 的 shape 无效`);
    if (!isTextOrNull(node.tag, 12)) errors.push(`节点 ${node.id || ""} 的 tag 无效`);
    nodeIds.add(node.id);
  }
  const edgeIds = new Set();
  for (const edge of plan.edges) {
    if (!edge || typeof edge !== "object" || !/^E[1-9][0-9]*$/.test(edge.id || "") || edgeIds.has(edge.id)) {
      errors.push(`边 id 缺失、重复或格式错误：${edge?.id || "(空)"}`);
    }
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push(`边 ${edge.id || ""} 引用了未知节点：${edge.from}->${edge.to}`);
    if (!SUPPORTED_KINDS.has(edge.kind)) errors.push(`边 ${edge.id || ""} 的 kind 无效`);
    if (!isTextOrNull(edge.label, 16)) errors.push(`边 ${edge.id || ""} 的 label 无效`);
    if (!SUPPORTED_ARROWS.has(edge.start_arrow) || !SUPPORTED_ARROWS.has(edge.end_arrow)) errors.push(`边 ${edge.id || ""} 的箭头无效`);
    edgeIds.add(edge.id);
  }
  return {
    status: errors.length ? "FAIL" : "PASS",
    errors,
    groups: plan.groups.length,
    nodes: plan.nodes.length,
    edges: plan.edges.length
  };
}

function columnLayout(plan, palette) {
  const body = { x: 60, y: 190, width: 1800, height: 810 };
  const gap = plan.groups.length === 1 ? 0 : 24;
  const groupWidth = (body.width - gap * (plan.groups.length - 1)) / plan.groups.length;
  const groups = plan.groups.map((group, index) => ({
    ...group,
    index: String(index + 1).padStart(2, "0"),
    x: Math.round(body.x + index * (groupWidth + gap)),
    y: body.y,
    width: Math.round(groupWidth),
    height: body.height,
    fill: palette.groupFills[index % palette.groupFills.length],
    stroke: palette.groupStroke,
    text_color: palette.text
  }));
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const groupedNodes = new Map(groups.map((group) => [group.id, plan.nodes.filter((node) => node.group === group.id)]));
  const nodes = [];
  for (const group of groups) {
    const members = groupedNodes.get(group.id);
    const availableHeight = group.height - 132;
    const nodeGap = members.length <= 1 ? 0 : Math.max(24, Math.min(48, (availableHeight - members.length * 132) / (members.length - 1)));
    const nodeHeight = Math.max(112, Math.min(154, (availableHeight - nodeGap * Math.max(0, members.length - 1)) / members.length));
    const totalHeight = members.length * nodeHeight + Math.max(0, members.length - 1) * nodeGap;
    const startY = group.y + 76 + Math.max(0, (availableHeight - totalHeight) / 2);
    const nodeWidth = Math.max(180, group.width - 72);
    members.forEach((node, index) => {
      nodes.push({
        ...node,
        detail: node.detail || "",
        tag: node.tag || "",
        x: Math.round(group.x + (group.width - nodeWidth) / 2),
        y: Math.round(startY + index * (nodeHeight + nodeGap)),
        width: Math.round(nodeWidth),
        height: Math.round(nodeHeight),
        fill: palette.nodeFill,
        stroke: node.kind === "reject" ? "#B34A4A" : palette.nodeStroke,
        text_color: palette.text,
        title_wrap: Math.max(6, Math.floor(nodeWidth / 38)),
        detail_wrap: Math.max(8, Math.floor(nodeWidth / 28))
      });
    });
  }
  return { groups, nodes, groupMap };
}

function hierarchyLayout(plan, palette) {
  const body = { x: 60, y: 190, width: 1800, height: 810 };
  const gap = plan.groups.length === 1 ? 0 : 20;
  const groupHeight = (body.height - gap * (plan.groups.length - 1)) / plan.groups.length;
  const groups = plan.groups.map((group, index) => ({
    ...group,
    index: String(index + 1).padStart(2, "0"),
    x: body.x,
    y: Math.round(body.y + index * (groupHeight + gap)),
    width: body.width,
    height: Math.round(groupHeight),
    fill: palette.groupFills[index % palette.groupFills.length],
    stroke: palette.groupStroke,
    text_color: palette.text
  }));
  const nodes = [];
  for (const group of groups) {
    const members = plan.nodes.filter((node) => node.group === group.id);
    const gapX = 26;
    const usableX = group.x + 190;
    const usableWidth = group.width - 230;
    const nodeWidth = Math.min(360, Math.max(180, (usableWidth - gapX * Math.max(0, members.length - 1)) / Math.max(1, members.length)));
    const totalWidth = members.length * nodeWidth + Math.max(0, members.length - 1) * gapX;
    const startX = usableX + Math.max(0, (usableWidth - totalWidth) / 2);
    const nodeHeight = Math.max(82, Math.min(128, group.height - 34));
    members.forEach((node, index) => {
      nodes.push({
        ...node,
        detail: node.detail || "",
        tag: node.tag || "",
        x: Math.round(startX + index * (nodeWidth + gapX)),
        y: Math.round(group.y + (group.height - nodeHeight) / 2),
        width: Math.round(nodeWidth),
        height: Math.round(nodeHeight),
        fill: palette.nodeFill,
        stroke: palette.nodeStroke,
        text_color: palette.text,
        title_wrap: Math.max(6, Math.floor(nodeWidth / 38)),
        detail_wrap: Math.max(8, Math.floor(nodeWidth / 28))
      });
    });
  }
  return { groups, nodes };
}

export function layoutSemanticPlan(plan) {
  const validation = validateSemanticPlan(plan);
  if (validation.status !== "PASS") throw new Error(`语义规划校验失败：${validation.errors.join("；")}`);
  const palette = THEME_PALETTES[plan.theme];
  const laidOut = plan.type === "hierarchy" ? hierarchyLayout(plan, palette) : columnLayout(plan, palette);
  const nodesById = new Map(laidOut.nodes.map((node) => [node.id, node]));
  const edges = plan.edges.map((edge) => {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    const output = {
      ...edge,
      label: edge.label || "",
      color: edge.kind === "reject" ? "#B34A4A" : edge.kind === "feedback" ? "#8055A6" : palette.accent,
      width: edge.kind === "feedback" ? 4 : 3,
      dash: edge.kind === "reject" || edge.kind === "feedback" ? "dashed" : "solid",
      start_anchor: "auto",
      end_anchor: "auto"
    };
    if (edge.kind === "feedback") {
      const fromX = from.x + from.width / 2;
      const toX = to.x + to.width / 2;
      output.route = [[fromX, 1026], [toX, 1026]];
      output.start_anchor = "bottom";
      output.end_anchor = "bottom";
      output.label_position = [Math.round((fromX + toX) / 2), 1004];
    }
    return output;
  });
  return {
    schema_version: 1,
    mode: "paper-visual",
    type: plan.type,
    title: plan.title,
    subtitle: plan.subtitle || "",
    theme: plan.theme,
    canvas: { width: 1920, height: 1080 },
    groups: laidOut.groups,
    nodes: laidOut.nodes,
    edges
  };
}
