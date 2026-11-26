import type { Command, CommandExecute, Manifest, PluginContext } from '@/types/workspace';

/** 命令定义不合法时抛出，message 会指明具体不支持的格式 **/
export class CommandDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandDefinitionError';
  }
}

const POSITIONAL_END = new Map<'<' | '[', '>' | ']'>([
  ['<', '>'],
  ['[', ']']
]);

function isPositional(token: string): boolean {
  return token.startsWith('<') || token.startsWith('[');
}

/** 按空白分词，但空白不会打断 `<...>` / `[...]`；同时校验未闭合的括号 **/
function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let opener: '<' | '[' | null = null;

  for (const char of command) {
    if (opener === null) {
      if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }
      if (char === '<' || char === '[') {
        opener = char;
      }
      current += char;
      continue;
    }

    current += char;
    if (char === POSITIONAL_END.get(opener)) {
      opener = null;
    }
  }

  if (opener !== null) {
    throw new CommandDefinitionError(`命令 "${command}" 存在未闭合的 "${opener}"`);
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

interface PositionalInfo {
  raw: string;
  opener: '<' | '[';
  closer: '>' | ']';
  names: string[];
  variadic: boolean;
}

function parsePositional(token: string): PositionalInfo {
  const opener = token[0] as '<' | '[';
  const closer = POSITIONAL_END.get(opener)!;

  if (!token.endsWith(closer)) {
    if (/\.+$/.test(token)) {
      throw new CommandDefinitionError(
        `位置参数 "${token}" 的变参标记 "..." 必须紧贴结束符 "${closer}"`
      );
    }
    throw new CommandDefinitionError(`位置参数 "${token}" 缺少结束符 "${closer}"`);
  }

  const inner = token.slice(1, -1);
  if (/[<>[\]]/.test(inner)) {
    throw new CommandDefinitionError(`位置参数 "${token}" 的名称不能包含 "<" ">" "[" "]"`);
  }

  const variadic = /\.+$/.test(inner);
  const body = (variadic ? inner.replace(/\.+$/, '') : inner).replace(/\s/g, '');
  const names = body.split('|');

  if (names.every(name => name.length === 0)) {
    throw new CommandDefinitionError(`位置参数 "${token}" 缺少名称`);
  }
  if (names.some(name => name.length === 0)) {
    throw new CommandDefinitionError(`位置参数 "${token}" 包含空别名项`);
  }

  return { raw: token, opener, closer, names, variadic };
}

/**
 * 将 yargs 风格命令字符串转换为 `match()` 需要的 pattern，并校验
 * `matcher.ts` 中声明的不支持格式。
 */
export function buildCommandPattern(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new CommandDefinitionError('命令定义不能为空');
  }

  const tokens = tokenize(trimmed);
  const result: string[] = [];
  const positionals: PositionalInfo[] = [];
  let inPositionals = false;

  for (const token of tokens) {
    if (isPositional(token)) {
      inPositionals = true;
      const positional = parsePositional(token);
      positionals.push(positional);
      result.push(
        `${positional.opener}${positional.names.join('|')}${
          positional.variadic ? '...' : ''
        }${positional.closer}`
      );
      continue;
    }

    if (inPositionals) {
      if (token === '*') {
        throw new CommandDefinitionError(`不支持在位置参数之后使用 "*"：命令 "${command}"`);
      }
      throw new CommandDefinitionError(
        `不支持在位置参数之后出现裸词 "${token}"：命令 "${command}"`
      );
    }

    if (token === '*') {
      result.push(token);
      continue;
    }

    if (/[<>[\]]/.test(token)) {
      throw new CommandDefinitionError(`命令路径中的裸词 "${token}" 不能包含 "<" ">" "[" "]"`);
    }
    if (token.startsWith('-')) {
      throw new CommandDefinitionError(`命令路径中的字面量 "${token}" 不能以 "-" 开头`);
    }

    result.push(token);
  }

  for (const [index, positional] of positionals.entries()) {
    if (positional.variadic && index !== positionals.length - 1) {
      throw new CommandDefinitionError(
        `变参 "${positional.raw}" 必须是最后一个位置参数：命令 "${command}"`
      );
    }
  }

  return result.join(' ');
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function deriveName(command: string): string {
  const [first = ''] = command.trim().split(/\s+/);
  return first.replace(/[<>[\]]/g, '') || command.trim();
}

/**
 * yargs 风格的链式命令构建器。所有配置方法与 `.command()` 都返回 `this`，
 * `build()` 时校验并生成 `match()` 需要的 pattern，同时把子命令和别名展开为扁平数组。
 *
 * 别名会按 yargs 的语义沿层级组合：父命令别名会传播到子命令，
 * 同一条命令的所有别名组合都收进它的 `pattern` 数组。
 *
 * @example
 * ```ts
 * const commands = defineCommand(['config', 'cfg'], '配置管理')
 *   .command(['get <key>', 'g'], '读取配置', getHandler)
 *   .command('set <key> <value>', '设置配置', setHandler)
 *   .build();
 * // { name: 'get', pattern: ['config get <key>', 'config g <key>', 'cfg get <key>', 'cfg g <key>'] }
 * // { name: 'set', pattern: ['config set <key> <value>', 'cfg set <key> <value>'] }
 * ```
 */
export class CommandBuilder<M extends Manifest = Manifest, C = unknown> {
  private readonly commandString: string;
  private readonly commandAliases: string[];
  private readonly children: CommandBuilder<M, C>[] = [];
  private _name?: string;
  private _description?: string;
  private _aliases: string[] = [];
  private _priority = 100;
  private _execute?: CommandExecute<M, C>;

  constructor(command: string, aliases: string[] = []) {
    this.commandString = command;
    this.commandAliases = aliases;
  }

  /** 覆盖命令名，缺省取命令字符串的第一个 token */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /** 设置命令描述 */
  describe(description: string): this {
    this._description = description;
    return this;
  }

  /** 追加命令别名（仅用于查找，不参与位置参数） */
  alias(...aliases: string[]): this {
    this._aliases.push(...aliases);
    return this;
  }

  /** 设置匹配优先级，数字越小越先执行 */
  priority(priority: number): this {
    this._priority = priority;
    return this;
  }

  /** 设置命中后的执行函数 */
  execute(execute: CommandExecute<M, C>): this {
    this._execute = execute;
    return this;
  }

  /** `execute` 的 yargs 风格别名 */
  handler(handler: CommandExecute<M, C>): this {
    return this.execute(handler);
  }

  /** 追加一个子命令，返回父构建器以便继续链式调用 */
  command(child: CommandBuilder<M, C>): this;
  command(command: string | string[], describe?: string, handler?: CommandExecute<M, C>): this;
  command(
    commandOrChild: string | string[] | CommandBuilder<M, C>,
    describe?: string,
    handler?: CommandExecute<M, C>
  ): this {
    if (commandOrChild instanceof CommandBuilder) {
      this.children.push(commandOrChild);
      return this;
    }

    const [canonical = '', ...aliases] = Array.isArray(commandOrChild)
      ? commandOrChild
      : [commandOrChild];
    const child = new CommandBuilder<M, C>(canonical, aliases);
    if (typeof describe === 'string') {
      child.describe(describe);
    }
    if (handler) {
      child.handler(handler);
    }
    this.children.push(child);
    return this;
  }

  /** 校验所有命令并生成扁平的命令数组 */
  build(): Command<M, C>[] {
    return this.collect([[]]);
  }

  /**
   * @param parentPathVariants 祖先命令路径的所有别名组合
   */
  private collect(parentPathVariants: string[][]): Command<M, C>[] {
    const tokens = tokenize(this.commandString.trim());
    const firstPositional = tokens.findIndex(isPositional);
    const pathTokens = firstPositional === -1 ? tokens : tokens.slice(0, firstPositional);
    const positionalTokens = firstPositional === -1 ? [] : tokens.slice(firstPositional);

    const [commandName = ''] = pathTokens;
    const restPath = pathTokens.slice(1);
    const nameVariants = commandName
      ? unique([commandName, ...this.commandAliases, ...this._aliases])
      : [''];

    const result: Command<M, C>[] = [];
    const patterns: string[] = [];
    const childPathVariants: string[][] = [];

    for (const parentPath of parentPathVariants) {
      for (const name of nameVariants) {
        const ownPath = name ? [name, ...restPath] : restPath;
        const fullPath = [...parentPath, ...ownPath];
        const fullCommand = [...fullPath, ...positionalTokens].join(' ').trim();
        patterns.push(buildCommandPattern(fullCommand));
        childPathVariants.push(fullPath);
      }
    }

    if (this._execute) {
      result.push({
        name: this._name ?? deriveName(this.commandString),
        description: this._description,
        pattern: unique(patterns),
        priority: this._priority,
        execute: this._execute
      });
    } else if (!this.children.length) {
      throw new CommandDefinitionError(`命令 "${this.commandString}" 缺少 execute/handler`);
    }

    for (const child of this.children) {
      result.push(...child.collect(childPathVariants));
    }
    return result;
  }
}

export type ContextTypes<Ctx> =
  Ctx extends PluginContext<infer M, infer C> ? [M, C] : [Manifest, unknown];
export type ContextManifest<Ctx> = ContextTypes<Ctx>[0];
export type ContextConfig<Ctx> = ContextTypes<Ctx>[1];

/**
 * 定义一个 yargs 风格的命令，返回链式构建器。
 * 用 `.command()` 追加子命令，`build()` 时生成扁平的命令数组。
 *
 * 在插件内可直接传 `ctx` 的类型让 `M`、`C` 自动推导：
 * `defineCommand<typeof ctx>('echo')`。
 */
export function defineCommand<M extends Manifest = Manifest, C = unknown>(
  command: string | string[],
  describe?: string
): CommandBuilder<M, C>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineCommand<Ctx extends PluginContext<any>>(
  command: string | string[],
  describe?: string
): CommandBuilder<ContextManifest<Ctx>, ContextConfig<Ctx>>;
export function defineCommand<M extends Manifest = Manifest, C = unknown>(
  command: string | string[],
  describe?: string
): CommandBuilder<M, C> {
  const [canonical = '', ...aliases] = Array.isArray(command) ? command : [command];
  const builder = new CommandBuilder<M, C>(canonical, aliases);
  if (typeof describe === 'string') {
    builder.describe(describe);
  }
  return builder;
}

export { defineCommand as command };
