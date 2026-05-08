<script setup>
import { ref, computed } from 'vue'
import FamilyTree from './components/FamilyTree.vue'
import FamilyMemberEditor from './components/FamilyMemberEditor.vue'
import AddChildModal from './components/AddChildModal.vue'
import { familyTreeData, countGenerations } from './data/familyTree.js'

const familyTree = ref(JSON.parse(JSON.stringify(familyTreeData)))
const isEditable = ref(false)
const showEditor = ref(false)
const showAddChild = ref(false)
const editingMember = ref(null)
const parentForChild = ref(null)

const totalGenerations = computed(() => countGenerations(familyTree.value))

function findMemberById(tree, id) {
  if (tree.id === id) return tree
  if (tree.children) {
    for (const child of tree.children) {
      const found = findMemberById(child, id)
      if (found) return found
    }
  }
  return null
}

function updateMember(updatedMember) {
  const member = findMemberById(familyTree.value, updatedMember.id)
  if (member) {
    Object.assign(member, updatedMember)
  }
  showEditor.value = false
}

function deleteMember(memberId) {
  function removeFromTree(tree, parent, index) {
    if (tree.children) {
      for (let i = 0; i < tree.children.length; i++) {
        if (tree.children[i].id === memberId) {
          tree.children.splice(i, 1)
          return true
        }
        if (removeFromTree(tree.children[i], tree, i)) {
          return true
        }
      }
    }
    return false
  }
  removeFromTree(familyTree.value, null, 0)
  showEditor.value = false
}

function handleEditMember(member) {
  editingMember.value = member
  showEditor.value = true
}

function handleAddChild(parentId) {
  parentForChild.value = parentId
  showAddChild.value = true
}

function addChild({ parentId, child }) {
  const parent = findMemberById(familyTree.value, parentId)
  if (parent) {
    if (!parent.children) {
      parent.children = []
    }
    parent.children.push(child)
  }
  showAddChild.value = false
}

function toggleEditMode() {
  isEditable.value = !isEditable.value
  showEditor.value = false
  showAddChild.value = false
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>家谱代序图</h1>
      <p class="subtitle">共 {{ totalGenerations }} 代家族成员</p>
      <button 
        class="edit-toggle-btn" 
        :class="{ 'active': isEditable }"
        @click="toggleEditMode"
      >
        {{ isEditable ? '✓ 编辑模式' : '✏️ 编辑模式' }}
      </button>
    </header>
    
    <main class="main-content">
      <div class="tree-container">
        <FamilyTree 
          :tree="familyTree" 
          :editable="isEditable"
          @editMember="handleEditMember"
        />
      </div>
    </main>
    
    <footer class="footer">
      <p>点击「收起/展开」按钮可以折叠或展开子孙后代</p>
      <p v-if="isEditable" class="edit-tip">💡 将鼠标悬停在成员卡片上可以看到编辑按钮</p>
    </footer>
    
    <FamilyMemberEditor 
      v-if="editingMember"
      :member="editingMember"
      :is-open="showEditor"
      @close="showEditor = false"
      @save="updateMember"
      @add-child="handleAddChild"
      @delete="deleteMember"
    />
    
    <AddChildModal 
      :parent-id="parentForChild"
      :is-open="showAddChild"
      @close="showAddChild = false"
      @add="addChild"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: white;
  padding: 24px;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 2.5rem;
  color: #333;
  margin: 0;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
  margin-top: 8px;
}

.edit-toggle-btn {
  margin-top: 16px;
  padding: 10px 24px;
  font-size: 1rem;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s;
  background: #f0f0f0;
  color: #333;
  border: 2px solid #ddd;
}

.edit-toggle-btn:hover {
  background: #e0e0e0;
}

.edit-toggle-btn.active {
  background: #4CAF50;
  border-color: #4CAF50;
  color: white;
}

.main-content {
  display: flex;
  justify-content: center;
}

.tree-container {
  background: white;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 32px;
  max-width: 1200px;
  width: 100%;
}

.footer {
  text-align: center;
  margin-top: 24px;
  color: #666;
  font-size: 14px;
}

.edit-tip {
  margin-top: 8px;
  color: #333;
  font-weight: 500;
}
</style>
