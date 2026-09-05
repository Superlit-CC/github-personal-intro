import { defineConfig } from "astro/config";
import rehypeMermaid from "rehype-mermaid";

function normalizeBasePath(value) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export default defineConfig({
  output: "static",
  markdown: {
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid"] },
    rehypePlugins: [[rehypeMermaid, {
      strategy: "inline-svg",
      launchOptions: {
        channel: process.env.MERMAID_BROWSER_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined)
      },
      mermaidConfig: {
        theme: "base",
        securityLevel: "strict",
        fontFamily: 'Arial, "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
        htmlLabels: false,
        themeVariables: {
          primaryColor: "#f0f0f0",
          primaryTextColor: "#262626",
          primaryBorderColor: "#2563eb",
          lineColor: "#2563eb",
          background: "#fafafa"
        }
      }
    }]],
    shikiConfig: { theme: "github-light" }
  },
  site: process.env.SITE_URL ?? "https://example.com",
  base: normalizeBasePath(process.env.BASE_PATH ?? process.env.PUBLIC_BASE_PATH ?? "/")
});
