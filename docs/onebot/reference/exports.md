---
outline: deep
---

# 导出总览

## 运行时导出

| 名称 | 签名 | 说明 |
| --- | --- | --- |
| `toCQCode` | `(message: AnyMessageSegment \| AnyMessageSegment[]) => string` | 消息段转 CQ 码 |
| `fromCQCode` | `(code: string) => AnyMessageSegment[]` | CQ 码转消息段数组 |
| `isExtendedSegment` | `(segment: AnyMessageSegment) => segment is ExtendedSegment` | 判断扩展消息段 |
| `isExtendedEvent` | `(event: OneBotEvent) => event is ExtendedEvent` | 判断扩展事件 |

## 类型导出

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
