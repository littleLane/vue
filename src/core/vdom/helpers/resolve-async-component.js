/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'

/**
 * 保证能找到异步组件 JS 定义的组件对象，
 * 如果它是一个普通对象，则调用 Vue.extend 把它转换成一个组件的构造函数
 * @param {*} comp
 * @param {*} base
 */
function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    // for async1
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

/**
 * 创建了一个占位的注释 VNode，
 * 同时把 asyncFactory 和 asyncMeta 赋值给当前 vnode
 * @param {*} factory
 * @param {*} data
 * @param {*} context
 * @param {*} children
 * @param {*} tag
 */
export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

// 三种创建异步组件的方式 =>
// async1:
//   Vue.component('async-example', function (resolve, reject) {
//     require(['./my-async-component'], resolve)
//   })
// async2:
//   Vue.component('async-webpack-example', () => import('./my-async-component'))
// async3:
//   Vue.component('async-example', () => ({
//     // 需要加载的组件。应当是一个 Promise
//     component: import('./MyComp.vue'),
//     // 加载中应当渲染的组件
//     loading: LoadingComp,
//     // 出错时渲染的组件
//     error: ErrorComp,
//     // 渲染加载中组件前的等待时间。默认：200ms。
//     delay: 200,
//     // 最长等待时间。超出此时间则渲染错误组件。默认：Infinity
//     timeout: 3000
//   }))
/**
 * 异步组件处理逻辑
 * @param {*} factory 定义异步组件的函数，也就是 Vue.component 的第二个参数
 * @param {*} baseCtor Vue 类
 */
export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  const owner = currentRenderingInstance
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    const owners = factory.owners = [owner]
    let sync = true
    let timerLoading = null
    let timerTimeout = null

    // 处理 @hook:destroyed
    ;(owner: any).$on('hook:destroyed', () => remove(owners, owner))

    // 遍历 factory.contexts，拿到每一个调用异步组件的实例 vm, 执行 vm.$forceUpdate() 方法
    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        (owners[i]: any).$forceUpdate()
      }

      // 组件渲染完成后，清除 loading 和 timeout 定时器
      if (renderCompleted) {
        owners.length = 0
        if (timerLoading !== null) {
          clearTimeout(timerLoading)
          timerLoading = null
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout)
          timerTimeout = null
        }
      }
    }

    // once reference: src/shared/util.js
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      // 异步渲染的情况下 sync 为 false
      if (!sync) {
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    // once reference: src/shared/util.js
    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )

      // 渲染 error 组件
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    // 执行异步组件的定义函数
    const res = factory(resolve, reject)

    if (isObject(res)) {
      // for async2
      if (isPromise(res)) {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) {
        // for async3
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)

          // 如果 delay 延迟为 0，表示立即加载组件，立即进入 loading 状态
          if (res.delay === 0) {
            factory.loading = true
          } else {
            // 否则设置定时器，延迟进行加载状态
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        // 设置超时定时器，如果超时还没加载完成就 reject
        if (isDef(res.timeout)) {
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
