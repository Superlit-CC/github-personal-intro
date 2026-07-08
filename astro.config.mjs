import { defineConfig } from "astro/config";

export default defineConfig(({ command }) => ({
  output: "static",
  site: process.env.SITE_URL ?? "https://example.com",
  base:
    command === "dev" ? "/" : process.env.BASE_PATH ?? "/github-personal-intro/"
}));
