---
outline: deep
---

# @xopenbot/sandbox

`@xopenbot/sandbox` 是一个在受限环境中执行 JavaScript 的沙箱包，用于让群聊消息直接作为
代码执行，同时限制代码对宿主进程和机器人能力的访问。

项目来源于 [takayamabot](https://github.com/takayama-lily/takayamabot.git)。

## 文档导航

| 页面 | 内容 |
| --- | --- |
| [导出 API](/sandbox/guide/api) | `init` / `exec` / `saveCtx`、`Config` 与事件派发 |
| [工作原理](/sandbox/internals/architecture) | 进程隔离、VM 上下文、事件驱动与持久化 |
| [异步任务与限流](/sandbox/internals/async) | 频率限制、递归检测与 `setTimeout` 约束 |
| [沙箱内置 API](/sandbox/internals/builtin-api) | 内置能力、拓展机器人 API、上下文与钩子 |
| [安全边界](/sandbox/security) | 加固措施、权限模型与注意事项 |
| [开发与构建](/sandbox/dev) | 目录结构、构建与检查命令 |

## 安装

```bash
pnpm add @xopenbot/sandbox
```

构建：

```bash
pnpm --filter @xopenbot/sandbox build
```

## 快速开始

```ts
import { init, exec, saveCtx } from '@xopenbot/sandbox';
import type { Bot, MessageEvent } from '@xopenbot/onebot';

declare const bot: Bot;

await init(bot, {
  /** 主人 QQ 列表 */
  master: ['10001'],
  /** 上下文存档目录，默认 ./data */
  dataPath: './data'
});

bot.on('message', (event: MessageEvent) => {
  exec(event);
});
```

注意：

- `init` 只需要调用一次，重复调用会打印错误并忽略；
- `master` 必须是字符串数组，`bridge` 会将其拼接为逗号分隔的字符串；
- 每个机器人实例以 `self.user_id` 为键注册，`exec` 遇到未初始化的机器人会抛错；
- `config.dataPath` 会在子进程收到 `init` 后写入 `process.env.dataPath`，但 `sandbox`
  模块已在子进程启动时完成导入，因此实际生效的是**启动前**的环境变量；需要自定义目录
  时请在启动宿主进程前设置 `dataPath` 环境变量。

详细说明见 [导出 API](/sandbox/guide/api)。
