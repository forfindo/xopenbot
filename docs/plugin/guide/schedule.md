---
outline: deep
---

# 定时任务

插件可以实现 `loadSchedule()` 返回要注册的定时任务，`cron` 使用标准 cron 表达式：

```ts
import { Workspace } from '@xopenbot/plugin';
import type { IPlugin, Manifest, ScheduleTask } from '@xopenbot/plugin';

const reminderPlugin: IPlugin<Manifest> = {
  info: { name: 'reminder', version: '1.0.0', description: '定时提醒' },
  loadCommand() {
    return [];
  },
  loadSchedule(): ScheduleTask[] {
    return [
      {
        name: 'daily',
        cron: '0 0 9 * * *',
        task(fireDate) {
          // 返回 true 表示执行成功，false 表示失败
          console.log('触发时间：', fireDate);
          return true;
        }
      }
    ];
  }
};

const workspace = new Workspace(bot);
await workspace.registry(reminderPlugin);
```

任务以 `插件名_任务名` 作为唯一标识；同名任务不会重复注册，非法 `cron` 会记录错误并
跳过。

## 日志

`Workspace` 的构造器第一个参数是 `bot`（会作为 `ctx.bot` 传给每个插件），第二个参数
可以传入一个 logger；不传时会依次回退到 `bot.logger`、`console`。定时任务执行的成功/
失败会记录到它：

```ts
const workspace = new Workspace(bot, logger);
```
