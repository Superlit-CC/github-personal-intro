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
