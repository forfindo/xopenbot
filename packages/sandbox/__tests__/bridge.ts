import cp from 'child_process';
import { emitKeypressEvents, type Key } from 'node:readline';
import type { MessageEvent } from '@xopenbot/onebot';

const worker = cp.fork('../src/bridge.js');

const isTTY = Boolean(process.stdin.isTTY);
let buffer = '';

const echo = (text: string) => {
  if (isTTY) {
    process.stdout.write(text);
  }
};

const send = (text: string) => {
  const id = Math.random().toString(36);
  worker.send({
    id: id,
    user_id: '12456464',
    message_id: id,
    message: [
      {
        type: 'text',
        data: {
          text
        }
      }
    ],
    alt_message: text,
    self: {
      user_id: '12456464',
      platform: 'qq'
    },
    time: Date.now(),
    type: 'message',
    detail_type: 'private',
    sub_type: ''
  } satisfies MessageEvent);
};

emitKeypressEvents(process.stdin);
if (isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

process.stdin.on('keypress', (str: string | undefined, key: Key) => {
  if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
    process.exit();
  }

  if (key.name === 'return' || key.name === 'enter') {
    echo('\n');
    const text = buffer;
    buffer = '';
    if (!text.trim()) {
      return;
    }
    send(text);
    return;
  }

  if (key.name === 'backspace') {
    if (buffer.length) {
      buffer = buffer.slice(0, -1);
      echo('\b \b');
    }
    return;
  }

  if (str && !key.ctrl && !key.meta) {
    buffer += str;
    echo(str);
  }
});
worker.on('message', data => {
  // @ts-ignore
  if (data.type === 'exec/result') {
    // @ts-ignore
    if (!data.data) {
      return;
    }
    // @ts-ignore
    // eslint-disable-next-line
    console.log(data.data.map(item => item.data.text).join(''));
    // @ts-ignore
    if (JSON.stringify(data.data).includes('saveCtx')) {
      worker.send({
        type: 'saveCtx'
      });
    }
  }
});
