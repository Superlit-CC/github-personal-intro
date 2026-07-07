# Personal Portfolio Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Astro static site for a personal introduction, portfolio, and lightweight notes/blog, using sample content throughout.

**Architecture:** The site is an Astro static project with data-driven profile and project content, Markdown notes, reusable UI components, and GitHub Pages deployment through GitHub Actions. The homepage composes focused Astro components, while note detail pages render content collections.

**Tech Stack:** Astro, TypeScript, Markdown content collections, CSS, GitHub Actions, GitHub Pages.

## Global Constraints

- The first version uses sample content throughout.
- The homepage includes Hero, About, Skills, Projects, Notes, and Contact sections.
- Notes are authored as Markdown files under `src/content/notes/`.
- The site deploys to GitHub Pages using GitHub Actions.
- The visual direction is professional, calm, personal, light, readable, and restrained.
- The first version does not include CMS integration, search, dark mode toggle, analytics, comments, or complex animation.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `astro.config.mjs`: Astro configuration for static output.
- `tsconfig.json`: TypeScript configuration extending Astro defaults.
- `.gitignore`: Generated files and local dependencies ignored by Git.
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow.
- `src/env.d.ts`: Astro TypeScript environment reference.
- `src/content.config.ts`: Defines the notes content collection schema.
- `src/data/profile.ts`: Sample profile, links, intro copy, and skills.
- `src/data/projects.ts`: Sample project data.
- `src/layouts/BaseLayout.astro`: Shared document shell, metadata, header, footer, and global styles.
- `src/components/Hero.astro`: First-screen introduction and hero visual.
- `src/components/Section.astro`: Shared section wrapper.
- `src/components/SkillGroup.astro`: Grouped skill tags.
- `src/components/ProjectCard.astro`: Portfolio project card.
- `src/components/NoteCard.astro`: Note preview card.
- `src/components/ContactLinks.astro`: Contact and social links.
- `src/pages/index.astro`: Homepage composition.
- `src/pages/notes/[slug].astro`: Note detail route.
- `src/content/notes/building-a-personal-site.md`: Sample note.
- `src/content/notes/learning-in-public.md`: Sample note.
- `src/content/notes/project-retrospectives.md`: Sample note.
- `public/profile-visual.png`: Generated bitmap hero/profile visual.

---

### Task 1: Project Scaffold And Deployment Config

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.github/workflows/deploy.yml`
- Create: `src/env.d.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, and `npm run preview` scripts.
- Produces: GitHub Actions workflow that builds the project and deploys `dist`.
- Consumes: No earlier tasks.

- [ ] **Step 1: Create package and Astro config files**

Create `package.json`:

```json
{
  "name": "github-personal-intro",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.0",
    "astro": "^5.0.0",
    "typescript": "^5.6.0"
  },
  "devDependencies": {}
}
```

Create `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static"
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.env
.DS_Store
```

Create `src/env.d.ts`:

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 2: Create the GitHub Pages workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm reports that packages were added.

- [ ] **Step 4: Run build to verify scaffold**

Run:

```bash
npm run build
```

Expected: Build fails only because no `src/pages` route exists yet, or passes if Astro accepts the empty scaffold. Continue to Task 2 either way.

- [ ] **Step 5: Commit scaffold**

Run:

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .gitignore .github/workflows/deploy.yml src/env.d.ts
git commit -m "chore: scaffold astro site"
```

Expected: Commit succeeds.

---

### Task 2: Content Schema And Sample Data

**Files:**
- Create: `src/content.config.ts`
- Create: `src/data/profile.ts`
- Create: `src/data/projects.ts`
- Create: `src/content/notes/building-a-personal-site.md`
- Create: `src/content/notes/learning-in-public.md`
- Create: `src/content/notes/project-retrospectives.md`

**Interfaces:**
- Produces: `profile` object with `name`, `role`, `tagline`, `summary`, `about`, `links`, and `skillGroups`.
- Produces: `projects` array with `title`, `summary`, `stack`, `highlights`, `githubUrl`, and `demoUrl`.
- Produces: `notes` content collection with `title`, `date`, `excerpt`, and `tags`.
- Consumes: Astro project scaffold from Task 1.

- [ ] **Step 1: Define the notes collection**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from "astro:content";

const notes = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).default([])
  })
});

export const collections = { notes };
```

- [ ] **Step 2: Add sample profile data**

Create `src/data/profile.ts`:

