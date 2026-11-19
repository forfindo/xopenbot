---
outline: deep
---

# 开发与构建

## 目录结构

```text
packages/sandbox
├── src
│   ├── index.ts          # 包入口：进程管理、事件派发、API 回传
│   ├── bridge.ts         # 子进程：事件解析、注入 API、结果回传、逃逸加固
│   ├── sandbox.ts        # VM 上下文创建、权限代理、执行与持久化
│   ├── sandbox.code.js   # 在沙箱内部执行的初始化代码
│   └── global.d.ts       # 第三方库类型补充
├── dist                  # 构建产物（tsc 输出）
├── package.json
└── tsconfig.json
```

## 构建与检查

```bash
pnpm --filter @xopenbot/sandbox build
pnpm check
pnpm lint
```

构建会执行 `tsc`，并把 `src/sandbox.code.js` 复制到 `dist`。

## 相关链接

- [包 README](https://github.com/forfindo/xopenbot/tree/main/packages/sandbox)
