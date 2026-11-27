---
outline: deep
---

# 类型参考

## IPlugin

```ts
interface IPlugin<M extends Manifest = Manifest, C = unknown> {
  info: PluginInfo<M>;
  /** 插件可以定义 init 方法返回一些 API，这些 API 会放到每个插件调用时的 ctx */
  init?(ctx: PluginContext<M, C>): MaybePromise<{ [key: string]: unknown }>;
  /** 命令 */
  loadCommand(ctx: PluginContext<M, C>): MaybePromise<Command<M, C>[]>;
  /** 定时任务 */
  loadSchedule?(ctx: PluginContext<M, C>): MaybePromise<ScheduleTask[]>;
  /** 事件监听 */
  loadListener?(ctx: PluginContext<M, C>): MaybePromise<Listener<M, C>>;
}
```

`C` 是插件配置类型，由 `definePlugin<C>()` 声明，缺省为 `unknown`。

## PluginInfo

```ts
interface PluginInfo<M extends Manifest> {
  name: string;
  version: string;
  description: string;
  manifest?: M;
}
```

## Command

```ts
import type { MatchArgs } from '@xopenbot/plugin';

interface Command<M extends Manifest = Manifest, C = unknown> {
  name: string;
  /** 该命令的所有 pattern（命令名 + 别名组合） */
  pattern: string[];
  priority: number;
  /** 命令描述，仅用于文档/帮助展示 */
  description?: string;
  /** 命令选项定义，命令匹配时据此解析并校验 flag */
  options?: CommandOptions;
  execute: (
    input: string,
    ctx: PluginContext<M, C>,
    args: MatchArgs
  ) => MaybePromise<ExecResult | void | undefined | null>;
}
```

- `pattern` 是 yargs 风格模板的数组，一个元素对应一种命令名、别名或子命令写法；匹配时
  按数组顺序取第一个命中的模板。模板语法见[命令匹配规则](/plugin/guide/command#pattern-语法)。
- `description` 可选，仅用于文档或帮助展示，不参与匹配；开启 `.help()` 后会出现在帮助中。
- `options` 可选，键为选项名，值为 `CommandOption` 或描述字符串；详见
  [命令选项](/plugin/guide/command#命令选项)。
- `execute` 经 `process` 调用时，`input` 是完整输入（已 trim），`args` 是 `yargs-parser`
  解析后的 `MatchArgs`，包含 `_` 与具名位置参数、flag。

## CommandOption

```ts
type CommandOptionType = 'string' | 'number' | 'boolean' | 'array';

interface CommandOption {
  alias?: string | string[];
  describe?: string;
  type?: CommandOptionType;
  default?: unknown;
  demandOption?: boolean | string;
  choices?: readonly (string | number)[];
  hidden?: boolean;
}

type CommandOptions = Record<string, CommandOption | string>;
```

## MatchArgs

```ts
interface MatchArgs {
  /** 命令路径与未消费的位置参数 */
  _: Array<string>;
  /** `--` 之后的参数 */
  '--'?: Array<string | number>;
  /** 具名位置参数与所有 flag */
  [argName: string]: any;
}
```

`MatchArgs` 即 `yargs-parser` 的解析结果。具名位置参数、`--flag` 以及 `.help()` 识别
到的 `help` 都按名字写入；详见 [execute 参数](/plugin/guide/command#execute-参数)。

## defineCommand

```ts
function defineCommand<M extends Manifest = Manifest, C = unknown>(
  command: string | string[],
  describe?: string
): CommandBuilder<M, C>;
```

`command` 为字符串或数组（第一项为命令名，其余为别名）。返回的 `CommandBuilder` 提供
`.name()`、`.describe()`、`.alias()`、`.priority()`、`.option()` / `.options()`、
`.help()`、`.handler()`、`.command()`、`.build()`，`build()` 返回
`Command[]`。用法见 [用构造器定义命令](/plugin/guide/command#用构造器定义命令) 与
[帮助](/plugin/guide/command#帮助)。

- `command` 是 `defineCommand` 的别名。
- 在插件内可传 `defineCommand<typeof ctx>(...)`，让 `M` / `C` 从 `ctx` 推导。
- 命令字符串不合法时，`build()` 抛出 `CommandDefinitionError`。

## ExecResult

```ts
interface ExecResult {
  next?: boolean;
  content?: Part[];
}
```

## ScheduleTask

```ts
interface ScheduleTask {
  /** 定时任务调度的格式化字符串 */
  cron: string;
  name: string;
  /** 返回 true 成功，false 失败 */
  task: (fireDate: Date) => MaybePromise<boolean>;
}
```

## 类型清单

| 类型 | 说明 |
| --- | --- |
| `Workspace` | 插件工作区类 |
| `definePlugin` | 插件定义辅助函数，保留字面量类型并冻结 `info` |
| `defineCommand` / `command` | 命令构造器入口，返回 `CommandBuilder` |
| `CommandBuilder<M, C>` | 命令构建器，`build()` 生成 `Command<M, C>[]` |
| `CommandDefinitionError` | 命令定义不合法时 `build()` 抛出的错误 |
| `IPlugin<M, C>` | 插件接口，`C` 为配置类型 |
| `Manifest` | 依赖声明，包含 `depsOn: BotAPIOptions` |
| `PluginInfo<M>` | 插件基本信息 |
| `PluginContext<M, C>` | 插件上下文，包含 `config: C` |
| `Command<M, C>` | 命令定义 |
| `CommandOption` / `CommandOptions` | 命令选项定义与映射 |
| `CommandOptionType` | 命令选项值类型 |
| `MatchArgs` | 命令匹配后的 `yargs-parser` 参数 |
| `ExecResult` | 命令执行结果 |
| `ProcessResult` | 命令处理结果 |
| `RegistryResult` | 插件注册结果 |
| `ScheduleTask` | 定时任务定义 |
| `Listener<M, C>` / `ListenerCallback<M, T, C>` | 事件监听定义 |
| `ListenerCallbackInfo<M, C>` | 监听注册信息（回调、内部包装函数与插件名） |
| `Part` / `Text` / `Image` | 消息段类型 |
| `LikeLogger` | 兼容 `console` / `bot.logger` 的日志接口 |
