import type yargsParser from 'yargs-parser';

export type MatchArgs = ReturnType<typeof yargsParser>;

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
