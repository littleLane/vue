<template>
  <div>
    <p>
      <label>选择文件：</label>
      <input type="file" multiple size="80" ref="input" accept="image/*"/>
    </p>
    <p>
      <input type="button" value="文件上传" @click="showSelectedFiles"/>
    </p>
  </div>
</template>
<script>
export default {
  methods: {
    showSelectedFiles() {
      const refInput = this.$refs['input']

      // refInput.files 为类数组
      // 转为数组 => Array.from(refInput.files)
      const fileList = Array.from(refInput.files)

      fileList.forEach((file) => {
        console.log(file.name)
      })

      console.log(new ArrayBuffer(32))
    }
  }
}
</script>
