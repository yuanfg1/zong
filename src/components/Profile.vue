<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits<{
  logout: []
  back: []
}>()

const user = ref<any>(null)
const isAdmin = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const adminPhone = '16683122850'

onMounted(async () => {
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    user.value = currentUser
    const phone = currentUser.email?.replace('@example.com', '')
    if (phone === adminPhone) {
      isAdmin.value = true
    }
  }
})

const changePassword = async () => {
  passwordError.value = ''
  
  if (!newPassword.value) {
    passwordError.value = '请输入新密码'
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的密码不一致'
    return
  }
  
  if (newPassword.value.length < 6) {
    passwordError.value = '密码长度不能少于6位'
    return
  }
  
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value
    })
    
    if (error) {
      passwordError.value = error.message
    } else {
      alert('密码修改成功，请重新登录')
      await supabase.auth.signOut()
      localStorage.removeItem('mindmap_admin')
      emit('logout')
    }
  } catch (error: any) {
    passwordError.value = error.message || '修改密码失败'
  }
}

const goBack = () => {
  emit('back')
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h1>个人中心</h1>
      <button class="logout-btn" @click="emit('logout')">退出登录</button>
    </div>
    
    <div class="profile-content">
      <div class="profile-card">
        <div class="card-header">
          <h2>账号信息</h2>
        </div>
        <div class="card-body">
          <div class="info-item">
            <label>账号</label>
            <span>{{ user?.email?.replace('@example.com', '') || '未知' }}</span>
          </div>
          <div class="info-item">
            <label>角色</label>
            <span :class="isAdmin ? 'admin-badge' : 'user-badge'">
              {{ isAdmin ? '管理员' : '普通用户' }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="profile-card">
        <div class="card-header">
          <h2>修改密码</h2>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label for="newPassword">新密码</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="请输入新密码"
            />
          </div>
          <div class="form-group">
            <label for="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="请再次输入密码"
            />
          </div>
          <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
          <button class="submit-btn" @click="changePassword">修改密码</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.back-btn {
  padding: 10px 20px;
  background: transparent;
  border: 2px solid #6366f1;
  color: #6366f1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #6366f1;
  color: white;
}

.profile-header h1 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.logout-btn {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #dc2626;
}

.profile-content {
  max-width: 500px;
  margin: 40px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.card-header h2 {
  margin: 0;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.card-body {
  padding: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  color: #64748b;
  font-size: 14px;
}

.info-item span {
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
}

.admin-badge {
  color: #6366f1 !important;
  background: rgba(99, 102, 241, 0.1);
  padding: 6px 16px;
  border-radius: 20px;
}

.user-badge {
  color: #64748b !important;
  background: rgba(100, 116, 139, 0.1);
  padding: 6px 16px;
  border-radius: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group label {
  color: #475569;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.form-group input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.error-message {
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 16px;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}
</style>