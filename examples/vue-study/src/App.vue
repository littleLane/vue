<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld
      name="jahha"
      msg="Welcome to Your Vue.js App"
      @hook:mounted="handleChildMount"
    >
      <!-- <h1>
        1、组件标签间的且没有指定 slot 属性的或者执行 slot 属性值为 default 的，都为 default slot，只要子组件加了 slot 就能显示
        Here might be a page title
      </h1> -->

      <!-- <h1 slot="header">
        2、具名插槽，子组件的 slot 要指定对应的 name 属性值
        Here might be a page title
      </h1> -->

      <!-- <template v-slot:header>
        3、2.6.0 新增的 v-slot 指令，注意 v-slot 只能加在 template 或者组件上，不能加在原生的 HTML 标签上
        <h1>Here might be a page title</h1>
      </template> -->

      <!-- <slot :user="user">
        4、作用域插槽
        {{ user.name }}
      </slot> -->

      <!-- <template v-slot="{compName}">
        5、作用域插槽   子向父传参
        {{ compName.firstName }}
      </template> -->
    </HelloWorld>
    <!-- <FileDemo01/> -->
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import FileDemo01 from './file/FileDemo01'

export default {
  name: 'App',
  data: () => ({
    user: {
      name: 'littleLane'
    }
  }),
  components: {
    HelloWorld,
    FileDemo01
  },
  methods: {
    handleChildMount() {
      console.log('HelloWorld Mounted')
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
