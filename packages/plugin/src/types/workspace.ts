import type { Part } from '@/types/message-part';
import type {
  Bot,
  BotImpl,
  StandardAPI,
  MessageEvent,
  MetaEvent,
  NoticeEvent,
  RequestEvent
} from '@xopenbot/onebot';

type MaybePromise<T> = T | Promise<T>;
type None = void | undefined | null;

export interface Manifest {
  /** 依赖的Bot API，缺失可能运行异常 **/
  depsOn: Partial<{
    [key in StandardAPI]: true;
  }> & {
    [key: string]: true;
  };
}

export interface PluginInfo<M extends Manifest = Manifest> {
  name: string;
  version: string;
  description: string;
  manifest?: M;
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

export interface Command<M extends Manifest = Manifest> {
  name: string;
  pattern: string | RegExp;
  priority: number;
  execute: (
    input: string,
    ctx: PluginContext<M>,
    args?: string[]
  ) => MaybePromise<ExecResult | None>;
}

// eslint-disable-next-line
export type ListenerCallback<M extends Manifest, T = any> = (
  ctx: PluginContext<M> & { event: T }
) => MaybePromise<None>;

export interface ListenerCallbackInfo<M extends Manifest = Manifest> {
  callback: ListenerCallback<M>;
  fn?: (e: unknown) => void;
  pluginName: string;
}

export type Listener<M extends Manifest = Manifest> = {
  message?: ListenerCallback<M, MessageEvent> | ListenerCallback<M, MessageEvent>[];
  request?: ListenerCallback<M, RequestEvent> | ListenerCallback<M, RequestEvent>[];
  notice?: ListenerCallback<M, NoticeEvent> | ListenerCallback<M, NoticeEvent>[];
  meta?: ListenerCallback<M, MetaEvent> | ListenerCallback<M, MetaEvent>[];
} & Record<string, ListenerCallback<M> | ListenerCallback<M>[]>;

export interface IPlugin<M extends Manifest = Manifest> {
  info: PluginInfo<M>;
  /** 插件可以定义init方法返回一些API，这些API会放到每个插件调用时的ctx **/
  init?: (ctx: PluginContext<M>) => MaybePromise<{ [key: string]: unknown }>;
  /** 命令 **/
  loadCommand(ctx: PluginContext<M>): MaybePromise<Command<M>[]>;
  /** 定时任务 **/
  loadSchedule?(ctx: PluginContext<M>): MaybePromise<ScheduleTask[]>;
  /** 事件监听 **/
  loadListener?(ctx: PluginContext<M>): MaybePromise<Listener<M>>;
}

export interface PluginContext<M extends Manifest = Manifest> {
  logger: LikeLogger;
  bot: BotImpl<keyof M['depsOn'] & keyof Bot>;
  state: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
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
