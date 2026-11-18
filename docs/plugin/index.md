---
outline: deep
---

# @xopenbot/plugin

xopenbot 的插件工作区。负责插件的加载、命令注册、消息匹配与分发、定时任务调度，以及
插件卸载。

一个插件通过 `loadCommand()` 返回若干条命令；命令由 `pattern` 匹配输入，由 `execute`
产出消息内容。`Workspace` 是一个类，需要先 `new` 出一个实例；一个实例管理一组插件、
命令、定时任务与插件私有状态，并支持 `init` 向命令上下文注入 API。

推荐使用 `definePlugin()` 定义插件，并通过 `info.manifest.depsOn` 声明依赖的 Bot API；
声明后 `ctx.bot` 的类型会变成必然包含这些成员的 `BotImpl`，未声明的标准成员仍保持可选。

## 安装

```bash
pnpm add @xopenbot/plugin
```

::: tip 依赖关系
`@xopenbot/plugin` 依赖 `@xopenbot/onebot`，插件中使用的 Bot 类型、`BotAPIOptions`
等均来自后者。
:::

## 快速开始

### 1. 编写插件

插件是一个实现了 `IPlugin` 的对象，推荐用 `definePlugin()` 创建：

```ts
import { definePlugin } from '@xopenbot/plugin';

export const echoPlugin = definePlugin({
  info: {
    name: 'echo',
    version: '1.0.0',
    description: '复读机示例'
  },
  // 不要标注返回类型，交给 definePlugin 依据 manifest 推断，ctx.bot 才能收窄
  loadCommand() {
    return [
      {
        name: 'echo',
        // 匹配到的片段会被截掉，剩余部分作为 execute 的 input
        // pattern 未以 ^ 开头时会自动补上 ^（字符串与正则都适用）
        pattern: /^echo\s*/i,
        // 数字越小越先执行（全局按 priority 升序排列）
        priority: 100,
        execute(input) {
          if (!input) {
            return {
              content: [{ type: 'text', text: '用法：echo <内容>' }]
            };
          }
          return {
            content: [{ type: 'text', text: input }]
          };
        }
      }
    ];
  }
});
```

`definePlugin()` 使用 `const` 泛型原样返回传入的对象，并递归冻结 `info`（含
`manifest`），防止插件信息在运行时被修改。也可以手写
`const plugin: IPlugin<Manifest> = {...}`，但此时 `M` 固定为 `Manifest`，`ctx.bot`
不会按具体 `depsOn` 收窄，因此推荐优先使用 `definePlugin()`。

### 2. 声明依赖（manifest）

插件通过 `info.manifest.depsOn` 声明自己用到的 Bot API。`depsOn` 的取值来自
`BotAPIOptions`（定义在 `@xopenbot/onebot`）：标准动作写 `'function'`，`selfInfo` /
`logger` 写 `'field'`，扩展成员两种都可以。声明后 `ctx.bot` 上对应的成员会从可选变成
必填（仅在类型层面），并在插件注册时被检查：

```ts
import { definePlugin } from '@xopenbot/plugin';

export const noticePlugin = definePlugin({
  info: {
    name: 'notice',
    version: '1.0.0',
    description: '依赖声明示例',
    manifest: {
      depsOn: {
        selfInfo: 'field', // 标准字段，有类型补全
        tts: 'function' // 扩展动作，通过字符串索引签名放行
      }
    }
  },
  loadCommand(ctx) {
    const uid = ctx.bot.selfInfo.user_id; // 声明后不再是可选
    ctx.bot.tts();
    return [];
  }
});
```

- `depsOn` 的键来自 `StandardAPI`（即 `keyof StandardBot` 去掉 `on` / `off`），标准 API
  有补全；扩展 API 的名字通过字符串索引签名放行，因此写错名字无法在编译期发现，只会在
  注册时报错。
- 值 `'function'` / `'field'` 会参与 `BotImpl` 类型推导：声明为函数的成员可以直接调用，
  声明为字段的成员可以直接读取。标准动作只能声明为 `'function'`，`selfInfo`、`logger`
  只能声明为 `'field'`。
- 不写 `manifest` 时，`M` 会退化为 `Manifest`，`ctx.bot` 上所有标准成员都会被当作必选，
  扩展成员会被当作函数；但运行时不会做依赖检查，仍需自行保证 bot 实现了它们。需要精确
  控制类型时请显式声明 `manifest.depsOn`。
