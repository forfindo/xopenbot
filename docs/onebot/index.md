---
outline: deep
---

# @xopenbot/onebot

`@xopenbot/onebot` 提供 OneBot 12 协议的 **TypeScript 类型契约**，依据
[OneBot 接口定义](https://github.com/botuniverse/onebot/tree/master/specs/interface) 编写。

包内绝大多数导出都是类型：

- `Bot` / `BotImpl` / `BotAPIOptions`：应用端机器人接口、实现约束与依赖选项；
- 全部标准动作的参数与响应类型（`ActionMap`）；
- 元事件、消息事件、通知事件、请求事件及扩展事件；
- 10 种标准消息段与扩展消息段；
- 动作请求、动作响应、返回码等公共类型。

运行时只额外导出 CQ 码互转函数与两个类型守卫：

- `toCQCode` / `fromCQCode`
- `isExtendedSegment` / `isExtendedEvent`

> 类型请使用 `import type` 导入；运行时函数使用普通 `import`。

## 安装

```bash
pnpm add @xopenbot/onebot
```

## 快速开始

```ts
import type {
  ActionMap,
  AnyMessageSegment,
  GroupMessageEvent,
  OneBotEvent
} from '@xopenbot/onebot';
```

### CQ 码互转

```ts
import { fromCQCode, toCQCode } from '@xopenbot/onebot';

const code = toCQCode([
  { type: 'text', data: { text: '你好' } },
  { type: 'mention', data: { user_id: '10000' } }
]);
// [CQ:text,text=你好][CQ:mention,user_id=10000]

const segments = fromCQCode(code);
```

CQ 码中的 `&`、`[`、`]`、`,`、`#` 会被转义；解析时还原为消息段，普通文本会转换为
`text` 消息段。

## 导出总览

### 运行时导出

| 名称 | 签名 | 说明 |
| --- | --- | --- |
| `toCQCode` | `(message: AnyMessageSegment \| AnyMessageSegment[]) => string` | 消息段转 CQ 码 |
| `fromCQCode` | `(code: string) => AnyMessageSegment[]` | CQ 码转消息段数组 |
| `isExtendedSegment` | `(segment: AnyMessageSegment) => segment is ExtendedSegment` | 判断扩展消息段 |
| `isExtendedEvent` | `(event: OneBotEvent) => event is ExtendedEvent` | 判断扩展事件 |

### 类型导出

| 分类 | 主要类型 |
| --- | --- |
| Bot 接口 | `Bot`、`BotAPIOptions`、`BotImpl`、`StandardAPI` |
| 公共规则 | `Extensible`、`MaybePromise` |
| Connect 基础类型 | `ActionDefinition`、`ActionRequest`、`ActionResponse`、`EventBase`、`NonMetaEventBase`、`EventType`、`NonMetaEventType`、`Self`、`Status`、`BotStatus`、`VersionInfo` |
| 动作 | `ActionMap`、`ActionName`、`MetaActionName`、`PlatformActionName`、`StandardActionRequest`、`StandardActionResponse` |
| 消息 | `Message`、`MessageEventBase`、`Bytes` |
| 消息段 | `SegmentOf`、`Text`、`Mention`、`MentionAll`、`Image`、`Voice`、`Audio`、`Video`、`File`、`Location`、`Reply`、`StandardSegment`、`ExtendedSegment`、`AnyMessageSegment`、`FileIdData` |
| 事件 | `MessageEvent`、`PrivateMessageEvent`、`GroupMessageEvent`、`ChannelMessageEvent`、`NoticeEvent`、`RequestEvent`、`MetaEvent`、`MetaConnectEvent`、`MetaHeartbeatEvent`、`MetaStatusUpdateEvent`、`OneBotEvent`、`NonMetaEvent`、`ExtendedEvent` |
| 通知事件 | `FriendIncreaseEvent`、`FriendDecreaseEvent`、`PrivateMessageDeleteEvent`、`GroupMemberIncreaseEvent`、`GroupMemberDecreaseEvent`、`GroupMessageDeleteEvent`、`GuildMemberIncreaseEvent`、`GuildMemberDecreaseEvent`、`ChannelMemberIncreaseEvent`、`ChannelMemberDecreaseEvent`、`ChannelMessageDeleteEvent`、`ChannelCreateEvent`、`ChannelDeleteEvent` |
| 通知子类型 | `MemberIncreaseSubType`、`MemberDecreaseSubType`、`MessageDeleteSubType` |
| 实体信息 | `UserInfo`、`FriendInfo`、`GroupInfo`、`GroupMemberInfo`、`GuildInfo`、`GuildMemberInfo`、`ChannelInfo`、`ChannelMemberInfo` |
| 动作参数与结果 | `SendMessageParams`、`SendMessageResult`、`DeleteMessageParams`、`GetLatestEventsParams`、`GetUserInfoParams`、`GetGroupInfoParams`、`GetGroupMemberInfoParams`、`GetGroupMemberListParams`、`SetGroupNameParams`、`LeaveGroupParams`、`GetGuildInfoParams`、`SetGuildNameParams`、`GetGuildMemberInfoParams`、`GetGuildMemberListParams`、`LeaveGuildParams`、`GetChannelInfoParams`、`GetChannelListParams`、`SetChannelNameParams`、`GetChannelMemberInfoParams`、`GetChannelMemberListParams`、`LeaveChannelParams`、`UploadFileParams`、`UploadFileResult`、`UploadFileFragmentedParams`、`UploadFileFragmentedResult`、`GetFileParams`、`GetFileResult`、`GetFileFragmentedParams`、`GetFileFragmentedResult`、`UploadFileType`、`FileTransferType` |
| 返回码 | `RetCode`、`RetCodeMap` |

## Bot 接口

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

### 标准方法一览

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

### 事件监听

`on` / `off` 当前声明了 `message`、`request`、`notice`、`meta` 四组重载：

```ts
bot.on?.('message', event => {
  event.type; // 'message'
});
```

### 必选成员与依赖声明

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

## 动作与 ActionMap

`ActionMap` 将每个标准动作映射到参数与响应数据，`ActionName` 是全部 31 个动作名的
联合类型：

```ts
import type {
  ActionMap,
  ActionName,
  MetaActionName,
  PlatformActionName,
  StandardActionRequest,
  StandardActionResponse
} from '@xopenbot/onebot';

type All = ActionName;
type Meta = MetaActionName; // get_latest_events | get_supported_actions | get_status | get_version
type Platform = PlatformActionName; // 除元动作外的标准动作

// 参数与响应通过 ActionMap 关联
type Result = ActionMap['send_message']['result']; // SendMessageResult

declare const request: StandardActionRequest<'send_message'>;
declare const response: StandardActionResponse<'send_message'>;
```

| 动作名 | Bot 方法 | 参数类型 | 响应类型 |
| --- | --- | --- | --- |
| `get_latest_events` | `getLatestEvents` | `GetLatestEventsParams` | `OneBotEvent[]` |
| `get_supported_actions` | `getSupportedActions` | `Record<string, never>` | `string[]` |
| `get_status` | `getStatus` | `Record<string, never>` | `Status` |
| `get_version` | `getVersion` | `Record<string, never>` | `VersionInfo` |
| `send_message` | `sendMessage` | `SendMessageParams` | `SendMessageResult` |
| `delete_message` | `deleteMessage` | `DeleteMessageParams` | `null` |
| `get_self_info` | `getSelfInfo` | `Record<string, never>` | `UserInfo` |
| `get_user_info` | `getUserInfo` | `GetUserInfoParams` | `FriendInfo` |
| `get_friend_list` | `getFriendList` | `Record<string, never>` | `FriendInfo[]` |
| `get_group_info` | `getGroupInfo` | `GetGroupInfoParams` | `GroupInfo` |
| `get_group_list` | `getGroupList` | `Record<string, never>` | `GroupInfo[]` |
| `get_group_member_info` | `getGroupMemberInfo` | `GetGroupMemberInfoParams` | `GroupMemberInfo` |
| `get_group_member_list` | `getGroupMemberList` | `GetGroupMemberListParams` | `GroupMemberInfo[]` |
| `set_group_name` | `setGroupName` | `SetGroupNameParams` | `null` |
| `leave_group` | `leaveGroup` | `LeaveGroupParams` | `null` |
| `get_guild_info` | `getGuildInfo` | `GetGuildInfoParams` | `GuildInfo` |
| `get_guild_list` | `getGuildList` | `Record<string, never>` | `GuildInfo[]` |
| `set_guild_name` | `setGuildName` | `SetGuildNameParams` | `null` |
| `get_guild_member_info` | `getGuildMemberInfo` | `GetGuildMemberInfoParams` | `GuildMemberInfo` |
| `get_guild_member_list` | `getGuildMemberList` | `GetGuildMemberListParams` | `GuildMemberInfo[]` |
| `leave_guild` | `leaveGuild` | `LeaveGuildParams` | `null` |
| `get_channel_info` | `getChannelInfo` | `GetChannelInfoParams` | `ChannelInfo` |
| `get_channel_list` | `getChannelList` | `GetChannelListParams` | `ChannelInfo[]` |
| `set_channel_name` | `setChannelName` | `SetChannelNameParams` | `null` |
| `get_channel_member_info` | `getChannelMemberInfo` | `GetChannelMemberInfoParams` | `ChannelMemberInfo` |
| `get_channel_member_list` | `getChannelMemberList` | `GetChannelMemberListParams` | `ChannelMemberInfo[]` |
| `leave_channel` | `leaveChannel` | `LeaveChannelParams` | `null` |
| `upload_file` | `uploadFile` | `UploadFileParams` | `UploadFileResult` |
| `upload_file_fragmented` | `uploadFileFragmented` | `UploadFileFragmentedParams` | `UploadFileFragmentedResult` |
| `get_file` | `getFile` | `GetFileParams` | `GetFileResult` |
| `get_file_fragmented` | `getFileFragmented` | `GetFileFragmentedParams` | `GetFileFragmentedResult` |

`ActionMap` 是一个接口，可以通过声明合并扩展自定义动作。扩展动作名建议使用
`<prefix>.<name>` 形式：

```ts
declare module '@xopenbot/onebot' {
  interface ActionMap {
    'qq.get_group_honor_info': {
      params: { group_id: string };
      result: { honors: string[] };
    };
  }
}
```

通用的动作请求与响应类型：

```ts
import type { ActionRequest, ActionResponse } from '@xopenbot/onebot';

declare const request: ActionRequest<{ user_id: string }>;
declare const response: ActionResponse<{ message_id: string }>;
```

`uploadFile` 支持四种重载：

```ts
uploadFile(type: 'url', name: string, url: string, sha256?, headers?, options?): MaybePromise<UploadFileResult>;
uploadFile(type: 'path', name: string, path: string, sha256?, options?): MaybePromise<UploadFileResult>;
uploadFile(type: 'data', name: string, data: Bytes, sha256?, options?): MaybePromise<UploadFileResult>;
uploadFile(type: string, name: string, sha256?, options?): MaybePromise<UploadFileResult>;
```

## 消息与消息段

消息内容可以是纯文本 `string`、单个消息段，或消息段数组：

```ts
import type { AnyMessageSegment, Message } from '@xopenbot/onebot';

const message: AnyMessageSegment[] = [
  { type: 'text', data: { text: '你好' } },
  { type: 'mention', data: { user_id: '10000' } },
  { type: 'image', data: { file_id: 'file-1' } }
];

const content: Message = '你好';
```

消息事件中的 `message` 字段固定为 `AnyMessageSegment[]`；动作请求参数使用 `Message`。

### 标准消息段

| `type` | 数据类型 | 说明 |
| --- | --- | --- |
| `text` | `{ text: string }` | 纯文本 |
| `mention` | `{ user_id: string }` | 提及用户 |
| `mention_all` | 无额外字段 | 提及所有人 |
| `image` | `{ file_id: string }` | 图片 |
| `voice` | `{ file_id: string }` | 语音 |
| `audio` | `{ file_id: string }` | 音频 |
| `video` | `{ file_id: string }` | 视频 |
| `file` | `{ file_id: string }` | 文件 |
| `location` | `{ latitude: number; longitude: number; title: string; content: string }` | 位置 |
| `reply` | `{ message_id: string; user_id?: string }` | 回复 |

`AnyMessageSegment` 是 `StandardSegment | ExtendedSegment` 的联合类型。运行时可以用
`isExtendedSegment` 判断并收窄：

```ts
import type { AnyMessageSegment } from '@xopenbot/onebot';
import { isExtendedSegment } from '@xopenbot/onebot';

function handle(segment: AnyMessageSegment): void {
  if (isExtendedSegment(segment)) {
    segment.type; // string
    segment.data; // 扩展消息段数据
  }
}
```

## 事件

事件使用 `type` 和 `detail_type` 作为判别字段。`NonMetaEvent` 是标准事件（不含元事件
和宽泛的 `ExtendedEvent`）的联合类型，可以直接收窄：

```ts
import type { NonMetaEvent } from '@xopenbot/onebot';

function handle(event: NonMetaEvent): void {
  if (event.type === 'message' && event.detail_type === 'group') {
    event.group_id; // string
    event.user_id; // string
    event.alt_message; // string
  }

  if (event.type === 'notice' && event.detail_type === 'friend_increase') {
    event.user_id; // string
  }
}
```

`OneBotEvent` 还包含宽泛的 `ExtendedEvent`，直接收窄后未知字段的类型是 `unknown`。
需要精确类型时可以写类型守卫：

```ts
import type { GroupMessageEvent, OneBotEvent } from '@xopenbot/onebot';

function isGroupMessage(event: OneBotEvent): event is GroupMessageEvent {
  return event.type === 'message' && event.detail_type === 'group';
}

function handle(event: OneBotEvent): void {
  if (isGroupMessage(event)) {
    event.group_id; // string
    event.alt_message; // string
  }
}
```

需要判断事件是否为扩展事件时，可以使用 `isExtendedEvent`：

```ts
import type { OneBotEvent } from '@xopenbot/onebot';
import { isExtendedEvent } from '@xopenbot/onebot';

function handle(event: OneBotEvent): void {
  if (isExtendedEvent(event)) {
    event.type; // 非标准事件类型
    event.detail_type; // string
    event['qq.raw_event_id']; // unknown
  }
}
```

`isExtendedEvent` 会排除全部标准事件（元事件、标准消息事件、标准通知事件），但
`type` 为 `request` 的事件始终返回 `false`。

### 标准事件

| 事件 | `type` | `detail_type` | 主要字段 |
| --- | --- | --- | --- |
| 连接事件 | `meta` | `connect` | `version` |
| 心跳事件 | `meta` | `heartbeat` | `interval` |
| 状态更新 | `meta` | `status_update` | `status` |
| 私聊消息 | `message` | `private` | `user_id`、`message_id`、`message`、`alt_message` |
| 群聊消息 | `message` | `group` | `group_id`、`user_id`、`message_id`、`message`、`alt_message` |
| 频道消息 | `message` | `channel` | `guild_id`、`channel_id`、`user_id`、`message_id`、`message`、`alt_message` |
| 好友增加 | `notice` | `friend_increase` | `user_id` |
| 好友减少 | `notice` | `friend_decrease` | `user_id` |
| 私聊消息删除 | `notice` | `private_message_delete` | `message_id`、`user_id` |
| 群成员增加 | `notice` | `group_member_increase` | `group_id`、`user_id`、`operator_id` |
| 群成员减少 | `notice` | `group_member_decrease` | `group_id`、`user_id`、`operator_id` |
| 群消息删除 | `notice` | `group_message_delete` | `group_id`、`message_id`、`user_id`、`operator_id` |
| 群组成员增加 | `notice` | `guild_member_increase` | `guild_id`、`user_id`、`operator_id` |
| 群组成员减少 | `notice` | `guild_member_decrease` | `guild_id`、`user_id`、`operator_id` |
| 频道成员增加 | `notice` | `channel_member_increase` | `guild_id`、`channel_id`、`user_id`、`operator_id` |
| 频道成员减少 | `notice` | `channel_member_decrease` | `guild_id`、`channel_id`、`user_id`、`operator_id` |
| 频道消息删除 | `notice` | `channel_message_delete` | `guild_id`、`channel_id`、`message_id`、`user_id`、`operator_id` |
| 频道新建 | `notice` | `channel_create` | `guild_id`、`channel_id`、`operator_id` |
| 频道删除 | `notice` | `channel_delete` | `guild_id`、`channel_id`、`operator_id` |

所有事件都包含 `id`、`time`、`type`、`detail_type`、`sub_type`；除元事件外的标准事件
还包含 `self`（`Self`）。通知事件的 `sub_type` 会收窄为：

- 成员增加：`'join' | 'invite' | ''`
- 成员减少：`'leave' | 'kick' | ''`
- 消息删除：`'recall' | 'delete' | ''`

扩展事件可以通过泛型指定 `type` 与 `detail_type`：

```ts
import type { ExtendedEvent } from '@xopenbot/onebot';

type QqGroupFileUploadEvent = ExtendedEvent<'notice', 'qq.group_file_upload'> & {
  group_id: string;
  file_id: string;
};
```

## 返回码

返回码以类型映射的形式提供，不包含运行时常量：

```ts
import type { RetCode, RetCodeMap } from '@xopenbot/onebot';

const success: RetCode = 0;
const platformError: RetCode = 34_000;
type PlatformError = RetCodeMap['PlatformError']; // 34000
```

| 名称 | 值 | 说明 |
| --- | --- | --- |
| `OK` | `0` | 成功 |
| `BadRequest` | `10001` | 无效的动作请求 |
| `UnsupportedAction` | `10002` | 不支持的动作请求 |
| `BadParam` | `10003` | 无效的动作请求参数 |
| `UnsupportedParam` | `10004` | 不支持的动作请求参数 |
| `UnsupportedSegment` | `10005` | 不支持的消息段类型 |
| `BadSegmentData` | `10006` | 无效的消息段参数 |
| `UnsupportedSegmentData` | `10007` | 不支持的消息段参数 |
| `WhoAmI` | `10101` | 未指定机器人账号 |
| `UnknownSelf` | `10102` | 未知的机器人账号 |
| `BadHandler` | `20001` | 动作处理器实现错误 |
| `InternalHandlerError` | `20002` | 动作处理器运行时抛出异常 |
| `DatabaseError` | `31000` | 数据库错误 |
| `FilesystemError` | `32000` | 文件系统错误 |
| `NetworkError` | `33000` | 网络错误 |
| `PlatformError` | `34000` | 机器人平台错误 |
| `LogicError` | `35000` | 动作逻辑错误 |
| `IAmTired` | `36000` | 实现自定义错误 |

`RetCodeMap` 同样支持通过声明合并补充自定义返回码：

```ts
declare module '@xopenbot/onebot' {
  interface RetCodeMap {
    QqGroupNotFound: 34_101;
  }
}
```

## 扩展字段

OneBot 允许实现添加扩展字段，扩展字段名建议使用 `<prefix>.` 前缀（如
`qq.raw_event_id`）。`Extensible` 为这些对象提供了字符串索引签名：

```ts
interface Extensible {
  [key: string]: unknown;
}
```

动作请求、动作响应、实体信息、事件、消息段数据等类型均继承了 `Extensible`。

## 目录结构

```text
packages/onebot
├── src
│   ├── index.ts            # 包入口，导出 Bot 与全部类型
│   ├── bot.ts              # 应用端 Bot 接口类型
│   ├── action-map.ts       # ActionMap 与标准动作请求/响应
│   ├── event.ts            # 事件联合类型与扩展事件
│   ├── rules.ts            # 扩展字段规则
│   ├── connect             # OneBot Connect 基础类型
│   ├── meta                # 元动作与元事件
│   ├── message             # 消息类型、消息段与消息动作
│   ├── user                # 用户信息、私聊消息与用户通知事件
│   ├── group               # 群信息、群消息与群通知事件
│   ├── guild               # 群组/频道信息、消息与通知事件
│   ├── file                # 文件动作
│   └── common              # 跨分类公共类型与运行时工具
├── dist                    # rollup 构建产物
├── rollup.config.js
├── tsconfig.json
└── package.json
```

## 开发与构建

`package.json` 的 `module` / `types` 与 `exports` 均指向 `dist`，发布前需要通过
rollup 构建：

```bash
pnpm --filter @xopenbot/onebot build
```

类型检查与代码检查在仓库根目录执行：

```bash
pnpm check
pnpm lint
```

根 `tsconfig.json` 的 project references 已包含 `packages/onebot`，`pnpm check`
会一并检查本包。

## 相关链接

- [OneBot 12 标准](https://github.com/botuniverse/onebot)
- [包 README](https://github.com/forfindo/xopenbot/tree/main/packages/onebot)
