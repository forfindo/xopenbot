import { describe, expect, it } from 'vitest';
import { match } from '@/command/matcher';

describe('match', () => {
  it('解析命令名、必选与可选位置参数，并保留 flags', () => {
    const result = match('cmd <qq> [name]', 'cmd 123 test --age 24');
    expect(result).toMatchObject({
      _: ['cmd'],
      qq: '123',
      name: 'test',
      age: 24
    });
  });

  it('缺少必选位置参数时不匹配', () => {
    expect(match('cmd <qq>', 'cmd')).toBeNull();
  });

  it('命令名不匹配时返回 null', () => {
    expect(match('cmd <qq>', 'other 123')).toBeNull();
  });

  it('支持位置参数别名', () => {
    const result = match('cmd <foo|bar>', 'cmd 1');
    expect(result).toMatchObject({ foo: '1', bar: '1' });
  });

  it('支持必选变参收集剩余位置参数', () => {
    const result = match('cmd <first> <rest...>', 'cmd 1 2 3');
    expect(result).toMatchObject({ first: '1', rest: ['2', '3'] });
  });

  it('支持可选变参', () => {
    expect(match('cmd [rest...]', 'cmd')).toMatchObject({ rest: [] });
    expect(match('cmd [rest...]', 'cmd 1 2')).toMatchObject({ rest: ['1', '2'] });
  });

  it('宽松保留多余的位置参数到 _', () => {
    const result = match('cmd <qq>', 'cmd 123 extra');
    expect(result).toMatchObject({ _: ['cmd', 'extra'], qq: '123' });
  });

  it('无需命令名时可直接以位置参数开头', () => {
    expect(match('<x> [y]', 'foo bar')).toMatchObject({
      _: [],
      x: 'foo',
      y: 'bar'
    });
  });

  it('$0 没有特殊含义，不会作为默认命令标记', () => {
    expect(match('$0 <x>', 'foo bar')).toBeNull();
  });

  it('未定义的环境变量保持原样，不会被替换成空', () => {
    expect(match('cmd <x>', 'cmd $0')).toMatchObject({ x: '$0' });
    expect(match('cmd <x>', 'cmd $UNSET_VAR')).toMatchObject({ x: '$UNSET_VAR' });
  });

  it('* 匹配任意一个命令 token', () => {
    expect(match('cmd * <name>', 'cmd any alice')).toMatchObject({
      _: ['cmd', 'any'],
      name: 'alice'
    });
    expect(match('* <x>', 'cmd value')).toMatchObject({ _: ['cmd'], x: 'value' });
    expect(match('test * <x>', 'test sub value')).toMatchObject({
      _: ['test', 'sub'],
      x: 'value'
    });
  });

  it('* 需要至少一个命令 token', () => {
    expect(match('*', '')).toBeNull();
  });

  it('* 匹配到的命令保留到 _', () => {
    expect(match('*', 'foo bar')).toMatchObject({ _: ['foo', 'bar'] });
  });

  it('解析带引号的参数', () => {
    expect(match('cmd <text>', 'cmd "hello world"')).toMatchObject({
      text: 'hello world'
    });
  });

  it('按 yargs 规则先消费全部必选再消费可选', () => {
    const result = match('cmd <a> [b] <c>', 'cmd 1 2 3');
    expect(result).toMatchObject({ a: '1', c: '2', b: '3' });
  });

  describe('子命令', () => {
    it('子命令路径进入 _', () => {
      const result = match('test sub1 <name> [age]', 'test sub1 alice 18');
      expect(result).toMatchObject({
        _: ['test', 'sub1'],
        name: 'alice',
        age: '18'
      });
    });

    it('支持多级子命令', () => {
      const result = match('test sub1 sub2 <x>', 'test sub1 sub2 hi');
      expect(result).toMatchObject({ _: ['test', 'sub1', 'sub2'], x: 'hi' });
    });

    it('仅有子命令时也能匹配', () => {
      expect(match('test sub1', 'test sub1')).toMatchObject({
        _: ['test', 'sub1']
      });
    });

    it('子命令不匹配时返回 null', () => {
      expect(match('test sub1', 'test other')).toBeNull();
    });

    it('子命令后可宽松保留多余参数', () => {
      const result = match('test sub1 <name>', 'test sub1 alice extra');
      expect(result).toMatchObject({ _: ['test', 'sub1', 'extra'], name: 'alice' });
    });
  });
});
