---
outline: deep
---

# 插件上下文

插件的 `init` / `loadCommand` / `loadSchedule` / `loadListener` 以及命令的 `execute`
都会收到一个 `ctx`，包含：

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `logger` | `LikeLogger` | 工作区注入的日志对象 |
| `bot` | `BotImpl<manifest.depsOn>` | 构造 `Workspace` 时传入的 bot 实例；`depsOn` 中声明过的成员会变为必选 |
| `state` | `Record<string, unknown>` | 该插件专属的状态对象，跨命令/定时任务持久，重复注册同名插件会重置 |
| `config` | `C` | 注册该插件时传入的配置，类型由 `definePlugin<C>()` 声明，缺省为 `unknown` |
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

## config

`ctx.config` 是注册插件时由调用方传入的配置，在 `init` / `loadCommand` /
`loadSchedule` / `loadListener` / `execute` / 监听回调中都可见：

```ts
interface EchoConfig {
  prefix: string;
}

const echoPlugin = definePlugin<EchoConfig>()({
  info: { name: 'echo', version: '1.0.0', description: '...' },
  loadCommand(ctx) {
    ctx.config.prefix; // string
    return [...];
  }
});

await workspace.registry({ plugin: echoPlugin, config: { prefix: '!' } });
```

未声明配置类型的插件 `ctx.config` 为 `unknown`。`config` 是工作区保留字段，会覆盖
`process` 传入的同名上下文以及 `init` 返回的同名 API。

`config` 在注册后视为只读：它与一次注册绑定，工作区不会在运行中替换。需要修改配置时
用新 `config` 重新 `registry`（会重建该插件的 `state`、定时任务与监听）；运行期需要可变
的开关/参数请放进 `ctx.state`。

## init

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
