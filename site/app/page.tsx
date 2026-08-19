const basePath = "/cumcm-visual-skill";
const asset = (path: string) => `${basePath}${path}`;
const downloadPath = asset("/downloads/cumcm-visual-skill-one-click.zip");

const capabilities = [
  {
    number: "01",
    title: "论文结构图",
    description: "流程图、思维导图、技术路线、系统架构、层次结构、反馈回路与时间线。",
  },
  {
    number: "02",
    title: "论文数据图",
    description: "读取 CSV、Excel、JSON，生成折线、柱状、散点、热力、箱线、雷达与误差棒图。",
  },
  {
    number: "03",
    title: "数学模型图",
    description: "把决策变量、目标函数、约束、求解检验与模型输出组织成可编辑关系图。",
  },
  {
    number: "04",
    title: "全文插图套件",
    description: "读取 Markdown 论文，规划插图位置、统一视觉风格，并连续生成整套论文插图。",
  },
];

const examples = [
  {
    eyebrow: "PAPER CHART · BOXPLOT",
    title: "交叉验证准确率分布",
    description: "中位数、四分位区间、须线和离群点均可继续编辑。",
    image: asset("/showcase-v2/charts/boxplot/pptx/chart-preview.png"),
    href: asset("/showcase-v2/charts/boxplot/index.html"),
  },
  {
    eyebrow: "PAPER VISUAL · FEEDBACK LOOP",
    title: "产品批次质量检测与闭环处置",
    description: "检测、复检、分级处置和规则更新构成可追踪闭环。",
    image: asset("/showcase-v2/flowcharts/quality-loop/diagram-preview.png"),
    href: asset("/showcase-v2/flowcharts/quality-loop/index.html"),
  },
  {
    eyebrow: "PAPER CHART · HEATMAP",
    title: "配送系统变量相关性",
    description: "相关系数矩阵与每个数值单元格都能独立调整。",
    image: asset("/showcase-v2/charts/heatmap/pptx/chart-preview.png"),
    href: asset("/showcase-v2/charts/heatmap/edit.html"),
  },
];

