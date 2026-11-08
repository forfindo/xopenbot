import stringify from 'string.ify';
import {
  type MessageEvent,
  type NoticeEvent,
  type RequestEvent,
  type GroupMemberInfo,
  type StandardAPI,
  toCQCode,
  fromCQCode,
  type GroupInfo
} from '@xopenbot/onebot';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import isValidUTF8 from 'utf-8-validate';
import crypto from 'crypto';
import path from 'path';
import type { OutgoingHttpHeaders } from 'node:http';
import os from 'os';
import type { Config } from './index.js';

export interface SaveContextEvent {
  type: 'saveCtx';
}

export interface InitEvent {
  type: 'init';
  value: Config;
}

type CheckCallApi = { method: StandardAPI; params: unknown[] };
type CallApiResponse = { echo: string; data: unknown };
type DataType = MessageEvent | NoticeEvent | RequestEvent;

type OnMessageEvent =
  | SaveContextEvent
  | InitEvent
  | MessageEvent
  | NoticeEvent
  | RequestEvent
  | CallApiResponse;

const stringify_config = stringify.configure({
  pure: false,
  json: false,
  maxDepth: 2,
  maxLength: 10,
  maxArrayLength: 20,
  maxObjectLength: 20,
  maxStringLength: 30,
  precision: void 0,
  formatter: void 0,
  pretty: true,
  rightAlignKeys: true,
  fancy: false,
  indentation: '  '
});

const sandbox = await import('./sandbox.js');
const getGid = () => (sandbox.getContext().data?.group_id || '') as string;
const getSid = () => sandbox.getContext().data?.self.user_id || '';
const handler = new Map<string, (value: CallApiResponse) => void>();
const bots = new Map<
  string,
  {
    groups: Map<string, GroupInfo>;
  }
>();
const buckets: Record<string, { time: number; cnt: number }> = {};
interface AsyncTaskInfo {
  depth: number;
}

interface AsyncQueueState {
  tasks: Map<number, AsyncTaskInfo>;
  current: number | null;
}

interface AsyncTask {
  id: number;
  key: string;
  depth: number;
  env: DataType;
}

interface TimerEntry {
  handle: ReturnType<typeof setTimeout>;
  key: string;
}

const TIMEOUT_MAX = 2 ** 31 - 1;
const MAX_ASYNC_DEPTH = 5;
const DEFAULT_REQUEST_TIMEOUT = 30000;
const async_queue: Record<string, AsyncQueueState> = {};
const timers = new Map<number, TimerEntry>();
let task_seq = 0;

const getQueueKey = (data: DataType) => {
  return [data.self?.user_id, data.group_id, data.user_id].filter(Boolean).join('-');
};

const getQueueState = (data: DataType) => {
  const key = getQueueKey(data);
  let state = async_queue[key];
  if (!state) {
    state = {
      tasks: new Map(),
      current: null
    };
    async_queue[key] = state;
  }
  return { key, state };
};

const cleanupQueueState = (key: string) => {
  const state = async_queue[key];
  if (!state) {
    return;
  }
  if (state.tasks.size === 0 && state.current === null) {
    delete async_queue[key];
  }
};

const releaseTimer = (id: number) => {
  const entry = timers.get(id);
  if (!entry) {
    return;
  }
  timers.delete(id);
  clearTimeout(entry.handle);
  const state = async_queue[entry.key];
  if (state && state.tasks.has(id)) {
    state.tasks.delete(id);
    if (state.tasks.size === 0 && state.current === null) {
      delete async_queue[entry.key];
    }
  }
};

