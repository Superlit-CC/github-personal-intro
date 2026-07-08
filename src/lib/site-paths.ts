const EXTERNAL_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export function getBasePath() {
  const raw = import.meta.env.PUBLIC_BASE_PATH ?? "/";
  const trimmed = raw.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export function withBasePath(path = "/") {
  if (EXTERNAL_URL_PATTERN.test(path)) {
    return path;
  }

  const basePath = getBasePath();

  if (path === "/" || path === "") {
    return basePath;
  }

  if (path.startsWith("#") || path.startsWith("?")) {
    return `${basePath}${path}`;
  }

  return `${basePath}${path.replace(/^\/+/, "")}`;
}
