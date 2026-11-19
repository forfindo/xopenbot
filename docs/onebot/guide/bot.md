---
outline: deep
---

# Bot 接口

`Bot` 是应用端机器人的接口类型，声明了协议规定的全部 31 个标准动作。方法名是动作名
的小驼峰形式，参数按动作参数顺序展开，最后一个可选参数 `options` 用于携带扩展参数；
返回值即动作响应中的 `data`，可以是同步值或 `Promise`（`MaybePromise<T>`）。

标准动作、`selfInfo`、`logger`、`on` / `off` 都声明为**可选成员**，直接调用时需要使用
可选链：

```ts
import type { Bot } from '@xopenbot/onebot';

declare const bot: Bot;

const info = await bot.getSelfInfo?.(); // get_self_info
const result = await bot.sendMessage?.('group', '你好'); // send_message
```

`Bot` 由标准动作与扩展 API 两部分交叉而成：

```ts
/** 拓展能力：既可以是扩展 action 函数，也可以是普通数据字段。 */
interface ExtendedAPI {
  [name: string]: unknown;
}

/** 标准动作与事件回调 */
interface StandardBot {
  readonly selfInfo?: UserInfo;
  readonly logger?: {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  on?(name: 'message', listener: (e: MessageEvent | ExtendedEvent<'message'>) => void): void;
  off?(name: 'message', listener: (e: MessageEvent | ExtendedEvent<'message'>) => void): void;
  // ... request / notice / meta 重载

  getLatestEvents(
    limit?: number,
    timeout?: number,
    options?: Record<string, unknown>
  ): MaybePromise<OneBotEvent[]>;
  // ... 其余标准动作
}

export type Bot = StandardBot & ExtendedAPI;
```

## 标准方法一览

| 分类 | 方法 | 说明 |
| --- | --- | --- |
| 元动作 | `getLatestEvents(limit?, timeout?, options?)` | 获取最新事件列表 |
| 元动作 | `getSupportedActions(options?)` | 获取支持的动作列表 |
| 元动作 | `getStatus(options?)` | 获取运行状态 |
| 元动作 | `getVersion(options?)` | 获取版本信息 |
| 消息 | `sendPrivateMessage(user_id, message, options?)` | 发送私聊消息 |
| 消息 | `sendGroupMessage(group_id, message, options?)` | 发送群聊消息 |
| 消息 | `sendChannelMessage(guild_id, channel_id, message, options?)` | 发送频道消息 |
| 消息 | `sendMessage(detail_type, message, options?)` | 发送扩展类型消息 |
| 消息 | `deleteMessage(message_id, options?)` | 撤回消息 |
| 用户 | `getSelfInfo(options?)` | 获取机器人自身信息 |
| 用户 | `getUserInfo(user_id, options?)` | 获取用户信息 |
| 用户 | `getFriendList(options?)` | 获取好友列表 |
| 群 | `getGroupInfo(group_id, options?)` | 获取群信息 |
| 群 | `getGroupList(options?)` | 获取群列表 |
| 群 | `getGroupMemberInfo(group_id, user_id, options?)` | 获取群成员信息 |
| 群 | `getGroupMemberList(group_id, options?)` | 获取群成员列表 |
| 群 | `setGroupName(group_id, group_name, options?)` | 设置群名称 |
| 群 | `leaveGroup(group_id, options?)` | 退出群 |
| 群组 | `getGuildInfo(guild_id, options?)` | 获取群组信息 |
| 群组 | `getGuildList(options?)` | 获取群组列表 |
| 群组 | `setGuildName(guild_id, guild_name, options?)` | 设置群组名称 |
| 群组 | `getGuildMemberInfo(guild_id, user_id, options?)` | 获取群组成员信息 |
| 群组 | `getGuildMemberList(guild_id, options?)` | 获取群组成员列表 |
| 群组 | `leaveGuild(guild_id, options?)` | 退出群组 |
| 频道 | `getChannelInfo(guild_id, channel_id, options?)` | 获取频道信息 |
| 频道 | `getChannelList(guild_id, joined_only?, options?)` | 获取频道列表 |
| 频道 | `setChannelName(guild_id, channel_id, channel_name, options?)` | 设置频道名称 |
| 频道 | `getChannelMemberInfo(guild_id, channel_id, user_id, options?)` | 获取频道成员信息 |
| 频道 | `getChannelMemberList(guild_id, channel_id, options?)` | 获取频道成员列表 |
| 频道 | `leaveChannel(guild_id, channel_id, options?)` | 退出频道 |
| 文件 | `uploadFile(...)` | 上传文件（重载见下文） |
| 文件 | `uploadFileFragmented(params)` | 分片上传文件 |
| 文件 | `getFile(file_id, type, options?)` | 获取文件 |
| 文件 | `getFileFragmented(params)` | 分片获取文件 |

## 事件监听

`on` / `off` 当前声明了 `message`、`request`、`notice`、`meta` 四组重载：

```ts
bot.on?.('message', event => {
  event.type; // 'message'
});
```

## 必选成员与依赖声明

`BotAPIOptions` 描述一个 Bot 实现实际提供了哪些成员，以及每个成员是函数还是数据字段
（`'function'` / `'field'`）。`BotImpl<T>` 把 `T` 中声明的成员变为**必选**，未声明的
标准成员仍保持可选：

```ts
import type { BotAPIOptions, BotImpl } from '@xopenbot/onebot';

const options = {
  sendGroupMessage: 'function', // 标准动作
  selfInfo: 'field', // 标准字段
  uid: 'field', // 扩展字段
  tts: 'function' // 扩展动作
} as const satisfies BotAPIOptions;

declare const impl: BotImpl<typeof options>;

await impl.sendGroupMessage('123456', '你好'); // 必选，保留精确签名
impl.selfInfo.user_id; // 必选
impl.uid; // 扩展字段，类型为 unknown
impl.tts('内容'); // 扩展动作，返回 MaybePromise<unknown>
await impl.getGroupInfo?.('123456'); // 未声明，仍为可选
```

- 标准动作在 `BotAPIOptions` 中只能写 `'function'`；`selfInfo`、`logger` 只能写
  `'field'`；扩展成员两种都可以。
- 扩展方式声明的函数默认接受任意参数，返回 `MaybePromise<unknown>`。第二个泛型参数
  可以约束参数列表：`BotImpl<T, [string]>` 时扩展函数签名为
  `(arg: string, options?: Record<string, unknown>) => MaybePromise<unknown>`。
- `BotImpl` 只影响类型，运行时仍需自行保证 Bot 实例实现了对应成员。

需要留意的几点：

- 已声明的标准方法保留精确的参数与返回类型；
- `notice` 重载的监听器参数在源码中写作 `RequestEvent | ExtendedEvent<'notice'>`；
- 由于 `Bot` 包含字符串索引签名，`class ... implements Bot` 需要类自身也声明兼容的
  索引签名。实现端通常先定义自己的类或对象，在作为 `Bot` 使用时再断言类型；
- 另导出 `StandardAPI = Exclude<keyof StandardBot, 'on' | 'off'>`，表示标准成员键名
  的联合类型（仍包含 `selfInfo` 和 `logger`）。

建立连接、发送动作请求等具体逻辑由使用者实现。
