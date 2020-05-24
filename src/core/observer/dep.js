/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 依赖收集器
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 将指定 watcher 追加到 this.subs
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除指定的 watcher
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 收集依赖
  // 实则调用的是当前全局 watcher 的 addDep 方法 =>
  //    将 dep 存入当前全局 watcher
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 触发更新
  // 取出收集到的 watcher，遍历逐一调用 watcher 的 update 方法
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 用来标识当前全局唯一的 watcher
Dep.target = null

// 以栈的形式保存一个 watcher 的链路
const targetStack = []

// 将当前全局的 watcher 压入栈顶
// 更新 Dep.target 为当前全局的 watcher
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

// 弹出当前全局的 watcher
// 更新 Dep.target 为当前栈顶的 watcher，表示上一个 watcher 即组件已经更新完了，回到了父组件
// 顺序 => 从子到父
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
