# AGENTS.md

本文件仅适用于 `packages/onebot`（`@xopenbot/onebot`）。

## 包的职责

- 提供 OneBot 12 协议的 TypeScript 类型契约：动作、事件、消息段、返回码、`Bot`
  接口等。
- 不实现连接、动作收发或事件分发；这些由使用方（如 `@xopenbot/sandbox`、
  `@xopenbot/plugin`）负责。
- 运行时只导出 `toCQCode`、`fromCQCode`、`isExtendedEvent`、
  `isExtendedSegment`，其余均应保持为纯类型。
- 不要引入运行时依赖，保持无副作用、可被实现端和应用端共用。

## 目录结构

```
src/
├── index.ts          # 包入口
├── bot.ts            # 应用端 Bot 接口
├── action-map.ts     # 31 个标准动作的 ActionMap
├── event.ts          # 事件联合类型、ExtendedEvent、isExtendedEvent
├── rules.ts          # Extensible
├── connect/          # OneBot Connect 基础类型
├── meta/             # 元动作与元事件
├── message/          # 消息、消息段、isExtendedSegment
├── user/             # 用户动作、私聊消息、用户通知
├── group/            # 群动作、群消息、群通知
├── guild/            # 群组/频道动作、消息、通知
├── file/             # 文件动作
└── common/           # 通知子类型、CQ 码互转
```

## 修改指引
- `Bot` 的方法使用位置参数，最后一个可选参数为 `options`；标准成员保持可选，
  不要随意改成必选。
- `ExtendedEvent` / `ExtendedSegment` 带有私有 `unique symbol` 品牌字段，用于和
  标准类型区分；构造时使用类型断言，不要移除该品牌。
- 注释和文档使用中文，保持与现有源码一致。

## 文档同步

`README.md` 是本包对外的使用说明。修改公开 API（导出、动作、事件、消息段、
`Bot` 方法、运行时函数）时，同步更新 README 中的示例与说明。
