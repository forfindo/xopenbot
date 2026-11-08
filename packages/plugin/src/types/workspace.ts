import type { Part } from '@/types/message-part';
import type { Bot } from '@xopenbot/onebot';

type MaybePromise<T> = T | Promise<T>;
type None = void | undefined | null;

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
}

export interface ExecResult {
  next?: boolean;
  content?: Part[];
}

export interface ScheduleTask {
  /** 定时任务调度的格式化字符串 **/
  cron: string;
  name: string;
  /** 返回true成功，false失败 **/
  task: (fireDate: Date) => MaybePromise<boolean>;
}

export interface Command {
  name: string;
  pattern: string | RegExp;
  priority: number;
  execute: (input: string, ctx: PluginContext, args?: string[]) => MaybePromise<ExecResult | None>;
}

export type ListenerCallback = (ctx: PluginContext) => MaybePromise<None>;

export interface IPlugin {
  info: PluginInfo;
  /** 插件可以定义init方法返回一些API，这些API会放到每个插件调用时的ctx **/
  init?: (ctx: PluginContext) => MaybePromise<{ [key: string]: unknown }>;
  /** 命令 **/
  loadCommand(ctx: PluginContext): MaybePromise<Command[]>;
  /** 定时任务 **/
  loadSchedule?(ctx: PluginContext): MaybePromise<ScheduleTask[]>;
  /** 事件监听 **/
  loadListener?(ctx: PluginContext): MaybePromise<Record<string, ListenerCallback>>;
}

export interface PluginContext {
  logger: LikeLogger;
  bot: Bot;
  state: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProcessResult {
  plugin: string;
  name: string;
  content?: Part[];
}

export interface RegistryResult {
  ok: boolean;
  failure?: {
    name: string;
    error: string;
  }[];
}

export interface LikeLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
