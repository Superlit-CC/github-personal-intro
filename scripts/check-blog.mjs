import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const pages = (await readdir("dist", { recursive: true })).filter((file) => file.endsWith(".html"));
const home = await readFile("dist/index.html", "utf8");
const base = home.match(/class="brand" href="([^"]+)"/)[1];

for (const path of ["index.html", "notes/index.html", "projects/index.html", "about/index.html"]) {
  assert(pages.includes(path.replaceAll("/", process.platform === "win32" ? "\\" : "/")), `Missing page: ${path}`);
}

for (const file of pages) {
  const html = await readFile(join("dist", file), "utf8");
  assert(html.includes('lang="zh-CN"'), `Missing Chinese document language: ${file}`);
  assert(!html.includes("Alex Chen"), `Stale author: ${file}`);
  for (const [, href] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^(?:[a-z]+:|\/\/)/i.test(href)) continue;
    const url = new URL(href, `https://blog.test${base}${file.replaceAll("\\", "/")}`);
    assert(url.pathname.startsWith(base), `Missing base path: ${href}`);
    let target = decodeURIComponent(url.pathname.slice(base.length));
    if (!target || target.endsWith("/")) target += "index.html";
    await access(join("dist", target));
    if (url.hash) {
      const destination = await readFile(join("dist", target), "utf8");
      assert(destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Broken anchor: ${href}`);
    }
  }
}

const dates = [...home.matchAll(/<time datetime="([^"]+)"/g)].map((match) => match[1]);
assert(dates.length <= 3, "Homepage should contain at most three articles");
assert.deepEqual(dates, [...dates].sort().reverse(), "Articles must be newest first");

const seriesPath = "notes/pi-agent-kernel-guide/";
const slugs = [
  "00-overview",
  "01-unified-contract",
  "02-provider-routing",
  "03-bailian-provider",
  "04-streaming-text",
  "05-events-and-result",
  "06-agent-question-answer",
  "07-conversation-history",
  "08-tool-calling",
  "09-tool-implementation",
  "10-session-persistence",
  "11-context-compaction",
];
const chapters = await Promise.all(slugs.map((slug) => readFile(`dist/${seriesPath}${slug}/index.html`, "utf8")));

for (const [index, html] of chapters.entries()) {
  assert(/<svg[^>]*id="mermaid/.test(html), `Mermaid must render in ${slugs[index]}`);
  assert(!html.includes('class="language-mermaid"'), `Do not expose Mermaid source in ${slugs[index]}`);
  assert(html.includes('role="graphics-document document"'), `Mermaid needs an accessible role in ${slugs[index]}`);
  assert(!html.includes("<foreignObject"), `Use native SVG labels in ${slugs[index]}`);
  assert(!/href="[^"]*\/labs\//i.test(html), `Lab paths must not be links in ${slugs[index]}`);
}

for (let index = 0; index < chapters.length - 1; index++) {
  const current = chapters[index];
  const next = chapters[index + 1];
  assert(current.includes(`href="${base}${seriesPath}${slugs[index + 1]}/"`), `${slugs[index]} must link forward`);
  assert(next.includes(`href="${base}${seriesPath}${slugs[index]}/"`), `${slugs[index + 1]} must link back`);
}
assert(!chapters.at(-1).includes(">下一篇："), "Do not link the final chapter to unpublished chapters");

const overview = chapters[0];
for (const slug of slugs.slice(1)) {
  assert(overview.includes(`href="../${slug}/"`), `Overview must list ${slug}`);
}
assert(overview.includes("10 → 11 阅读。"), "Overview must include chapter eleven in the reading order");

const chapterNineText = chapters[9].replace(/<[^>]+>/g, "");
for (const text of ["npm install", "node labs/09-tool-implementation.ts", "file content:", "final answer: read-841273", "content", "details"]) {
  assert(chapterNineText.includes(text), `Preserve chapter nine content: ${text}`);
}
const chapterNineDiagram = chapters[9].match(/<svg[^>]*id="mermaid[\s\S]*?<\/svg>/)[0].replace(/<[^>]+>/g, "");
for (const label of ["Agent 传入本次调用参数", "工具的 execute 函数", "应用提供执行环境", "调用环境完成操作", "整理操作结果，交回 Agent"]) {
  assert(chapterNineDiagram.includes(label), `Missing chapter nine SVG label: ${label}`);
}

for (const slug of ["building-a-personal-site", "learning-in-public", "project-retrospectives"]) {
  assert(!pages.some((page) => page.includes(slug)), `Removed sample still published: ${slug}`);
}

const chapterTenText = chapters[10].replace(/<[^>]+>/g, "");
for (const text of ["node labs/10-session-persistence.ts", "phase: save", "phase: resume", "source file exists: false", "restored roles:", "final answer: read-841273", "JsonlSessionRepo", "buildSessionContext"]) {
  assert(chapterTenText.includes(text), `Preserve chapter ten content: ${text}`);
}
const chapterTenDiagram = chapters[10].match(/<svg[^>]*id="mermaid[\s\S]*?<\/svg>/)[0].replace(/<[^>]+>/g, "");
for (const label of ["已有会话消息", "保存到磁盘文件", "程序重启后读取文件", "恢复会话消息", "带上历史继续提问"]) {
  assert(chapterTenDiagram.includes(label), `Missing chapter ten SVG label: ${label}`);
}

const chapterElevenText = chapters[11].replace(/<[^>]+>/g, "");
for (const text of ["node labs/11-context-compaction.ts", "original code: read-550415", "retained roles: user", "stored entries: 6", "compactionSummary", "context JSON characters: 11279", "source file exists: false", "answer: read-550415"]) {
  assert(chapterElevenText.includes(text), `Preserve chapter eleven content: ${text}`);
}
const chapterElevenDiagram = chapters[11].match(/<svg[^>]*id="mermaid[\s\S]*?<\/svg>/)[0].replace(/<[^>]+>/g, "");
for (const label of ["当前会话的历史记录", "分出较早对话与近期消息", "较早对话生成摘要", "保存摘要与近期消息", "重建上下文并继续提问"]) {
  assert(chapterElevenDiagram.includes(label), `Missing chapter eleven SVG label: ${label}`);
}

console.log(`Blog checks passed: ${pages.length} pages, internal links, Mermaid, series navigation and Lab content.`);
