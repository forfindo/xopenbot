# @xopenbot/plugin

xopenbot 的插件工作区。负责插件的加载、命令注册、消息匹配与分发、定时任务调度，以及
插件卸载。

一个插件通过 `loadCommand()` 返回命令；命令由 `pattern` 匹配输入，由 `execute` 产出
消息内容。`Workspace` 管理插件、命令、定时任务与插件私有状态，并支持通过 `init` 向
命令上下文注入 API。

## 安装

```bash
pnpm add @xopenbot/plugin
```

## 最小示例

```ts
import { definePlugin, Workspace } from '@xopenbot/plugin';

const echoPlugin = definePlugin({
  info: {
    name: 'echo',
    version: '1.0.0',
    description: '复读机示例'
  },
  loadCommand() {
    return [
      {
        name: 'echo',
        pattern: /^echo\s*/i,
        priority: 100,
        execute(input) {
          return {
            content: [{ type: 'text', text: input || '用法：echo <内容>' }]
          };
        }
      }
    ];
  }
});

const workspace = new Workspace(bot);
await workspace.registry(echoPlugin);

const outputs = await workspace.process('echo 你好', {});
// [{ plugin: 'echo', name: 'echo', content: [{ type: 'text', text: '你好' }] }]
```

## 核心能力

- 命令：`pattern` 支持字符串或正则，按 `priority` 升序执行。
- 依赖声明：`info.manifest.depsOn` 声明所需的 Bot API，注册时校验并收窄 `ctx.bot`。
- 插件上下文：`ctx` 提供 `logger`、`bot`、`state`、`emit`。
- 生命周期：支持 `init`、`loadCommand`、`loadSchedule`、`loadListener`。
- 卸载：`workspace.deregister(name)` 清理命令、任务、监听与状态。

## 包边界

- 只负责插件管理与命令分发，不直接发送 QQ 消息。
- 命令产出的 `content` 是 `Part[]`，如何转换成 QQ 消息由调用方决定。
- 依赖 `@xopenbot/onebot` 的类型契约。

## 文档

完整 API 文档见 [`docs/plugin`](https://github.com/forfindo/xopenbot/blob/main/docs/plugin/index.md)，
包括 `Workspace` API、`IPlugin` / `Command` / `ScheduleTask` 类型、manifest 推导、
上下文合并顺序、定时任务与事件监听。

## 开发

```bash
pnpm --filter @xopenbot/plugin build
pnpm check
pnpm lint
```
