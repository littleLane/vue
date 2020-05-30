<template>
  <div class="hello">
    <h1 @click="handleClick">{{ $attrs.msg }} - {{ name }} - {{ handleClick }}</h1>
    <!-- <slot :compName="compName">{{ compName.lastName }}</slot>
    <TestBindProps v-bind="$attrs" id="aa" />
    <TestFuntional :msg="functionalMsg" /> -->
  </div>
</template>

<script>
import TestBindProps from './TestBindProps'
import TestFuntional from './TestFuntional'

export default {
  name: 'HelloWorld',
  props: {
    name: String,
  },
  data: () => ({
    // handleClick: () => {
    //   console.log('lane click')
    // },
    name: 'lllll',
    compName: {
      firstName: 'Hello',
      lastName: 'World',
    },
    functionalMsg: {
      msg1: {
        msg2: '111'
      }
    }
  }),
  computed: {
    name: {
      get: function() {
        return 'lkkk ij'
      }
    }
  },
  components: {
    TestBindProps,
    TestFuntional
  },
  methods: {
    handleClick() {
      this.functionalMsg.msg1.msg2 = '1212ajjaa'
      console.log(11)
    }
  },
  mounted () {
    console.log(this.$attrs)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
