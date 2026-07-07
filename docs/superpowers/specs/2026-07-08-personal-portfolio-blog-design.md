# Personal Portfolio Blog Design

## Goal

Build a GitHub Pages friendly personal site that combines a concise self-introduction, a professional portfolio, and a lightweight notes/blog area. The first version uses sample placeholder content throughout so the site can be launched quickly and customized later.

## Audience

The site is for visitors who want to quickly understand who the owner is, what they build, what projects they have worked on, and how to contact them. Typical visitors include GitHub profile viewers, recruiters, collaborators, and peers.

## Recommended Approach

Use Astro as a static site generator.

Astro fits this project because it produces static output for GitHub Pages, supports Markdown content naturally, keeps the homepage fast, and can stay simple without adding a heavy client-side app framework.

## Page Structure

The first version is a mostly single-page experience with a notes detail route.

### Home Page

The homepage is built from these sections:

1. Hero
   - Sample name, role, short positioning statement, and primary links.
   - Primary links include GitHub, email, and optional resume/demo links.

2. About
   - Two or three short paragraphs using sample text.
   - The copy focuses on interests, working style, and current learning direction.

3. Skills
   - Skills are grouped into categories such as Frontend, Backend, Tools, and AI/Automation.
   - Each skill is rendered as a compact tag.

4. Projects
   - Three to six sample project cards.
   - Each card includes project title, description, tech stack, highlights, GitHub link, and demo link.
   - This is the main portfolio section.

5. Notes
   - A small list of sample Markdown posts.
   - The homepage links to individual note pages.

6. Contact
   - Short closing copy and contact links.
   - Links include GitHub, email, and optional social profiles.

### Note Pages

Each note page renders Markdown content with title, date, excerpt, and body content. The first version includes sample notes so the content flow is visible from day one.

## Content Model

Use data files and Markdown content so future edits are easy.

- `src/data/profile.ts`
  - Name, role, tagline, intro text, skill groups, contact links.

- `src/data/projects.ts`
  - Project list with title, summary, stack, highlights, GitHub URL, demo URL.

- `src/content/notes/`
  - Markdown notes with frontmatter for title, date, excerpt, and tags.

## Component Structure

Use focused Astro components:

- `BaseLayout.astro`
  - Shared document structure, metadata, header, footer, and global styles.

- `Hero.astro`
  - Top introduction area and primary links.

- `Section.astro`
  - Reusable section wrapper with title and optional intro text.

- `SkillGroup.astro`
  - Renders grouped skill tags.

- `ProjectCard.astro`
  - Renders a single portfolio item.

- `NoteCard.astro`
  - Renders a note preview.

- `ContactLinks.astro`
  - Renders contact and social links.

## Visual Direction

The site should feel professional, calm, and personal.

- Light background with strong readable text.
- One restrained accent color, such as blue, teal, or green.
- Clean typography with generous spacing.
- Project cards use subtle borders and hover states.
- No heavy animation in the first version.
- Mobile layout is first-class, with sections stacking cleanly.

## Deployment

Deploy through GitHub Pages using GitHub Actions.

The workflow builds the Astro site and publishes the generated static output. After setup, pushing to `main` updates the site automatically.

## Testing And Verification

Before considering the implementation complete:

- Run the Astro build command.
- Confirm all pages build successfully.
- Start a local dev server and inspect the homepage.
- Check mobile and desktop layouts.
- Confirm note pages and internal links work.

## Out Of Scope For Version 1

- CMS integration.
- Search.
- Dark mode toggle.
- Analytics.
- Comments.
- Complex animation.
- Real personal content, unless supplied later.

These can be added after the first site is live and the structure feels right.
