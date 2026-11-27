import { describe, expect, it, vi } from 'vitest';
import { buildCommandPattern, CommandDefinitionError, defineCommand } from '@/command/command';
import type { CommandBuilder } from '@/command/command';
import type { MatchArgs } from '@/types/matcher';
import type { ExecResult, PluginContext } from '@/types/workspace';

const noopExecute = () => null;
const pluginContext = {} as PluginContext;

async function executeCommand(
  builder: CommandBuilder,
  args: MatchArgs = { _: [], help: true },
  input = ''
): Promise<ExecResult | null | undefined> {
  const [built] = builder.build();
  return (await built!.execute(input, pluginContext, args)) as ExecResult | null | undefined;
}

async function helpText(builder: CommandBuilder): Promise<string> {
  const result = await executeCommand(builder);
  const part = result?.content?.[0];
  if (!part || part.type !== 'text') {
    throw new Error('帮助命令应返回文本 part');
  }
  return part.text;
}

describe('buildCommandPattern', () => {
  it('原样生成 pattern', () => {
    expect(buildCommandPattern('test sub <name> [age]')).toBe('test sub <name> [age]');
  });

  it('归一化空白并把 yargs 变参 .. 转成 ...', () => {
    expect(buildCommandPattern('  cmd   <first>   <rest..>  ')).toBe('cmd <first> <rest...>');
  });

  it('支持参数别名、可选参数与通配符路径', () => {
    expect(buildCommandPattern('* <a|b> [c|d]')).toBe('* <a|b> [c|d]');
  });

  it.each([
    ['位置参数之后使用 *', 'cmd <a> *'],
    ['位置参数之后出现裸词', 'cmd <a> foo'],
    ['变参不在最后一个位置参数上', 'cmd <a...> <b>'],
    ['未闭合的 <', 'cmd <a'],
    ['未闭合的 [', 'cmd [a'],
    ['位置参数缺少名称 <>', 'cmd <>'],
    ['位置参数缺少名称 []', 'cmd []'],
    ['位置参数缺少名称 <...>', 'cmd <...>'],
    ['命令路径裸词混入方括号', 'cmd[1]'],
    ['字面量以 - 开头', 'cmd --flag'],
    ['位置参数包含空别名项 <a|>', 'cmd <a|>'],
    ['位置参数包含空别名项 <|a>', 'cmd <|a>'],
    ['... 未紧贴结束符', 'cmd <a>...'],
    ['空 pattern', '   ']
  ])('拒绝不支持的格式：%s', (_name, command) => {
    expect(() => buildCommandPattern(command)).toThrow(CommandDefinitionError);
  });
});

