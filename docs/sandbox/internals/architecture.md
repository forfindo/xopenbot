---
outline: deep
---

# 工作原理

整体是「宿主进程 + 子进程 + VM 上下文」三层结构：

```text
宿主进程 (index.ts)
   │  收到 QQ 事件
   │  normalize() 净化数据
   ▼
子进程 (bridge.ts, fork 启动)
   │  事件转成 JS 源码
   ▼
VM 上下文 (sandbox.ts + sandbox.code.js)
   │  执行代码
   └─ 返回结果 / 需要调用机器人 API 时通过 IPC 回传宿主
```

## 进程隔离

`index.ts` 通过 `child_process.fork` 启动 `bridge.js`，所有用户代码都在子进程中运行：

- 子进程崩溃或退出时由宿主自动重启（`worker.on('exit', startWorker)`）；
- 子进程与宿主通过 IPC 消息通信，消息类型分为：
  - `CallApiRequest`：沙箱请求宿主调用机器人 API；
  - `ExecResponse`：执行结果需要回传到 QQ；
  - `init` / `saveCtx`：初始化与持久化指令。
- `process.on('disconnect')` 时子进程主动退出，避免孤儿进程。

即使沙箱被突破，影响范围也先被限制在子进程内。

## VM 上下文隔离

`sandbox.ts` 使用 Node 内置 `vm` 模块创建独立上下文，并关闭 `codeGeneration` 的字符串
与 WebAssembly 能力，同时把微任务设置为在每次求值后统一执行。上下文对象本身是一个
`Proxy`，用于拦截属性写入、删除、原型修改等操作。初始化流程为：

1. 从 `data/context`、`data/context.fn`（brotli 压缩）还原上次的上下文与函数；
2. 执行 `sandbox.code.js` 注入沙箱内置变量与权限模型；
3. 冻结全部内置对象及其原型；
4. 执行用户可选的 `afterInit()` 钩子。

## 事件驱动执行

`bridge.ts` 不提供显式的「执行某个函数」接口，而是把收到的 QQ 消息转换为 JavaScript
源码：

- 文本消息直接拼接；
- `@`、图片等消息段转换为 CQ 码字符串；
- 通过 `sandbox.run(message)` 在上下文中求值，结果回传到 QQ；
- 消息以 `\` 或 `＼` 开头时进入调试模式，错误信息会带上行号。

## 上下文持久化

沙箱内的普通数据与函数会被序列化保存：

- `context`：普通数据，JSON 序列化后 brotli 压缩；
- `context.fn`：函数被保存为源码字符串，重启时通过 `vm.runInContext` 还原；
- 保存时机：每 60 分钟、调用 `saveCtx()`、子进程以退出码 200 退出时；
- 数据目录由环境变量 `dataPath` 决定，默认 `./data`。

### 持久化文件

```text
data
├── context      # brotli 压缩的上下文数据
└── context.fn   # brotli 压缩的函数源码
```

函数以源码字符串保存，因此沙箱内定义的函数在重启后可以恢复；超出 10MB 的对象会在
保存时被丢弃。
