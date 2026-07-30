function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function parsePaperSections(markdown) {
  const sections = [];
  let current = { level: 0, title: "全文", lines: [] };
  for (const line of String(markdown || "").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = /^(#{1,4})\s+(.+)$/.exec(line);
    if (match) {
      if (current.lines.some((item) => item.trim())) sections.push({ ...current, content: current.lines.join("\n").trim() });
      current = { level: match[1].length, title: clean(match[2]), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((item) => item.trim())) sections.push({ ...current, content: current.lines.join("\n").trim() });
  return sections.filter((section) => section.title && section.content);
}

function recommendation(section, index) {
  const source = `${section.title}\n${section.content}`;
  const title = section.title;
  if (/(目标函数|约束条件|决策变量|数学模型|优化模型)/.test(source)) {
    return {
      engine: "model-diagram",
      visual_type: "model-relationship",
      purpose: "解释变量、目标函数、约束、求解方法与输出之间的关系",
      required_inputs: ["决策变量", "参数", "目标函数", "约束", "求解方法", "输出"]
    };
  }
  if (/(相关性|相关系数|相关矩阵)/.test(source)) {
    return {
      engine: "paper-chart",
      visual_type: "heatmap",
      purpose: "呈现指标或变量之间的相关关系",
      required_inputs: ["包含至少两个数值列的 CSV/Excel"]
    };
  }
  if (/(箱线图|箱型图|离群值|异常值分布|组间分布)/.test(source)) {
    return {
      engine: "paper-chart",
      visual_type: "boxplot",
      purpose: "比较不同类别的数据分布、中位数、四分位数与离群值",
      required_inputs: ["类别列", "原始观测值列"]
    };
  }
  if (/(雷达图|综合能力|多维评价|指标画像)/.test(source)) {
    return {
      engine: "paper-chart",
      visual_type: "radar",
      purpose: "比较多个方案在同一组评价维度上的综合表现",
      required_inputs: ["指标名称列", "至少两个方案数值列"]
    };
  }
  if (/(误差棒|标准差|标准误|置信区间)/.test(source)) {
    return {
      engine: "paper-chart",
      visual_type: "errorbar",
      purpose: "同时呈现实验均值和不确定性范围",
      required_inputs: ["类别或横轴列", "均值列", "误差列"]
    };
  }
  if (/(收敛|迭代次数|损失函数|目标函数值)/.test(source)) {
    return {
      engine: "paper-chart",
      visual_type: "line",
      purpose: "呈现算法迭代与收敛过程",
      required_inputs: ["迭代轮次列", "一个或多个指标列"]
    };
  }
  if (/(敏感性|稳健性|参数变化)/.test(source)) {
    return {
      engine: "paper-chart",
      visual_type: "line",
      purpose: "呈现参数变化对模型输出的影响",
      required_inputs: ["参数取值列", "响应指标列"]
    };
  }
  if (/(结果|实验|仿真|对比|评价指标)/.test(title)) {
    return {
      engine: "paper-chart",
      visual_type: "bar",
      purpose: "对比不同方案、模型或实验组的核心指标",
      required_inputs: ["方案类别列", "一个或多个数值指标列"]
    };
  }
  if (/(流程|步骤|技术路线|预处理|求解过程)/.test(source)) {
    return {
      engine: "paper-visual",
      visual_type: "flowchart",
      purpose: "解释从输入到输出的方法步骤与分支",
      required_inputs: ["步骤", "先后关系", "判断分支", "反馈关系"]
    };
  }
  if (/(系统|架构|模块|平台|功能设计)/.test(source)) {
    return {
      engine: "paper-visual",
      visual_type: "architecture",
      purpose: "解释系统模块、数据流与依赖关系",
      required_inputs: ["模块", "层级", "数据流", "依赖关系"]
    };
  }
  if (/(研究内容|研究框架|问题分析|方法)/.test(title)) {
    return {
      engine: "paper-visual",
      visual_type: "mindmap",
      purpose: "概括研究主线、任务分解与内容结构",
      required_inputs: ["中心主题", "一级分支", "二级任务"]
    };
  }
  return null;
}

export function planFigureSuite(markdown, options = {}) {
  const sections = parsePaperSections(markdown);
  if (!sections.length) throw new Error("论文材料中没有可分析的 Markdown 章节");
  const maxFigures = Math.max(1, Math.min(12, Number(options.maxFigures || 8)));
  const figures = [];
  for (let index = 0; index < sections.length && figures.length < maxFigures; index += 1) {
    const section = sections[index];
    const rec = recommendation(section, index);
    if (!rec) continue;
    const duplicate = figures.some((figure) => figure.section === section.title && figure.visual_type === rec.visual_type);
    if (duplicate) continue;
    figures.push({
      id: `F${String(figures.length + 1).padStart(2, "0")}`,
      section: section.title,
      suggested_title: `${section.title}可视化`,
      ...rec,
      status: "planned",
      source_trace: clean(section.content).slice(0, 320)
    });
  }
  if (!figures.length) throw new Error("未识别到适合自动规划的论文插图章节");
  return {
    schema_version: 1,
    mode: "figure-suite",
    paper_title: clean(options.title) || sections[0].title,
    global_style: {
      theme: options.theme || "academic-blue",
      background: "near-white",
      typography: "serif-title + sans-body",
      aspect: "paper-landscape",
      palette_rule: "统一主题色；数据系列顺序保持一致",
      export: ["SVG", "2x PNG", "editable HTML"]
    },
    figures,
    coverage: {
      sections_total: sections.length,
      sections_with_figures: new Set(figures.map((figure) => figure.section)).size,
      figures_total: figures.length
    }
  };
}

export function renderFigurePrompt(figure, suite) {
  return `# ${figure.id} ${figure.suggested_title}

请使用 HTML-PPT Skill 的 \`${figure.engine}\` 模式，为论文生成一张 \`${figure.visual_type}\` 插图。

## 目的

${figure.purpose}

## 来源章节

${figure.section}

## 可追溯原文

${figure.source_trace}

## 必需输入

${figure.required_inputs.map((item) => `- ${item}`).join("\n")}

## 统一视觉

- 主题：${suite.global_style.theme}
- 背景：近白
- 标题使用衬线体，正文使用无衬线体
- 保持与本套其他插图一致的色彩、线宽、圆角和字号
- 不得编造原文没有的数据、公式、结论或引用
`;
}
