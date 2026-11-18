import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'xopenbot',
  description: 'API文档',
  base: '/xopenbot/',
  head: [['link', { rel: 'icon', href: '/xopenbot/imgs/favicon.ico' }]],
  themeConfig: {
    logo: '/imgs/logo.png',
    nav: [
      { text: '首页', link: '/' },
      { text: 'OneBot', link: '/onebot/' },
      { text: 'Plugin', link: '/plugin/' },
      { text: 'Sandbox', link: '/sandbox/' }
    ],
    sidebar: [
      {
        text: '子包文档',
        items: [
          { text: 'OneBot 类型契约', link: '/onebot/' },
          { text: '插件工作区', link: '/plugin/' },
          { text: '沙箱运行时', link: '/sandbox/' }
        ]
      }
    ],
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
