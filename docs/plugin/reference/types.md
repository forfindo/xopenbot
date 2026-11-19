---
outline: deep
---

# 类型参考

## IPlugin

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
