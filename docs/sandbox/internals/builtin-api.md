---
outline: deep
---

# 沙箱内置 API

`bridge.ts` 通过 `sandbox.include()` 注入以下能力：

| 名称 | 说明 |
| --- | --- |
| `$` | 机器人 API：`sendPrivateMsg`、`sendGroupMsg`、`sendDiscussMsg`、`deleteMsg`、`getGroupInfo`、`ajax`、`get` |
| `fetch` | HTTP 请求，支持 `fetch.get`、`fetch.post`、`fetch.request` 与 http(s) 代理 |
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

## HTTP 请求与代理

`fetch` 有四个入口：

| 入口 | 说明 |
| --- | --- |
| `fetch(url, place?, callback?)` | 默认 GET；`place` 为 `RequestOptions` 或回调 |
| `fetch.get(url, place?, callback?)` | GET 语法糖；`place` 为 `RequestOptions` 或回调 |
| `fetch.post(url, body?, place?, callback?)` | POST 语法糖；`place` 为 `RequestOptions` 或回调，`place.body` 会覆盖第二参数 |
| `fetch.request(url, options, callback?)` | 通用入口，必须显式传 `options` |

`RequestOptions` 常用字段为 `method`、`headers`、`body`、`timeout`、`proxy`。请求头必须
放在 `headers` 字段内：

```js
fetch.get(
  'https://example.com/api',
  {
    headers: { accept: 'application/json' }
  },
  res => {
    this.last_response = res;
  }
);
```

`proxy` 支持字符串地址，也支持 `{ url, options }` 形式：

```js
// 字符串形式
fetch('https://example.com', { proxy: 'http://127.0.0.1:7890' }, res => {
  this.last_response = res;
});

// 带 agent 选项
fetch.request(
  'https://example.com',
  {
    method: 'get',
    proxy: {
      url: 'http://127.0.0.1:7890',
      options: { keepAlive: true }
    }
  },
  res => {
    this.last_response = res;
  }
);
```

代理说明：

- 目标 URL 为 `https:` 时使用 `HttpsProxyAgent`，否则使用 `HttpProxyAgent`；
  代理地址本身支持 `http:` / `https:`；
- `proxy.options` 会透传给对应的 proxy agent；
- 同时显式传入 `agent` 时，由 `proxy` 生成的 agent 优先；
- 传入的 `options` 会被浅拷贝，不会被修改，可以安全复用；
- 代理地址非法时会在发起请求时抛错。

回调约定与其他异步能力一致：成功时收到响应体；非 2xx 时收到响应头（含
`status-code`）；失败时收到 `Error`。请求同样受[异步任务与限流](/sandbox/internals/async)
约束。

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
