/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }

        // 全局形式注册组件
        // Vue.component('my-component', {})
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id

          // 类似 Vue.extend(definition)
          definition = this.options._base.extend(definition)
        }

        // 全局形式注册指令
        // Vue.directive('my-directive', {})
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }

        // 挂载到 Vue.options 对应的 components 或 directives 或 filters 上
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
