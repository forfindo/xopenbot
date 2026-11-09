import cp from 'child_process';
import vm from 'vm';
import type { MessageEvent } from '@xopenbot/onebot';

const worker = cp.fork('../src/bridge.js');

let buffer = '';

const isComplete = (code: string) => {
  try {
    new vm.Script(code);
    return true;
  } catch {
    return false;
  }
};

process.stdin.on('data', data => {
  buffer += data.toString();

  if (!buffer.endsWith('\n') || !isComplete(buffer)) {
    return;
  }

  const text = buffer.replace(/\r?\n$/, '');
  buffer = '';

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
