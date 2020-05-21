/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
/**
 * 包装函数，主要是对参数进行校准，实际调用了 _createElement
 * @param {*} context VNode 上下文环境
 * @param {*} tag 标签，一个字符串或者 component
 * @param {*} data VNode 的数据  referencce: flow/vnode.js
 * @param {*} children 当前 VNode 的子节点，后续会被规范为 VNode 数组
 * @param {*} normalizationType 子节点规范化的类型，对应不同的规范方法，参考依据是 render 函数是编译生成还是用户手写
 * @param {*} alwaysNormalize
 */
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

/**
 * 真正的 createElement 逻辑
 * @param {*} context
 * @param {*} tag
 * @param {*} data
 * @param {*} children
 * @param {*} normalizationType
 */
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // 避免用响应式数据作为 data，因为每次的重新渲染都会重新生成 VNode
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  // 绑定 is 属性 => 动态组件
  // refeence case: https://codesandbox.io/s/github/vuejs/vuejs.org/tree/master/src/v2/examples/vue-20-dynamic-components
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }

  // 绑定的 is 属性值不存在 => falsy value
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }

  // warn against non-primitive key
  // 绑定的 key 属性值应为简单类型的 string/number
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }

  // children 规范化处理
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  if (normalizationType === ALWAYS_NORMALIZE /** 2 */) {
    // 调用场景一：render 函数是用户手写
    // 调用场景二：编译 <template>, <slot>, v-for 的时候
    // reference: src/core/vdom/helpers/normalize-children.js
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE /** 1 */) {
    // render 函数是编译生成的
    // reference: src/core/vdom/helpers/normalize-children.js
    children = simpleNormalizeChildren(children)
  }

  // 创建 VNode =>
  let vnode, ns

  // string
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)

    // 如果是内置的一些节点，则直接创建一个普通 VNode
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn)) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // 如果是为已注册的组件名，则通过 createComponent 创建一个组件类型的 VNode
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 创建一个未知的标签的 VNode
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    // 直接创建一个组件 VNode
    vnode = createComponent(tag, data, context, children)
  }

  // 如果生成的 vnode
  if (Array.isArray(vnode)) {
    // 是数组，直接返回
    return vnode
  } else if (isDef(vnode)) {
    // vnode 为 truely value，进行处理后返回
    if (isDef(ns)) applyNS(vnode, ns)

    // 对 class、style 做深度依赖收集
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    // 为 falsely value 返回一个空的 VNode
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
// 对 class、style 做深度依赖收集
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
