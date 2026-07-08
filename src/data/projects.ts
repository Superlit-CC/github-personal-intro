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
