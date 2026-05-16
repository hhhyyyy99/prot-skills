export default {
  extends: ["@commitlint/config-conventional"],
  // 自定义规则
  rules: {
    // 类型枚举
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新功能
        "fix", // 修复 bug
        "docs", // 文档变更
        "style", // 代码格式（不影响功能）
        "refactor", // 重构
        "perf", // 性能优化
        "test", // 增加测试
        "chore", // 构建过程或辅助工具的变动
        "revert", // 回退
        "build", // 打包
        "ci", // CI相关变更
      ],
    ],
    // 大小写不做校验
    "subject-case": [0],
  },
};
