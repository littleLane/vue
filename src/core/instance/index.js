import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * 为什么是构造函数，而不是 class？
 * 构造函数更方便通过 prototype 进行扩展，而 class 分块扩展能力较差，几乎不能实现
 * @param {*} options
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }

  // 通过 initMixin(Vue) 挂载
  // reference: src/core/instance/init.js
  this._init(options)
}

// 初始化 Vue.prototype._init
initMixin(Vue)

// 向 Vue.prototype 混入设置状态相关的方法
stateMixin(Vue)

// 向 Vue.prototype 混入发布订阅（自定义事件机制）方法
eventsMixin(Vue)

// 向 Vue.prototype 混入生命周期相关的方法
lifecycleMixin(Vue)

// 向 Vue.prototype 混入渲染相关的方法
renderMixin(Vue)

export default Vue
