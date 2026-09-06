import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";

// Check the built site, including repository-prefixed GitHub Pages links.
const pages = (await readdir("dist", { recursive: true }))
  .filter((file) => file.endsWith(".html"));
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
const overview = await readFile(`dist/${seriesPath}00-overview/index.html`, "utf8");
const chapter = await readFile(`dist/${seriesPath}01-unified-contract/index.html`, "utf8");
const chapterTwo = await readFile(`dist/${seriesPath}02-provider-routing/index.html`, "utf8");
for (const html of [overview, chapter, chapterTwo]) {
  assert(/<svg[^>]*id="mermaid/.test(html), "Mermaid must render to SVG at build time");
  assert(!html.includes('class="language-mermaid"'), "Do not expose unrendered Mermaid code");
  assert(html.includes('role="graphics-document document"'), "Mermaid must have an accessible diagram role");
  assert(!html.includes("<foreignObject"), "Use native SVG labels to prevent HTML line breaks from clipping text");
}
for (const label of ["本次调用的模型", "本次发送的内容", "模型回复"]) {
  assert(new RegExp(`<tspan[^>]*>${label}</tspan>`).test(chapter), `Missing SVG label: ${label}`);
}
const overviewNext = [...overview.matchAll(/<a href="([^"]+)"[^>]*>下一篇/g)].map((match) => match[1]);
const chapterPrevious = [...chapter.matchAll(/<a href="([^"]+)"[^>]*>← 上一篇/g)].map((match) => match[1]);
assert.deepEqual(overviewNext, [`${base}${seriesPath}01-unified-contract/`], "Overview must link to chapter one");
assert.deepEqual(chapterPrevious, [`${base}${seriesPath}00-overview/`], "Chapter one must link back to overview");
const chapterNext = [...chapter.matchAll(/<a href="([^"]+)"[^>]*>下一篇/g)].map((match) => match[1]);
const chapterTwoPrevious = [...chapterTwo.matchAll(/<a href="([^"]+)"[^>]*>← 上一篇/g)].map((match) => match[1]);
assert.deepEqual(chapterNext, [`${base}${seriesPath}02-provider-routing/`], "Chapter one must link to chapter two");
assert.deepEqual(chapterTwoPrevious, [`${base}${seriesPath}01-unified-contract/`], "Chapter two must link back to chapter one");
assert(!chapterTwo.includes(">下一篇："), "Do not link to unpublished chapters");
assert(overview.includes('href="../02-provider-routing/"'), "Overview must list chapter two as published");
const chapterTwoDiagram = chapterTwo.match(/<svg[^>]*id="mermaid[\s\S]*?<\/svg>/)[0].replace(/<[^>]+>/g, "");
for (const label of ["调用方", "models.complete()", "Models", "查找 Provider 并应用认证", "执行调用", "模型服务", "AssistantMessage"]) {
  assert(chapterTwoDiagram.includes(label), `Missing chapter two SVG label: ${label}`);
}
for (const text of ["node labs/02-provider-routing.ts", "anthropic: hello", "openai: hello", "chapter 2 example passed"]) {
  assert(chapterTwo.replace(/<[^>]+>/g, "").includes(text), `Preserve chapter two Lab instructions and output: ${text}`);
}
assert(chapter.includes("labs/01-model-call.ts") && chapter.includes("chapter 1 example passed"), "Preserve the original Lab instructions and expected output");
assert(!/href="[^"]*\/labs\//i.test(overview + chapter + chapterTwo), "Lab paths should remain text, not links");
for (const slug of ["building-a-personal-site", "learning-in-public", "project-retrospectives"]) {
  assert(!pages.some((page) => page.includes(slug)), `Removed sample still published: ${slug}`);
}
console.log(`Blog checks passed: ${pages.length} pages, internal links, anchors and article order.`);
