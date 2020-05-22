/* @flow */

// 平台的 DOM 操作方法
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'

// 基础模块方法，主要是 ref 和 directives
import baseModules from 'core/vdom/modules/index'

// 运行时 VNode 处理 attrs, klass, events, domProps, style, transition
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 利用 web 平台的特性创建 web 平台特有的 patch
export const patch: Function = createPatchFunction({ nodeOps, modules })
