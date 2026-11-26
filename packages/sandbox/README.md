# @xopenbot/sandbox

在受限环境中执行 JavaScript 的沙箱包，用于让群聊消息直接作为代码执行，同时限制代码对
宿主进程和机器人能力的访问。

项目来源于 [takayamabot](https://github.com/takayama-lily/takayamabot.git)。

> Node 的 `vm` 本身**不是**安全边界。本包通过多层加固提高逃逸成本，但仍建议在低权限
> 用户或容器中运行不可信代码。

## 安装

```bash
pnpm add @xopenbot/sandbox
```

## 最小示例

```ts
import { exec, init } from '@xopenbot/sandbox';
import type { Bot, MessageEvent } from '@xopenbot/onebot';

declare const bot: Bot;

await init(bot, {
  master: ['10001'],
  dataPath: './data'
});

bot.on('message', (event: MessageEvent) => {
  exec(event);
});
```

包导出三个运行时方法与一个配置类型：

| 名称 | 说明 |
| --- | --- |
| `init` | 初始化沙箱并注册机器人实例 |
| `exec` | 把事件交给沙箱执行并等待结果 |
| `saveCtx` | 立即保存当前上下文与函数源码 |
| `Config` | `init` 的配置类型 |

## 关键限制

- 只有 `master` 中的 QQ 可以修改受保护属性与调用 `run()`；`run()` 会在宿主侧执行
  任意代码。
- `vm.runInContext` 默认 500ms 超时；`setTimeout` 延迟限制在 5000ms 以上。
- 机器人 API、`setTimeout`、`fetch` 共用频率限制与异步递归深度限制。
- `fetch` 默认 30 秒超时，响应体限制 500KB；支持 `proxy` 配置（字符串或 `{ url, options }`），
  但仍受超时、响应上限、频率与递归深度限制。
- 上下文会持久化到 `data/context`、`data/context.fn`。

## 包边界

- 负责宿主进程、子进程与 VM 上下文之间的隔离与通信。
- 不负责连接 OneBot 实现；事件由使用方通过 `exec` 传入。
- 依赖 `@xopenbot/onebot` 的事件与消息类型。

## 文档

完整 API 文档见 [`docs/sandbox`](https://github.com/forfindo/xopenbot/blob/main/docs/sandbox/index.md)，
包括 `init` / `exec` / `saveCtx`、沙箱内置 API、异步限流、权限模型、钩子、持久化格式
与安全加固说明。

## 开发

```bash
pnpm --filter @xopenbot/sandbox build
pnpm check
pnpm lint
```