```ts
export const profile = {
  name: "Alex Chen",
  role: "Full-stack developer",
  tagline: "I build thoughtful web tools, automation workflows, and product experiments.",
  summary:
    "A sample personal site for presenting work, writing notes, and making a GitHub profile feel more complete.",
  about: [
    "I enjoy turning fuzzy ideas into small, useful products. My work usually sits between frontend craft, backend reliability, and practical automation.",
    "Recently I have been exploring AI-assisted workflows, developer tooling, and ways to make technical projects easier to explain.",
    "This first version uses sample copy so the structure is ready before the personal details are finalized."
  ],
  links: [
    { label: "GitHub", href: "https://github.com/example" },
    { label: "Email", href: "mailto:hello@example.com" },
    { label: "Resume", href: "#" }
  ],
  skillGroups: [
    {
      title: "Frontend",
      skills: ["Astro", "React", "TypeScript", "CSS", "Accessibility"]
    },
    {
      title: "Backend",
      skills: ["Node.js", "API design", "PostgreSQL", "Serverless"]
    },
    {
      title: "Tools",
      skills: ["GitHub Actions", "Testing", "Documentation", "CI/CD"]
    },
    {
      title: "AI and Automation",
      skills: ["Prompt design", "Workflow automation", "Data cleanup"]
    }
  ]
} as const;
```

- [ ] **Step 3: Add sample project data**

Create `src/data/projects.ts`:

```ts
export const projects = [
  {
    title: "Launch Notes",
    summary:
      "A lightweight release notes generator that turns merged pull requests into a clean weekly digest.",
    stack: ["TypeScript", "GitHub API", "Markdown"],
    highlights: [
      "Groups changes by feature area",
      "Keeps technical details readable",
      "Exports Markdown for team updates"
    ],
    githubUrl: "https://github.com/example/launch-notes",
    demoUrl: "#"
  },
  {
    title: "Focus Board",
    summary:
      "A personal dashboard for tracking current goals, active projects, and next actions without heavy process overhead.",
    stack: ["Astro", "CSS", "Local data"],
    highlights: [
      "Fast static interface",
      "Project cards designed for scanning",
      "Simple data model for weekly updates"
    ],
    githubUrl: "https://github.com/example/focus-board",
    demoUrl: "#"
  },
  {
    title: "API Sketchbook",
    summary:
      "A collection of small backend experiments for testing API patterns, auth flows, and deployment ideas.",
    stack: ["Node.js", "PostgreSQL", "GitHub Actions"],
    highlights: [
      "Documents trade-offs beside code",
      "Includes repeatable setup scripts",
      "Uses CI checks for every example"
    ],
    githubUrl: "https://github.com/example/api-sketchbook",
    demoUrl: "#"
  }
] as const;
```

- [ ] **Step 4: Add sample notes**

Create `src/content/notes/building-a-personal-site.md`:

```md
---
title: "Building a Personal Site That Can Grow"
date: 2026-07-08
excerpt: "A short note on starting with a focused portfolio and leaving room for future writing."
tags:
  - portfolio
  - astro
---

A personal site does not need to start as a complete publication system. A focused homepage with a small notes section is often enough to explain who you are, what you build, and where your thinking is going.

The useful first version has clear structure, easy content editing, and a deployment path that does not require ceremony.
```

Create `src/content/notes/learning-in-public.md`:

```md
---
title: "Learning in Public, Quietly"
date: 2026-07-07
excerpt: "A sample reflection on sharing small technical notes before they become polished essays."
tags:
  - writing
  - learning
---

Learning in public can be modest. A note can capture a small decision, a useful command, or a problem that finally made sense.

Small posts compound into a visible trail of curiosity, and that trail can be more useful than a perfectly polished archive.
```

Create `src/content/notes/project-retrospectives.md`:

```md
---
title: "What I Track After Finishing a Project"
date: 2026-07-06
excerpt: "A sample project retrospective format for capturing decisions, outcomes, and follow-up ideas."
tags:
  - projects
  - process
---

After a project ships, the most useful questions are simple: what changed, what was harder than expected, what should be reused, and what should be avoided next time?

Capturing those answers while the work is fresh makes the next project easier to begin.
```

- [ ] **Step 5: Run type and content validation**

Run:

```bash
npm run build
```

Expected: Build still may fail until pages are added in Task 4. There should be no TypeScript schema errors from `src/content.config.ts`, `src/data/profile.ts`, or `src/data/projects.ts`.

- [ ] **Step 6: Commit data model**

Run:

