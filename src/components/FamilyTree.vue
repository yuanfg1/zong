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
        :editable="editable"
        @edit="handleEditMember"
      />
      
      <div v-if="tree.spouse" class="spouse-connector">
        <span class="marriage-line">⚭</span>
      </div>
      
      <FamilyMemberCard 
        v-if="tree.spouse" 
        :member="tree.spouse" 
        :is-spouse="true" 
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
  color: #667eea;
  margin-bottom: 12px;
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 20px;
}

.couple-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spouse-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.marriage-line {
  font-size: 16px;
  color: #9B59B6;
}

.children-section {
  margin-top: 24px;
  width: 100%;
}

.children-connector {
  height: 24px;
  width: 2px;
  background: linear-gradient(to bottom, #667eea, #764ba2);
  margin: 0 auto;
}

.children-container {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.child-wrapper {
  position: relative;
}

.expand-btn {
  margin-top: 12px;
  padding: 4px 12px;
  font-size: 12px;
  color: #667eea;
  background: transparent;
  border: 1px solid #667eea;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: #667eea;
  color: white;
}
</style>
