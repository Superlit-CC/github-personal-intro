import { defineConfig } from "astro/config";

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

export default defineConfig(({ command }) => ({
  output: "static",
  site: process.env.SITE_URL ?? "https://example.com",
  base:
    command === "dev"
      ? "/"
      : normalizeBasePath(process.env.BASE_PATH ?? process.env.PUBLIC_BASE_PATH ?? "/github-personal-intro/"),
  vite: {
    base:
      command === "dev"
        ? "/"
        : `${normalizeBasePath(
            process.env.BASE_PATH ?? process.env.PUBLIC_BASE_PATH ?? "/github-personal-intro/"
          )}/`
  }
}));
