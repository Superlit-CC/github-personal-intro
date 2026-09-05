export const projects = [
  {
    title: "MCPNET",
    summary:
      "基于 Python 与 PyTorch 的分子点云建模项目，涵盖特征生成、模型训练、评估与可视化。",
    stack: ["Python", "PyTorch", "RDKit", "Molecular point clouds"],
    highlights: [
      "使用 PyTorch 实现端到端 MCPNET 工作流程",
      "支持分子点云特征生成、训练与评估",
      "提供识别和渲染重要点的可视化工具"
    ],
    githubUrl: "https://github.com/Superlit-CC/MCPNET"
  }
] as const;
