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
| `registry` | `(...entries: (IPlugin \| { plugin: IPlugin; config: unknown })[]) => Promise<RegistryResult>` | 注册一个或多个插件；`{ plugin, config }` 形式会校验并注入该插件的 `ctx.config` |
| `process` | `(input: string, ctx: Record<string, unknown>) => Promise<ProcessResult[]>` | 按优先级匹配命令并执行 |
| `deregister` | `(pluginName: string) => void` | 卸载指定插件及其命令、任务、监听、状态与 `acquireRelease` 登记的资源 |
| `listPlugin` | `() => (PluginInfo<Manifest> & { loadTime: number })[]` | 返回已注册插件信息（含 `loadTime`） |

命令匹配与执行细节见 [命令与消息处理](/plugin/guide/command)。

## 插件配置

```ts
await workspace.registry(
  echoPlugin, // 无配置，ctx.config 为 undefined
  { plugin: otherPlugin, config: { token: 'xxx' } }
);
```

配置类型由插件的 `definePlugin<Config>()` 声明，字段类型与必填项会在编译期校验；运行时
注入到 `ctx.config`，并在 `deregister` 时一并清理。`config` 与一次注册绑定，注册后视为
只读；修改配置需重新 `registry`，运行期可变状态请用 `ctx.state`。

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
