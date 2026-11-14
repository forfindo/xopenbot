import { mergeObject } from '@/utils/merge';
import { cancelJob, type Job, scheduleJob } from 'node-schedule';
import type {
  Command,
  IPlugin,
  LikeLogger,
  ListenerCallbackInfo,
  PluginContext,
  PluginInfo,
  ProcessResult,
  RegistryResult,
  ScheduleTask
} from '@/types/workspace';
import type { Bot } from '@xopenbot/onebot';
import { EventEmitter } from 'node:events';
import { extraSubEvents } from '@/utils/event';

function normalizePattern(pattern: string | RegExp): RegExp {
  if (typeof pattern === 'string') {
    return new RegExp(pattern.startsWith('^') ? pattern : '^' + pattern);
  }
  return pattern.source.startsWith('^') ? pattern : new RegExp('^' + pattern.source, pattern.flags);
}

export class Workspace {
  private plugins: (PluginInfo & { loadTime: number })[] = [];
  private commands: (Command & { plugin: string })[] = [];
  /** 根据插件名字 **/
  private apis: { [key: string]: { [key: string]: unknown } } = {};
  /** 定时任务列表 **/
  private tasks: (ScheduleTask & { plugin: string })[] = [];
  private runningTask: Job[] = [];
  private states: Record<string, Record<string, unknown>> = {};
  private listeners: Record<string, ListenerCallbackInfo[]> = {};
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
      const values = this.listeners[key]!;
      values.forEach(cbInfo => {
        if (cbInfo.pluginName !== name) {
          return;
        }
        const pluginContext = {
          logger: this.logger,
          bot: this.bot,
          emit: this.emit,
          state: this.states[cbInfo.pluginName] || {}
        } satisfies PluginContext;
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
            this.bot.on?.('message', cbInfo.fn);
            break;
          case 'notice':
            this.bot.on?.('notice', cbInfo.fn);
            break;
          case 'request':
            this.bot.on?.('request', cbInfo.fn);
            break;
          case 'meta':
            this.bot.on?.('meta', cbInfo.fn);
            break;
          default:
            this.emitter.on(key, cbInfo.fn);
        }
      });
    }
  }

  private cancelListen(pluginName: string) {
    for (const key of Object.keys(this.listeners)) {
      const values = this.listeners[key]!;
      const isBotEvent =
        key === 'message' || key === 'notice' || key === 'request' || key === 'meta';
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

  private async load(plugin: IPlugin) {
    const name = plugin.info.name;
    try {
      // —— 准备阶段：只计算、不碰 this.*，任何抛错都安全 ——
      const state: Record<string, unknown> = {};
      const ctx: PluginContext = {
        logger: this.logger,
        bot: this.bot,
        emit: this.emit,
        state
      };

      const apis = await plugin.init?.(ctx);
      const commands = (await plugin.loadCommand(ctx)).map(item => ({
        plugin: name,
        ...item,
        pattern: normalizePattern(item.pattern)
      }));
      const tasks = ((await plugin.loadSchedule?.(ctx)) ?? []).map(item => ({
        ...item,
        plugin: name
      }));
      const listeners = await plugin.loadListener?.(ctx);

      // —— 提交阶段：下面全是无抛错的纯内存操作 ——
      this.deregister(name);
      this.states[name] = state;
      if (apis) {
        this.apis[name] = apis;
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
      this.logger.warn(`插件 ${name} 加载失败，reason：${String(e)}`);
      return {
        name,
        error: String(e)
      };
    }
  }

  async registry(...plugins: IPlugin[]): Promise<RegistryResult> {
    const result: RegistryResult = {
      ok: true,
      failure: []
    };
    for (const plugin of plugins) {
      const errors = await this.load(plugin);
      if (errors) {
        result.ok = false;
        result.failure!.push(errors);
      }
    }
    return result;
  }

  async process(input: string, ctx: { [key: string]: unknown }) {
    const processResult: ProcessResult[] = [];
    const initApis = mergeObject(...Object.values(this.apis));
    for (const command of this.commands) {
      const result = input.match(command.pattern);
      if (result) {
        const prefix = result[0];
        const execRst = await command.execute(
          input.substring(prefix.length).trim(),
          {
            ...initApis,
            ...ctx,
            logger: this.logger,
            bot: this.bot,
            emit: this.emit,
            state: this.states[command.plugin] || {}
          },
          result.slice(1)
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
    Reflect.deleteProperty(this.states, pluginName);
    this.cancelListen(pluginName);
  }

  listPlugin() {
    return this.plugins;
  }
}
