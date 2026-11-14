# AGENTS.md

## 首要规则

- 回答任何代码层面的问题，先查看相关源码再回答；**所有结论都需要有实际代码支撑**。

## 仓库概览

pnpm workspace 单仓库，使用 TypeScript + ESM。工作区包位于 `packages/`：

| 包 | 说明 |
| --- | --- |
| `@openbot/openchat` | AI Agent 运行时，包含 session、provider、tool、MCP、数据库等模块 |
| `@xopenbot/plugin` | 插件系统与插件上下文类型，依赖 `@xopenbot/onebot` |
| `@xopenbot/sandbox` | 沙盒进程与宿主通信桥接，依赖 `@xopenbot/onebot` |
| `@xopenbot/onebot` | OneBot 12 协议类型契约，另有 CQ 码互转与类型守卫 |
| `@xopenbot/bot` | 占位包，`src/index.ts` 目前为空 |
