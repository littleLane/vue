/* @flow */

import { addProp } from 'compiler/helpers'

/**
 * 给节点设置 innerHTML 属性
 * @param {*} el
 * @param {*} dir
 */
export default function html (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`, dir)
  }
}
