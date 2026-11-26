import { Workspace } from '@/workspace';
import { definePlugin } from '@/plugin';
import { defineCommand } from '@/command/command';

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

interface EchoConfig {
  prefix: string;
  times?: number;
}

const configuredPlugin = definePlugin<EchoConfig>()({
  info: {
    name: 'configured',
    version: '1.0.0',
    description: 'typed config'
  },
  init(ctx) {
    const prefix: string = ctx.config.prefix;
    void prefix;
    return {};
  },
  loadCommand(ctx) {
    const prefix: string = ctx.config.prefix;
    void prefix;
    return defineCommand<typeof ctx>('X')
      .priority(1)
      .name('x')
      .execute((_input, execCtx) => {
        const execPrefix: string = execCtx.config.prefix;
        void execPrefix;
        return { content: [{ type: 'text', text: execPrefix }] };
      })
      .build();
  },
  loadListener(ctx) {
    const prefix: string = ctx.config.prefix;
    void prefix;
    return {
      message(listenerCtx) {
        const listenerPrefix: string = listenerCtx.config.prefix;
        void listenerPrefix;
      }
    };
  }
});

// 正确配置
await workspace.registry({ plugin: configuredPlugin, config: { prefix: '!', times: 123 } });

// 配置字段类型错误应在编译期报错
// @ts-expect-error prefix 必须是 string
await workspace.registry({
  plugin: configuredPlugin,
  config: { prefix: 123 }
});

// 缺少必填配置字段应在编译期报错
// @ts-expect-error 缺少 prefix
await workspace.registry({
  plugin: configuredPlugin,
  config: {}
});

await workspace.registry(
  p,
  definePlugin({
    loadCommand(ctx) {
      void ctx.bot.getChannelMemberList('def', 'fff');
      void ctx.bot.getChannelInfo?.('ff', 'ff');
      return defineCommand<typeof ctx>('test')
        .name('test')
        .handler((_, ctx) => {
          void ctx.bot.getChannelMemberList('gff', 'fff');
          void ctx.bot.test;
        })
        .build();
    },
    info: {
      name: 'test',
      version: '344',
      description: 'ttestt',
      manifest: {
        depsOn: {
          getChannelMemberList: 'function',
          test: 'field'
        }
      }
    },
    init(ctx) {
      void ctx.bot.getChannelMemberList('fgg', 'fdg');
      void ctx.bot.test;
      return {};
    }
  })
);
