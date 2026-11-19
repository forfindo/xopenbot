---
outline: deep
---

# 沙箱内置 API

`bridge.ts` 通过 `sandbox.include()` 注入以下能力：

| 名称 | 说明 |
| --- | --- |
| `$` | 机器人 API：`sendPrivateMsg`、`sendGroupMsg`、`sendDiscussMsg`、`deleteMsg`、`getGroupInfo`、`ajax`、`get` |
| `fetch` | HTTP 请求，支持 `fetch.get`、`fetch.post`、`fetch.request` |
| `setTimeout` / `clearTimeout` | 受限的延时任务；`setTimeout` 返回数字 id，`clearTimeout` 接收该 id |
| `crypto` | Node `crypto` 模块 |
| `path` | Node `path` 模块 |
| `os` | Node `os` 模块 |
| `zip` / `unzip` | `zlib.deflateSync` / `zlib.unzipSync` |
| `Buffer` | Node `Buffer` |
| `run` | 仅主人可用，在宿主侧 `eval` 任意代码 |

## 使用示例

群成员发送的消息会被当作 JavaScript 表达式执行：

```text
1 + 1          -> 2
Math.max(1,9)  -> 9
this.data.user_id
```

调试模式（以 `\` 开头）会返回带行号的错误：

```text
\ foo.bar
```

在消息中可以使用沙箱注入的能力：

```js
// 发送群消息
$.sendGroupMsg(this.data.group_id, 'hello');

// 私聊
$.sendPrivateMsg('10001', 'hello');

// 获取当前群信息
$.getGroupInfo();

// 发起 HTTP 请求（注意沙箱内没有 console）
fetch('https://example.com', res => {
  this.last_response = res;
});
fetch.post('https://example.com/api', { a: 1 }, res => {
  this.last_response = res;
});

// 延时任务（5000ms ~ 2^31-1），返回数字 id
const timer = setTimeout(() => {
  $.sendGroupMsg(this.data.group_id, 'later');
}, 5000);

// 需要时用同一个 id 取消
clearTimeout(timer);
```

## 拓展机器人 API

通过 `init` 的 `botAPI` 配置可以把宿主 `Bot` 上的方法暴露到沙箱的 `$` 下：

```ts
await init(bot, {
  master: ['10001'],
  // 传 API 名称（字符串），对应 bot[名称]；函数项会被忽略
  botAPI: ['getFriendList', 'getGroupMemberList']
});
```

沙箱内按「参数数组 + 可选回调」调用：

```js
// 只发起调用，忽略结果
$.getFriendList([]);

// 通过回调获取结果
$.getGroupMemberList([this.data.group_id], res => {
  // res = { data, error }
  if (res.error) {
    this.last_error = res.data;
  } else {
    this.members = res.data;
  }
});
```

说明：

- 第一个参数必须是**数组**，会作为调用参数原样传给对应 API；
- 第二个参数是可选的异步回调，回调参数为 `{ data, error }`：
  - 成功时 `error` 为 `false`，`data` 为 API 返回值；
  - 失败时 `error` 为 `true`，`data` 为错误信息字符串；
- 回调内继续发起异步调用同样受递归深度与频率限制（见[异步任务与限流](/sandbox/internals/async)）。

## 沙箱上下文

`sandbox.code.js` 定义了五个主要变量：

| 变量 | 说明 |
| --- | --- |
| `this.master` | 主人 QQ 列表（字符串），受保护 |
| `this.data` | 当前事件数据（环境变量），只读替换 |
| `this.database` | 群数据库，按群隔离 |
| `this.set_history` | 变量修改历史 |
| `this.protected_properties` | 受保护属性列表，受保护 |

常用判断与工具：

```js
this.isMaster();        // 当前用户是否主人
this.isProtected('master'); // 属性是否受保护
this.database[this.data.group_id].foo = 1;
```

## 钩子函数

沙箱支持以下钩子，默认均受保护（只有主人可修改）：

| 钩子 | 触发时机 |
| --- | --- |
| `afterInit()` | 沙箱加载完成 |
| `beforeExec(code)` | 用户代码执行前，可返回字符串替换待执行代码 |
| `afterExec(res)` | 用户代码执行后，可返回新结果 |
| `onEvents()` | 每个 QQ 事件 |
| `beforeApiCalled(params)` | 调用机器人 API 前 |

示例：

```js
this.beforeExec = code => {
  // 记录执行前的代码
  return code;
};

this.afterExec = res => {
  return res + ' (done)';
};
```
