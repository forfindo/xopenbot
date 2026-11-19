---
outline: deep
---

# 返回码与扩展字段

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
