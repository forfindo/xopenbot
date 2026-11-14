import type { Extensible } from '../rules';

declare const extension_segment: unique symbol;

/** 消息段通用结构：`type` 为类型字面量，`data` 允许扩展字段 */
export type SegmentOf<T extends string, D extends object> = {
  type: T;
  data: D & Extensible;
};

/** 带 `file_id` 的消息段数据，`image`/`voice`/`audio`/`video`/`file` 共用 */
export interface FileIdData {
  /** 文件 ID */
  file_id: string;
}

/** `text` 纯文本消息段 */
export type Text = SegmentOf<
  'text',
  {
    /** 纯文本内容 */
    text: string;
  }
>;

/** `mention` 提及消息段 */
export type Mention = SegmentOf<
  'mention',
  {
    /** 提及的用户 ID */
    user_id: string;
  }
>;

/** `mention_all` 提及所有人消息段，无参数 */
export type MentionAll = SegmentOf<'mention_all', Extensible>;

/** `image` 图片消息段 */
export type Image = SegmentOf<'image', FileIdData>;

/** `voice` 语音消息段 */
export type Voice = SegmentOf<'voice', FileIdData>;

/** `audio` 音频消息段 */
export type Audio = SegmentOf<'audio', FileIdData>;

/** `video` 视频消息段 */
export type Video = SegmentOf<'video', FileIdData>;

/** `file` 文件消息段 */
export type File = SegmentOf<'file', FileIdData>;

/** `location` 位置消息段 */
export type Location = SegmentOf<
  'location',
  {
    /** 纬度 */
    latitude: number;
    /** 经度 */
    longitude: number;
    /** 标题 */
    title: string;
    /** 地址内容 */
    content: string;
  }
>;

/** `reply` 回复消息段 */
export type Reply = SegmentOf<
  'reply',
  {
    /** 回复的消息 ID */
    message_id: string;
    /** 回复的消息发送者 ID，发送时可以不传入 */
    user_id?: string;
  }
>;

export type ExtendedSegment = SegmentOf<
  string,
  {
    readonly [extension_segment]: true;
    [key: string]: unknown;
  }
>;

/** 标准消息段 */
export type StandardSegment =
  | Text
  | Mention
  | MentionAll
  | Image
  | Voice
  | Audio
  | Video
  | File
  | Location
  | Reply;

/** 任意标准或扩展消息段 */
export type AnyMessageSegment = StandardSegment | ExtendedSegment;

export function isExtendedSegment(segment: AnyMessageSegment): segment is ExtendedSegment {
  if (!('type' in segment) && !('data' in segment)) {
    return false;
  }
  return (
    segment.type !== 'text' &&
    segment.type !== 'mention' &&
    segment.type !== 'mention_all' &&
    segment.type !== 'file' &&
    segment.type !== 'image' &&
    segment.type !== 'reply' &&
    segment.type !== 'video' &&
    segment.type !== 'voice' &&
    segment.type !== 'audio' &&
    segment.type !== 'location'
  );
}
