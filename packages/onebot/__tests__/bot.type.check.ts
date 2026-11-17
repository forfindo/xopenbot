import type { BotAPIOptions, BotImpl } from '@/bot';

const options = {
  getChannelMemberList: 'function',
  getFile: 'function',
  uid: 'field',
  tts: 'function',
  selfInfo: 'field',
  getGroupInfo: 'function'
} as const satisfies BotAPIOptions;
declare const botImpl: BotImpl<typeof options>;

void options;
void botImpl.getChannelMemberList('ttt', 'tttt');
void botImpl.tts('ffdsag', 'fff');
if (botImpl.selfInfo.user_id) {
  void 0;
}
