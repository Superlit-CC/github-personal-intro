import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

function normalizeBasePath(value) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function walkHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

const basePath = normalizeBasePath(
  process.env.PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? "/github-personal-intro/"
);

if (basePath !== "/") {
  const prefix = escapeRegExp(basePath.slice(1));
  const attributePattern = new RegExp(`\\b(href|src)="/(?!${prefix}|/)`, "g");
  const htmlFiles = await walkHtmlFiles("dist");

  for (const file of htmlFiles) {
    const original = await readFile(file, "utf8");
    const updated = original.replace(attributePattern, `$1="${basePath}`);

    if (updated !== original) {
      await writeFile(file, updated);
    }
  }
}
