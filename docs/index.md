---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "xopenbot"
  text: "xopenbot API 文档"
  tagline: OneBot 类型契约、插件工作区与受限 JavaScript 沙箱
  actions:
    - theme: brand
      text: OneBot
      link: /onebot/
    - theme: alt
      text: Plugin
      link: /plugin/
    - theme: alt
      text: Sandbox
      link: /sandbox/

features:
  - title: "@xopenbot/onebot"
    details: OneBot 12 协议的 TypeScript 类型契约，涵盖动作、事件、消息段、返回码与 Bot 接口。
    link: /onebot/
    linkText: 查看 API 文档
  - title: "@xopenbot/plugin"
    details: 插件加载、命令注册、消息匹配与分发、定时任务调度，以及插件上下文与事件监听。
    link: /plugin/
    linkText: 查看 API 文档
  - title: "@xopenbot/sandbox"
    details: 在宿主进程、子进程与 VM 上下文中受限执行 JavaScript，并提供沙箱内置 API 与权限模型。
    link: /sandbox/
    linkText: 查看 API 文档
---