```bash
git add src/content.config.ts src/data/profile.ts src/data/projects.ts src/content/notes
git commit -m "feat: add sample portfolio content"
```

Expected: Commit succeeds.

---

### Task 3: Shared Layout, Styles, And Components

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Hero.astro`
- Create: `src/components/Section.astro`
- Create: `src/components/SkillGroup.astro`
- Create: `src/components/ProjectCard.astro`
- Create: `src/components/NoteCard.astro`
- Create: `src/components/ContactLinks.astro`
- Create: `public/profile-visual.png`

**Interfaces:**
- Consumes: `profile` from `src/data/profile.ts`.
- Consumes: project objects from `src/data/projects.ts`.
- Consumes: note collection entries with `slug`, `data.title`, `data.date`, `data.excerpt`, and `data.tags`.
- Produces: Reusable components consumed by pages in Task 4.

- [ ] **Step 1: Generate the bitmap hero visual**

Use the image generation skill with this prompt:

```text
A polished editorial-style bitmap illustration for a personal developer portfolio hero image. Show a calm modern desk setup with a laptop, small notebook, code-inspired interface shapes on the screen, soft natural light, professional but warm mood, clean composition, no readable text, no logos, light background, subtle teal and green accents.
```

Save the generated image as `public/profile-visual.png`.

Expected: The file exists at `public/profile-visual.png` and can be referenced from Astro as `/profile-visual.png`.

- [ ] **Step 2: Create the shared layout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
interface Props {
  title?: string;
  description?: string;
}

const {
  title = "Alex Chen - Personal Portfolio",
  description = "A sample personal portfolio and notes site built with Astro."
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">Alex Chen</a>
      <nav class="nav" aria-label="Primary navigation">
        <a href="/#about">About</a>
        <a href="/#projects">Projects</a>
        <a href="/#notes">Notes</a>
        <a href="/#contact">Contact</a>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer class="site-footer">
      <p>Built with Astro. Sample content ready to customize.</p>
    </footer>
  </body>
</html>

<style is:global>
  :root {
    color-scheme: light;
    --bg: #f7faf8;
    --surface: #ffffff;
    --surface-soft: #edf7f1;
    --text: #17211c;
    --muted: #5e6f66;
    --border: #d9e6df;
    --accent: #137c68;
    --accent-strong: #0d5f52;
    --accent-warm: #c96d3b;
    --shadow: 0 18px 45px rgba(23, 33, 28, 0.08);
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-width: 320px;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  img {
    display: block;
    max-width: 100%;
  }

  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 18px clamp(20px, 5vw, 72px);
    border-bottom: 1px solid rgba(217, 230, 223, 0.78);
    background: rgba(247, 250, 248, 0.92);
    backdrop-filter: blur(16px);
  }

  .brand {
    font-weight: 750;
    letter-spacing: 0;
  }

  .nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 14px;
    color: var(--muted);
    font-size: 0.95rem;
  }

  .nav a:hover {
    color: var(--accent);
  }

  main {
    overflow: hidden;
  }

  .site-footer {
    padding: 32px clamp(20px, 5vw, 72px);
    border-top: 1px solid var(--border);
    color: var(--muted);
    text-align: center;
  }

  .container {
    width: min(1120px, calc(100% - 40px));
    margin: 0 auto;
  }

  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
    box-shadow: 0 10px 24px rgba(23, 33, 28, 0.05);
  }

  .button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: #ffffff;
  }

  .button:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }

  @media (max-width: 680px) {
    .site-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .nav {
      justify-content: flex-start;
    }
  }
</style>
```

- [ ] **Step 3: Create section and content components**

Create `src/components/Section.astro`:

```astro
---
interface Props {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
}

const { id, eyebrow, title, intro } = Astro.props;
---

<section class="section" id={id}>
  <div class="container">
    <div class="section-heading">
      {eyebrow && <p class="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {intro && <p class="section-intro">{intro}</p>}
    </div>
    <slot />
  </div>
</section>

<style>
  .section {
    padding: 78px 0;
  }

  .section-heading {
    max-width: 720px;
    margin-bottom: 32px;
  }

  .eyebrow {
    margin: 0 0 10px;
    color: var(--accent);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 3.1rem);
    line-height: 1.08;
  }

  .section-intro {
    margin: 14px 0 0;
    color: var(--muted);
    font-size: 1.05rem;
  }
</style>
```

Create `src/components/Hero.astro`:

