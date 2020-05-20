/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  // 将全局配置 config 挂载到 Vue 类上
  // 暴露 get 方法返回
  // 禁止 set 方法给 config 重新赋值 => 直接抛出警告，且不做任何的后续处理
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 在 Vue 类上通过 util 挂载众多的方法
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 初始化 Vue.options，并挂载 components、directives、filters
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  // 挂载内置的 keep-alive 组件
  extend(Vue.options.components, builtInComponents)

  // 初始化 Vue.use 插件机制
  initUse(Vue)

  // 初始化 Vue.mixin 用于混入，实则是调用 mergeOptions 合并配置
  initMixin(Vue)

  // 初始化 Vue.extend
  initExtend(Vue)

  // 挂载 Vue.component、Vue.directive 和 Vue.filter 类方法
  initAssetRegisters(Vue)
}
