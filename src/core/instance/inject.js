/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

/**
 * 将 provide 属性赋值给 _provided
 * @param {*} vm
 */
export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

/**
 * 先初始化 inject
 * @param {*} vm
 */
export function initInjections (vm: Component) {
  // 获取 inject 中 key 对应的 provide 的值
  const result = resolveInject(vm.$options.inject, vm)

  if (result) {
    // 避免深度响应式处理
    toggleObserving(false)

    // 浅层响应式处理
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })

    toggleObserving(true)
  }
}

/**
 * 处理 inject
 * @param {*} inject
 * @param {*} vm
 */
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    const keys = hasSymbol
      // 取出包含 Symbol 的所以 key
      // reference: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect/ownKeys
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    // 遍历每个 key，从 parent 中的 _provided 属性中取出对应的值
    // 组成 key-value 的形式存入 result
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue

      const provideKey = inject[key].from
      let source = vm

      // 递归 parent
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }

      // 如果 parent 到根节点还没有取到对应的值
      // 就获取 inject 对应 key 的默认值
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default

          // 默认值是 函数就直接调用
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
