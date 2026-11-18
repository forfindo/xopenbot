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

## 文档分工

- `docs/<package>/` 是公开 API 文档的**单一事实来源**，包含完整导出、签名、参数与
  返回值、边界条件、错误行为、安全说明和跨包集成示例。
- 各包 `README.md` 只保留：包定位、安装、最小可运行示例、核心能力速查、包边界、
  完整文档链接、构建与检查命令。
- 不要在 README 中维护完整 API 表格、长篇幅实现原理或与 docs 重复的教程。
- 修改公开 API（导出、类型、方法、配置项、运行时行为）时，先更新对应的 docs 页面；
  README 仅同步受影响的入口示例和文档链接。
