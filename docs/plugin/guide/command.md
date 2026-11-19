---
outline: deep
---

# 命令与消息处理

## 处理消息

```ts
const outputs = await workspace.process('echo 你好', {});

// [
//   {
//     plugin: 'echo',
//     name: 'echo',
//     content: [{ type: 'text', text: '你好' }]
//   }
// ]
```

返回值的 `content` 是 `Part[]`，如何转换成 QQ 消息由调用方决定。`process` 的第二个
参数是额外的消息上下文，会合并进命令 `execute` 的 `ctx`；但 `logger`、`bot`、`emit`、
`state` 由工作区强制覆盖，传入的同名键不会生效。

命令默认在第一个命中后停止匹配，只有 `execute` 返回 `{ next: true }` 时才会继续尝试
后续命令，最终的返回值会是多个命令结果的数组。

`execute` 的第三个参数是 `pattern` 的捕获组（`result.slice(1)`）：

```ts
{
  pattern: /^set\s+(\w+)\s+(.+)$/i,
  execute(input, ctx, args) {
    const [key, value] = args ?? [];
    return { content: [{ type: 'text', text: `${key}=${value}` }] };
  }
}
```

## 命令匹配规则

- `pattern` 可以是字符串或正则；字符串会被转换为正则，未以 `^` 开头时自动补上 `^`。
- 全部命令按 `priority` 升序执行，数字越小越先执行。
- 命中后默认停止；只有 `execute` 返回 `{ next: true }` 时继续匹配后续命令。

## 卸载插件

```ts
workspace.deregister('echo');
```

`deregister` 按插件的 `info.name` 删除该插件的插件信息、全部命令、`init` 注入的 API
与该插件的 `state`，取消它的所有定时任务，并移除 `loadListener` 注册的全部事件监听。
重复注册同名插件时会先自动执行一次 `deregister`，因此插件状态会重置，监听器也不会
重复挂载。