const outputs = ["HTML", "SVG", "PNG", "JSON", "PPTX"];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="CUMCM Visual Skill 首页">
          <span className="wordmark-mark">C</span>
          <span>
            CUMCM Visual
            <small>数模国赛论文可视化 Skill</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <a href="#install">安装</a>
          <a href="#capabilities">功能</a>
          <a href="#examples">示例</a>
          <a href={asset("/student-guide/index.html")}>使用说明</a>
          <a className="nav-download" href={downloadPath} download>
            一键安装
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="release-pill">
            <span />
            v1.1.0 一键安装版 · Codex / Kimi K3
          </div>
          <p className="kicker">CUMCM 数模国赛论文可视化 Skill</p>
          <h1>
            国赛论文可视化，
            <br />
            一套 <span>Skill</span> 就够了。
          </h1>
          <p className="hero-description">
            从研究流程、数学模型到实验数据，一次生成适合论文正文的矢量图、浏览器编辑页与
            PowerPoint 可编辑文件。大模型负责理解，确定性生成器负责布局与交付。
          </p>
          <div className="hero-actions">
            <a className="button primary" href={downloadPath} download>
              下载一键安装包
            </a>
            <a className="button secondary" href={asset("/showcase-v2/index.html")}>
              查看完整示例库
            </a>
          </div>
          <p className="download-note">
            解压后双击“安装数模Skill.cmd”，自动安装到当前用户的 Skill 目录。
          </p>
        </div>

        <div className="hero-visual" aria-label="真实论文可视化示例">
          <div className="visual-window">
            <div className="window-bar">
              <span />
              <span />
              <span />
              <p>paper-visual / quality-loop / edit.html</p>
            </div>
            <img
              src={asset("/showcase-v2/flowcharts/quality-loop/diagram-preview.png")}
              alt="产品批次质量检测与闭环处置流程图"
            />
          </div>
          <div className="floating-card card-edit">
            <strong>浏览器编辑</strong>
            <span>节点 · 分区 · 箭头</span>
          </div>
          <div className="floating-card card-export">
            <strong>矢量 SVG</strong>
            <span>适合直接插入论文</span>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="核心能力">
        <div>
          <strong>4</strong>
          <span>类核心可视化能力</span>
        </div>
        <div>
          <strong>7</strong>
          <span>类论文数据图</span>
        </div>
        <div>
          <strong>5</strong>
          <span>种常用交付格式</span>
        </div>
        <div>
          <strong>2</strong>
          <span>种模型使用入口</span>
        </div>
      </section>

      <section className="section install" id="install">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ONE-CLICK INSTALL</p>
            <h2>下载、解压、双击，三步装好</h2>
          </div>
          <p>
            安装器自动识别当前 Windows 用户，不要求放在 D 盘，也不需要手动复制 Skill 文件夹。
          </p>
        </div>
        <div className="install-grid">
          <article>
            <span>01</span>
            <h3>下载并解压</h3>
            <p>获取公开 ZIP，解压到任意磁盘的普通文件夹。</p>
          </article>
          <article>
            <span>02</span>
            <h3>双击安装</h3>
            <p>运行 <code>安装数模Skill.cmd</code>，看到“安装成功”即可。</p>
          </article>
          <article>
            <span>03</span>
            <h3>直接告诉 Codex</h3>
            <p>说“使用 $cumcm-visual-skill”，然后附上论文或数据。</p>
          </article>
        </div>
        <div className="install-path">
          <div>
            <span>自动安装位置</span>
            <code>%USERPROFILE%\.agents\skills\cumcm-visual-skill</code>
          </div>
          <a className="button primary" href={downloadPath} download>
            下载一键安装包
          </a>
        </div>
        <p className="install-help">
          重复运行可安全更新，旧版本会先备份；包内还提供“检查安装状态”和“可恢复卸载”。
        </p>
      </section>

      <section className="section capabilities" id="capabilities">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CAPABILITIES</p>
            <h2>从一张图，到整篇论文的视觉系统</h2>
          </div>
          <p>
            默认生成单张论文插图；只有明确要求答辩、汇报或多页幻灯片时，才进入完整演示文稿模式。
          </p>
        </div>
        <div className="capability-grid">
          {capabilities.map((item) => (
            <article key={item.number}>
              <span className="capability-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section examples" id="examples">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REAL OUTPUTS</p>
            <h2>这里展示的，都是真实生成结果</h2>
          </div>
          <a className="text-link" href={asset("/showcase-v2/index.html")}>
            浏览全部示例与提示词 →
          </a>
        </div>
        <div className="example-grid">
          {examples.map((example) => (
            <a className="example-card" href={example.href} key={example.title}>
              <div className="example-image">
                <img src={example.image} alt={example.title} />
              </div>
              <div className="example-copy">
                <p>{example.eyebrow}</p>
                <h3>{example.title}</h3>
                <span>{example.description}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="section workflow">
        <div className="workflow-intro">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>四步完成一张论文图</h2>
          <p>
            使用 Codex 可以直接自然语言完成全流程；Kimi K3 当前用于论文单图的语义规划。
          </p>
          <div className="model-tags">
            <span>Codex · 端到端执行</span>
            <span>Kimi K3 · 语义规划</span>
          </div>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <div>
              <h3>提供论文或数据</h3>
              <p>上传 Markdown、文字、CSV、Excel 或模型 JSON。</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>说明想表达的关系</h3>
              <p>明确图型、必需内容、禁止补造项与导出格式。</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>生成并验证</h3>
              <p>统一生成器完成布局、渲染、格式检查和视觉验证。</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>继续编辑与导出</h3>
              <p>在浏览器或 PowerPoint 中调整，最后插入论文。</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="output-band">
        <div>
          <p className="eyebrow">ONE PLAN · MULTIPLE OUTPUTS</p>
          <h2>同一份内容规划，多种可编辑交付</h2>
        </div>
        <div className="output-list">
          {outputs.map((output) => (
            <span key={output}>{output}</span>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">START CREATING</p>
          <h2>先看示例，再用你的论文试一次。</h2>
          <p>一键安装包已包含安装器、完整生成器、使用文档、精选示例和 Codex / Kimi 提示词。</p>
        </div>
        <div className="final-actions">
          <a className="button primary" href={downloadPath} download>
            下载一键安装包
          </a>
          <a className="button secondary" href={asset("/student-guide/index.html")}>
            阅读学生使用说明
          </a>
        </div>
      </section>

      <footer>
        <a className="wordmark footer-mark" href="#top">
          <span className="wordmark-mark">C</span>
          <span>CUMCM Visual</span>
        </a>
        <p>面向数学建模竞赛、国赛论文、课程论文与毕业论文。</p>
        <div>
          <a href={asset("/showcase-v2/index.html")}>示例库</a>
          <a href={asset("/student-guide/index.html")}>使用说明</a>
          <a href={asset("/docs/CUMCM-Visual-Skill-Feishu-User-Guide.md")}>Markdown 文档</a>
        </div>
      </footer>
    </main>
  );
}
