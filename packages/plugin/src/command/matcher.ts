import { parse } from 'shell-quote';
import yargsParser from 'yargs-parser';
import type { MatchArgs, ParsedCommand, Positional } from '@/types/matcher';

const BRACKET_CHARS = /\.*[\][<>]/g;

function syncQuoteIndex(primary: number[], second: number[], i: number) {
  if (primary.length) {
    const lastDoIndex = primary.pop()!;
    let lastSiIndex = second.slice(-1)[0];
    while (lastSiIndex && lastSiIndex > lastDoIndex) {
      second.pop();
      lastSiIndex = second.slice(-1)[0];
    }
  } else {
    primary.push(i);
  }
}

function shellParse(cmd: string, env: Record<string, string> = {}): string[] {
  const doubleQuote: number[] = [];
  const singleQuote: number[] = [];
  const length = cmd.length;
  let s = '';
  for (let i = 0; i < length; i++) {
    const code = cmd[i]!.charCodeAt(0);
    if (code === 34) {
      syncQuoteIndex(doubleQuote, singleQuote, i);
    } else if (code === 39) {
      syncQuoteIndex(singleQuote, doubleQuote, i);
    } else if (code === 35 && doubleQuote.length + singleQuote.length === 0) {
      s += '\\#';
      continue;
    }
    s += cmd[i];
  }
  return parse(s, key => env[key] ?? '$' + key)
    .map(item => {
      if (typeof item === 'string') {
        return item;
      } else if ('op' in item) {
        return item.op === 'glob' ? item.pattern : item.op;
      } else if ('comment' in item) {
        const args = shellParse(item.comment, env);
        args[0] = '#' + args[0];
        return args;
      } else {
        return '';
      }
    })
    .filter(Boolean)
    .flat();
}

function parseCommand(pattern: string): ParsedCommand {
  const parts = pattern
    .replace(/\s{2,}/g, ' ')
    .trim()
    .split(/\s+(?![^[]*]|[^<]*>)/)
    .filter(Boolean);
  const command: ParsedCommand = {
    path: [],
    demanded: [],
    optional: []
  };

  let inPositionals = false;
  parts.forEach((part, index) => {
    if (!inPositionals) {
      if (part === '*') {
        command.path.push({ kind: 'wildcard' });
        return;
      }
      if (!part.startsWith('<') && !part.startsWith('[')) {
        command.path.push({ kind: 'literal', value: part.replace(BRACKET_CHARS, '') });
        return;
      }
      inPositionals = true;
    }

    const names = part.replace(BRACKET_CHARS, '').replace(/\s/g, '').split('|').filter(Boolean);
    const positional: Positional = {
      names,
      variadic: /\.+[\]>]/.test(part) && index === parts.length - 1
    };
    if (part.startsWith('[')) {
      command.optional.push(positional);
    } else {
      command.demanded.push(positional);
    }
  });

  return command;
}

function consume(
  positional: Positional,
  remaining: (string | number)[],
  argv: MatchArgs,
  demanded: boolean
): boolean {
  const [name, ...aliases] = positional.names;
  if (!name) {
    return !demanded;
  }

  let value: string | string[];
  if (positional.variadic) {
    value = remaining.splice(0).map(String);
    if (demanded && !value.length) {
      return false;
    }
  } else {
    if (!remaining.length) {
      return !demanded;
    }
    value = String(remaining.shift());
  }

  argv[name] = value;
  for (const alias of aliases) {
    argv[alias] = value;
  }
  return true;
}

/**
 * 按 pattern 匹配输入，返回解析后的 argv；不匹配返回 null。
 *
 * ## pattern 语法（以空白分词）
 * - 命令路径：第一个位置参数之前的连续 token。
 *   - 裸词：按字面量匹配，可表示命令名或子命令。
 *   - `*`：匹配任意一个命令 token。
 * - 位置参数（出现在命令路径之后）：
 *   - `<name>` 必选
 *   - `[name]` 可选
 *   - `<a|b>` / `[a|b]` 别名
 *   - `<name...>` / `[name...]` 变参，只能用于最后一个位置参数
 * - 不需要命令名时可直接以位置参数开头，如 `<x> [y]`。
 * - `$0` 没有特殊含义，按普通 token 处理。
 *
 * ## 输入解析
 * - 用 shell-quote 处理引号、转义与 `#` 注释。
 * - 环境变量存在则替换，未定义则原样保留（如 `$0`、`$UNSET`）。
 * - 用 yargs-parser 解析 flags：`--key value` / `--flag` 写入 argv，位置参数进入 `_`。
 *
 * ## 匹配规则
 * - 先按顺序匹配命令路径：裸词必须相等，`*` 吃掉任意一个 token。
 * - 再依次消费必选位置参数，最后消费可选位置参数。
 * - 多余的位置参数不报错，保留在 `_` 中。
 * - 返回的 `_` = 匹配到的命令路径（含 `*` 命中的 token）+ 未消费的位置参数；
 *   具名位置参数只写入各自的 argv 键，不进入 `_`。
 *
 * ## 不支持的格式（调用方需报错处理，当前 match 不做校验）
 * - `*` 出现在位置参数之后，如 `cmd <a> *`（会被当成名为 `*` 的必选位置参数）
 * - 位置参数之后出现裸词，如 `cmd <a> foo`（会被当成名为 `foo` 的位置参数，语义歧义）
 * - 变参 `...` 不在最后一个位置参数上，如 `cmd <a...> <b>`（会退化为普通位置参数）
 * - 未闭合的 `<` / `[`，如 `cmd <a`、`cmd [a`（括号被静默剥离）
 * - 位置参数缺少名称，如 `cmd <>`、`cmd []`、`cmd <...>`（必选将永远匹配失败）
 * - 命令路径裸词中混入 `<` `>` `[` `]`，如 `cmd[1]`（会被剥离成 `cmd1`）
 * - 以 `-` / `--` 开头的字面量，如 `cmd --flag`（输入中的 flag 不进入位置参数，无法匹配）
 * - 位置参数中的空别名项，如 `<a|>`、`<|a>`（空项被丢弃）
 * - `...` 未紧贴 `]` / `>`，如 `<a>...`（不会识别为变参，`...` 会留在参数名里）
 * - 空 pattern（全空白）会匹配任意输入
 *
 * @param pattern 命令模板
 * @param input 用户输入
 * @returns 匹配成功返回 argv（含 `_`），失败返回 null
 */
export function match(pattern: string, input: string): MatchArgs | null {
  const command = parseCommand(pattern);
  const argv = yargsParser(shellParse(input.trim()), {
    configuration: {
      'parse-positional-numbers': false
    }
  });

  const remaining = argv._.slice(0);
  const path: string[] = [];
  for (const token of command.path) {
    if (!remaining.length) {
      return null;
    }
    if (token.kind === 'literal' && String(remaining[0]) !== token.value) {
      return null;
    }
    path.push(String(remaining.shift()));
  }

  for (const positional of command.demanded) {
    if (!consume(positional, remaining, argv, true)) {
      return null;
    }
  }
  for (const positional of command.optional) {
    if (!consume(positional, remaining, argv, false)) {
      return null;
    }
  }

  const leftover = remaining.map(String);
  argv._ = [...path, ...leftover];
  return argv;
}