- 注册时 `Workspace` 会遍历 `depsOn`，bot 上缺少对应成员会抛出错误，该插件加载失败并
  记录到 `result.failure`，其他插件不受影响。声明依赖意味着你在类型上信任运行时 bot
  一定实现了它。
- 如果 manifest 不内联，请用 `satisfies` 而不是类型标注，否则字面量类型会被拓宽，
  `ctx.bot` 的收窄会失效：

```ts
import type { Manifest } from '@xopenbot/plugin';

// 保留字面量类型
const manifest = { depsOn: { sendGroupMessage: 'function' } } satisfies Manifest;

// 错误：拓宽成 Manifest，ctx.bot 不会收窄
const manifest: Manifest = { depsOn: { sendGroupMessage: 'function' } };
```

### 3. 注册插件

```ts
import { Workspace } from '@xopenbot/plugin';
import { echoPlugin } from './plugins/echo';

const workspace = new Workspace(bot);
const result = await workspace.registry(echoPlugin);

if (!result.ok) {
  console.error('插件加载失败：', result.failure);
}
```

`registry` 也支持一次注册多个插件：

```ts
await workspace.registry(echoPlugin, anotherPlugin);
```

单个插件加载抛错不会影响其他插件注册，错误会记录在 `result.failure` 中。

### 4. 处理消息

```ts
const outputs = await workspace.process('echo 你好', {});

// [
//   {
//     plugin: 'echo',
//     name: 'echo',
//     content: [{ type: 'text', text: '你好' }]
//   }
// ]
```

返回值的 `content` 是 `Part[]`，如何转换成 QQ 消息由调用方决定。`process` 的第二个
参数是额外的消息上下文，会合并进命令 `execute` 的 `ctx`；但 `logger`、`bot`、`emit`、
`state` 由工作区强制覆盖，传入的同名键不会生效。

命令默认在第一个命中后停止匹配，只有 `execute` 返回 `{ next: true }` 时才会继续尝试
后续命令，最终的返回值会是多个命令结果的数组。

`execute` 的第三个参数是 `pattern` 的捕获组（`result.slice(1)`）：

```ts
{
  pattern: /^set\s+(\w+)\s+(.+)$/i,
  execute(input, ctx, args) {
    const [key, value] = args ?? [];
    return { content: [{ type: 'text', text: `${key}=${value}` }] };
  }
}
```

### 5. 卸载插件

```ts
workspace.deregister('echo');
```

`deregister` 按插件的 `info.name` 删除该插件的插件信息、全部命令、`init` 注入的 API
与该插件的 `state`，取消它的所有定时任务，并移除 `loadListener` 注册的全部事件监听。
重复注册同名插件时会先自动执行一次 `deregister`，因此插件状态会重置，监听器也不会
重复挂载。

### 6. 定时任务

插件可以实现 `loadSchedule()` 返回要注册的定时任务，`cron` 使用标准 cron 表达式：

```ts
import type { IPlugin, Manifest, ScheduleTask } from '@xopenbot/plugin';

const reminderPlugin: IPlugin<Manifest> = {
  info: { name: 'reminder', version: '1.0.0', description: '定时提醒' },
  loadCommand() {
    return [];
  },
  loadSchedule(): ScheduleTask[] {
    return [
      {
        name: 'daily',
        cron: '0 0 9 * * *',
        task(fireDate) {
          // 返回 true 表示执行成功，false 表示失败
          console.log('触发时间：', fireDate);
          return true;
        }
      }
    ];
  }
};

const workspace = new Workspace(bot);
await workspace.registry(reminderPlugin);
```

任务以 `插件名_任务名` 作为唯一标识；同名任务不会重复注册，非法 `cron` 会记录错误并
跳过。

`Workspace` 的构造器第一个参数是 `bot`（会作为 `ctx.bot` 传给每个插件），第二个参数
可以传入一个 logger；不传时会依次回退到 `bot.logger`、`console`。定时任务执行的成功/
失败会记录到它：

```ts
const workspace = new Workspace(bot, logger);
```

## Workspace API

```ts
import { Workspace } from '@xopenbot/plugin';

const workspace = new Workspace(bot, logger?);
```

