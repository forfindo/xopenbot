---
outline: deep
---

# 开发与构建

## 目录结构

```text
packages/plugin
├── src
│   ├── index.ts             # 包入口，统一导出
│   ├── plugin.ts            # definePlugin 辅助函数
│   ├── workspace.ts         # 插件工作区、命令注册与分发
│   ├── command
│   │   ├── command.ts       # defineCommand 构建器与 pattern 校验
│   │   └── matcher.ts       # pattern 匹配与输入解析
│   ├── types
│   │   ├── matcher.ts       # 匹配结果与 pattern 结构类型
│   │   ├── message-part.ts  # 消息段类型 Part
│   │   └── workspace.ts     # Manifest、插件、命令、定时任务等类型定义
│   └── utils
│       ├── event.ts         # 事件名层级拆分
│       ├── object.ts        # 深层次对象合并、递归冻结
│       └── type-guard.ts    # 类型守卫
├── package.json
├── rollup.config.js         # 构建配置（输出 dist）
└── tsconfig.json
```

## 构建与检查

```bash
# 构建（rollup，输出到 dist）
pnpm --filter @xopenbot/plugin build

# 类型检查（仓库根目录）
pnpm check

# 代码检查（仓库根目录）
pnpm lint
```

## 相关链接

- [包 README](https://github.com/forfindo/xopenbot/tree/main/packages/plugin)
