<script setup>
import { ref, computed } from 'vue'
import FamilyMemberCard from './FamilyMemberCard.vue'

const props = defineProps({
  tree: {
    type: Object,
    required: true
  },
  generation: {
    type: Number,
    default: 1
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['editMember'])

const expanded = ref(true)

const hasChildren = computed(() => {
  return props.tree.children && props.tree.children.length > 0
})

function toggleExpand() {
  expanded.value = !expanded.value
}

function handleEditMember() {
  emit('editMember', props.tree)
}
</script>

<template>
  <div class="family-tree">
    <div class="generation-label" v-if="generation === 1">
      <span>第 {{ generation }} 代</span>
    </div>
    
    <div class="couple-container">
      <FamilyMemberCard 
        :member="tree" 
        :spouse="tree.spouse"
        :editable="editable"
        @edit="handleEditMember"
      />
    </div>
    
    <div v-if="hasChildren && expanded" class="children-section">
      <div class="children-connector"></div>
      
      <div class="children-container">
        <div 
          v-for="child in tree.children" 
          :key="child.id" 
          class="child-wrapper"
        >
          <FamilyTree 
            :tree="child" 
            :generation="generation + 1"
            :editable="editable"
            @editMember="emit('editMember', $event)"
          />
        </div>
      </div>
    </div>
    
    <button 
      v-if="hasChildren" 
      class="expand-btn"
      @click="toggleExpand"
    >
      {{ expanded ? '▼ 收起' : '▲ 展开' }}
    </button>
  </div>
</template>

<style scoped>
.family-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}

.generation-label {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding: 4px 12px;
  border: 1px solid #333;
  border-radius: 4px;
}

.couple-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.children-section {
  margin-top: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.children-connector {
  height: 20px;
  width: 2px;
  background: #333;
}

.children-container {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
  margin-top: 16px;
  position: relative;
}

.children-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  height: 2px;
  background: #333;
}

.child-wrapper {
  position: relative;
}

.child-wrapper::before {
  content: '';
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 20px;
  background: #333;
}

.expand-btn {
  margin-top: 12px;
  padding: 4px 12px;
  font-size: 12px;
  color: #333;
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: #333;
  color: white;
}
</style>
