# Personal Portfolio Blog

A sample personal introduction and portfolio site built with Astro for GitHub Pages.

The homepage currently includes these sections:

- Hero
- About
- Skills
- Projects
- Notes
- Contact

The first version uses sample content throughout, so you can swap in your details after setup.

## Features

- Personal introduction homepage with reusable Astro sections
- Skills grouped by category
- Project portfolio cards
- Markdown-backed Notes section from `src/content/notes/`
- GitHub Pages deployment workflow with base-path handling
- Customizable profile data via data files

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

Notes are authored as Markdown files under `src/content/notes/` and use this frontmatter shape:

```md
---
title: "Your note title"
date: 2026-07-08
excerpt: "Short summary for the card listing"
tags:
  - example
  - astro
---
```

Notes automatically appear on the Notes section and note detail pages (the three newest by date appear on the homepage).

## Customize Content

- Edit profile details in `src/data/profile.ts`.
- Edit portfolio projects in `src/data/projects.ts`.
- Add notes in `src/content/notes/`.
- Replace the hero visual at `public/profile-visual.png`.

## Deploy

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`:

- Builds with `npm run build` on pushes to `main`.
- Sets `BASE_PATH` and `PUBLIC_BASE_PATH` to `/${{ github.event.repository.name }}/`.
- Runs `scripts/prefix-base-path.mjs` so links and assets are rewritten for the repository-level GitHub Pages path.

To use this deployment method:

1. In repository settings, enable GitHub Pages with **GitHub Actions** as the source.
2. Push to `main`.