| 成员 | 签名 | 说明 |
| --- | --- | --- |
| `constructor` | `(bot: Bot, logger?: LikeLogger)` | 创建插件工作区；`logger` 缺省时回退到 `bot.logger`、`console` |
| `registry` | `(...plugins: IPlugin[]) => Promise<RegistryResult>` | 注册一个或多个插件 |
| `process` | `(input: string, ctx: Record<string, unknown>) => Promise<ProcessResult[]>` | 按优先级匹配命令并执行 |
| `deregister` | `(pluginName: string) => void` | 卸载指定插件及其命令、任务、监听与状态 |
| `listPlugin` | `() => PluginInfo[]` | 返回已注册插件信息（含 `loadTime`） |

### RegistryResult

```ts
interface RegistryResult {
  ok: boolean;
  failure?: {
    name: string;
    error: string;
  }[];
}
```

### ProcessResult

```ts
interface ProcessResult {
  plugin: string;
  name: string;
  content?: Part[];
}
```

### 命令匹配规则

- `pattern` 可以是字符串或正则；字符串会被转换为正则，未以 `^` 开头时自动补上 `^`。
- 全部命令按 `priority` 升序执行，数字越小越先执行。
- 命中后默认停止；只有 `execute` 返回 `{ next: true }` 时继续匹配后续命令。

## 插件定义（IPlugin）

```ts
interface IPlugin<M extends Manifest> {
  info: PluginInfo<M>;
  /** 插件可以定义 init 方法返回一些 API，这些 API 会放到每个插件调用时的 ctx */
  init?(ctx: PluginContext<M>): MaybePromise<{ [key: string]: unknown }>;
  /** 命令 */
  loadCommand(ctx: PluginContext<M>): MaybePromise<Command<M>[]>;
  /** 定时任务 */
  loadSchedule?(ctx: PluginContext<M>): MaybePromise<ScheduleTask[]>;
  /** 事件监听 */
  loadListener?(ctx: PluginContext<M>): MaybePromise<Listener<M>>;
}
```

### PluginInfo

```ts
interface PluginInfo<M extends Manifest> {
  name: string;
  version: string;
  description: string;
  manifest?: M;
}
```

### Command

```ts
interface Command<M extends Manifest> {
  name: string;
  pattern: string | RegExp;
  priority: number;
  execute: (
    input: string,
    ctx: PluginContext<M>,
    args?: string[]
  ) => MaybePromise<ExecResult | void | undefined | null>;
}
```

### ExecResult

```ts
interface ExecResult {
  next?: boolean;
  content?: Part[];
}
```

### ScheduleTask

```ts
interface ScheduleTask {
  /** 定时任务调度的格式化字符串 */
  cron: string;
  name: string;
  /** 返回 true 成功，false 失败 */
  task: (fireDate: Date) => MaybePromise<boolean>;
}
```

## 插件上下文（ctx）

插件的 `init` / `loadCommand` / `loadSchedule` / `loadListener` 以及命令的 `execute`
都会收到一个 `ctx`，包含：

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `logger` | `LikeLogger` | 工作区注入的日志对象 |
| `bot` | `BotImpl<manifest.depsOn>` | 构造 `Workspace` 时传入的 bot 实例；`depsOn` 中声明过的成员会变为必选 |
| `state` | `Record<string, unknown>` | 该插件专属的状态对象，跨命令/定时任务持久，重复注册同名插件会重置 |
| `emit` | `(event: string, ...args: unknown[]) => void` | 向工作区事件总线派发事件 |
| `event` | 仅监听回调中存在 | 当前事件数据 |

```ts
loadCommand(ctx) {
  ctx.state.count = 0;   // 初始化状态
  return [...];
}

execute(input, ctx) {
  ctx.state.count += 1;
  return { content: [{ type: 'text', text: `已执行 ${ctx.state.count} 次` }] };
}
```

`ctx.emit` 的事件名带 `.` 时会按层级依次触发（`a.b.c` 依次触发 `a`、`a.b`、`a.b.c`
的监听器）。

### init

插件可以定义 `init(ctx)` 返回一些 API，这些 API 会合并进所有插件命令 `execute` 时的
`ctx`。合并顺序为：`init` API → `process` 传入的额外上下文 → 工作区保留字段
（`logger` / `bot` / `emit` / `state`），后者会覆盖前者：

```ts
init(ctx) {
  return { db: new Database(ctx.state) };
}
```

