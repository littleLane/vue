/* @flow */

import { addProp } from 'compiler/helpers'

/**
 * 给节点设置 textContent 属性
 * @param {*} el
 * @param {*} dir
 */
export default function text (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'textContent', `_s(${dir.value})`, dir)
  }
}
