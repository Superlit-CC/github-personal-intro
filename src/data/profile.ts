export const profile = {
  name: "Superlit",
  role: "Agent 开发工程师",
  tagline:
    "一名技术开发人员，从事 Agent 开发，关注 Agent 与 AI。",
  summary:
    "Superlit 的个人博客，记录 Agent 开发与 AI 探索，分享技术实践、项目复盘和学习笔记。",
  about: [
    "我是 Superlit，目前在国内某大厂从事技术开发，主要负责 Agent 开发相关工作。此前曾在百度工作，也曾在华为实习。",
    "这个博客用来记录我在 Agent 与 AI 方向的学习、思考和技术实践，也分享项目中的经验与复盘。希望这些记录能帮助自己整理思路，也为遇到相似问题的人提供参考。"
  ],
  focus: "目前主要关注 Agent 与 AI，围绕 Agent 的设计、开发与实际应用持续学习和探索。",
  experiences: [
    { company: "国内某大厂", description: "目前 · 技术开发，从事 Agent 开发相关工作" },
    { company: "百度", description: "曾任职" },
    { company: "华为", description: "实习经历" }
  ],
  links: [
    { label: "GitHub", href: "https://github.com/Superlit-CC" },
    { label: "Email", href: "mailto:2762183147@qq.com" }
  ],
  skillGroups: [
    {
      title: "Useful Web Tools",
      skills: ["Web apps", "Productivity tools", "Workflow automation", "Product prototyping"]
    },
    {
      title: "Full-stack Development",
      skills: ["Frontend engineering", "Backend APIs", "Data-driven systems", "Deployment"]
    },
    {
      title: "AI and Algorithms",
      skills: ["AI applications", "Algorithm engineering", "Model workflows", "Technical research"]
    }
  ]
} as const;
