import { mergeObject } from '@/utils/object';
import { cancelJob, type Job, scheduleJob } from 'node-schedule';
import type {
  AcquireCallback,
  AnyCommand,
  AnyListenerInfo,
  AnyPlugin,
  AnyPluginContext,
  AnyPluginInfo,
  LikeLogger,
  Manifest,
  PluginEntry,
  PluginInfo,
  ProcessResult,
  Registrable,
  RegistryResult,
  ReleaseCallback,
  ScheduleTask,
  ValidateEntries
} from '@/types/workspace';
import type { Bot } from '@xopenbot/onebot';
import { EventEmitter } from 'node:events';
import { extraSubEvents } from '@/utils/event';
import { match } from '@/command/matcher';
import type { MatchArgs } from '@/types/matcher';

const BOT_EVENTS = new Set(['message', 'request', 'notice', 'meta']);

export class Workspace {
  private plugins: (AnyPluginInfo & { loadTime: number })[] = [];
  private commands: (AnyCommand & { plugin: string })[] = [];
  /** 根据插件名字 **/
  private apis: { [key: string]: { [key: string]: unknown } } = {};
  /** apis 合并结果缓存，apis 变更时置空重算 **/
  private mergedApis: Record<string, unknown> | null = null;
  /** 定时任务列表 **/
  private tasks: (ScheduleTask & { plugin: string })[] = [];
  private runningTask: Job[] = [];
  private states: Record<string, Record<string, unknown>> = {};
  private configs: Record<string, unknown> = {};
  private listeners: Record<string, AnyListenerInfo[]> = {};
  /** 每个插件通过 acquireRelease 登记的资源释放回调，deregister 时统一执行 **/
  private resources: Record<string, (() => void)[]> = {};
  private readonly logger: LikeLogger;
  private readonly bot: Bot;
  private emitter: EventEmitter = new EventEmitter();
  private emit = (event: string, ...args: unknown[]) => {
    const events = extraSubEvents(event);
    for (const e of events) {
      this.emitter.emit(e, ...args);
    }
  };

  constructor(bot: Bot, logger?: LikeLogger) {
    this.bot = bot;
    this.logger = logger || this.bot.logger || console;
    this.emitter.setMaxListeners(0);
  }

  private logListenerError(pluginName: string, event: string, error: unknown) {
    this.logger.error(
      `插件 ${pluginName} 处理事件 ${event} 时出错：${error instanceof Error ? error.message : String(error)}`
    );
  }

  private createAcquireRelease(pluginName: string) {
    return <T, R>(acquire: AcquireCallback<T>, release: ReleaseCallback<R>) => {
      const entry = acquire();
      if (entry instanceof Promise) {
        const bucket = this.resources[pluginName];
        entry
          .then((item: R) => {
            if (this.resources[pluginName] === bucket) {
              (this.resources[pluginName] ??= []).push(() => release(item));
            } else {
              release(item);
            }
          })
          .catch(() => {});
      } else {
        (this.resources[pluginName] ??= []).push(() => release(entry as unknown as R));
      }
      return entry;
    };
  }

