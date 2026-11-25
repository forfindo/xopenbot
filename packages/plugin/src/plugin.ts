import type { IPlugin, Manifest } from '@/types/workspace';
import { freezeObject } from '@/utils/object';

export function definePlugin<C = unknown>(): <const M extends Manifest>(
  plugin: IPlugin<M, C>
) => IPlugin<M, C>;
export function definePlugin<const M extends Manifest>(plugin: IPlugin<M>): IPlugin<M>;
export function definePlugin(input?: unknown) {
  const freeze = <const M extends Manifest, C>(plugin: IPlugin<M, C>) => {
    freezeObject(plugin.info);
    return plugin;
  };
  return input === void 0 ? freeze : freeze(input as IPlugin<Manifest>);
}
