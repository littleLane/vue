/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]

  // Object.defineProperty
  // 对原生的数组方法做拦截
  def(
    arrayMethods /* 需要处理的对象 */,
    method /* 需要处理的属性 */,
    function mutator (...args) {
      const result = original.apply(this, args)
      const ob = this.__ob__
      let inserted
      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args
          break
        case 'splice':
          inserted = args.slice(2)
          break
      }

      // 对数组新增的数据做响应式处理
      if (inserted) ob.observeArray(inserted)

      // notify change
      ob.dep.notify()

      return result
    }
  )
})
