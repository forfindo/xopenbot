---
outline: deep
---

# 导出 API

包导出三个运行时方法与一个配置类型：

| 名称 | 签名 | 说明 |
| --- | --- | --- |
| `init` | `(bot: Bot \| Bot[], cfg?: Config) => Promise<void>` | 初始化沙箱并注册机器人实例 |
| `exec` | `(data: MessageEvent \| NoticeEvent \| RequestEvent) => Promise<Message>` | 把事件交给沙箱执行并等待结果 |
| `saveCtx` | `() => void` | 立即保存当前上下文与函数源码 |
| `Config` | `interface` | `init` 的配置类型 |

## Config

```ts
interface Config {
  /** 上下文存档目录，默认 ./data */
  dataPath?: string;
  /** 判断是否主人 */
  master: string[];
  /**
   * 拓展的机器人 API，放在 $ 下。
   * 传入 API 名称，沙箱内通过 `$.<名称>(参数数组, 回调?)` 调用；
   * 回调参数为 `{ data, error }`，省略回调时只发起调用、忽略结果。
   */
  botAPI?: string[];
}
```

## init

```ts
await init(bot, { master: ['10001'] });
```

`init` 会：

1. 如果传入单个 Bot，会先包装成数组；
2. 读取每个机器人的 `selfInfo.user_id`（不存在时调用 `getSelfInfo()`）；
3. 以 `user_id` 为键注册机器人实例；
4. 向子进程发送 `init` 消息。

`uid` 为空时会抛出 `TypeError('uid不能为空')`。

## exec

```ts
const result = await exec(messageEvent);
```

`exec` 内部会：

1. 校验机器人是否已初始化；
2. 使用 `normalize()` 净化事件数据；
3. 通过 IPC 发送给子进程，并等待执行结果。

## saveCtx

```ts
saveCtx();
```

立即把当前上下文与函数源码压缩写入 `data/context`、`data/context.fn`。

## 派发事件

```ts
init(bot, { master: ['10001'] });

bot.on('message', event => exec(event));
bot.on('notice', event => exec(event));
bot.on('request', event => exec(event));
```
