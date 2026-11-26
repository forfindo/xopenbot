---
outline: deep
---

# 命令与消息处理

## 处理消息

```ts
const outputs = await workspace.process('echo 你好', {});

// [
//   {
//     plugin: 'echo',
//     name: 'echo',
//     content: [{ type: 'text', text: '你好' }]
//   }
// ]
```

返回值的 `content` 是 `Part[]`，如何转换成 QQ 消息由调用方决定。`process` 的第二个
参数是额外的消息上下文，会合并进命令 `execute` 的 `ctx`；但 `logger`、`bot`、`emit`、
`state`、`config` 由工作区强制覆盖，传入的同名键不会生效。

命令默认在第一个命中后停止匹配，只有 `execute` 返回 `{ next: true }` 时才会继续尝试
后续命令，最终的返回值会是多个命令结果的数组。

## 用构造器定义命令

推荐用 `defineCommand` 构造命令：

```ts
import { defineCommand } from '@xopenbot/plugin';

export const echoCommands = defineCommand('echo [text...]', '复读消息')
  .alias('say', 'repeat')
  .priority(100)
  .handler((input, ctx, args) => {
    const text = (args.text as string[] | undefined)?.join(' ') ?? '';
    return { content: [{ type: 'text', text: text || '用法：echo <内容>' }] };
  })
  .build();
```

`defineCommand` 的第一个参数是命令字符串，也可以传数组，第一项为命令名，其余项为别名：

```ts
defineCommand(['config', 'cfg'], '配置管理');
```

`handler` 是 `execute` 的别名。`build()` 会校验命令字符串并返回 `Command[]`，可以直接
作为 `loadCommand()` 的返回值。

### 子命令与别名

```ts
import { defineCommand } from '@xopenbot/plugin';

export const configCommands = defineCommand(['config', 'cfg'], '配置管理')
  .command(['get <key>', 'g'], '读取配置', (input, ctx, args) => {
    return { content: [{ type: 'text', text: `key=${args.key}` }] };
  })
  .command('set <key> <value>', '设置配置', (input, ctx, args) => {
    return { content: [{ type: 'text', text: `${args.key}=${args.value}` }] };
  })
  .build();
```

上面的命令会展开为两条命令，父命令别名会传播到子命令：

```ts
[
  {
    name: 'get',
    description: '读取配置',
    pattern: ['config get <key>', 'config g <key>', 'cfg get <key>', 'cfg g <key>'],
    priority: 100,
    execute: getHandler
  },
  {
    name: 'set',
    description: '设置配置',
    pattern: ['config set <key> <value>', 'cfg set <key> <value>'],
    priority: 100,
    execute: setHandler
  }
]
```

- 父命令自身有 `handler` 时也会生成一条命令；只有子命令、没有 `handler` 时，父命令只作为
  路径前缀。
- 子命令也可以直接传一个构建器：`.command(defineCommand('remote').handler(...))`，用于
  多级子命令。
- 没有 `handler` 且没有子命令时，`build()` 会抛出 `CommandDefinitionError`。

### 构造器方法

| 方法 | 说明 |
| --- | --- |
| `defineCommand(command, describe?)` | 创建构建器；`command` 为字符串或数组（第一项为命令名，其余为别名） |
| `.name(name)` | 覆盖命令名，缺省取命令字符串的第一个 token |
| `.describe(description)` | 设置命令描述，仅用于文档/帮助展示 |
| `.alias(...aliases)` | 追加命令别名 |
| `.priority(priority)` | 设置优先级，默认 `100`，数字越小越先执行 |
| `.execute(fn)` / `.handler(fn)` | 设置命中后的执行函数 |
| `.command(child \| command, describe?, handler?)` | 追加子命令，返回父构建器以便链式调用 |
| `.build()` | 校验命令字符串并返回扁平的 `Command[]` |

## execute 参数

`execute` / `handler` 的第三个参数是 `yargs-parser` 解析后的 `Arguments`：

```ts
defineCommand('set <key> <value>')
  .handler((input, ctx, args) => {
    const key = String(args.key);
    const value = String(args.value);
    return { content: [{ type: 'text', text: `${key}=${value}` }] };
  })
  .build();
```

`Arguments` 总是包含 `_`（命令路径与未消费的位置参数）。具名位置参数与 `--flag` 按名字
写入；`--key value` 与 `--flag` 都会被解析，位置参数不会因为形如数字而被转成 `number`。

`execute` 的第一个参数始终是本次 `process` 收到的完整输入（已 trim），不是剔除命令名后
的剩余部分；需要参数时请从第三个参数的 `args` 中读取。

## pattern 语法

命令字符串（以及最终生成的 `pattern`）以空白分词，第一个位置参数之前的 token 是命令路径：

| 写法 | 含义 |
| --- | --- |
| `echo` | 字面量，按 token 精确匹配 |
| `*` | 匹配任意一个命令 token |
| `<name>` | 必选位置参数 |
| `[name]` | 可选位置参数 |
| `<a\|b>` / `[a\|b]` | 位置参数别名，匹配后每个别名都会写入 `args` |
| `<name...>` / `[name...]` | 变参，收集剩余位置参数为数组，只能作为最后一个位置参数 |
| `<x> [y]` | 不需要命令名时可以直接以位置参数开头 |

`build()` 会把 yargs 风格的 `..` 归一化为 `...`，并校验以下不支持的写法，命中时抛出
`CommandDefinitionError`：

- 位置参数之后出现 `*` 或裸词；
- 变参不在最后一个位置参数上；
- 未闭合的 `<` / `[`，或位置参数缺少名称；
- 命令路径中的裸词以 `-` 开头或混入 `<` `>` `[` `]`；
- 位置参数包含空别名项，或 `...` 未紧贴结束符。

## 匹配规则

- 一条命令可以有多条 `pattern`（别名/子命令组合），匹配时按数组顺序取第一个命中的模板。
- 先按顺序匹配命令路径（字面量必须相等，`*` 消费任意一个 token），再依次消费必选
  位置参数，最后消费可选位置参数。
- 多余的位置参数不会报错，会保留在 `args._` 中。
- `args._` 包含匹配到的命令路径（含 `*` 命中的 token）与未消费的位置参数；具名位置参数
  只写入各自的键。
- 输入用 shell-quote 处理引号、转义与 `#` 注释；`$VAR` 在环境变量存在时替换，未定义时
  原样保留。
- 全部命令按 `priority` 升序执行，数字越小越先执行；命中后默认停止，只有 `execute`
  返回 `{ next: true }` 时继续匹配后续命令。

## 卸载插件

```ts
workspace.deregister('echo');
```

`deregister` 按插件的 `info.name` 删除该插件的插件信息、全部命令、`init` 注入的 API
与该插件的 `state`、`config`，取消它的所有定时任务，并移除 `loadListener` 注册的全部事件监听。
重复注册同名插件时会先自动执行一次 `deregister`，因此插件状态会重置，监听器也不会
重复挂载。
