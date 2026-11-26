export interface MatchArgs {
  /** Non-option arguments */
  _: Array<string>;
  /** Arguments after the end-of-options flag `--` */
  '--'?: Array<string | number>;
  /** All remaining options */
  // eslint-disable-next-line
  [argName: string]: any;
}

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
