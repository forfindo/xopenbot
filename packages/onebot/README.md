# OneBot 12 类型定义

`@xopenbot/onebot` 提供 OneBot 12 接口的 **TypeScript 类型定义**，依据
[OneBot 接口定义](https://github.com/botuniverse/onebot/tree/master/specs/interface)
编写。包内绝大多数导出都是类型：

- `Bot`：应用端机器人接口类型，声明协议规定的全部标准动作方法，并通过索引签名
  兼容扩展动作；
- 全部标准动作的参数与响应类型（`ActionMap`）；
- 元事件、消息事件、通知事件、请求事件及扩展事件的类型；
- 10 种标准消息段与扩展消息段；
- 动作请求、动作响应、返回码等公共类型。

运行时另外导出 CQ 码互转函数和两个类型守卫：`toCQCode`、`fromCQCode`、
`isExtendedSegment`、`isExtendedEvent`，其余内容均需以类型方式引入。OneBot
实现端和应用端都可以直接引用这些类型。

> 类型请使用 `import type` 导入；运行时函数使用普通 `import`。

## 使用

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

### 消息

```ts
import type { AnyMessageSegment, Message } from '@xopenbot/onebot';

// 事件和动作响应中使用消息段数组
const message: AnyMessageSegment[] = [
  { type: 'text', data: { text: '你好' } },
  { type: 'mention', data: { user_id: '10000' } },
  { type: 'image', data: { file_id: 'file-1' } }
];

// 动作请求参数可以使用字符串、单个消息段或消息段数组
const content: Message = '你好';
```

标准消息段：`text`、`mention`、`mention_all`、`image`、`voice`、`audio`、
`video`、`file`、`location`、`reply`。

`Message` 可以是纯文本 `string`、单个消息段，或消息段数组；消息事件中的
`message` 字段固定为 `AnyMessageSegment[]`。

`AnyMessageSegment` 是 `StandardSegment | ExtendedSegment` 的联合类型。运行时
可以用 `isExtendedSegment` 判断并收窄：

```ts
import type { AnyMessageSegment } from '@xopenbot/onebot';
import { isExtendedSegment } from '@xopenbot/onebot';

function handle(segment: AnyMessageSegment): void {
  if (isExtendedSegment(segment)) {
    segment.type; // string
    segment.data; // 扩展消息段数据
  }
}
```

### 动作

```ts
import type {
  ActionMap,
  ActionRequest,
  ActionResponse,
  SendGroupMessageParams,
  SendMessageResult
} from '@xopenbot/onebot';

const params: SendGroupMessageParams = {
  detail_type: 'group',
  group_id: '123456',
  message: '你好'
};

// 参数与响应通过 ActionMap 关联
type Result = ActionMap['send_message']['result'];
// SendMessageResult

// 通用动作请求 / 响应
declare const request: ActionRequest<SendGroupMessageParams>;
declare const response: ActionResponse<SendMessageResult>;

// 带动作名约束的版本
import type { StandardActionRequest, StandardActionResponse } from '@xopenbot/onebot';

declare const sendRequest: StandardActionRequest<'send_message'>;
declare const sendResponse: StandardActionResponse<'send_message'>;
```

动作名称：

```ts
import type { ActionName, MetaActionName, PlatformActionName } from '@xopenbot/onebot';

type All = ActionName; // 全部 31 个标准动作
type Meta = MetaActionName; // get_latest_events | get_supported_actions | get_status | get_version
type Platform = PlatformActionName; // 除元动作外的标准动作
```

### Bot 接口

`Bot` 是应用端机器人的接口类型，声明了协议规定的全部 31 个标准动作。方法名是动作名
的小驼峰形式，参数按动作参数顺序展开，最后一个可选参数 `options` 用于携带扩展参数；
返回值即动作响应中的 `data`，可以是同步值或 `Promise`（`MaybePromise<T>`）。

标准动作、`on` / `off` 都声明为**可选成员**，直接调用时需要使用可选链，或用
`BotImpl` 声明必须实现的成员：

```ts
import type { Bot, BotImpl } from '@xopenbot/onebot';

declare const bot: Bot;

const info = await bot.getSelfInfo?.(); // get_self_info
const result = await bot.sendMessage?.('group', '你好'); // send_message

// BotImpl 把指定成员变为必选
declare const impl: BotImpl<'sendMessage' | 'getSelfInfo'>;
await impl.sendMessage('group', '你好');
await impl.getSelfInfo();
```

`Bot` 由标准动作与扩展动作两部分交叉而成：

```ts
/** 拓展动作 */
interface ExtendedAction {
  [name: string]: (...args: unknown[]) => MaybePromise<unknown>;
}

/** 标准动作与事件回调 */
interface StandardBot {
  selfInfo?: UserInfo;
  logger?: {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  on?(name: 'message', listener: (e: MessageEvent | ExtendedEvent<'message'>) => void): void;
  off?(name: 'message', listener: (e: MessageEvent | ExtendedEvent<'message'>) => void): void;
  // ... request / notice / meta 重载

  getLatestEvents(
    limit?: number,
    timeout?: number,
    options?: Record<string, unknown>
  ): MaybePromise<OneBotEvent[]>;
  // ... 其余标准动作
}

export type Bot = StandardBot & ExtendedAction;
```

需要留意的几点：

- 已声明的标准方法保留精确的参数与返回类型；
- `on` / `off` 目前声明了 `message`、`request`、`notice`、`meta` 四组重载；其中
  `notice` 重载的监听器参数在源码中写作 `RequestEvent | ExtendedEvent<'notice'>`；
- 由于 `Bot` 包含字符串索引签名，`class ... implements Bot` 需要类自身也声明
  兼容的索引签名。实现端通常先定义自己的类或对象，在作为 `Bot` 使用时再断言类型；
- 另导出 `StandardAPI = Exclude<keyof StandardBot, 'on'>`，表示标准成员键名的联合
  类型（注意它只排除了 `on`，仍包含 `off`、`selfInfo` 和 `logger`）。

建立连接、发送动作请求等具体逻辑由使用者实现。

### 事件

事件使用 `type` 和 `detail_type` 作为判别字段。`NonMetaEvent` 是标准事件（不含
元事件和宽泛的 `ExtendedEvent`）的联合类型，可以直接收窄：

```ts
import type { NonMetaEvent } from '@xopenbot/onebot';

function handle(event: NonMetaEvent): void {
  if (event.type === 'message' && event.detail_type === 'group') {
    event.group_id; // string
    event.user_id; // string
    event.alt_message; // string
  }

  if (event.type === 'notice' && event.detail_type === 'friend_increase') {
    event.user_id; // string
  }
}
```

`OneBotEvent` 还包含宽泛的 `ExtendedEvent`，直接收窄后未知字段的类型是
`unknown`。需要精确类型时可以写类型守卫：

```ts
import type { GroupMessageEvent, OneBotEvent } from '@xopenbot/onebot';

function isGroupMessage(event: OneBotEvent): event is GroupMessageEvent {
  return event.type === 'message' && event.detail_type === 'group';
}

function handle(event: OneBotEvent): void {
  if (isGroupMessage(event)) {
    event.group_id; // string
    event.alt_message; // string
  }
}
```

需要判断事件是否为扩展事件时，可以使用 `isExtendedEvent`：

```ts
import type { OneBotEvent } from '@xopenbot/onebot';
import { isExtendedEvent } from '@xopenbot/onebot';

function handle(event: OneBotEvent): void {
  if (isExtendedEvent(event)) {
    event.type; // 非标准事件类型
    event.detail_type; // string
    event['qq.raw_event_id']; // unknown
  }
}
```

`isExtendedEvent` 会排除全部标准事件（元事件、标准消息事件、标准通知事件），但
`type` 为 `request` 的事件始终返回 `false`。

标准事件：

- `meta.connect`、`meta.heartbeat`、`meta.status_update`
- `message.private`、`message.group`、`message.channel`
- `notice.friend_increase`、`notice.friend_decrease`、
  `notice.private_message_delete`、`notice.group_member_increase`、
  `notice.group_member_decrease`、`notice.group_message_delete`、
  `notice.guild_member_increase`、`notice.guild_member_decrease`、
  `notice.channel_member_increase`、`notice.channel_member_decrease`、
  `notice.channel_message_delete`、`notice.channel_create`、`notice.channel_delete`
- 请求事件与扩展事件可通过扩展字段携带数据

### 返回码

返回码以类型映射的形式提供，不包含运行时常量：

```ts
import type { RetCode, RetCodeMap } from '@xopenbot/onebot';

const success: RetCode = 0;
const platformError: RetCode = 34_000;
type PlatformError = RetCodeMap['PlatformError']; // 34000
```

## 目录结构

```
packages/onebot
├── src
│   ├── index.ts            # 包入口，导出 Bot 与全部类型
│   ├── bot.ts              # 应用端 Bot 接口类型
│   ├── action-map.ts       # ActionMap 与标准动作请求/响应
│   ├── event.ts            # 事件联合类型与扩展事件
│   ├── rules.ts            # 扩展字段规则
│   ├── connect             # OneBot Connect 基础类型
│   │   ├── action.ts       # 动作定义、动作请求与响应
│   │   ├── event.ts        # 事件基本类型与公共字段
│   │   ├── retcode.ts      # 返回码类型映射
│   │   ├── self.ts         # 机器人自身标识
│   │   ├── status.ts       # 版本信息与运行状态
│   │   └── utility.ts      # 通用工具类型
│   ├── meta                # 元动作与元事件
│   │   ├── actions.ts
│   │   └── events.ts
│   ├── message             # 消息类型、消息段与消息动作
│   │   ├── actions.ts
│   │   ├── segments.ts
│   │   └── type.ts
│   ├── user                # 用户信息、私聊消息与用户通知事件
│   │   ├── actions.ts
│   │   ├── message-events.ts
│   │   └── notice-events.ts
│   ├── group               # 群信息、群消息与群通知事件
│   │   ├── actions.ts
│   │   ├── message-events.ts
│   │   └── notice-events.ts
│   ├── guild               # 群组/频道信息、消息与通知事件
│   │   ├── actions.ts
│   │   ├── message-events.ts
│   │   └── notice-events.ts
│   ├── file                # 文件动作
│   │   └── actions.ts
│   └── common              # 跨分类公共类型与运行时工具
│       ├── notice.ts       # 通知事件子类型
│       └── utils.ts        # CQ 码互转（唯一的运行时实现）
├── dist                    # rollup 构建产物
├── rollup.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## 构建与类型检查

`package.json` 的 `module` / `types` 与 `exports` 均指向 `dist`，发布前需要通过
rollup 构建：

```bash
cd packages/onebot
pnpm build
```

在仓库根目录执行：

```bash
pnpm check
pnpm lint
```

根 `tsconfig.json` 的 project references 已包含 `packages/onebot`，`pnpm check`
会一并检查本包。
