import type { IPlugin, Manifest } from '@/types/workspace';
import { freezeObject } from '@/utils/object';

export function definePlugin<const M extends Manifest>(plugin: IPlugin<M>): IPlugin<M> {
  freezeObject(plugin.info);
  return plugin;
}
