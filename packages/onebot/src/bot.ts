import type { Status, VersionInfo } from './connect/status';
import type { MaybePromise } from './connect/utility';
import type { ExtendedEvent, OneBotEvent, RequestEvent } from './event';
import type {
  FileTransferType,
  GetFileFragmentedParams,
  GetFileFragmentedResult,
  GetFileResult,
  UploadFileFragmentedParams,
  UploadFileFragmentedResult,
  UploadFileResult
} from './file/actions';
import type { ChannelInfo, ChannelMemberInfo, GuildInfo, GuildMemberInfo } from './guild/actions';
import type { GroupInfo, GroupMemberInfo } from './group/actions';
import type { SendMessageResult } from './message/actions';
import type { Bytes, Message } from './message/type';
import type { FriendInfo, UserInfo } from './user/actions';
import type { MessageEvent } from './event';
import type { MetaEvent } from './meta/events';

/** 拓展action **/
interface ExtendedAction {
  [name: string]: (...args: unknown[]) => MaybePromise<unknown>;
}

/**
 * OneBot 应用端机器人
 */
interface StandardBot {
  /** 机器人自身信息 **/
  selfInfo?: UserInfo;

  /** 日志 **/
  logger?: {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  /** 消息事件 **/
  on?(name: 'message', listener: (e: MessageEvent | ExtendedEvent<'message'>) => void): void;
  off?(name: 'message', listener: (e: MessageEvent | ExtendedEvent<'message'>) => void): void;

  /** 请求事件 **/
  on?(name: 'request', listener: (e: RequestEvent | ExtendedEvent<'request'>) => void): void;
  off?(name: 'request', listener: (e: RequestEvent | ExtendedEvent<'request'>) => void): void;

  /** 通知事件 **/
  on?(name: 'notice', listener: (e: RequestEvent | ExtendedEvent<'notice'>) => void): void;
  off?(name: 'notice', listener: (e: RequestEvent | ExtendedEvent<'notice'>) => void): void;

  /** 元事件 **/
  on?(name: 'meta', listener: (e: MetaEvent | ExtendedEvent<'meta'>) => void): void;
  off?(name: 'meta', listener: (e: MetaEvent | ExtendedEvent<'meta'>) => void): void;

  // -------------------------------------------------------------------------
  // 元动作
  // -------------------------------------------------------------------------

  /** 获取最新事件列表 */
  getLatestEvents(
    limit?: number,
    timeout?: number,
    options?: Record<string, unknown>
  ): MaybePromise<OneBotEvent[]>;

  /** 获取支持的动作列表 */
  getSupportedActions(options?: Record<string, unknown>): MaybePromise<string[]>;

  /** 获取运行状态 */
  getStatus(options?: Record<string, unknown>): MaybePromise<Status>;

  /** 获取版本信息 */
  getVersion(options?: Record<string, unknown>): MaybePromise<VersionInfo>;

  // -------------------------------------------------------------------------
  // 消息动作
  // -------------------------------------------------------------------------

  /** 发送私聊消息 */
  sendPrivateMessage?(
    user_id: string,
    message: Message,
    options?: Record<string, unknown>
  ): MaybePromise<SendMessageResult>;

  /** 发送群聊消息 */
  sendGroupMessage?(
    group_id: string,
    message: Message,
    options?: Record<string, unknown>
  ): MaybePromise<SendMessageResult>;

  /** 发送频道消息 */
  sendChannelMessage?(
    guild_id: string,
    channel_id: string,
    message: Message,
    options?: Record<string, unknown>
  ): MaybePromise<SendMessageResult>;

  /** 发送扩展类型消息 */
  sendMessage?(
    detail_type: string,
    message: Message,
    options?: Record<string, unknown>
  ): MaybePromise<SendMessageResult>;

  /** 撤回消息 */
  deleteMessage?(message_id: string, options?: Record<string, unknown>): MaybePromise<null>;

  // -------------------------------------------------------------------------
  // 用户动作
  // -------------------------------------------------------------------------

  /** 获取机器人自身信息 */
  getSelfInfo?(options?: Record<string, unknown>): MaybePromise<UserInfo>;

  /** 获取用户信息 */
  getUserInfo?(user_id: string, options?: Record<string, unknown>): MaybePromise<FriendInfo>;

  /** 获取好友列表 */
  getFriendList?(options?: Record<string, unknown>): MaybePromise<FriendInfo[]>;

  // -------------------------------------------------------------------------
  // 群动作
  // -------------------------------------------------------------------------

  /** 获取群信息 */
  getGroupInfo?(group_id: string, options?: Record<string, unknown>): MaybePromise<GroupInfo>;

  /** 获取群列表 */
  getGroupList?(options?: Record<string, unknown>): MaybePromise<GroupInfo[]>;

  /** 获取群成员信息 */
  getGroupMemberInfo?(
    group_id: string,
    user_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<GroupMemberInfo>;

  /** 获取群成员列表 */
  getGroupMemberList?(
    group_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<GroupMemberInfo[]>;

  /** 设置群名称 */
  setGroupName?(
    group_id: string,
    group_name: string,
    options?: Record<string, unknown>
  ): MaybePromise<null>;

  /** 退出群 */
  leaveGroup?(group_id: string, options?: Record<string, unknown>): MaybePromise<null>;

  // -------------------------------------------------------------------------
  // 群组动作
  // -------------------------------------------------------------------------

  /** 获取群组信息 */
  getGuildInfo?(guild_id: string, options?: Record<string, unknown>): MaybePromise<GuildInfo>;

  /** 获取群组列表 */
  getGuildList?(options?: Record<string, unknown>): MaybePromise<GuildInfo[]>;

  /** 设置群组名称 */
  setGuildName?(
    guild_id: string,
    guild_name: string,
    options?: Record<string, unknown>
  ): MaybePromise<null>;

  /** 获取群组成员信息 */
  getGuildMemberInfo?(
    guild_id: string,
    user_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<GuildMemberInfo>;

  /** 获取群组成员列表 */
  getGuildMemberList?(
    guild_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<GuildMemberInfo[]>;

  /** 退出群组 */
  leaveGuild?(guild_id: string, options?: Record<string, unknown>): MaybePromise<null>;

  // -------------------------------------------------------------------------
  // 频道动作
  // -------------------------------------------------------------------------

  /** 获取频道信息 */
  getChannelInfo?(
    guild_id: string,
    channel_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<ChannelInfo>;

  /** 获取频道列表 */
  getChannelList?(
    guild_id: string,
    joined_only?: boolean,
    options?: Record<string, unknown>
  ): MaybePromise<ChannelInfo[]>;

  /** 设置频道名称 */
  setChannelName?(
    guild_id: string,
    channel_id: string,
    channel_name: string,
    options?: Record<string, unknown>
  ): MaybePromise<null>;

  /** 获取频道成员信息 */
  getChannelMemberInfo?(
    guild_id: string,
    channel_id: string,
    user_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<ChannelMemberInfo>;

  /** 获取频道成员列表 */
  getChannelMemberList?(
    guild_id: string,
    channel_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<ChannelMemberInfo[]>;

  /** 退出频道 */
  leaveChannel?(
    guild_id: string,
    channel_id: string,
    options?: Record<string, unknown>
  ): MaybePromise<null>;

  // -------------------------------------------------------------------------
  // 文件动作
  // -------------------------------------------------------------------------

  /** 通过 URL 上传文件 */
  uploadFile?(
    type: 'url',
    name: string,
    url: string,
    sha256?: string,
    headers?: Record<string, string>,
    options?: Record<string, unknown>
  ): MaybePromise<UploadFileResult>;

  /** 通过路径上传文件 */
  uploadFile?(
    type: 'path',
    name: string,
    path: string,
    sha256?: string,
    options?: Record<string, unknown>
  ): MaybePromise<UploadFileResult>;

  /** 直接上传文件数据 */
  uploadFile?(
    type: 'data',
    name: string,
    data: Bytes,
    sha256?: string,
    options?: Record<string, unknown>
  ): MaybePromise<UploadFileResult>;

  /** 以扩展方式上传文件 */
  uploadFile?(
    type: string,
    name: string,
    sha256?: string,
    options?: Record<string, unknown>
  ): MaybePromise<UploadFileResult>;

  /** 分片上传文件 */
  uploadFileFragmented?(
    params: UploadFileFragmentedParams
  ): MaybePromise<UploadFileFragmentedResult>;

  /** 获取文件 */
  getFile?(
    file_id: string,
    type: FileTransferType,
    options?: Record<string, unknown>
  ): MaybePromise<GetFileResult>;

  /** 分片获取文件 */
  getFileFragmented?(params: GetFileFragmentedParams): MaybePromise<GetFileFragmentedResult>;
}

export type Bot = StandardBot & ExtendedAction;

export type BotImpl<T extends keyof Bot> = Pick<Required<Bot>, T> & Bot;

export type StandardAPI = Exclude<keyof StandardBot, 'on' | 'off'>;
