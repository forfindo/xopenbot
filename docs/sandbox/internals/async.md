---
outline: deep
---

# 异步任务与限流

`bridge.ts` 向沙箱注入的 `setTimeout` / `fetch` 等异步能力都经过限制。

## 调用频率限制：checkFrequency

`bridge.ts` 以「触发事件的用户」为粒度做频率控制，`precheck`（调用机器人 API 前）、
`setTimeout` 和 `fetch.request` 都会先执行它：

- 计数按 `data.user_id` 分桶，每个桶记录最近一次调用时间与次数；
- 相邻调用间隔都在 300ms 内时计数累加，最多 3 次，第 4 次抛出 `调用频率太快。`；
- 距离上次调用超过 300ms 时桶被删除，计数清零。

## 异步任务递归检测：checkAndAddAsyncQueue

`bridge.ts` 用于防止用户通过回调反复发起异步任务形成「无限递归」。任务按
`self.user_id`、`group_id`、`user_id` 组成的队列隔离，并用「代际深度」描述异步延续链：

- `checkAndAddAsyncQueue(env)` 登记任务时，深度取队列当前深度 + 1（无正在执行的回调时
  为 0）；任务以自增 id 存入队列，并返回 `{ id, key, depth, env }`；
- 回调触发时由 `asyncCallback` 把队列深度置为该任务的深度，回调结束后再还原，因此
  回调内再调度的任务深度会继续 +1；
- 深度超过 `MAX_ASYNC_DEPTH`（5）时抛出 `判定为递归调用，中断。`，用于阻断回调内的
  无限自我续期；
- 任务执行完毕（或被 `clearTimeout` 取消）后从队列移除，队列为空时自动清理；
- 由新的 QQ 事件触发的任务深度总是从 0 开始，因此该检测只约束「同一回调链」，跨事件
  的自激由 `checkFrequency` 兜底。

## setTimeout 限制

- 返回自增数字 id，不向沙箱暴露宿主 `Timeout` 对象；`clearTimeout` 接收这个数字 id
  （传入其他值抛 `TypeError`）；
- 延迟必须在 5000ms 到 `2^31 - 1` 之间；
- 与其他异步能力共用 `checkFrequency` 频率限制；
- 与 `fetch` 共用上面的递归检测：回调内反复 `setTimeout` 会累计深度，超过 5 代即中断
  （即不支持回调内无限轮询，周期任务应由新的 QQ 事件驱动）。

## 其他限制

- `fetch` 默认 30 秒超时，HTTP 响应体限制 500KB，避免内存耗尽；
- 配置 `proxy` 不会绕过上述超时、响应上限、频率与递归深度限制；
- 输出内容经过敏感词过滤。
