<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const dragHandleRef = ref(null)

function handleMouseDown(e) {
  if (props.disabled) return
  if (e.target.closest('button, input, select')) return
  
  isDragging.value = true
  startX.value = e.clientX - translateX.value
  startY.value = e.clientY - translateY.value
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  document.body.style.cursor = 'grabbing'
  document.body.style.userSelect = 'none'
}

function handleMouseMove(e) {
  if (!isDragging.value) return
  
  translateX.value = e.clientX - startX.value
  translateY.value = e.clientY - startY.value
}

function handleMouseUp() {
  isDragging.value = false
  
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function handleTouchStart(e) {
  if (props.disabled) return
  
  isDragging.value = true
  const touch = e.touches[0]
  startX.value = touch.clientX - translateX.value
  startY.value = touch.clientY - translateY.value
  
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
}

function handleTouchMove(e) {
  if (!isDragging.value) return
  
  const touch = e.touches[0]
  translateX.value = touch.clientX - startX.value
  translateY.value = touch.clientY - startY.value
}

function handleTouchEnd() {
  isDragging.value = false
  
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
}

function resetPosition() {
  translateX.value = 0
  translateY.value = 0
}

onMounted(() => {
  if (dragHandleRef.value) {
    dragHandleRef.value.addEventListener('mousedown', handleMouseDown)
    dragHandleRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  
  if (dragHandleRef.value) {
    dragHandleRef.value.removeEventListener('mousedown', handleMouseDown)
    dragHandleRef.value.removeEventListener('touchstart', handleTouchStart)
  }
})

defineExpose({ resetPosition })
</script>

<template>
  <div class="draggable-container">
    <div 
      ref="dragHandleRef"
      class="drag-handle"
      :class="{ 'dragging': isDragging }"
    >
      <span class="drag-icon">🖱️</span>
      <span class="drag-text">拖拽移动</span>
    </div>
    
    <div 
      class="draggable-content"
      :style="{
        transform: `translate(${translateX}px, ${translateY}px)`
      }"
    >
      <slot></slot>
    </div>
    
    <button 
      v-if="translateX !== 0 || translateY !== 0"
      class="reset-btn"
      @click="resetPosition"
    >
      ↺ 重置位置
    </button>
  </div>
</template>

<style scoped>
.draggable-container {
  position: relative;
  min-height: 200px;
  overflow: hidden;
}

.drag-handle {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: grab;
  font-size: 12px;
  color: #666;
  z-index: 10;
  user-select: none;
  transition: background-color 0.2s;
}

.drag-handle:hover {
  background: #e0e0e0;
}

.drag-handle.dragging {
  cursor: grabbing;
  background: #ddd;
}

.drag-icon {
  font-size: 14px;
}

.draggable-content {
  transition: transform 0s;
}

.reset-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  z-index: 10;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}
</style>
