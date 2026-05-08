<script setup>
defineProps({
  member: {
    type: Object,
    required: true
  },
  isSpouse: {
    type: Boolean,
    default: false
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
  <div 
    class="family-card" 
    :class="[`gender-${member.gender}`, { 'spouse-card': isSpouse }]"
  >
    <div class="card-header">
      <div class="avatar">
        <span v-if="member.gender === 'male'">👨</span>
        <span v-else>👩</span>
      </div>
      <div class="name">
        {{ member.name }}
      </div>
      <button 
        v-if="editable && !isSpouse" 
        class="edit-btn" 
        @click="handleEdit"
        title="编辑"
      >
        ✏️
      </button>
    </div>
  </div>
</template>

<style scoped>
.family-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  min-width: 100px;
  border: 2px solid #333;
  transition: transform 0.2s;
}

.family-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 3px;
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
