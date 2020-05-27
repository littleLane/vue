/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// 根据传入的基础编译函数创建一个 编译器创建函数
// 实际的编译逻辑在 baseCompile
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 将 template 编译成 AST 语法树
  const ast = parse(template.trim(), options)

  // 优化 AST，实则标记静态节点
  // 很多数据是首次渲染后就永远不会变化的，那么这部分数据生成的 DOM 也不会变化，可以在下次 patch 的过程跳过对他们的比对
  if (options.optimize !== false) {
    optimize(ast, options)
  }

  // 根据 AST 生成代码
  const code = generate(ast, options)

  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
