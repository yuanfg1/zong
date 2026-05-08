<script setup>
defineProps({
  member: {
    type: Object,
    required: true
  },
  spouse: {
    type: Object,
    default: null
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit'])

function handleEdit() {
  emit('edit')
}
</script>

<template>
  <div class="family-card">
    <div class="couple-content">
      <div class="member-row">
        <span class="avatar">{{ member.gender === 'male' ? '👨' : '👩' }}</span>
        <span class="name">{{ member.name }}</span>
        <button 
          v-if="editable" 
          class="edit-btn" 
          @click="handleEdit"
          title="编辑"
        >
          ✏️
        </button>
      </div>
      
      <div v-if="spouse" class="marriage-line">⚭</div>
      
      <div v-if="spouse" class="member-row">
        <span class="avatar">{{ spouse.gender === 'male' ? '👨' : '👩' }}</span>
        <span class="name">{{ spouse.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.family-card {
  background: white;
  border-radius: 8px;
  padding: 10px 14px;
  min-width: 100px;
  border: 2px solid #333;
  transition: transform 0.2s;
}

.family-card:hover {
  transform: translateY(-2px);
}

.couple-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar {
  font-size: 18px;
}

.name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.marriage-line {
  font-size: 14px;
  color: #666;
  margin: 2px 0;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.family-card:hover .edit-btn {
  opacity: 1;
}

.edit-btn:hover {
  transform: scale(1.2);
}
</style>
