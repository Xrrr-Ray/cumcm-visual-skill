import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePaperSections, planFigureSuite, renderFigurePrompt } from "../figure-suite/figure-suite.mjs";

const markdown = fs.readFileSync(new URL("./fixtures/figure-suite-paper.md", import.meta.url), "utf8");
const sections = parsePaperSections(markdown);
assert.ok(sections.length >= 7);
const suite = planFigureSuite(markdown, { maxFigures: 8 });
assert.ok(suite.figures.length >= 6);
assert.ok(suite.figures.some((figure) => figure.engine === "model-diagram"));
assert.ok(suite.figures.some((figure) => figure.visual_type === "line"));
assert.ok(suite.figures.some((figure) => figure.visual_type === "bar"));
assert.ok(suite.figures.every((figure) => figure.source_trace));
assert.match(renderFigurePrompt(suite.figures[0], suite), /不得编造/);
process.stdout.write(`${JSON.stringify({ status: "PASS", sections: sections.length, figures: suite.figures.length, engines: [...new Set(suite.figures.map((figure) => figure.engine))] }, null, 2)}\n`);

