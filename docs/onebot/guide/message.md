---
outline: deep
---

# 消息与消息段

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

## 标准消息段

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

## 扩展消息段

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
