---
outline: deep
---

# @xopenbot/onebot

`@xopenbot/onebot` 提供 OneBot 12 协议的 **TypeScript 类型契约**，依据
[OneBot 接口定义](https://github.com/botuniverse/onebot/tree/master/specs/interface) 编写。

包内绝大多数导出都是类型：

- `Bot` / `BotImpl` / `BotAPIOptions`：应用端机器人接口、实现约束与依赖选项；
- 全部标准动作的参数与响应类型（`ActionMap`）；
- 元事件、消息事件、通知事件、请求事件及扩展事件；
- 10 种标准消息段与扩展消息段；
- 动作请求、动作响应、返回码等公共类型。

运行时只额外导出 CQ 码互转函数与两个类型守卫：

- `toCQCode` / `fromCQCode`
- `isExtendedSegment` / `isExtendedEvent`

> 类型请使用 `import type` 导入；运行时函数使用普通 `import`。

## 文档导航

| 页面 | 内容 |
| --- | --- |
| [Bot 接口](/onebot/guide/bot) | `Bot` / `BotImpl` / `BotAPIOptions` 与 31 个标准动作 |
| [动作与 ActionMap](/onebot/guide/action) | 动作名、请求/响应类型与自定义动作扩展 |
| [消息与消息段](/onebot/guide/message) | `Message`、10 种标准消息段与类型守卫 |
| [事件](/onebot/guide/event) | 消息/通知/请求/元事件与扩展事件 |
| [导出总览](/onebot/reference/exports) | 运行时导出与全部类型导出清单 |
| [返回码与扩展字段](/onebot/reference/retcode) | `RetCode`、`RetCodeMap` 与 `Extensible` |
| [开发与构建](/onebot/dev) | 目录结构、构建与检查命令 |

## 安装

```bash
pnpm add @xopenbot/onebot
```

## 快速开始

```ts
import type {
  ActionMap,
  AnyMessageSegment,
  GroupMessageEvent,
  OneBotEvent
} from '@xopenbot/onebot';
```

### CQ 码互转

```ts
import { fromCQCode, toCQCode } from '@xopenbot/onebot';

const code = toCQCode([
  { type: 'text', data: { text: '你好' } },
  { type: 'mention', data: { user_id: '10000' } }
]);
// [CQ:text,text=你好][CQ:mention,user_id=10000]

const segments = fromCQCode(code);
```

CQ 码中的 `&`、`[`、`]`、`,`、`#` 会被转义；解析时还原为消息段，普通文本会转换为
`text` 消息段。
