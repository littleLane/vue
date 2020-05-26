/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 通过 Object.defineProperty 代理对象属性的访问
 * @param {*} target
 * @param {*} sourceKey
 * @param {*} key
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 初始化 data/props/methods/computed/watch
 * call from => src/core/instance/init.js
 * @param {*} vm
 */
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

/**
 * 处理 options.props
 *    只会对最外层的属性做响应式处理，不会做深度的响应式
 *
 * 校验，响应式，代理
 * @param {*} vm
 * @param {*} propsOptions
 */
function initProps (vm: Component, propsOptions: Object) {
  // 从父组件传递过来的 props 数据
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }

  // 遍历 options.props 上的每个 key 属性
  for (const key in propsOptions) {
    keys.push(key)

    // 对父组件传入的 props 进行合法性校验
    const value = validateProp(key, propsOptions, propsData, vm)

    /* istanbul ignore else */
    // 把每个 prop 对应的值变成响应式
    if (process.env.NODE_ENV !== 'production') {
      // 校验 prop 的 key 是否是 HTML 的保留属性，并给出警告
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }

      // 添加自定义 setter，当直接对 prop 赋值的时候会输出警告
      defineReactive(props, key, value, () => {
        // 不是根实例，且不是父组件修改 props 触发的更新
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }

    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 将 vm._props.xxx 的访问代理到 vm.xxx 上
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }

  toggleObserving(true)
}

/**
 * 处理 options.data
 * @param {*} vm
 */
function initData (vm: Component) {
  let data = vm.$options.data

  // 如果 data 是函数，就执行函数，获取返回的数据对象
  // 如果 data 不是函数，做判空赋值
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}

  // 函数返回的不是对象，就将 data 设置对 {}，然后警告提示
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 1、data 里面定义的属性在 methods or props 同时存在就会发出警告
  // 2、props 里面的属性最终会覆盖 data 里面存在的相同属性
  // 3、methods 里面的属性会被 data 里面存在的相同属性覆盖
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key) /* 以 $ 或者 _ 开头的属性 */) {
      // 不是 props 里面的 key 而且不是以 $ 或者 _ 开头的属性就代理到 vm._data 上
      // vm._data 保存的是最终会生效的 data 属性
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  // data 响应式处理
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * 遍历 options.computed 每个属性，然后针对每个属性创建对应的 computed watcher
 * @param {*} vm
 * @param {*} computed
 */
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  // 遍历 options.computed 每个属性
  for (const key in computed) {
    const userDef = computed[key]

    // 每个 computed 可以为函数或者包含 get/set 属性的对象
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    // 为每个属性创建对应的 computed watcher
    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the component prototype.
    //    => reference: src/core/global-api/extend.js
    // We only need to define computed properties defined at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 在 options.data 或 options.props 上定义了 computed 属性，则发出警报
      // 而且会覆盖 options.data 或 options.props 中的相同属性
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

/**
 * 将 computed 绑定到 target 上
 * @param {*} target
 * @param {*} key
 * @param {*} userDef
 */
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 执行这个方法的时候，会执行属性的 getter，getter 会触发依赖收集
 * 当每个属性赋值时，会执行 setter，就会触发 notify
 * @param {*} key
 */
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      // 获取执行 getter 结果
      if (watcher.dirty) {
        watcher.evaluate()
      }

      // getter 做依赖收集
      // 当前全局的渲染 watcher 订阅了当前的 computed watcher
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

/**
 * 初始化 watcher
 * @param {*} vm
 * @param {*} watch
 */
function initWatch (vm: Component, watch: Object) {
  // 遍历处理每一个 watcher
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

/**
 * 为 options.watch 每一个 watcher 对应的每个 handler 创建一个 watcher
 * 实则通过 vm.$watch 创建 watcher
 * @param {*} vm
 * @param {*} expOrFn
 * @param {*} handler watcher 的处理函数，(函数) 或者 (包含 handler、deep、immediate 的对象) 或者 (handler 数组) 或者 (一个已经定义好的方法)
 * @param {*} options
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this

    // 如果 cb 即 handler 还是对象，继续递归调用 createWatcher
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }

    options = options || {}

    // 将当前 watcher 标记为 user watcher
    options.user = true

    // 创建 watcher 实例
    const watcher = new Watcher(vm, expOrFn, cb, options)

    // 如果设置了 immediate 为 true，就立即调用一次获取值
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }

    // 返回一个函数，用于销毁 watcher
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
