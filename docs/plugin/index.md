---
outline: deep
---

# @xopenbot/plugin

xopenbot 的插件工作区。负责插件的加载、命令注册、消息匹配与分发、定时任务调度，以及
插件卸载。

一个插件通过 `loadCommand()` 返回若干条命令；命令由 `pattern` 匹配输入，由 `.handler()`
设置的处理函数（即 `Command.execute`）产出消息内容，并可用 `.option()` 声明 flag、用
`.help()` 启用内置 `--help`。
`Workspace` 是一个类，需要先 `new` 出一个实例；一个实例管理一组插件、命令、定时任务
与插件私有状态，并支持 `init` 向命令上下文注入 API。

推荐使用 `definePlugin()` 定义插件，并通过 `info.manifest.depsOn` 声明依赖的 Bot API；
声明后 `ctx.bot` 的类型会变成必然包含这些成员的 `BotImpl`，未声明的标准成员仍保持可选。

## 文档导航

| 页面 | 内容 |
| --- | --- |
| [编写插件](/plugin/guide/plugin) | `definePlugin`、`manifest.depsOn` 与插件注册 |
| [命令与消息处理](/plugin/guide/command) | `process`、`pattern` 匹配、命令选项、`--help` 与 `deregister` |
| [定时任务](/plugin/guide/schedule) | `loadSchedule`、cron 表达式与任务标识 |
| [插件上下文](/plugin/guide/context) | `ctx`、`init` 注入与消息段 `Part` |
| [事件监听](/plugin/guide/listener) | `loadListener`、内置事件与事件总线 |
| [Workspace API](/plugin/reference/workspace) | 工作区方法、`RegistryResult` 与 `ProcessResult` |
| [类型参考](/plugin/reference/types) | `IPlugin`、`Command`、`ScheduleTask` 等类型 |
| [开发与构建](/plugin/dev) | 目录结构、构建与检查命令 |

## 安装

```bash
pnpm add @xopenbot/plugin
```

::: tip 依赖关系
`@xopenbot/plugin` 依赖 `@xopenbot/onebot`，插件中使用的 Bot 类型、`BotAPIOptions`
等均来自后者。
:::

## 快速开始

```ts
import { Workspace, defineCommand, definePlugin } from '@xopenbot/plugin';

const echoPlugin = definePlugin({
  info: {
    name: 'echo',
    version: '1.0.0',
    description: '复读机示例'
  },
  loadCommand() {
    return defineCommand('echo [text...]', '复读消息')
      .handler((input, ctx, args) => {
        const text = (args.text as string[] | undefined)?.join(' ') ?? '';
        return { content: [{ type: 'text', text }] };
      })
      .build();
  }
});

const workspace = new Workspace(bot);
await workspace.registry(echoPlugin);
const outputs = await workspace.process('echo 你好', {});
```

完整的编写步骤见 [编写插件](/plugin/guide/plugin)。

## 文档基线

`docs/plugin` 下的页面已同步到提交 `cbfdbee`（`feat(plugin): 新增命令option`，
2026-11-27）。本次相对上一次文档基线覆盖的变更为：

| 提交 | 内容 |
| --- | --- |
| `ea842a3` | 插件配置：`definePlugin<C>()` 与 `registry({ plugin, config })` |
| `b47aded` | 命令匹配改为 yargs 风格：`pattern` 数组、子命令与别名展开 |
| `83973e1` | 内置帮助：`.help()` 与 `--help` |
| `cbfdbee` | 命令选项：`.option()` / `.options()`、`CommandOption` |

下次增量更新从该提交之后开始：

```bash
git log cbfdbee..HEAD --oneline -- packages/plugin
git diff cbfdbee..HEAD -- packages/plugin/src
```
