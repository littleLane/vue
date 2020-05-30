/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

/**
 * 初始化 Vue.prototype._init
 * @param {*} Vue
 */
export function initMixin (Vue: Class<Component>) {
  // 调用的两种场景 =>
  //    1、new Vue(options)
  //    2、实例化子组件
  Vue.prototype._init = function (options?: Object) {
    // 组件实例
    const vm: Component = this
    // a uid
    // 递增 _uid，用于标识唯一的组件实例
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 避免后面做数据响应式的时候将 vm 实例也响应化
    vm._isVue = true
    // merge options
    // 实例化组件时调用
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // 外部通过 new Vue(options) 调用
      // 合并配置项
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    // vm._renderProxy 赋值，vm 实例或 vm 代理对象
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm

    // 初始化生命周期相关的属性
    initLifecycle(vm)

    // 初始化事件
    initEvents(vm)

    // 初始化 createElement 函数和属性代理
    initRender(vm)

    // 调用 beforeCreate 生命周期
    callHook(vm, 'beforeCreate')

    // 初始化 inject
    // 注意在初始化 data/props 之前
    initInjections(vm) // resolve injections before data/props

    // 初始化 data/props/methods/computed/watch
    initState(vm)

    // 初始化 provide，在 data/props 之后
    initProvide(vm) // resolve provide after data/props

    // 调用 created 生命周期
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // vm.$mount 挂载节点
    // reference: src/platforms/web/entry-runtime-with-compiler.js
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 将 new Vue 时传入的 options 和 Vue 实例上的一些属性合并到当前组件实例的 $options 上。
 * @param {*} vm 当前的组件实例
 * @param {*} options 组件实例化传入的的参数
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options /** Sub.options */)
  // doing this because it's faster than dynamic enumeration.
  // 将实例化子组件传入的子组件父 VNode 实例 parentVnode
  const parentVnode = options._parentVnode

  // 将子组件的父 Vue 实例 parent 保存到 vm.$options 中
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  // 保留了 parentVnode 配置中如 propsData 等其它的属性
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
