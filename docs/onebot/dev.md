---
outline: deep
---

# 开发与构建

## 目录结构

```text
packages/onebot
├── src
│   ├── index.ts            # 包入口，导出 Bot 与全部类型
│   ├── bot.ts              # 应用端 Bot 接口类型
│   ├── action-map.ts       # ActionMap 与标准动作请求/响应
│   ├── event.ts            # 事件联合类型与扩展事件
│   ├── rules.ts            # 扩展字段规则
│   ├── connect             # OneBot Connect 基础类型
│   ├── meta                # 元动作与元事件
│   ├── message             # 消息类型、消息段与消息动作
│   ├── user                # 用户信息、私聊消息与用户通知事件
│   ├── group               # 群信息、群消息与群通知事件
│   ├── guild               # 群组/频道信息、消息与通知事件
│   ├── file                # 文件动作
│   └── common              # 跨分类公共类型与运行时工具
├── dist                    # rollup 构建产物
├── rollup.config.js
├── tsconfig.json
└── package.json
```

## 构建与检查

`package.json` 的 `module` / `types` 与 `exports` 均指向 `dist`，发布前需要通过
rollup 构建：

```bash
pnpm --filter @xopenbot/onebot build
```

类型检查与代码检查在仓库根目录执行：

```bash
pnpm check
pnpm lint
```

根 `tsconfig.json` 的 project references 已包含 `packages/onebot`，`pnpm check`
会一并检查本包。

## 相关链接

- [OneBot 12 标准](https://github.com/botuniverse/onebot)
- [包 README](https://github.com/forfindo/xopenbot/tree/main/packages/onebot)
