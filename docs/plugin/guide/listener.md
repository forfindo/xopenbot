---
outline: deep
---

# 事件监听

插件可以实现 `loadListener()` 返回 `Listener`：键为事件名，值为回调或回调数组。工作区
会在插件注册完成后自动挂载监听，并在 `deregister` 时移除：

```ts
loadListener() {
  return {
    message: ctx => {
      ctx.logger.debug('收到消息');
    },
    // 同一个事件也可以注册多个回调
    'my.custom': [
      ctx => ctx.logger.debug('自定义事件', ctx.event),
      ctx => ctx.logger.debug('第二个回调')
    ]
  };
}
```

内置事件 `message` / `request` / `notice` / `meta` 会监听 bot 的对应事件；其余事件名
注册在工作区事件总线上，可通过 `ctx.emit` 派发：

```ts
execute(input, ctx) {
  ctx.emit('my.custom', { input });
  return { content: [{ type: 'text', text: '已派发' }] };
}
```

内置事件的 `ctx.event` 会按事件类型收窄（`message` 为 `MessageEvent`，`request` 为
`RequestEvent` 等）；自定义事件的 `ctx.event` 是 `any`，需要自己断言：

```ts
'my.custom': ctx => {
  const e = ctx.event as { input: string };
  ctx.logger.debug(e.input);
}
```

事件名带 `.` 时会按层级派发：`ctx.emit('a.b.c')` 会依次触发 `a`、`a.b`、`a.b.c`
的监听器。回调的 `ctx.event` 是派发时传入的第一个参数。

监听回调支持同步或异步（返回 `Promise`）。回调抛错或被 reject 时只会记录到
`logger.error`，不会影响同一事件上的其他监听器。

## Listener 类型

```ts
type ListenerCallback<M extends Manifest, T = any> = (
  ctx: PluginContext<M> & { event: T }
) => MaybePromise<void | undefined | null>;

type Listener<M extends Manifest> = {
  message?: ListenerCallback<M, MessageEvent> | ListenerCallback<M, MessageEvent>[];
  request?: ListenerCallback<M, RequestEvent> | ListenerCallback<M, RequestEvent>[];
  notice?: ListenerCallback<M, NoticeEvent> | ListenerCallback<M, NoticeEvent>[];
  meta?: ListenerCallback<M, MetaEvent> | ListenerCallback<M, MetaEvent>[];
} & Record<string, ListenerCallback<M> | ListenerCallback<M>[]>;
```
