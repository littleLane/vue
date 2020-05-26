/* @flow */

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

/**
 * 校验 props
 * @param {*} key 遍历的 props key
 * @param {*} propOptions props 在规范后生成的 options.props 对象
 * @param {*} propsData 从父组件传递的 prop 数据
 * @param {*} vm
 */
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]

  // 父组件没有传递这个 prop 数据
  const absent = !hasOwn(propsData, key)
  let value = propsData[key]

  // boolean casting
  // 处理 Boolean 类型的数据
  const booleanIndex = getTypeIndex(Boolean, prop.type)

  // 大于 -1，说明设置的类型符合设置的类型
  if (booleanIndex > -1) {
    // Boolean 类型的 prop 没有设置默认值，就将默认值置为 false
    if (absent && !hasOwn(prop, 'default')) {
      value = false
    } else if (value === '' || value === hyphenate(key) /** 将驼峰转成连字符 */) {
      // student 组件 props: { nickName: [Boolean, String] }
      // value === ''    =>    <student nick-name></student>
      // value === hyphenate(key)    =>     <student nick-name="nick-name"></student>

      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type)

      // 没有设置 String，或者 Boolean 和 String 都设置了，但是 Boolean 在 String 的前面
      // like     =>     props: { nickName: [Boolean, String] }
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true
      }
    }
  }

  // check default value
  // 处理默认数据
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)

    // since the default value is a fresh copy,
    // make sure to observe it.
    // 将 props 的值进行响应式处理
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }

  // prop 断言
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent)
  }

  // 返回最终的 prop 值
  return value
}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  // 没有设置 default 默认值，直接返回 undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }

  const def = prop.default

  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }

  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  // 判断如果是上一次组件渲染父组件传递的 prop 的值是 undefined，
  // 则直接返回上一次的默认值 vm._props[key]，这样可以避免触发不必要的 watcher 的更新。
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }

  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  // 判断 def 如果是工厂函数且 prop 的类型不是 Function 构造函数时，返回工厂函数的返回值，否则直接返回 def
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 * @param {*} prop
 * @param {*} name
 * @param {*} value
 * @param {*} vm
 * @param {*} absent
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  // 如果 prop 设置了 required，但是父组件没有传值
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }

  // 如果 value 不存在，且 prop 没有设置 required，不做任何处理
  if (value == null && !prop.required) {
    return
  }

  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []

  // 将 prop.type 转换成数组
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }

    // 遍历设置的 types，进行 assertType
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }

  if (!valid) {
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }

  // 通过传入的校验器校验数据
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

/**
 * 传值和预设类型断言
 * @param {*} value
 * @param {*} type
 */
function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid

  // 获取设置的 prop.type 的类型
  const expectedType = getType(type)

  // 判断获取的 prop.type 类型是否为简单的预设类型
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()

    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }

  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 *
 * // 去除构造函数的函数名
 * Boolean => toString() => function Boolean() { [native code] }
 * Object => toString() => function Object() { [native code] }
 */
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/) // Boolean or Object
  return match ? match[1] : ''
}

/**
 * 判断 期望的构造函数的函数名称和设置的构造函数的函数名称是否相等
 * @param {*} a
 * @param {*} b
 */
function isSameType (a, b) {
  return getType(a) === getType(b)
}

function getTypeIndex (type, expectedTypes): number {
  // 期望值和设置值相等就返回 0，否则返回 -1
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }

  // 如果期望值是数组，就遍历找出与设置值相同类型的，并返回 index，否则返回 -1
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}

function getInvalidTypeMessage (name, value, expectedTypes) {
  let message = `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(', ')}`
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  const expectedValue = styleValue(value, expectedType)
  const receivedValue = styleValue(value, receivedType)
  // check if we need to specify expected value
  if (expectedTypes.length === 1 &&
      isExplicable(expectedType) &&
      !isBoolean(expectedType, receivedType)) {
    message += ` with value ${expectedValue}`
  }
  message += `, got ${receivedType} `
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`
  }
  return message
}

function styleValue (value, type) {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

function isExplicable (value) {
  const explicitTypes = ['string', 'number', 'boolean']
  return explicitTypes.some(elem => value.toLowerCase() === elem)
}

function isBoolean (...args) {
  return args.some(elem => elem.toLowerCase() === 'boolean')
}
