import type { Part } from '@/types/message-part';
import type {
  BotImpl,
  BotAPIOptions,
  MessageEvent,
  MetaEvent,
  NoticeEvent,
  RequestEvent
} from '@xopenbot/onebot';
import type { CommandOptions, MatchArgs } from '@/types/matcher';

type MaybePromise<T> = T | Promise<T>;
type None = void | undefined | null;
type IsAny<T> = 0 extends 1 & T ? true : false;

// Workspace 不在编译期校验插件泛型，依赖由 checkManifest 在运行时校验
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyPlugin = IPlugin<any, any>;
export type AnyCommand = Command<any, any>;
export type AnyPluginInfo = PluginInfo<any>;
export type AnyListenerInfo = ListenerCallbackInfo<any, any>;
export type AnyPluginContext = PluginContext<any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 插件对象或带配置的注册项 **/
export type PluginEntry = { plugin: AnyPlugin; config: unknown };
export type Registrable = AnyPlugin | PluginEntry;

// eslint-disable-next-line
export type ConfigOf<P> = P extends IPlugin<any, infer C> ? C : unknown;
export type ValidateEntries<E extends readonly Registrable[]> = {
  [K in keyof E]: E[K] extends { plugin: infer P extends AnyPlugin; config: infer C }
    ? C extends ConfigOf<P>
      ? E[K]
      : { plugin: P; config: ConfigOf<P> }
    : E[K];
};
export type AcquireCallback<T> = () => T;
export type ReleaseCallback<T> = (r: T) => void;

// eslint-disable-next-line
type AnyBot = any;

export interface Manifest {
  /** 依赖的Bot API，缺失可能运行异常 **/
  depsOn: BotAPIOptions;
}

export interface PluginInfo<M extends Manifest> {
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

export interface Command<M extends Manifest = Manifest, C = unknown> {
  name: string;
  /** 该命令的所有 pattern（命令名 + 别名组合） */
  pattern: string[];
  priority: number;
  /** 命令描述，仅用于文档/帮助展示 */
  description?: string;
  /** 命令选项定义，`match()` 会据此解析并校验 flag */
  options?: CommandOptions;
  execute: (
    input: string,
    ctx: PluginContext<M, C>,
    args: MatchArgs
  ) => MaybePromise<ExecResult | None>;
}

export type CommandExecute<M extends Manifest, C> = Command<M, C>['execute'];

// eslint-disable-next-line
type AnyEvent = any;

// eslint-disable-next-line
export type ListenerCallback<M extends Manifest = Manifest, T = any, C = unknown> = (
  ctx: PluginContext<M, C> & { event: T }
) => MaybePromise<None>;

export interface ListenerCallbackInfo<M extends Manifest = Manifest, C = unknown> {
  callback: ListenerCallback<M, AnyEvent, C>;
  fn?: (e: unknown) => void;
  pluginName: string;
}

export type Listener<M extends Manifest = Manifest, C = unknown> = {
  message?: ListenerCallback<M, MessageEvent, C> | ListenerCallback<M, MessageEvent, C>[];
  request?: ListenerCallback<M, RequestEvent, C> | ListenerCallback<M, RequestEvent, C>[];
  notice?: ListenerCallback<M, NoticeEvent, C> | ListenerCallback<M, NoticeEvent, C>[];
  meta?: ListenerCallback<M, MetaEvent, C> | ListenerCallback<M, MetaEvent, C>[];
} & Record<string, ListenerCallback<M, AnyEvent, C> | ListenerCallback<M, AnyEvent, C>[]>;

export interface IPlugin<M extends Manifest = Manifest, C = unknown> {
  info: PluginInfo<M>;
  /** 插件可以定义init方法返回一些API，这些API会放到每个插件调用时的ctx **/
  init?: (ctx: PluginContext<M, C>) => MaybePromise<{ [key: string]: unknown }>;
  /** 命令 **/
  loadCommand(ctx: PluginContext<M, C>): MaybePromise<Command<M, C>[]>;
  /** 定时任务 **/
  loadSchedule?(ctx: PluginContext<M, C>): MaybePromise<ScheduleTask[]>;
  /** 事件监听 **/
  loadListener?(ctx: PluginContext<M, C>): MaybePromise<Listener<M, C>>;
}

export interface PluginContext<M extends Manifest = Manifest, C = unknown> {
  logger: LikeLogger;
  bot: IsAny<M> extends true ? AnyBot : BotImpl<M['depsOn']>;
  state: Record<string, unknown>;
  /** 注册该插件时传入的配置，注册后视为只读；修改需重新注册，运行期可变项用 state **/
  config: C;
  emit: (event: string, ...args: unknown[]) => void;
  /** 登记需要随插件卸载（deregister）一起释放的资源，返回 acquire 创建的值 **/
  acquireRelease: <T, R = T extends Promise<unknown> ? Awaited<T> : T>(
    acquire: AcquireCallback<T>,
    release: ReleaseCallback<R>
  ) => T;
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
