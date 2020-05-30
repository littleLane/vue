/* @flow */

import { mergeOptions } from '../util/index'

/**
 * 初始化全局混入 Vue.mixin
 * @param {*} Vue
 */
export function initMixin (Vue: GlobalAPI) {
  // 实际调用的还是合并配置方法
  // 全局注册一个混入，影响注册之后所有创建的每个 Vue 实例
  // 因为后面所有组件的实例化都会合并 Vue 实例的配置
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