```astro
---
import { profile } from "../data/profile";
---

<section class="hero">
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Personal portfolio</p>
      <h1>{profile.name}</h1>
      <p class="role">{profile.role}</p>
      <p class="tagline">{profile.tagline}</p>
      <div class="button-row">
        <a class="button primary" href="#projects">View projects</a>
        {profile.links.map((link) => (
          <a class="button" href={link.href}>{link.label}</a>
        ))}
      </div>
    </div>
    <div class="hero-visual" aria-label="Developer workspace illustration">
      <img src="/profile-visual.png" alt="Modern developer workspace illustration" />
    </div>
  </div>
</section>

<style>
  .hero {
    padding: 72px 0 64px;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.04fr) minmax(320px, 0.82fr);
    align-items: center;
    gap: clamp(32px, 6vw, 72px);
  }

  .eyebrow {
    margin: 0 0 14px;
    color: var(--accent);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(3.4rem, 8vw, 6.5rem);
    line-height: 0.95;
  }

  .role {
    margin: 18px 0 0;
    color: var(--accent-warm);
    font-size: 1.25rem;
    font-weight: 800;
  }

  .tagline {
    max-width: 660px;
    margin: 18px 0 28px;
    color: var(--muted);
    font-size: clamp(1.1rem, 2vw, 1.45rem);
  }

  .hero-visual {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .hero-visual img {
    aspect-ratio: 4 / 3;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 860px) {
    .hero-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

Create `src/components/SkillGroup.astro`:

```astro
---
interface Props {
  title: string;
  skills: readonly string[];
}

const { title, skills } = Astro.props;
---

<article class="skill-group">
  <h3>{title}</h3>
  <div class="skills">
    {skills.map((skill) => <span>{skill}</span>)}
  </div>
</article>

<style>
  .skill-group {
    padding: 22px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
  }

  h3 {
    margin: 0 0 14px;
    font-size: 1.05rem;
  }

  .skills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  span {
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--surface-soft);
    color: var(--accent-strong);
    font-size: 0.9rem;
    font-weight: 700;
  }
</style>
```

Create `src/components/ProjectCard.astro`:

```astro
---
interface Props {
  project: {
    title: string;
    summary: string;
    stack: readonly string[];
    highlights: readonly string[];
    githubUrl: string;
    demoUrl: string;
  };
}

const { project } = Astro.props;
---

<article class="project-card">
  <div>
    <h3>{project.title}</h3>
    <p>{project.summary}</p>
  </div>
  <ul class="highlights">
    {project.highlights.map((highlight) => <li>{highlight}</li>)}
  </ul>
  <div class="stack">
    {project.stack.map((item) => <span>{item}</span>)}
  </div>
  <div class="project-links">
    <a href={project.githubUrl}>GitHub</a>
    <a href={project.demoUrl}>Demo</a>
  </div>
</article>