// 色情敏感词过滤
const ero =
  /(母狗|看批|日批|香批|批里|成人|无码|苍井空|b里|嫩b|嫩比|小便|大便|粪|屎|尿|淦|屄|屌|奸|淫|穴|肏|肛|骚|逼|妓|艹|子宫|月经|危险期|安全期|戴套|无套|内射|中出|射在里|射在外|精子|卵子|受精|幼女|嫩幼|粉嫩|日我|日烂|草我|草烂|干我|日死|草死|干死|狂草|狂干|狂插|狂操|日比|草比|搞我|舔我|舔阴|浪女|浪货|浪逼|浪妇|发浪|浪叫|淫荡|淫乱|荡妇|荡女|荡货|操烂|抽插|被干|被草|被操|被日|被上|被艹|被插|被射|射爆|射了|颜射|射脸|按摩棒|肉穴|小穴|阴核|阴户|阴阜|阴蒂|阴囊|阴部|阴道|阴唇|阴茎|肉棒|阳具|龟头|勃起|爱液|蜜液|精液|食精|咽精|吃精|吸精|吞精|喷精|射精|遗精|梦遗|深喉|人兽|兽交|滥交|拳交|乱交|群交|肛交|足交|脚交|口爆|口活|口交|乳交|乳房|乳头|乳沟|巨乳|玉乳|豪乳|暴乳|爆乳|乳爆|乳首|乳罩|奶子|奶罩|摸奶|胸罩|摸胸|胸部|胸推|推油|大保健|黄片|爽片|a片|野战|叫床|露出|露b|漏出|漏b|乱伦|轮奸|轮暴|轮操|强奸|强暴|情色|色情|全裸|裸体|果体|酥痒|捏弄|套弄|体位|骑乘|后入|二穴|三穴|嬲|调教|凌辱|饥渴|好想要|性交|性奴|性虐|性欲|性行为|性爱|做爱|作爱|手淫|撸管|自慰|痴女|鸡8|鸡ba|鸡鸡|鸡巴|鸡吧|鸡儿|肉便器|泄欲|发泄|高潮|潮吹|潮喷|爽死|爽翻|爽爆|你妈|屁眼|后庭|菊花|援交|操死|插死)/gi;

const filter = (msg: string) => {
  if (typeof msg === 'undefined') {
    return;
  } else if (typeof msg !== 'string') {
    msg = stringify_config(msg);
  }
  msg = msg.replace(ero, '⃺');
  if (!msg.length) {
    return;
  }
  return msg;
};

const asyncCallback = (
  task: AsyncTask,
  callback: (...args: unknown[]) => void,
  argv?: unknown[]
) => {
  const { id, key, env } = task;
  const state = async_queue[key];
  const active = state?.tasks.get(id);
  const prev_depth = state?.current ?? null;
  const prev_data = sandbox.getContext().data;
  if (state && active) {
    state.current = active.depth;
  }
  const function_name = `tmp_${Date.now()}_${id}`;
  sandbox.getContext()[function_name] = callback;
  let argv_name: string | undefined;
  try {
    sandbox.setEnv(env);
    if (argv === void 0) {
      sandbox.exec(`this.${function_name}.apply(this)`);
    } else {
      argv_name = `tmp_argv_${Date.now()}_${id}`;
      sandbox.getContext()[argv_name] = argv;
      sandbox.exec(`this.${function_name}.apply(this, this.${argv_name})`);
    }
  } catch (_) {
    /* empty */
  } finally {
    const cleanup = argv_name
      ? `delete this.${function_name};delete this.${argv_name}`
      : `delete this.${function_name}`;
    try {
      sandbox.exec(cleanup);
    } catch (_) {
      /* empty */
    }
    if (state && active) {
      state.current = prev_depth;
      state.tasks.delete(id);
    }
    cleanupQueueState(key);
    if (prev_data !== void 0 && prev_data !== env) {
      try {
        sandbox.setEnv(prev_data);
      } catch (_) {
        /* empty */
      }
    }
  }
};

const checkAndAddAsyncQueue = (env: DataType): AsyncTask => {
  const { key, state } = getQueueState(env);
  const depth = state.current === null ? 0 : state.current + 1;
  if (depth > MAX_ASYNC_DEPTH) {
    throw new Error('判定为递归调用，中断。');
  }
  const id = ++task_seq;
  state.tasks.set(id, { depth });
  return { id, key, depth, env };
};

/**
 * @param msg 待处理的cq码
 */
const toStr = (msg: string) => {
  let str = '';
  let cnt = 0;
  for (const char of msg) {
    if (char === '`') {
      if (cnt === 0) {
        str += '"`';
        cnt += 1;
      } else {
        str += '`"';
        cnt -= 1;
      }
    } else {
      str += char;
    }
  }
  return str;
};

