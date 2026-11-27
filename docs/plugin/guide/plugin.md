---
outline: deep
---

# 编写插件

## 定义插件

插件是一个实现了 `IPlugin` 的对象，推荐用 `definePlugin()` 创建：

```ts
import { defineCommand, definePlugin } from '@xopenbot/plugin';

export const echoPlugin = definePlugin({
  info: {
    name: 'echo',
    version: '1.0.0',
    description: '复读机示例'
  },
  // 让 definePlugin 推断返回类型；手写 Command[] 会退化为 Command<Manifest>，与收窄后的 M 冲突
  loadCommand() {
    return defineCommand('echo [text...]', '复读消息')
      // 数字越小越先执行（全局按 priority 升序排列）
      .priority(100)
      .handler((input, ctx, args) => {
        const text = (args.text as string[] | undefined)?.join(' ') ?? '';
        if (!text) {
          return {
            content: [{ type: 'text', text: '用法：echo <内容>' }]
          };
        }
        return {
          content: [{ type: 'text', text }]
        };
      })
      .build();
  }
});
```

`definePlugin()` 使用 `const` 泛型原样返回传入的对象，并递归冻结 `info`（含
`manifest`），防止插件信息在运行时被修改。也可以手写
`const plugin: IPlugin<Manifest> = {...}`，但此时 `M` 固定为 `Manifest`，`ctx.bot`
不会按具体 `depsOn` 收窄，因此推荐优先使用 `definePlugin()`。

## 插件配置

需要配置的插件用柯里化形式 `definePlugin<Config>()` 声明配置类型，注册时通过
`{ plugin, config }` 传入，`Workspace` 会把配置注入该插件的 `ctx.config`：

```ts
import { defineCommand, definePlugin } from '@xopenbot/plugin';

interface EchoConfig {
  prefix: string;
  times?: number;
}

export const echoPlugin = definePlugin<EchoConfig>()({
  info: { name: 'echo', version: '1.0.0', description: '带配置的复读机' },
  loadCommand(ctx) {
    // ctx.config.prefix 已按 EchoConfig 收窄
    return defineCommand<typeof ctx>(`${ctx.config.prefix}echo [text...]`, '带配置的复读机')
      .handler((input, ctx, args) => {
        const text = (args.text as string[] | undefined)?.join(' ') ?? '';
        return { content: [{ type: 'text', text }] };
      })
      .build();
  }
});

// 注册时传入配置，字段类型与必填项会被校验
await workspace.registry({
  plugin: echoPlugin,
  config: { prefix: '!' }
});
```

- 不声明配置类型时 `ctx.config` 为 `unknown`；`definePlugin({...})` 的旧写法不变。
- 不传配置时 `ctx.config` 为 `undefined`，需要必填配置的插件应使用
  `definePlugin<Config>()`。
- 同名插件成功注册时会把 `config` 重置为最新一次传入的值。
- `config` 注册后视为只读，修改需用新值重新 `registry`（会重建该插件的 `state`、定时
  任务与监听）；运行期可变项请用 `ctx.state`。
- `registry` 也支持混用：`workspace.registry(echoPlugin, { plugin: other, config })`。

## 声明依赖（manifest）

插件通过 `info.manifest.depsOn` 声明自己用到的 Bot API。`depsOn` 的取值来自
`BotAPIOptions`（定义在 `@xopenbot/onebot`）：标准动作写 `'function'`，`selfInfo` /
`logger` 写 `'field'`，扩展成员两种都可以。声明后 `ctx.bot` 上对应的成员会从可选变成
必填（仅在类型层面），并在插件注册时被检查：

```ts
import { definePlugin } from '@xopenbot/plugin';

export const noticePlugin = definePlugin({
  info: {
    name: 'notice',
    version: '1.0.0',
    description: '依赖声明示例',
    manifest: {
      depsOn: {
        selfInfo: 'field', // 标准字段，有类型补全
        tts: 'function' // 扩展动作，通过字符串索引签名放行
      }
    }
  },
  loadCommand(ctx) {
    const uid = ctx.bot.selfInfo.user_id; // 声明后不再是可选
    ctx.bot.tts();
    return [];
  }
});
```

- `depsOn` 的键来自 `StandardAPI`（即 `keyof StandardBot` 去掉 `on` / `off`），标准 API
  有补全；扩展 API 的名字通过字符串索引签名放行，因此写错名字无法在编译期发现，只会在
  注册时报错。
- 值 `'function'` / `'field'` 会参与 `BotImpl` 类型推导：声明为函数的成员可以直接调用，
  声明为字段的成员可以直接读取。标准动作只能声明为 `'function'`，`selfInfo`、`logger`
  只能声明为 `'field'`。
- 不写 `manifest` 时，`M` 会退化为 `Manifest`，`ctx.bot` 上所有标准成员都会被当作必选，
  扩展成员会被当作函数；但运行时不会做依赖检查，仍需自行保证 bot 实现了它们。需要精确
  控制类型时请显式声明 `manifest.depsOn`。
- 注册时 `Workspace` 会遍历 `depsOn`，bot 上缺少对应成员会判定为加载失败，错误记录到
  `result.failure`，其他插件不受影响。声明依赖意味着你在类型上信任运行时 bot 一定实现了
  它。
- 如果 manifest 不内联，请用 `satisfies` 而不是类型标注，否则字面量类型会被拓宽，
  `ctx.bot` 的收窄会失效：

```ts
import type { Manifest } from '@xopenbot/plugin';

// 保留字面量类型
const manifest = { depsOn: { sendGroupMessage: 'function' } } satisfies Manifest;

// 错误：拓宽成 Manifest，ctx.bot 不会收窄
const manifest: Manifest = { depsOn: { sendGroupMessage: 'function' } };
```

## 注册插件

```ts
import { Workspace } from '@xopenbot/plugin';
import { echoPlugin } from './plugins/echo';

const workspace = new Workspace(bot);
const result = await workspace.registry(echoPlugin);

if (!result.ok) {
  console.error('插件加载失败：', result.failure);
}
```

`registry` 也支持一次注册多个插件：

```ts
await workspace.registry(echoPlugin, anotherPlugin);
```

单个插件加载抛错不会影响其他插件注册，错误会记录在 `result.failure` 中。
