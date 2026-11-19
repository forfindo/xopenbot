import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'xopenbot',
  description: 'API文档',
  base: '/xopenbot/',
  head: [['link', { rel: 'icon', href: '/xopenbot/favicon.ico' }]],
  themeConfig: {
    logo: '/imgs/logo.png',
    nav: [
      { text: '首页', link: '/' },
      { text: 'OneBot', link: '/onebot/' },
      { text: 'Plugin', link: '/plugin/' },
      { text: 'Sandbox', link: '/sandbox/' }
    ],
    sidebar: {
      '/onebot/': [
        {
          text: '开始',
          items: [{ text: '概览与快速开始', link: '/onebot/' }]
        },
        {
          text: '指南',
          items: [
            { text: 'Bot 接口', link: '/onebot/guide/bot' },
            { text: '动作与 ActionMap', link: '/onebot/guide/action' },
            { text: '消息与消息段', link: '/onebot/guide/message' },
            { text: '事件', link: '/onebot/guide/event' }
          ]
        },
        {
          text: '参考',
          items: [
            { text: '导出总览', link: '/onebot/reference/exports' },
            { text: '返回码与扩展字段', link: '/onebot/reference/retcode' }
          ]
        },
        {
          text: '开发',
          items: [{ text: '开发与构建', link: '/onebot/dev' }]
        }
      ],
      '/plugin/': [
        {
          text: '开始',
          items: [{ text: '概览与快速开始', link: '/plugin/' }]
        },
        {
          text: '指南',
          items: [
            { text: '编写插件', link: '/plugin/guide/plugin' },
            { text: '命令与消息处理', link: '/plugin/guide/command' },
            { text: '定时任务', link: '/plugin/guide/schedule' },
            { text: '插件上下文', link: '/plugin/guide/context' },
            { text: '事件监听', link: '/plugin/guide/listener' }
          ]
        },
        {
          text: '参考',
          items: [
            { text: 'Workspace API', link: '/plugin/reference/workspace' },
            { text: '类型参考', link: '/plugin/reference/types' }
          ]
        },
        {
          text: '开发',
          items: [{ text: '开发与构建', link: '/plugin/dev' }]
        }
      ],
      '/sandbox/': [
        {
          text: '开始',
          items: [{ text: '概览与快速开始', link: '/sandbox/' }]
        },
        {
          text: '指南',
          items: [{ text: '导出 API', link: '/sandbox/guide/api' }]
        },
        {
          text: '内部机制',
          items: [
            { text: '工作原理', link: '/sandbox/internals/architecture' },
            { text: '异步任务与限流', link: '/sandbox/internals/async' },
            { text: '沙箱内置 API', link: '/sandbox/internals/builtin-api' }
          ]
        },
        {
          text: '安全',
          items: [{ text: '安全边界', link: '/sandbox/security' }]
        },
        {
          text: '开发',
          items: [{ text: '开发与构建', link: '/sandbox/dev' }]
        }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/forfindo/xopenbot' }],
    editLink: {
      pattern: 'https://github.com/forfindo/xopenbot/edit/main/docs/:path',
      text: '编辑此页'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    search: {
      provider: 'local'
    }
  }
});
