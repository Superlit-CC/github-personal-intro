# Task 1: Project Scaffold and Deployment Config — Report

## Completed
- Created `package.json` with exact scripts, dependency versions, and metadata from the Task 1 brief.
- Created `astro.config.mjs` with:
  - `output: "static"`.
- Created `tsconfig.json` extending `astro/tsconfigs/strict`.
- Created `.gitignore` with required ignore list.
- Created `.github/workflows/deploy.yml` for GitHub Pages build/deploy.
- Created `src/env.d.ts` with the required Astro type references.
- Ran `npm install` and generated `package-lock.json`.

## Commands
1. `npm install`
   - Initial run (sandbox-restricted network) failed:
   - `npm error code ENOTCACHED`
   - `npm error request to https://registry.npmmirror.com/@astrojs%2fcheck failed: cache mode is 'only-if-cached' but no cached response is available.`
2. `npm install` (rerun with escalation) succeeded and created `package-lock.json`.
3. `npm run build`
   - Fails due local environment permission constraints during Vite cache renaming:
   - `EPERM: operation not permitted, rename 'D:\\Dev\\workspace\\github-personal-intro\\node_modules\\.vite\\deps_temp_b60c37d7' -> 'D:\\Dev\\workspace\\github-personal-intro\\node_modules\\.vite\\deps'`

## Notes
- Build reached Astro scaffold validation stage and reported `Missing pages directory: src/pages`, matching the expected early-task behavior once environment-level EPERM noise was no longer blocking startup.
## Fix update: 2026-07-08

### Lockfile registry normalization
- Replaced all `https://registry.npmmirror.com/` URLs in `package-lock.json` with `https://registry.npmjs.org/`.
- Focused verification:
  - `rg -n "registry\.npmmirror\.com" package-lock.json` → `NO_NPMMIRROR`
- `package.json` was not changed.

### Build check
- `npm run build` executed and failed in local environment with:
  - `EPERM: operation not permitted, mkdir 'C:\Users\Superlit\AppData\Roaming\astro\Config'`
  - `node_modules/@astrojs/telemetry/dist/config.js:56:8` stack trace
- Conclusion: build failure is environmental permissions issue, not related to this Task 1 lockfile registry fix.

## Fix update: 2026-07-08

### Pages base-path wiring
- Updated `astro.config.mjs` to keep `output: "static"` while using `defineConfig(({ command }) => ({ ... }))`.
- Local dev now uses `base: "/"`.
- Non-dev builds use `BASE_PATH` when provided, otherwise fall back to `/github-personal-intro/`.
- Added `site: process.env.SITE_URL ?? "https://example.com"` so the config stays env-driven without hard-coding a personal GitHub username.
- Updated `.github/workflows/deploy.yml` to pass:
  - `BASE_PATH: /${{ github.event.repository.name }}/`
  - `SITE_URL: https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}/`

### Verification
- Read back `astro.config.mjs` after the change; it now contains the `command`-aware base-path logic above.
- Ran `npm run build`.
- Exact failure output:
  - `EPERM: operation not permitted, mkdir 'C:\Users\Superlit\AppData\Roaming\astro\Config'`
  - `Location: D:\Dev\workspace\github-personal-intro\node_modules\@astrojs\telemetry\dist\config.js:56:8`
- Why unrelated: the failure happens before Astro reaches the project build and is caused by the local environment blocking Astro telemetry config directory creation, not by the GitHub Pages base-path change.
