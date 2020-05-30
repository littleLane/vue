<template>
  <h1>
    TestBindProps, {{ msg }}
  </h1>
</template>
<script>
export default {
  name: 'TestBindProps',
  inheritAttrs: false,
  props: {
    msg: String
  },
  mounted () {
    console.log(this.$attrs)
  }
}
</script>