  private releaseCallbacks(pluginName: string, callbacks: (() => void)[]) {
    for (let i = callbacks.length - 1; i >= 0; i--) {
      try {
        callbacks[i]!();
      } catch (error) {
        this.logger.error(
          `插件 ${pluginName} 释放资源失败：${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  private releaseResources(pluginName: string) {
    const callbacks = this.resources[pluginName];
    if (!callbacks) {
      return;
    }
    Reflect.deleteProperty(this.resources, pluginName);
    this.releaseCallbacks(pluginName, callbacks);
  }

  private addSchedule(task: (typeof this.tasks)[number]) {
    const existing = this.tasks.find(
      item => item.plugin === task.plugin && item.name === task.name
    );
    if (existing) {
      return;
    }

    const job = scheduleJob(`${task.plugin}_${task.name}`, task.cron, async (fireDate: Date) => {
      try {
        const success = await task.task(fireDate);
        if (success) {
          this.logger.info(`定时任务 ${task.plugin}_${task.name} 执行成功`);
        } else {
          this.logger.error(`定时任务 ${task.plugin}_${task.name} 执行失败`);
        }
      } catch (e) {
        this.logger.error(
          `定时任务 ${task.plugin}_${task.name} 执行失败。${e instanceof Error ? e.message : String(e)}`
        );
      }
    });

    if (!job) {
      this.logger.error(`定时任务 ${task.name} cron 表达式非法: ${task.cron}`);
      return;
    }

    this.tasks.push(task);
    this.runningTask.push(job);
  }

  private listen(name: string) {
    for (const key of Object.keys(this.listeners)) {
      const targets = this.listeners[key]!.filter(cbInfo => cbInfo.pluginName === name);
      if (!targets.length) {
        continue;
      }

      const isBotEvent = BOT_EVENTS.has(key);
      if (isBotEvent && (!this.bot.on || !this.bot.off)) {
        this.logger.warn(`插件 ${name} 无法监听 ${key} 事件：Bot 未同时提供 on/off 方法`);
        continue;
      }

      const pluginContext = {
        logger: this.logger,
        bot: this.bot,
        emit: this.emit,
        state: this.states[name] || {},
        config: this.configs[name],
        acquireRelease: this.createAcquireRelease(name)
      } satisfies AnyPluginContext;

      for (const cbInfo of targets) {
        cbInfo.fn = (e: unknown) => {
          try {
            const result = cbInfo.callback({
              event: e,
              ...pluginContext
            });
            if (result instanceof Promise) {
              result.catch(error => this.logListenerError(name, key, error));
            }
          } catch (error) {
            this.logListenerError(name, key, error);
          }
        };
        switch (key) {
          case 'message':
            this.bot.on!('message', cbInfo.fn);
            break;
          case 'notice':
            this.bot.on!('notice', cbInfo.fn);
            break;
          case 'request':
            this.bot.on!('request', cbInfo.fn);
            break;
          case 'meta':
            this.bot.on!('meta', cbInfo.fn);
            break;
          default:
            this.emitter.on(key, cbInfo.fn);
        }
      }
    }
  }

  private cancelListen(pluginName: string) {
    for (const key of Object.keys(this.listeners)) {
      const values = this.listeners[key]!;
      const isBotEvent = BOT_EVENTS.has(key);
      const matched = values.filter(item => item.pluginName === pluginName && item.fn);
      if (matched.length && isBotEvent && !this.bot.off) {
        this.logger.warn(`bot 未实现 off 方法，无法取消插件 ${pluginName} 对 ${key} 事件的监听`);
      }
      // 取消监听
      matched.forEach(cbInfo => {
        if (!cbInfo.fn || (isBotEvent && !this.bot.off)) {
          return;
        }
        switch (key) {
          case 'message':
            this.bot.off!('message', cbInfo.fn);
            break;
          case 'notice':
            this.bot.off!('notice', cbInfo.fn);
            break;
          case 'request':
            this.bot.off!('request', cbInfo.fn);
            break;
          case 'meta':
            this.bot.off!('meta', cbInfo.fn);
            break;
          default:
            this.emitter.off(key, cbInfo.fn);
        }
      });
      this.listeners[key] = this.listeners[key]!.filter(item => item.pluginName !== pluginName);
      if (!this.listeners[key].length) {
        Reflect.deleteProperty(this.listeners, key);
      }
    }
  }

  private cancelSchedule(task: (typeof this.tasks)[number]): void {
    const existingIndex = this.tasks.findIndex(
      item => item.plugin === task.plugin && item.name === task.name
    );
    const jobIndex = this.runningTask.findIndex(
      item => item.name === `${task.plugin}_${task.name}`
    );
    if (jobIndex >= 0) {
      cancelJob(this.runningTask[jobIndex]!);
      this.runningTask.splice(jobIndex, 1);
    }
    if (existingIndex >= 0) {
      this.tasks.splice(existingIndex, 1);
    }
  }

  private async load(plugin: AnyPlugin, config: unknown) {
    const name = plugin.info.name;
    const resources: (() => void)[] = [];
    let committed = false;
    let released = false;
    const acquireRelease = <T, R>(acquire: AcquireCallback<T>, release: ReleaseCallback<R>) => {
      const entry = acquire();
      if (entry instanceof Promise) {
        entry
          .then((item: R) => {
            // 异步 acquire 在本次加载已回收（失败或已卸载）后 resolve 时直接释放，
            // 避免回调被推入不再被回收的资源数组造成泄漏
            if (released || (committed && this.resources[name] !== resources)) {
              release(item);
            } else {
              resources.push(() => release(item));
            }
          })
          .catch(() => {});
      } else {
        resources.push(() => release(entry as unknown as R));
      }
      return entry;
    };
    try {
      // —— 准备阶段：只计算、不碰 this.*，任何抛错都安全 ——
      checkManifest(this.bot, plugin.info as PluginInfo<Manifest>);
      const state: Record<string, unknown> = {};
      const ctx: AnyPluginContext = {
        logger: this.logger,
        bot: this.bot,
        emit: this.emit,
        state,
        config,
        acquireRelease
      };

      const apis = await plugin.init?.(ctx);
      const commands = (await plugin.loadCommand(ctx)).map(item => ({
        plugin: name,
        ...item,
        pattern: item.pattern
      }));
      const tasks = ((await plugin.loadSchedule?.(ctx)) ?? []).map(item => ({
        ...item,
        plugin: name
      }));
      const listeners = await plugin.loadListener?.(ctx);

      // —— 提交阶段：下面全是无抛错的纯内存操作 ——
      this.deregister(name);
      this.resources[name] = resources;
      committed = true;
      this.states[name] = state;
      this.configs[name] = config;
      if (apis) {
        this.apis[name] = apis;
        this.mergedApis = null;
      }
      this.plugins.push({
        ...plugin.info,
        loadTime: Date.now()
      });
      this.commands.push(...commands);
      this.commands.sort((c1, c2) => c1.priority - c2.priority);
      for (const task of tasks) {
        this.addSchedule(task);
      }
      if (listeners) {
        for (const event of Object.keys(listeners)) {
          const callbacks = Array.isArray(listeners[event]!)
            ? listeners[event]
            : [listeners[event]!];
          for (const cb of callbacks) {
            if (this.listeners[event]) {
              this.listeners[event].push({
                pluginName: name,
                callback: cb
              });
            } else {
              this.listeners[event] = [
                {
                  pluginName: name,
                  callback: cb
                }
              ];
            }
          }
        }
        // 开启事件监听
        this.listen(name);
      }
    } catch (e) {
      // 加载失败时回收本次已创建的资源，避免泄漏
      released = true;
      if (this.resources[name] === resources) {
        this.releaseResources(name);
      } else {
        this.releaseCallbacks(name, resources);
      }
      this.logger.warn(`插件 ${name} 加载失败，reason：${String(e)}`);
      return {
        name,
        error: String(e)
      };
    }
  }

  async registry<const E extends readonly Registrable[]>(
    ...entries: E & ValidateEntries<E>
  ): Promise<RegistryResult> {
    const result: RegistryResult = {
      ok: true,
      failure: []
    };
    for (const entry of entries) {
      const { plugin, config } = isPluginEntry(entry) ? entry : { plugin: entry, config: void 0 };
      const errors = await this.load(plugin, config);
      if (errors) {
        result.ok = false;
        result.failure!.push(errors);
      }
    }
    return result;
  }

  async process(input: string, ctx: { [key: string]: unknown }) {
    const processResult: ProcessResult[] = [];
    const initApis = (this.mergedApis ??= mergeObject(...Object.values(this.apis)));
    for (const command of this.commands) {
      input = input.trim();
      let argv: MatchArgs | null = null;
      const result = command.pattern.find(item => (argv = match(item, input, command.options)));
      if (result) {
        const execRst = await command.execute(
          input,
          {
            ...initApis,
            ...ctx,
            logger: this.logger,
            bot: this.bot,
            emit: this.emit,
            state: this.states[command.plugin] || {},
            config: this.configs[command.plugin],
            acquireRelease: this.createAcquireRelease(command.plugin)
          },
          argv!
        );
        if (execRst?.content?.length) {
          processResult.push({
            plugin: command.plugin,
            name: command.name,
            content: execRst.content
          });
        }
        if (!execRst?.next) {
          break;
        }
      }
    }
    return processResult;
  }

  deregister(pluginName: string) {
    this.plugins = this.plugins.filter(item => item.name !== pluginName);
    this.commands = this.commands.filter(item => item.plugin !== pluginName);
    const removed = this.tasks.filter(item => item.plugin === pluginName);
    removed.forEach(item => this.cancelSchedule(item));
    Reflect.deleteProperty(this.apis, pluginName);
    this.mergedApis = null;
    Reflect.deleteProperty(this.states, pluginName);
    Reflect.deleteProperty(this.configs, pluginName);
    this.cancelListen(pluginName);
    // 回收插件创建的资源
    this.releaseResources(pluginName);
  }

  listPlugin() {
    return this.plugins;
  }
}

function isPluginEntry(entry: Registrable): entry is PluginEntry {
  return typeof entry === 'object' && entry !== null && 'plugin' in entry;
}

function checkManifest(bot: Bot, info: PluginInfo<Manifest>) {
  const depsOn = info.manifest?.depsOn;
  if (!depsOn) {
    return;
  }
  for (const key of Object.keys(depsOn)) {
    if (!depsOn[key]) {
      continue;
    }
    if (!bot[key]) {
      throw new Error(`插件${info.name}依赖Bot API：${key}，请实现该API或联系插件开发者`);
    }
  }
}
