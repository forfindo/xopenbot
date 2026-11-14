import type { Self } from './connect/self';
import type { EventBase, EventType, NonMetaEventBase } from './connect/event';
import type {
  ChannelCreateEvent,
  ChannelDeleteEvent,
  ChannelMemberDecreaseEvent,
  ChannelMemberIncreaseEvent,
  ChannelMessageDeleteEvent,
  GuildMemberDecreaseEvent,
  GuildMemberIncreaseEvent
} from './guild/notice-events';
import type { ChannelMessageEvent } from './guild/message-events';
import type {
  GroupMemberDecreaseEvent,
  GroupMemberIncreaseEvent,
  GroupMessageDeleteEvent
} from './group/notice-events';
import type { GroupMessageEvent } from './group/message-events';
import type { MetaEvent } from './meta/events';
import type {
  FriendDecreaseEvent,
  FriendIncreaseEvent,
  PrivateMessageDeleteEvent
} from './user/notice-events';
import type { PrivateMessageEvent } from './user/message-events';

declare const extension_event: unique symbol;

/** 消息事件 */
export type MessageEvent = PrivateMessageEvent | GroupMessageEvent | ChannelMessageEvent;

/** 通知事件 */
export type NoticeEvent =
  | FriendIncreaseEvent
  | FriendDecreaseEvent
  | PrivateMessageDeleteEvent
  | GroupMemberIncreaseEvent
  | GroupMemberDecreaseEvent
  | GroupMessageDeleteEvent
  | GuildMemberIncreaseEvent
  | GuildMemberDecreaseEvent
  | ChannelMemberIncreaseEvent
  | ChannelMemberDecreaseEvent
  | ChannelMessageDeleteEvent
  | ChannelCreateEvent
  | ChannelDeleteEvent;

/** 请求事件。标准中暂未定义具体的请求事件，实现可通过扩展字段携带数据 */
export type RequestEvent = NonMetaEventBase<'request', string> & Record<string, unknown>;

/**
 * 扩展事件。
 *
 * OneBot 实现可以扩展事件的具体类型（`detail_type`），扩展的类型名建议使用
 * `<prefix>.` 前缀。扩展事件建议包含事件的基本字段。
 *
 * 可以指定 `type` 和 `detail_type` 得到更精确的定义：
 *
 * ```ts
 * type QqGroupFileUploadEvent = ExtendedEvent<'notice', 'qq.group_file_upload'> & {
 *   group_id: string;
 *   file_id: string;
 * };
 * ```
 */
export type ExtendedEvent<T extends EventType = EventType, D extends string = string> = EventBase<
  T,
  D
> & {
  self: Self;
  readonly [extension_event]: true;
  [key: string]: unknown;
};

/** 所有标准事件与扩展事件的联合类型 */
export type OneBotEvent = MetaEvent | MessageEvent | NoticeEvent | RequestEvent | ExtendedEvent;

/** 除元事件外的标准事件 */
export type NonMetaEvent = MessageEvent | NoticeEvent | RequestEvent;

export function isExtendedEvent(e: OneBotEvent): e is ExtendedEvent {
  if (e.type === 'meta') {
    return (
      e.detail_type !== 'connect' &&
      e.detail_type !== 'heartbeat' &&
      e.detail_type !== 'status_update'
    );
  }
  if (e.type === 'message') {
    return e.detail_type !== 'private' && e.detail_type !== 'group' && e.detail_type !== 'channel';
  }
  if (e.type === 'notice') {
    return (
      e.detail_type !== 'guild_member_decrease' &&
      e.detail_type !== 'channel_member_decrease' &&
      e.detail_type !== 'channel_create' &&
      e.detail_type !== 'channel_delete' &&
      e.detail_type !== 'channel_message_delete' &&
      e.detail_type !== 'group_message_delete' &&
      e.detail_type !== 'private_message_delete' &&
      e.detail_type !== 'channel_member_increase' &&
      e.detail_type !== 'friend_decrease' &&
      e.detail_type !== 'friend_increase' &&
      e.detail_type !== 'group_member_decrease' &&
      e.detail_type !== 'group_member_increase' &&
      e.detail_type !== 'guild_member_increase'
    );
  }
  if (e.type === 'request') {
    return false;
  }
  return false;
}
