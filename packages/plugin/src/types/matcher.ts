export interface MatchArgs {
  /** Non-option arguments */
  _: Array<string>;
  /** Arguments after the end-of-options flag `--` */
  '--'?: Array<string | number>;
  /** All remaining options */
  // eslint-disable-next-line
  [argName: string]: any;
}

/** 命令选项的值类型，对应 yargs-parser 的解析行为 **/
export type CommandOptionType = 'string' | 'number' | 'boolean' | 'array';

/** 单个命令选项的定义，语义与 yargs 的 option 配置一致 **/
export interface CommandOption {
  /** 选项别名，可传单个或多个；命中后每个别名都会写入 argv **/
  alias?: string | string[];
  /** 帮助文本中的说明 **/
  describe?: string;
  /** 值类型，缺省由 yargs-parser 推断 **/
  type?: CommandOptionType;
  /** 默认值；未传入该选项时也会写入 argv **/
  default?: unknown;
  /** 是否必填；为 `true` 时缺失视为不匹配，为字符串时同义 **/
  demandOption?: boolean | string;
  /** 允许的取值；不在其中时视为不匹配 **/
  choices?: readonly (string | number)[];
  /** 是否在帮助文本中隐藏 **/
  hidden?: boolean;
}

/** 选项名到选项定义的映射；值直接传字符串等价于 `{ describe: 值 }` **/
export type CommandOptions = Record<string, CommandOption | string>;

export interface Positional {
  names: string[];
  variadic: boolean;
}

export type PathToken = { kind: 'literal'; value: string } | { kind: 'wildcard' };

export interface ParsedCommand {
  path: PathToken[];
  demanded: Positional[];
  optional: Positional[];
}