## 消息段（Part）

`ExecResult.content` 与 `ProcessResult.content` 都是可选的 `Part[]`，目前支持两种
消息段：

```ts
// 文本
{ type: 'text', text: '你好' }

// 图片：path 为必填，content 为可选的补充内容（如 base64）
{ type: 'image', path: 'https://example.com/a.png' }
```

对应的类型：

```ts
interface Text {
  type: 'text';
  text: string;
}

interface Image {
  type: 'image';
  path: string;
  content?: string;
}

type Part = Text | Image;
```

## 查询已注册插件

```ts
const plugins = workspace.listPlugin();
// [{ name: 'echo', version: '1.0.0', description: '复读机示例', loadTime: 1700000000000 }]
```

## 事件监听

插件可以实现 `loadListener()` 返回 `Listener`：键为事件名，值为回调或回调数组。工作区
会在插件注册完成后自动挂载监听，并在 `deregister` 时移除：

```ts
loadListener() {
  return {
    message: ctx => {
      ctx.logger.debug('收到消息');
    },
    // 同一个事件也可以注册多个回调
    'my.custom': [
      ctx => ctx.logger.debug('自定义事件', ctx.event),
      ctx => ctx.logger.debug('第二个回调')
    ]
  };
}
```

内置事件 `message` / `request` / `notice` / `meta` 会监听 bot 的对应事件；其余事件名
注册在工作区事件总线上，可通过 `ctx.emit` 派发：

```ts
execute(input, ctx) {
  ctx.emit('my.custom', { input });
  return { content: [{ type: 'text', text: '已派发' }] };
}
```

内置事件的 `ctx.event` 会按事件类型收窄（`message` 为 `MessageEvent`，`request` 为
`RequestEvent` 等）；自定义事件的 `ctx.event` 是 `any`，需要自己断言：

```ts
'my.custom': ctx => {
  const e = ctx.event as { input: string };
  ctx.logger.debug(e.input);
}
```

事件名带 `.` 时会按层级派发：`ctx.emit('a.b.c')` 会依次触发 `a`、`a.b`、`a.b.c`
的监听器。回调的 `ctx.event` 是派发时传入的第一个参数。

监听回调支持同步或异步（返回 `Promise`）。回调抛错或被 reject 时只会记录到
`logger.error`，不会影响同一事件上的其他监听器。

### Listener 类型

```ts
type ListenerCallback<M extends Manifest, T = any> = (
  ctx: PluginContext<M> & { event: T }
) => MaybePromise<void | undefined | null>;

type Listener<M extends Manifest> = {
  message?: ListenerCallback<M, MessageEvent> | ListenerCallback<M, MessageEvent>[];
  request?: ListenerCallback<M, RequestEvent> | ListenerCallback<M, RequestEvent>[];
  notice?: ListenerCallback<M, NoticeEvent> | ListenerCallback<M, NoticeEvent>[];
  meta?: ListenerCallback<M, MetaEvent> | ListenerCallback<M, MetaEvent>[];
} & Record<string, ListenerCallback<M> | ListenerCallback<M>[]>;
```

## 类型参考

| 类型 | 说明 |
| --- | --- |
| `Workspace` | 插件工作区类 |
| `definePlugin` | 插件定义辅助函数，保留字面量类型并冻结 `info` |
| `IPlugin<M>` | 插件接口 |
| `Manifest` | 依赖声明，包含 `depsOn: BotAPIOptions` |
| `PluginInfo<M>` | 插件基本信息 |
| `PluginContext<M>` | 插件上下文 |
| `Command<M>` | 命令定义 |
| `ExecResult` | 命令执行结果 |
| `ProcessResult` | 命令处理结果 |
| `RegistryResult` | 插件注册结果 |
| `ScheduleTask` | 定时任务定义 |
| `Listener<M>` / `ListenerCallback<M>` | 事件监听定义 |
| `Part` / `Text` / `Image` | 消息段类型 |
| `LikeLogger` | 兼容 `console` / `bot.logger` 的日志接口 |

## 目录结构

```text
packages/plugin
├── src
│   ├── index.ts             # 包入口，统一导出
│   ├── plugin.ts            # definePlugin 辅助函数
│   ├── workspace.ts         # 插件工作区、命令注册与分发
│   ├── types
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

## 开发与构建

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
