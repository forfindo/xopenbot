---
outline: deep
---

# 事件

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

## 标准事件

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

## 扩展事件

扩展事件可以通过泛型指定 `type` 与 `detail_type`：

```ts
import type { ExtendedEvent } from '@xopenbot/onebot';

type QqGroupFileUploadEvent = ExtendedEvent<'notice', 'qq.group_file_upload'> & {
  group_id: string;
  file_id: string;
};
```

事件类型清单见 [导出总览](/onebot/reference/exports)。