const checkFrequency = () => {
  const uid = sandbox.getContext().data?.user_id as string;
  if (!uid) {
    return;
  }
  if (Object.hasOwn(buckets, uid) && Date.now() - buckets[uid]!.time > 300) {
    delete buckets[uid];
  }
  if (!Object.hasOwn(buckets, uid)) {
    buckets[uid] = { time: 0, cnt: 0 };
  }
  if (buckets[uid]!.cnt >= 3) {
    throw new Error('调用频率太快。');
  }
  buckets[uid]!.time = Date.now();
  ++buckets[uid]!.cnt;
};

const precheck = function (caller: CheckCallApi) {
  checkFrequency();
  const args_name = 'tmp_called_api_' + Date.now();
  sandbox.getContext()[args_name] = caller;
  const uid = sandbox.getContext().data?.user_id as string;
  if (!uid) {
    return;
  }
  sandbox.exec(`if (typeof this.beforeApiCalled === "function") {
    try {
     this.beforeApiCalled(this.${args_name})
    } finally {
     delete this.${args_name}
    }
  };`);
};

const callApi = (method: StandardAPI, params: unknown[] = [], check = true) => {
  if (check) {
    precheck({ method, params });
  }
  const echo = String(Math.random()) + String(Date.now());
  process.send!({
    uin: getSid(),
    method,
    params,
    echo
  });
  return new Promise<CallApiResponse>(resolve => handler.set(echo, resolve));
};

const init = async (data: DataType, gid?: string) => {
  if (!bots.has(data.self.user_id)) {
    bots.set(data.self.user_id, {
      groups: new Map()
    });
  }
  const bot = bots.get(data.self.user_id)!;
  if (!bot.groups.size) {
    sandbox.setEnv(data);
    const groups = (await callApi('getGroupList', [], false)).data as GroupInfo[];
    bot.groups = new Map(groups.map(g => [String(g.group_id), g]));
  }
  const groups = gid
    ? [(await callApi('getGroupInfo', [gid], false)).data as GroupInfo]
    : bot.groups.values();
  sandbox.setEnv(data);
  for (const ginfo of groups) {
    const membersRsp = (await callApi('getGroupMemberList', [gid], false))
      .data as GroupMemberInfo[];
    if (!membersRsp?.length) {
      continue;
    }
    const members = new Map(membersRsp.map(m => [String(m.user_id), m]));
    ginfo.members = {};
    for (const [uid, minfo] of members) {
      (ginfo.members as Record<string, GroupMemberInfo>)[uid] = minfo;
      Object.freeze(minfo);
    }
    Object.freeze(ginfo.members);
    Object.freeze(ginfo);
    if (ginfo.group_id == gid) {
      bot.groups.set(String(gid), ginfo);
    }
  }
};

const onmessage = async (data: DataType) => {
  if (data.type === 'message') {
    if (
      data.detail_type === 'group' &&
      bots.has(data.user_id) &&
      data.user_id !== data.self.user_id &&
      data.user_id < data.self.user_id
    ) {
      return callApi('leaveGroup', [data.group_id], false);
    }
    let message = '';
    for (const v of data.message) {
      if (v.type === 'text') {
        message += v.data.text;
      } else if (v.type === 'mention') {
        if (v.data.user_id == data.self.user_id && !message) {
          continue;
        }
        message += `'[CQ:mention,user_id=${v.data.user_id}]'`;
      } else if (v.type === 'mention_all') {
        message += `'[CQ:mention_all]'`;
      } else {
        message += toCQCode(v);
      }
    }
    message = message.trim();
    data.msg = message;
    sandbox.setEnv(data);
    const str = message
      .match(/```[\s\S]*```/)?.[0]
      .replace(/```/g, '')
      .trim();
    if (str) {
      message = message.replace(/```[\s\S]*```/, JSON.stringify(str));
    } else if (
      !message.includes('return') &&
      message.includes('`') &&
      /\[CQ:[^\]]+\]/.test(message)
    ) {
      message = toStr(message);
    }
    let echo = true;
    try {
      let res = sandbox.run(message);
      if (typeof res === 'string' && res.includes('`') && /\[CQ:[^\]]+\]/.test(res)) {
        res = sandbox.run(res);
      }
      if (message.match(/^['"`]\[CQ:mention,user_id=\d+\]['"`]$/)) {
        echo = false;
      }
      if (res === null && message === 'null') {
        echo = false;
      }
      if (['number', 'boolean'].includes(typeof res) && String(res) === message) {
        echo = false;
      }
      if (message.substring(0, 1) === '\\' && typeof res === 'undefined') {
        res = '<undefined>';
      }
      res = filter(res as string);
      if (echo && res) {
        res = fromCQCode(res as string);
        process.send!({
          type: 'exec/result',
          id: data.id,
          data: res
        });
      } else {
        process.send!({
          type: 'exec/result',
          id: data.id,
          data: ''
        });
      }
    } catch (err) {
      process.send!({
        type: 'exec/result',
        id: data.id,
        data: echo ? `${String(err)}` : ''
      });
    }
  } else {
    sandbox.setEnv(data);
  }
  if (!bots.has(data.self.user_id)) {
    await init(data);
  } else if (data.type === 'notice' && data.detail_type.includes('group')) {
    await init(data, data.group_id as string);
  }
  try {
    sandbox.exec(`if(typeof this.onEvents === 'function'){this.onEvents()}`);
  } catch {
    /* empty */
  }
};

