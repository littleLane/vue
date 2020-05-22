/* @flow */

import { namespaceMap } from 'web/util/index'

/**
 * 1、根据 tagName 通过 document.createElement 创建节点
 * 2、tagName 不是 select 就直接返回
 * 3、tagName 是 select 设置 multiple 属性，然后返回
 * @param {*} tagName
 * @param {*} vnode
 */
export function createElement (tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

/**
 * 创建命名空间节点 document.createElementNS
 * @param {*} namespace
 * @param {*} tagName
 */
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

/**
 * 创建文本节点 document.createTextNode
 * @param {*} text
 */
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

/**
 * 创建注释节点 document.createComment
 * @param {*} text
 */
export function createComment (text: string): Comment {
  return document.createComment(text)
}

/**
 * 插入节点 insertBefore
 * 将 newNode 插到 referenceNode 前面
 * @param {*} parentNode
 * @param {*} newNode
 * @param {*} referenceNode
 */
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

/**
 * 移除节点 removeChild
 * @param {*} node
 * @param {*} child
 */
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

/**
 * 追加节点 appendChild
 * @param {*} node
 * @param {*} child
 */
export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}

/**
 * 获取父节点 parentNode
 * @param {*} node
 */
export function parentNode (node: Node): ?Node {
  return node.parentNode
}

/**
 * 获取兄弟节点 nextSibling
 * @param {*} node
 */
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}

/**
 * 获取节点标签名 tagName
 * @param {*} node
 */
export function tagName (node: Element): string {
  return node.tagName
}

/**
 * 设置节点的文本 setTextContent
 * @param {*} node
 * @param {*} text
 */
export function setTextContent (node: Node, text: string) {
  node.textContent = text
}

/**
 * 设置样式的域 setStyleScope
 * @param {*} node
 * @param {*} scopeId
 */
export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
