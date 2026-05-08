<script setup>
import { computed } from 'vue'
import FamilyTree from './components/FamilyTree.vue'
import { familyTreeData, countGenerations } from './data/familyTree.js'

const totalGenerations = computed(() => countGenerations(familyTreeData))
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🏠 家谱代序图</h1>
      <p class="subtitle">共 {{ totalGenerations }} 代家族成员</p>
    </header>
    
    <main class="main-content">
      <div class="tree-container">
        <FamilyTree :tree="familyTreeData" />
      </div>
    </main>
    
    <footer class="footer">
      <p>点击「收起/展开」按钮可以折叠或展开子孙后代</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 2.5rem;
  color: white;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  margin-top: 8px;
}

.main-content {
  display: flex;
  justify-content: center;
}

.tree-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 1200px;
  width: 100%;
}

.footer {
  text-align: center;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
</style>
