/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0

    // 给对象添加 __ob__ 属性并设置为当前的 Observer 实例
    def(value, '__ob__', this)

    if (Array.isArray(value)) {
      // 对数组方法做拦截处理
      // 如果支持 __proto__ 就直接修改 __proto__ 属性值
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        // 如果不支持 __proto__ 就遍历每个方法通过 defineProperty 设置属性
        copyAugment(value, arrayMethods, arrayKeys)
      }

      // 对数组的每个元素做响应式处理
      this.observeArray(value)
    } else {
      // 遍历对象的每个属性，实现响应式处理
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历对象的每个属性，实现响应式处理
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * data 响应式处理
 * @param {*} value 需要响应式处理的数据
 * @param {*} asRootData 是否为根数据，即 new Vue() 传递的 data
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 不是对象或者是 VNode 实例就直接返回
  if (!isObject(value) || value instanceof VNode) {
    return
  }

  let ob: Observer | void

  // 如果 value 上有 __ob__ 属性，说明已经响应式处理过了，直接返回
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&    // 需要响应式标识为 true
    !isServerRendering() &&   // 不是服务端渲染
    (Array.isArray(value) || isPlainObject(value)) &&   // 对象或者数组
    Object.isExtensible(value) &&   // 可扩展
    !value._isVue   // 不是 Vue 对象本身
  ) {
    ob = new Observer(value)
  }

  // 标识以这个作为根数据的 vm，为后面的销毁提供依据
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 定义对象属性响应式处理
 * @param {*} obj 需要处理的对象
 * @param {*} key 当前需要处理的对象属性
 * @param {*} val 当前需要处理的对象属性对应的 value
 * @param {*} customSetter 自定义的 setter
 * @param {*} shallow 是否为浅响应式处理
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 实例化一个当前对象当前属性的依赖收集器
  //    对象的每个属性都有一个依赖收集器
  const dep = new Dep()

  // 获取属性本身的属性描述符
  // 如果描述符 configurable 为 false 直接返回，因为表示不可配置
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 缓存属性原本的 getter 和 setter
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 深度响应式处理
  let childOb = !shallow && observe(val)

  // 重新定义属性的描述符对象
  // 既然代码逻辑可以执行到这里，说明 enumerable 和 configurable 都为 true
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val

      // 会有一个栈的结构依照父子组件顺序保存一连串的 watcher
      // Dep.target 标识了当前处理的是哪个 watcher，
      //    通过 pushTarget 赋值当前处理的 watcher
      //    通过 popTarget 回到前一个 watcher
      // 依赖收集 => 将 dep 存入当前的 watcher
      if (Dep.target) {
        dep.depend()

        // 深入依赖收集
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 获取 old value 值
      const value = getter ? getter.call(obj) : val

      /* eslint-disable no-self-compare */
      // 避免重复赋值或 NaN 赋值
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }

      // 对赋值的值做深度响应式处理
      childOb = !shallow && observe(newVal)

      // 触发所有收集到的相关 watchers
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * call reference: src/core/global-api/index.js
 * this.$set(obj, 'name', 'littleLane')
 * 注意对象不能是 Vue 实例，或者 Vue 实例的根数据对象。
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // target 必须是引用类型
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }

  // target 是数组，根据 key 设置 length 属性
  // 将 val 插入到合适的位置
  // 返回 val
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }

  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }

  const ob = (target: any).__ob__
  if (target._isVue /* Vue 实例 */ || (ob && ob.vmCount) /* root $data */) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }

  if (!ob) {
    target[key] = val
    return val
  }

  // 新添加的属性变成响应式对象
  defineReactive(ob.value, key, val)

  // 手动的触发依赖更新通知
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 * call reference: src/core/global-api/index.js
 *    this.$delete(obj, 'name')
 * 注意对象不能是 Vue 实例，或者 Vue 实例的根数据对象。
 */
export function del (target: Array<any> | Object, key: any) {
  // target 必须是引用类型
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }

  // 数组直接调用 splice
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }

  const ob = (target: any).__ob__
  if (target._isVue /* Vue 实例 */ || (ob && ob.vmCount) /* root $data */) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }

  // 不是自有属性直接 return
  if (!hasOwn(target, key)) {
    return
  }

  delete target[key]

  if (!ob) {
    return
  }

  // 手动的触发依赖更新通知
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
