import { describe, expect, it } from 'vitest';
import { buildCommandPattern, CommandDefinitionError, defineCommand } from '@/command/command';

const noopExecute = () => null;

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
    expect(built!.execute).toBe(noopExecute);
  });

  describe('命令别名', () => {
    it('.alias() 生成同一条命令的多个 pattern', () => {
      const [built] = defineCommand('echo <text>')
        .alias('say', 'repeat')
        .handler(noopExecute)
        .build();

      expect(built!.name).toBe('echo');
      expect(built!.pattern).toEqual(['echo <text>', 'say <text>', 'repeat <text>']);
      expect(built!.execute).toBe(noopExecute);
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
});
