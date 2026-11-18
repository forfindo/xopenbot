# @xopenbot/onebot

OneBot 12 协议的 **TypeScript 类型契约**，依据
[OneBot 接口定义](https://github.com/botuniverse/onebot/tree/master/specs/interface)
编写。

包内绝大多数导出都是类型：`Bot` 接口、31 个标准动作的 `ActionMap`、事件、消息段、
返回码等。运行时只额外导出 CQ 码互转函数和两个类型守卫。

> 类型请使用 `import type` 导入；运行时函数使用普通 `import`。

## 安装

```bash
pnpm add @xopenbot/onebot
```

## 快速开始

```ts
import type { AnyMessageSegment, GroupMessageEvent, Message } from '@xopenbot/onebot';

const message: Message = [
  { type: 'text', data: { text: '你好' } },
  { type: 'mention', data: { user_id: '10000' } }
] satisfies AnyMessageSegment[];

function handle(event: GroupMessageEvent): void {
  event.group_id;
  event.user_id;
  event.alt_message;
}
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

### 运行时导出

| 名称 | 说明 |
| --- | --- |
| `toCQCode` | 消息段转 CQ 码 |
| `fromCQCode` | CQ 码转消息段数组 |
| `isExtendedSegment` | 判断扩展消息段 |
| `isExtendedEvent` | 判断扩展事件 |

## 包边界

- 只提供类型契约与少量运行时工具，不实现连接、动作收发或事件分发。
- 连接与实现端逻辑由使用方负责，例如 `@xopenbot/sandbox`、`@xopenbot/plugin`。
- 不引入运行时依赖，保持无副作用，可被实现端和应用端共用。

## 文档

完整 API 文档见 [`docs/onebot`](https://github.com/forfindo/xopenbot/blob/main/docs/onebot/index.md)，
包括 `Bot` 接口、`BotImpl` 依赖推导、全部动作、事件、消息段、返回码与扩展方式。

## 开发

```bash
pnpm --filter @xopenbot/onebot build
pnpm check
pnpm lint
```