describe('defineCommand', () => {
  it('链式方法返回它自己', () => {
    const builder = defineCommand('echo <text>');
    expect(builder.describe('复读')).toBe(builder);
    expect(builder.alias('repeat')).toBe(builder);
    expect(builder.priority(10)).toBe(builder);
    expect(builder.handler(noopExecute)).toBe(builder);
    expect(builder.command('sub <x>', '子命令', noopExecute)).toBe(builder);
  });

  it('build 生成单条命令', () => {
    const [built] = defineCommand('echo <text>', '复读').priority(10).handler(noopExecute).build();

    expect(built).toMatchObject({
      name: 'echo',
      description: '复读',
      pattern: ['echo <text>'],
      priority: 10
    });
  });

  it('支持覆盖 name 并使用 execute', () => {
    const [built] = defineCommand('echo <text>').name('say').handler(noopExecute).build();

    expect(built!.name).toBe('say');
    expect(built!.execute('echo x', pluginContext, { _: [] })).toBeNull();
  });

  describe('命令别名', () => {
    it('.alias() 生成同一条命令的多个 pattern', () => {
      const [built] = defineCommand('echo <text>')
        .alias('say', 'repeat')
        .handler(noopExecute)
        .build();

      expect(built!.name).toBe('echo');
      expect(built!.pattern).toEqual(['echo <text>', 'say <text>', 'repeat <text>']);
      expect(built!.execute('echo x', pluginContext, { _: [] })).toBeNull();
    });

    it('command 数组的第一项是命令名，其余作为 pattern', () => {
      const [built] = defineCommand(['serve', 'up', 'start']).handler(noopExecute).build();

      expect(built!.name).toBe('serve');
      expect(built!.pattern).toEqual(['serve', 'up', 'start']);
    });

    it('重复别名只生成一次', () => {
      const [built] = defineCommand(['serve', 'serve', 's'])
        .alias('s')
        .handler(noopExecute)
        .build();

      expect(built!.pattern).toEqual(['serve', 's']);
    });
  });

  describe('子命令', () => {
    it('链式追加子命令时自动拼接父命令路径', () => {
      const commands = defineCommand('config', '配置管理')
        .command('get <key>', '读取配置', noopExecute)
        .command('set <key> <value>', '设置配置', noopExecute)
        .build();

      expect(commands.map(command => command.pattern)).toEqual([
        ['config get <key>'],
        ['config set <key> <value>']
      ]);
      expect(commands.map(command => command.name)).toEqual(['get', 'set']);
      expect(commands.map(command => command.description)).toEqual(['读取配置', '设置配置']);
    });

    it('父命令有 handler 时本身也会成为一条命令', () => {
      const commands = defineCommand('config')
        .handler(noopExecute)
        .command('get <key>', '读取配置', noopExecute)
        .build();

      expect(commands.map(command => command.pattern)).toEqual([['config'], ['config get <key>']]);
    });

    it('子命令别名生成同一条命令的多个 pattern', () => {
      const commands = defineCommand('config')
        .command(['get <key>', 'g'], '读取配置', noopExecute)
        .build();

      expect(commands).toHaveLength(1);
      expect(commands[0]!.name).toBe('get');
      expect(commands[0]!.pattern).toEqual(['config get <key>', 'config g <key>']);
    });

    it('父命令别名传播到子命令', () => {
      const commands = defineCommand(['config', 'cfg'])
        .command('get <key>', '读取配置', noopExecute)
        .build();

      expect(commands[0]!.pattern).toEqual(['config get <key>', 'cfg get <key>']);
    });

    it('父子别名按层级组合到同一条命令', () => {
      const commands = defineCommand(['config', 'cfg'])
        .command(['get <key>', 'g'], '读取配置', noopExecute)
        .build();

      expect(commands[0]!.pattern).toEqual([
        'config get <key>',
        'config g <key>',
        'cfg get <key>',
        'cfg g <key>'
      ]);
    });

    it('通过嵌套 builder 支持多级子命令与别名', () => {
      const commands = defineCommand(['config', 'cfg'])
        .command(
          defineCommand(['remote', 'r'])
            .handler(noopExecute)
            .command(['add <name>', 'a'], '添加', noopExecute)
        )
        .build();

      expect(commands.map(command => command.name)).toEqual(['remote', 'add']);
      expect(commands.map(command => command.pattern)).toEqual([
        ['config remote', 'config r', 'cfg remote', 'cfg r'],
        [
          'config remote add <name>',
          'config remote a <name>',
          'config r add <name>',
          'config r a <name>',
          'cfg remote add <name>',
          'cfg remote a <name>',
          'cfg r add <name>',
          'cfg r a <name>'
        ]
      ]);
    });

    it('允许传入已构建的 builder 作为子命令', () => {
      const child = defineCommand('get <key>').handler(noopExecute);
      const [built] = defineCommand('config').command(child).build();

      expect(built!.pattern).toEqual(['config get <key>']);
    });

    it('无 handler 且无子命令时 build 报错', () => {
      expect(() => defineCommand('echo <text>').build()).toThrow(CommandDefinitionError);
    });
  });

  describe('help', () => {
    it('.help() 返回构建器自身', () => {
      const builder = defineCommand('echo <text>');
      expect(builder.help()).toBe(builder);
    });

    it('未开启 help 时 args.help 不会拦截执行', async () => {
      const result = await executeCommand(defineCommand('echo <text>').handler(noopExecute));
      expect(result).toBeNull();
    });

    it('args.help 为真时返回用法、描述与选项', async () => {
      const text = await helpText(defineCommand('echo <text>', '复读').help().handler(noopExecute));

      expect(text).toBe(
        ['Usage: echo <text> [options]', '', '复读', '', 'Options:', '  --help  显示帮助信息'].join(
          '\n'
        )
      );
    });

    it('没有描述时不输出描述段', async () => {
      const text = await helpText(defineCommand('echo <text>').help().handler(noopExecute));

      expect(text).toBe(
        ['Usage: echo <text> [options]', '', 'Options:', '  --help  显示帮助信息'].join('\n')
      );
    });

    it('无位置参数时用法只展示 options', async () => {
      const text = await helpText(defineCommand('ping', '心跳').help().handler(noopExecute));

      expect(text).toBe(
        ['Usage: ping [options]', '', '心跳', '', 'Options:', '  --help  显示帮助信息'].join('\n')
      );
    });

    it('args.help 为假时执行原 handler 并透传参数', async () => {
      const handler = vi.fn(() => ({ content: [{ type: 'text' as const, text: 'done' }] }));
      const builder = defineCommand('echo <text>').help().handler(handler);
      const args: MatchArgs = { _: ['hi'] };

      const result = await executeCommand(builder, args, 'echo hi');

      expect(result).toEqual({ content: [{ type: 'text', text: 'done' }] });
      expect(handler).toHaveBeenCalledWith('echo hi', pluginContext, args);
    });

    it('有子命令时列出子命令及其描述', async () => {
      const text = await helpText(
        defineCommand('config', '配置管理')
          .help()
          .handler(noopExecute)
          .command(['get <key>', 'g'], '读取配置', noopExecute)
          .command('set <key> <value>', '设置配置', noopExecute)
      );

      expect(text).toBe(
        [
          'Usage: config <command> [options]',
          '',
          '配置管理',
          '',
          'Commands:',
          '  config get <key>  读取配置',
          '  config set <key> <value>  设置配置',
          '',
          'Options:',
          '  --help  显示帮助信息'
        ].join('\n')
      );
    });

    it('递归列出多级子命令的完整路径', async () => {
      const text = await helpText(
        defineCommand('config', '配置管理')
          .help()
          .handler(noopExecute)
          .command(
            defineCommand(['remote', 'r'], '远端管理')
              .handler(noopExecute)
              .command(['add <name>', 'a'], '添加远端', noopExecute)
              .command(
                defineCommand('group', '分组管理')
                  .handler(noopExecute)
                  .command('create <name>', '创建分组', noopExecute)
              )
          )
          .command('set <key> <value>', '设置配置', noopExecute)
      );

      expect(text).toBe(
        [
          'Usage: config <command> [options]',
          '',
          '配置管理',
          '',
          'Commands:',
          '  config remote  远端管理',
          '  config remote add <name>  添加远端',
          '  config remote group  分组管理',
          '  config remote group create <name>  创建分组',
          '  config set <key> <value>  设置配置',
          '',
          'Options:',
          '  --help  显示帮助信息'
        ].join('\n')
      );
    });

    it('子命令没有描述时只输出命令路径', async () => {
      const text = await helpText(
        defineCommand('config', '配置管理')
          .help()
          .handler(noopExecute)
          .command('ping', void 0, noopExecute)
      );

      expect(text).toBe(
        [
          'Usage: config <command> [options]',
          '',
          '配置管理',
          '',
          'Commands:',
          '  config ping',
          '',
          'Options:',
          '  --help  显示帮助信息'
        ].join('\n')
      );
    });

    it('父命令的 help 不会影响子命令', async () => {
      const childHandler = vi.fn(() => null);
      const commands = defineCommand('config', '配置管理')
        .help()
        .handler(noopExecute)
        .command('get <key>', '读取配置', childHandler)
        .build();
      const child = commands.find(command => command.name === 'get')!;

      const result = await child.execute('config get a', pluginContext, { _: [], help: true });

      expect(result).toBeNull();
      expect(childHandler).toHaveBeenCalledOnce();
    });

    it('子命令单独开启 help 时以首个父命令路径生成帮助', async () => {
      const text = await helpText(
        defineCommand(['config', 'cfg'], '配置管理').command(
          defineCommand(['get <key>', 'g'], '读取配置').help().handler(noopExecute)
        )
      );

      expect(text).toBe(
        [
          'Usage: config get <key> [options]',
          '',
          '读取配置',
          '',
          'Options:',
          '  --help  显示帮助信息'
        ].join('\n')
      );
    });

    it('子命令无位置参数时只展示父命令路径', async () => {
      const text = await helpText(
        defineCommand(['config', 'cfg'], '配置管理').command(
          defineCommand(['get', 'g'], '读取配置').help().handler(noopExecute)
        )
      );

      expect(text).toBe(
        [
          'Usage: config get [options]',
          '',
          '读取配置',
          '',
          'Options:',
          '  --help  显示帮助信息'
        ].join('\n')
      );
    });

    it('仅开启 help 且没有 handler 时只注册 help 处理', async () => {
      const builder = defineCommand('echo <text>', '复读').help();

      const text = await helpText(builder);
      expect(text).toBe(
        ['Usage: echo <text> [options]', '', '复读', '', 'Options:', '  --help  显示帮助信息'].join(
          '\n'
        )
      );

      expect(await executeCommand(builder, { _: [] })).toBeUndefined();
    });

    it('有子命令但父命令无 handler 时也注册父命令帮助', async () => {
      const commands = defineCommand('config', '配置管理')
        .help()
        .command('get <key>', '读取配置', noopExecute)
        .build();

      expect(commands.map(command => command.name)).toEqual(['config', 'get']);

      const [parent] = commands;
      const result = (await parent!.execute('config', pluginContext, {
        _: [],
        help: true
      })) as ExecResult;

      const part = result?.content?.[0];
      expect(part?.type).toBe('text');
      expect(part?.type === 'text' ? part.text : '').toContain('config get <key>');
      expect(await parent!.execute('config', pluginContext, { _: [] })).toBeUndefined();
    });

    it('example', () => {
      const commands = defineCommand('config', '配置管理')
        .help()
        .command(
          defineCommand('user', '用户配置')
            .help()
            .command('get <uid>', '获取用户配置', noopExecute)
            .command('list', '所用用户配置', noopExecute)
        );
      executeCommand(commands)
        // @ts-ignore
        .then(res => console.log(res?.content![0].text))
        .catch(() => {});
    });
  });
});
