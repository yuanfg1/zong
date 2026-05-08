<script setup>
defineProps({
  member: {
    type: Object,
    required: true
  },
  isSpouse: {
    type: Boolean,
    default: false
  }
})

function getAge(birthYear, deathYear) {
  if (deathYear) {
    return `${birthYear} - ${deathYear} (${deathYear - birthYear}岁)`
  }
  return `生于 ${birthYear}`
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
    </div>
    <div class="card-body">
      <div class="info">
        {{ getAge(member.birthYear, member.deathYear) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.family-card {
  background: white;
  border-radius: 12px;
  padding: 12px;
  min-width: 120px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.family-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.family-card.gender-male {
  border-left: 4px solid #4A90D9;
}

.family-card.gender-female {
  border-left: 4px solid #E91E8C;
}

.family-card.spouse-card {
  border-left: 4px solid #9B59B6;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.card-body {
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.info {
  font-size: 12px;
  color: #666;
}
</style>
