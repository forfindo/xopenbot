---
outline: deep
---

# Workspace API

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

命令匹配与执行细节见 [命令与消息处理](/plugin/guide/command)。

## RegistryResult

```ts
interface RegistryResult {
  ok: boolean;
  failure?: {
    name: string;
    error: string;
  }[];
}
```

## ProcessResult

```ts
interface ProcessResult {
  plugin: string;
  name: string;
  content?: Part[];
}
```

## 查询已注册插件

```ts
const plugins = workspace.listPlugin();
// [{ name: 'echo', version: '1.0.0', description: '复读机示例', loadTime: 1700000000000 }]
```
