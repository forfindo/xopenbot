---
outline: deep
---

# 安全边界

> Node 的 `vm` 本身**不是**安全边界，本包通过多层加固显著提高逃逸成本，但仍建议在
> 低权限用户或容器中运行不可信代码。

## 禁止动态代码生成

`codeGeneration.strings = false` 与 `wasm: false` 直接禁用了以下逃逸入口：

- `eval` / `new Function`；
- `WebAssembly`；
- 基于字符串的编译能力。

同时在 `sandbox.code.js` 中删除了 `globalThis` 与 `console`，减少用户拿到全局对象与
调试通道的机会。

## 冻结内置对象与原型

`sandbox.ts` 遍历并冻结了 `Object`、`Function`、`Array`、`Promise`、`Proxy`、
`Reflect`、`WebAssembly`、各类 TypedArray 等全部内置构造器及其 `prototype`。这样可以
阻止用户通过修改原型链获得额外的构造能力。

## 上下文 Proxy 拦截危险操作

上下文对象被包装为 `Proxy`，非主人用户无法进行以下操作：

- 给受保护属性赋值（`protected_properties` 中的项）；
- 修改 `data`、`set_history_allowed`；
- `defineProperty` / `deleteProperty` / `setPrototypeOf` / `preventExtensions`；
- 通过原型修改绕过写入检查。

## 冻结注入的外部对象

`contextify()` 会递归冻结注入到沙箱的对象，并通过一个已处理列表避免循环引用导致死循环。
注入的 `data`、`$`、`fetch`、`Buffer`、`path`、`os` 等都被冻结，避免用户改写宿主对象
或顺藤摸瓜拿到宿主引用。

## 输入净化

`index.ts` 在把事件送进子进程前执行 `normalize()`，逐项检查事件字段：只保留字符串、
数字、布尔、`null`、数组与纯对象，丢弃函数、Symbol、类实例等可能携带宿主信息的值，
并排除字段引用回事件自身的情况。

## 主进程侧加固

`bridge.ts` 在完成注入后，对宿主 realm 的 `Function`、`Object` 再做一次加固：把
`Function.prototype.constructor` 替换为一个调用或构造时直接抛错的 `Proxy`，并冻结
`Object`、`Object.prototype`、`Function`、`Function.prototype`。由于注入的宿主函数
（如 `Buffer`、`path.join`）可以通过原型链访问到宿主的 `Function` 构造器，这一步可以
阻断「拿注入函数当跳板构造新函数」的逃逸路径。

## 权限模型

- `master`：主人 QQ 列表，只有主人可以修改受保护属性；
- `protected_properties`：默认保护 `master`、`afterInit`、`beforeExec`、`afterExec`、
  `onEvents`、`beforeApiCalled`；
- `database`：按群隔离，只有当前群或主人可以读写；
- `set_history`：只在内部允许写入时记录变量修改历史；
- `run()`：只有主人可以调用，且执行的是**宿主侧** `eval`，完全绕过沙箱。

## 超时与资源限制

- `vm.runInContext` 默认 500ms 超时，防止死循环占满 CPU；
- 异步任务、调用频率、响应体大小均有上限；
- 子进程异常退出后自动重启。

## 注意事项

- 该沙箱依赖 Node `vm`，并非强安全边界，请勿直接运行完全不可信的代码；
- 建议在容器、低权限用户或独立进程中部署，并限制网络与文件访问；
- 主人可用的 `run()` 会在宿主侧执行任意代码，务必只把可信 QQ 加入 `master`；
- 输出与 HTTP 内容会经过敏感词过滤，但仍建议在业务层做额外审核。
