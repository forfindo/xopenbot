---
outline: deep
---

# 动作与 ActionMap

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

## 标准动作映射

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

## 扩展自定义动作

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

## uploadFile 重载

`uploadFile` 支持四种重载：

```ts
uploadFile(type: 'url', name: string, url: string, sha256?, headers?, options?): MaybePromise<UploadFileResult>;
uploadFile(type: 'path', name: string, path: string, sha256?, options?): MaybePromise<UploadFileResult>;
uploadFile(type: 'data', name: string, data: Bytes, sha256?, options?): MaybePromise<UploadFileResult>;
uploadFile(type: string, name: string, sha256?, options?): MaybePromise<UploadFileResult>;
```
