<script setup>
import { ref } from 'vue'

defineProps({
  msg: String
})

const count = ref(0)
</script>

<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <div class="card">
      <button type="button" @click="count++">点击计数: {{ count }}</button>
      <p>
        编辑
        <code>components/HelloWorld.vue</code> 来测试热更新
      </p>
    </div>
    <p class="read-the-docs">
      点击 Vite 和 Vue 标志了解更多
    </p>
  </div>
</template>

<style scoped>
.hello {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

h1 {
  color: #42b883;
  margin-bottom: 1.5rem;
}

.card {
  padding: 2rem;
}

button {
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  font-family: inherit;
  background-color: #42b883;
  color: white;
  cursor: pointer;
  transition: background-color 0.25s;
}

button:hover {
  background-color: #35495e;
}

.read-the-docs {
  color: #888;
  margin-top: 1.5rem;
}

code {
  background-color: #f0f0f0;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  color: #35495e;
}
</style>
