import cp from 'child_process';
import type { MessageEvent } from '@xopenbot/onebot';

// 还原context函数名称丢失
const worker = cp.fork('../src/bridge.js');

process.stdin.on('data', data => {
  const id = Math.random().toString(36);
  worker.send({
    id: id,
    user_id: '12456464',
    message_id: id,
    message: [
      {
        type: 'text',
        data: {
          text: data.toString()
        }
      }
    ],
    alt_message: data.toString(),
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
    console.log(data.data);
    // @ts-ignore
    if (JSON.stringify(data.data).includes('saveCtx')) {
      worker.send({
        type: 'saveCtx'
      });
    }
  }
});
