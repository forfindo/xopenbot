import { Workspace } from '@/workspace';
import { definePlugin } from '@/plugin';

const workspace = new Workspace({
  uin: 'test',
  sendTts() {
    return [];
  }
});
const p = definePlugin({
  loadCommand(ctx) {
    // depsOn 声明后该成员应从可选变为必填，赋值给 NonNullable 才不报错
    void ctx.bot.getChannelMemberList('def', 'fff');
    void ctx.bot.getChannelInfo?.('ff', 'ff');
    return [];
  },
  info: {
    name: 'test',
    version: '344',
    description: 'ttestt',
    manifest: {
      depsOn: {
        getChannelMemberList: 'function',
        uin: 'field',
        sendTts: 'function',
        selfInfo: 'field'
      }
    }
  },
  init(ctx) {
    void ctx.bot.getChannelMemberList('fgg', 'fdg');
    void ctx.bot.uin;
    void ctx.bot.sendTts();
    return {};
  }
});

await workspace.registry(
  p,
  definePlugin({
    loadCommand(ctx) {
      void ctx.bot.getChannelMemberList('def', 'fff');
      void ctx.bot.getChannelInfo?.('ff', 'ff');
      return [];
    },
    info: {
      name: 'test',
      version: '344',
      description: 'ttestt',
      manifest: {
        depsOn: {
          getChannelMemberList: 'function'
        }
      }
    },
    init(ctx) {
      void ctx.bot.getChannelMemberList('fgg', 'fdg');
      return {};
    }
  })
);