sandbox.include(
  'setTimeout',
  function (fn: (...args: unknown[]) => void, timeout = 5000, ...args: unknown[]) {
    if (typeof fn !== 'function') {
      throw new TypeError('fn(第一个参数)必须是函数。');
    }
    timeout = typeof timeout === 'number' ? timeout : Number(timeout);
    if (!Number.isFinite(timeout) || timeout < 5000) {
      throw new Error('延迟时间不能小于5000毫秒。');
    }
    if (timeout > TIMEOUT_MAX) {
      throw new Error(`延迟时间不能大于${TIMEOUT_MAX}毫秒。`);
    }
    const env = sandbox.getContext().data as DataType;
    checkFrequency();
    const task = checkAndAddAsyncQueue(env);
    const cb = () => {
      try {
        asyncCallback(task, fn, args.length ? args : void 0);
      } finally {
        releaseTimer(task.id);
      }
    };
    const handle = setTimeout(cb, timeout);
    timers.set(task.id, { handle, key: task.key });
    return task.id;
  }
);
sandbox.include('clearTimeout', function (id: unknown) {
  if (typeof id !== 'number') {
    throw new TypeError('id(第一个参数)必须是数字。');
  }
  releaseTimer(id);
});

const temp = {
  get: function (url: string, callback = () => {}, headers?: http.OutgoingHttpHeaders) {
    const params = {
      method: 'get',
      headers: headers
    };
    temp.request(url, params, callback);
  },
  post: function (
    url: string,
    body: unknown,
    callback = () => {},
    headers?: http.OutgoingHttpHeaders
  ) {
    const params = {
      method: 'post',
      body: body,
      headers: headers
    };
    temp.request(url, params, callback);
  },
  request: function (
    url: string,
    params: http.RequestOptions & { body?: unknown },
    callback = () => {}
  ) {
    if (typeof url !== 'string') {
      throw new TypeError('url(第一个参数)必须是字符串。');
    }
    if (typeof callback !== 'function') {
      throw new TypeError('callback(第三个参数)必须是函数。');
    }
    if (typeof params !== 'object' || params === null) {
      throw new TypeError('params(第二个参数)必须是对象。');
    }
    url = url.trim();
    const protocol = url.substring(0, 5) === 'https' ? https : http;
    const data: Uint8Array<ArrayBufferLike>[] = [];
    let size = 0;
    const options = params;
    if (!options.headers) {
      options.headers = {};
    }
    if (Array.isArray(options.headers)) {
      throw new TypeError('headers 不支持数组形式。');
    }
    const headers = options.headers as OutgoingHttpHeaders;
    Object.assign(headers, { 'accept-encoding': 'gzip' });
    const body = options?.body;
    delete options.body;
    if (
      typeof options.timeout !== 'number' ||
      !Number.isFinite(options.timeout) ||
      options.timeout <= 0
    ) {
      options.timeout = DEFAULT_REQUEST_TIMEOUT;
    } else if (options.timeout > TIMEOUT_MAX) {
      options.timeout = TIMEOUT_MAX;
    }
    checkFrequency();
    const env = sandbox.getContext().data as DataType;
    const task = checkAndAddAsyncQueue(env);
    let done = false;
    const cb = (data: unknown) => {
      if (done) {
        return;
      }
      done = true;
      asyncCallback(task, callback, [data]);
    };
    try {
      const req = protocol.request(url, options, res => {
        res.on('error', err => cb(err));
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          res.headers['status-code'] = String(res.statusCode);
          res.destroy();
          cb(res.headers);
          return;
        }
        res.on('data', (chunk: Uint8Array<ArrayBufferLike>) => {
          size += chunk.length;
          if (size > 500000) {
            res.destroy();
            cb(new Error('响应内容过大。'));
            return;
          }
          data.push(chunk);
        });
        res.on('end', () => {
          if (res.headers['content-encoding'] && res.headers['content-encoding'].includes('gzip')) {
            try {
              zlib.gunzip(Buffer.concat(data), (err, buffer) => {
                cb(err ? JSON.stringify(err) : buffer.toString());
              });
            } catch {
              /* empty */
            }
          } else {
            const buf = Buffer.concat(data);
            cb(isValidUTF8(buf) ? buf.toString() : buf);
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error('请求超时。')));
      req.on('error', err => cb(err));
      if (body) {
        if (
          !headers['content-type'] ||
          String(headers['content-type']).includes('application/json')
        ) {
          req.write(JSON.stringify(body));
        } else {
          req.write(body);
        }
      }
      req.end();
    } catch (e) {
      cb(e);
    }
  }
};
const fetch = function (url: string, callback = () => {}, headers?: http.OutgoingHttpHeaders) {
  return temp.get(url, callback, headers);
};
Object.assign(fetch, temp);
sandbox.include('fetch', fetch);

//master可以执行任意代码
sandbox.include('run', (code: string) => {
  if (sandbox.getContext().isMaster?.()) {
    try {
      return eval(code) as unknown;
    } catch (e) {
      return (e as Error).stack;
    }
  } else {
    throw new Error('403 forbidden');
  }
});

sandbox.getContext().crypto = crypto;
sandbox.include('path', path);
sandbox.include('zip', zlib.deflateSync);
sandbox.include('unzip', zlib.unzipSync);
sandbox.include('os', os);
sandbox.include('Buffer', Buffer);

// bot api
const $ = {
  getGroupInfo: () => {
    return bots.get(getSid())?.groups?.get(getGid());
  },
  sendPrivateMsg: (uid: string, msg: string) => {
    uid = String(uid);
    msg = filter(msg) || '';
    if (!msg) {
      return;
    }
    callApi('sendMessage', ['private', uid, fromCQCode(msg)]).catch(() => {});
  },
  sendGroupMsg: (gid: string, msg: string) => {
    gid = String(gid);
    msg = filter(msg) || '';
    if (!msg) {
      return;
    }
    callApi('sendMessage', ['group', gid, fromCQCode(msg)]).catch(() => {});
  },
  sendDiscussMsg: (id: string, msg: string) => {
    msg = filter(msg) || '';
    if (!msg) {
      return;
    }
    callApi('sendMessage', ['channel', id, fromCQCode(msg)]).catch(() => {});
  },
  deleteMsg: (message_id: string) => {
    callApi('deleteMessage', [message_id]).catch(() => {});
  },
  // eslint-disable-next-line @typescript-eslint/unbound-method
  ajax: temp.get,
  // eslint-disable-next-line @typescript-eslint/unbound-method
  get: temp.get
};
sandbox.include('$', $);

process.on('disconnect', () => process.exit());
process.on('message', (value: OnMessageEvent) => {
  if ('type' in value && value.type === 'saveCtx') {
    sandbox.saveCtx();
    return;
  }
  if ('type' in value && value.type === 'init') {
    const config = value.value;
    sandbox.include('master', config.master.join(','));
    if (config.dataPath) {
      process.env.dataPath = config.dataPath;
    }
    return;
  }
  if (!('type' in value) && 'echo' in value) {
    handler.get(value.echo)?.(value);
    handler.delete(value.echo);
  } else {
    onmessage(value).catch(() => {});
  }
});

//防止沙盒逃逸
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/unbound-method
Function.prototype['view'] = Function.prototype.toString;
Function.prototype.constructor = new Proxy(Function, {
  apply: () => {
    throw Error('想跟妾身斗，汝还差得远呢。');
  },
  construct: () => {
    throw Error('想跟妾身斗，汝还差得远呢。');
  }
});
Object.freeze(Object);
Object.freeze(Object.prototype);
Object.freeze(Function);
Object.freeze(Function.prototype);
