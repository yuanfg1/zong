<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  member: {
    type: Object,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save', 'addChild', 'delete'])

const form = reactive({
  name: '',
  gender: 'male',
  birthYear: '',
  deathYear: ''
})

const spouseForm = reactive({
  name: '',
  gender: 'female',
  birthYear: '',
  deathYear: ''
})

const showSpouse = ref(false)

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.member) {
    form.name = props.member.name || ''
    form.gender = props.member.gender || 'male'
    form.birthYear = props.member.birthYear || ''
    form.deathYear = props.member.deathYear || ''
    
    if (props.member.spouse) {
      spouseForm.name = props.member.spouse.name || ''
      spouseForm.gender = props.member.spouse.gender || 'female'
      spouseForm.birthYear = props.member.spouse.birthYear || ''
      spouseForm.deathYear = props.member.spouse.deathYear || ''
      showSpouse.value = true
    } else {
      spouseForm.name = ''
      spouseForm.gender = 'female'
      spouseForm.birthYear = ''
      spouseForm.deathYear = ''
      showSpouse.value = false
    }
  }
})

function handleSave() {
  const updatedMember = {
    ...props.member,
    name: form.name,
    gender: form.gender,
    birthYear: form.birthYear ? parseInt(form.birthYear) : undefined,
    deathYear: form.deathYear ? parseInt(form.deathYear) : undefined
  }
  
  if (showSpouse.value && spouseForm.name) {
    updatedMember.spouse = {
      id: props.member.spouse?.id || `spouse-${Date.now()}`,
      name: spouseForm.name,
      gender: spouseForm.gender,
      birthYear: spouseForm.birthYear ? parseInt(spouseForm.birthYear) : undefined,
      deathYear: spouseForm.deathYear ? parseInt(spouseForm.deathYear) : undefined
    }
  } else {
    delete updatedMember.spouse
  }
  
  emit('save', updatedMember)
}

function handleAddChild() {
  emit('addChild', props.member.id)
}

function handleDelete() {
  emit('delete', props.member.id)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <h2>编辑家庭成员</h2>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-section">
            <h3>基本信息</h3>
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
          
          <div class="form-section">
            <div class="section-header">
              <h3>配偶信息</h3>
              <label class="checkbox-label">
                <input type="checkbox" v-model="showSpouse" /> 添加/编辑配偶
              </label>
            </div>
            
            <div v-if="showSpouse" class="spouse-form">
              <div class="form-group">
                <label>配偶姓名</label>
                <input v-model="spouseForm.name" type="text" placeholder="请输入配偶姓名" />
              </div>
              
              <div class="form-group">
                <label>配偶性别</label>
                <select v-model="spouseForm.gender">
                  <option value="female">女</option>
                  <option value="male">男</option>
                </select>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>出生年份</label>
                  <input v-model="spouseForm.birthYear" type="number" placeholder="YYYY" />
                </div>
                <div class="form-group">
                  <label>去世年份</label>
                  <input v-model="spouseForm.deathYear" type="number" placeholder="YYYY（可选）" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-danger" @click="handleDelete">删除成员</button>
          <button class="btn btn-secondary" @click="handleAddChild">添加子女</button>
          <button class="btn btn-secondary" @click="emit('close')">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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

.form-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.form-section h3 {
  font-size: 1rem;
  color: #666;
  margin: 0 0 12px 0;
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

.checkbox-label {
  font-size: 0.875rem;
  color: #667eea;
  cursor: pointer;
}

.spouse-form {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
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

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}
</style>
