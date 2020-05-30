/* @flow */

import { toArray } from '../util/index'

/**
 * 初始化 Vue.use
 * @param {*} Vue
 */
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 避免插件重复安装
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    // [Vue, ...rest]

    // 如果插件提供了 install 方法，就执行 install
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // 如果插件没有提供 install 方法，就执行本身
      plugin.apply(null, args)
    }

    // 将插件加入缓存
    installedPlugins.push(plugin)
    return this
  }
}
