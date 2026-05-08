<script setup>
import { reactive } from 'vue'

const props = defineProps({
  parentId: {
    type: String,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'add'])

const form = reactive({
  name: '',
  gender: 'male',
  birthYear: '',
  deathYear: ''
})

function handleAdd() {
  const newChild = {
    id: `child-${Date.now()}`,
    name: form.name,
    gender: form.gender,
    birthYear: form.birthYear ? parseInt(form.birthYear) : undefined,
    deathYear: form.deathYear ? parseInt(form.deathYear) : undefined,
    children: []
  }
  
  emit('add', { parentId: props.parentId, child: newChild })
  
  form.name = ''
  form.gender = 'male'
  form.birthYear = ''
  form.deathYear = ''
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <h2>添加子女</h2>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>姓名</label>
            <input v-model="form.name" type="text" placeholder="请输入姓名" />
          </div>
          
          <div class="form-group">
            <label>性别</label>
            <select v-model="form.gender">
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>出生年份</label>
              <input v-model="form.birthYear" type="number" placeholder="YYYY" />
            </div>
            <div class="form-group">
              <label>去世年份</label>
              <input v-model="form.deathYear" type="number" placeholder="YYYY（可选）" />
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="emit('close')">取消</button>
          <button class="btn btn-primary" @click="handleAdd">添加</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd6;
}

.btn-secondary {
  background: #e9ecef;
  color: #333;
}

.btn-secondary:hover {
  background: #dee2e6;
}
</style>