<style>
  .project-card {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    justify-content: space-between;
    gap: 18px;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: 0 12px 30px rgba(23, 33, 28, 0.05);
    transition:
      border-color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .project-card:hover {
    border-color: rgba(19, 124, 104, 0.48);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  h3 {
    margin: 0 0 10px;
    font-size: 1.35rem;
  }

  p {
    margin: 0;
    color: var(--muted);
  }

  .highlights {
    margin: 0;
    padding-left: 20px;
    color: var(--text);
  }

  .stack {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stack span {
    padding: 5px 9px;
    border-radius: 999px;
    background: var(--surface-soft);
    color: var(--accent-strong);
    font-size: 0.84rem;
    font-weight: 700;
  }

  .project-links {
    display: flex;
    gap: 14px;
    color: var(--accent);
    font-weight: 800;
  }
</style>
```

Create `src/components/NoteCard.astro`:

```astro
---
interface Props {
  href: string;
  title: string;
  excerpt: string;
  date: Date;
  tags: readonly string[];
}

const { href, title, excerpt, date, tags } = Astro.props;
const formattedDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric"
}).format(date);
---

<article class="note-card">
  <a href={href}>
    <time datetime={date.toISOString()}>{formattedDate}</time>
    <h3>{title}</h3>
    <p>{excerpt}</p>
    <div class="tags">
      {tags.map((tag) => <span>{tag}</span>)}
    </div>
  </a>
</article>

<style>
  .note-card a {
    display: block;
    height: 100%;
    padding: 22px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    transition:
      border-color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .note-card a:hover {
    border-color: rgba(19, 124, 104, 0.48);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  time {
    color: var(--accent);
    font-size: 0.85rem;
    font-weight: 800;
  }

  h3 {
    margin: 10px 0;
    font-size: 1.2rem;
  }

  p {
    margin: 0;
    color: var(--muted);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }

  .tags span {
    color: var(--accent-strong);
    font-size: 0.82rem;
    font-weight: 800;
  }
</style>
```

Create `src/components/ContactLinks.astro`:

```astro
---
interface Props {
  links: readonly {
    label: string;
    href: string;
  }[];
}

const { links } = Astro.props;
---

<div class="contact-links">
  {links.map((link, index) => (
    <a class={index === 0 ? "button primary" : "button"} href={link.href}>{link.label}</a>
  ))}
</div>

<style>
  .contact-links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
</style>
```

- [ ] **Step 4: Run Astro check**

Run:

```bash
npm run build
```

Expected: The build may still fail because pages are not created yet. There should be no syntax errors in the components.

- [ ] **Step 5: Commit components**

Run:

```bash
git add src/layouts src/components public/profile-visual.png
git commit -m "feat: add portfolio layout components"
```

Expected: Commit succeeds.

---

### Task 4: Home Page And Note Detail Pages

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/notes/[slug].astro`

**Interfaces:**
- Consumes: Components from Task 3.
- Consumes: `profile` and `projects` data from Task 2.
- Consumes: `notes` content collection from Task 2.
- Produces: Homepage at `/`.
- Produces: Note pages at `/notes/<slug>/`.

- [ ] **Step 1: Create the homepage**

Create `src/pages/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Hero from "../components/Hero.astro";
import Section from "../components/Section.astro";
import SkillGroup from "../components/SkillGroup.astro";
import ProjectCard from "../components/ProjectCard.astro";
import NoteCard from "../components/NoteCard.astro";
import ContactLinks from "../components/ContactLinks.astro";
import BaseLayout from "../layouts/BaseLayout.astro";
import { profile } from "../data/profile";
import { projects } from "../data/projects";

const notes = (await getCollection("notes"))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 3);
---

<BaseLayout>
  <Hero />

  <Section
    id="about"
    eyebrow="About"
    title="Focused on useful, well-explained software."
    intro={profile.summary}
  >
    <div class="about-grid">
      {profile.about.map((paragraph) => <p>{paragraph}</p>)}
    </div>
  </Section>

  <Section
    id="skills"
    eyebrow="Skills"
    title="A practical toolkit for building and shipping."
  >
    <div class="skills-grid">
      {profile.skillGroups.map((group) => (
        <SkillGroup title={group.title} skills={group.skills} />
      ))}
    </div>
  </Section>

  <Section
    id="projects"
    eyebrow="Projects"
    title="Selected work and experiments."
    intro="Sample portfolio cards show how real projects will be presented later."
  >
    <div class="projects-grid">
      {projects.map((project) => <ProjectCard project={project} />)}
    </div>
  </Section>

  <Section
    id="notes"
    eyebrow="Notes"
    title="Short writing from the workbench."
    intro="A small notes area keeps the site ready for process notes, project retrospectives, and learning logs."
  >
    <div class="notes-grid">
      {notes.map((note) => (
        <NoteCard
          href={`/notes/${note.slug}/`}
          title={note.data.title}
          excerpt={note.data.excerpt}
          date={note.data.date}
          tags={note.data.tags}
        />
      ))}
    </div>
  </Section>

  <Section
    id="contact"
    eyebrow="Contact"
    title="Have an idea worth exploring?"
    intro="This sample contact section is ready for real GitHub, email, and social links."
  >
    <ContactLinks links={profile.links} />
  </Section>
</BaseLayout>

<style>
  .about-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .about-grid p {
    margin: 0;
    padding: 22px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--muted);
  }

  .skills-grid,
  .projects-grid,
  .notes-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .skills-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 980px) {
    .about-grid,
    .projects-grid,
    .notes-grid {
      grid-template-columns: 1fr 1fr;
    }

    .skills-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 640px) {
    .about-grid,
    .skills-grid,
    .projects-grid,
    .notes-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 2: Create the note detail route**

Create `src/pages/notes/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";

export async function getStaticPaths() {
  const notes = await getCollection("notes");

  return notes.map((note) => ({
    params: { slug: note.slug },
    props: { note }
  }));
}

const { note } = Astro.props;
const { Content } = await render(note);
const formattedDate = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric"
}).format(note.data.date);
---

<BaseLayout title={`${note.data.title} - Alex Chen`} description={note.data.excerpt}>
  <article class="note-page container">
    <a class="back-link" href="/#notes">Back to notes</a>
    <header>
      <p class="eyebrow">Note</p>
      <h1>{note.data.title}</h1>
      <time datetime={note.data.date.toISOString()}>{formattedDate}</time>
      <p>{note.data.excerpt}</p>
    </header>
    <div class="content">
      <Content />
    </div>
  </article>
</BaseLayout>

<style>
  .note-page {
    padding: 72px 0 96px;
  }

  .back-link {
    color: var(--accent);
    font-weight: 800;
  }

  header {
    max-width: 760px;
    margin-top: 42px;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: var(--accent);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 16px;
    font-size: clamp(2.4rem, 6vw, 4.6rem);
    line-height: 1;
  }

  time {
    color: var(--accent-warm);
    font-weight: 800;
  }

  header p {
    margin: 18px 0 0;
    color: var(--muted);
    font-size: 1.15rem;
  }

  .content {
    max-width: 720px;
    margin-top: 42px;
    padding-top: 30px;
    border-top: 1px solid var(--border);
    font-size: 1.08rem;
  }

  .content :global(p) {
    margin: 0 0 20px;
  }
</style>
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: `astro check` and `astro build` pass, and `dist/` is generated.

- [ ] **Step 4: Commit pages**

Run:

```bash
git add src/pages
git commit -m "feat: add homepage and notes pages"
```

Expected: Commit succeeds.

---

### Task 5: Local Preview And Responsive Verification

**Files:**
- Modify only if verification finds a layout defect: files from Tasks 3 and 4.

**Interfaces:**
- Consumes: Complete static site from Tasks 1 through 4.
- Produces: Verified local preview URL and responsive layout adjustments if needed.

- [ ] **Step 1: Start the local development server**

Run:

```bash
npm run dev
```

Expected: Astro starts a local dev server, usually at `http://localhost:4321/`.

- [ ] **Step 2: Inspect desktop layout**

Open:

```text
http://localhost:4321/
```

Expected:
- Header remains readable.
- Hero image renders from `/profile-visual.png`.
- Hero text and buttons do not overlap.
- Projects and notes render as cards.
- Section spacing feels balanced.

- [ ] **Step 3: Inspect mobile layout**

Open the same URL at a narrow viewport around 390px wide.

Expected:
- Navigation wraps cleanly.
- Hero grid stacks into one column.
- Cards stack into one column.
- Button labels remain inside their buttons.
- No text overlaps adjacent content.

- [ ] **Step 4: Inspect note pages**

Open:

```text
http://localhost:4321/notes/building-a-personal-site/
```

Expected:
- The page renders title, date, excerpt, and Markdown body.
- The back link returns to the notes section on the homepage.

- [ ] **Step 5: Stop the dev server and run final build**

Run:

```bash
npm run build
```

Expected: The build passes.

- [ ] **Step 6: Commit verification fixes**

If files changed during verification, run:

```bash
git add src public
git commit -m "fix: polish responsive portfolio layout"
```

Expected: Commit succeeds if changes were made. If no changes were made, leave the working tree clean.

---

### Task 6: README And Launch Notes

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Finished Astro site and GitHub Pages workflow.
- Produces: Project usage and customization guide.

- [ ] **Step 1: Create README**

Create `README.md`:

````md
# Personal Portfolio Blog

A sample personal introduction and portfolio site built with Astro for GitHub Pages.

## Features

- Personal introduction homepage
- Skills grouped by category
- Project portfolio cards
- Markdown notes/blog section
- GitHub Pages deployment workflow
- Sample content ready to replace

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Customize Content

- Edit profile details in `src/data/profile.ts`.
- Edit portfolio projects in `src/data/projects.ts`.
- Add notes in `src/content/notes/`.
- Replace the hero visual at `public/profile-visual.png`.

## Deploy

Push to `main` after enabling GitHub Pages with GitHub Actions as the source in the repository settings.
````

- [ ] **Step 2: Run final build**

Run:

```bash
npm run build
```

Expected: Build passes.

- [ ] **Step 3: Commit README**

Run:

```bash
git add README.md
git commit -m "docs: add portfolio site readme"
```

Expected: Commit succeeds.

---

## Self-Review

- Spec coverage: The plan covers Astro setup, sample content, profile sections, project cards, Markdown notes, note detail pages, GitHub Pages deployment, build verification, responsive preview, and README documentation.
- Scope check: The plan excludes CMS integration, search, dark mode, analytics, comments, and complex animation as required.
- Type consistency: `profile`, `projects`, and notes collection fields match the consuming components and pages.
