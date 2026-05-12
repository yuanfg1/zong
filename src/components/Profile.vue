<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits<{
  logout: []
  back: []
}>()

const user = ref<any>(null)
const isAdmin = ref(false)
const userName = ref('')
const editingName = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const nameError = ref('')
const adminPhone = '16683122850'

const activeTab = ref('mapMarkers')

const markers = ref<any[]>([
  { id: 1, name: '张三', phone: '13800138001', description: '北京市朝阳区', location: '北京' },
  { id: 2, name: '李四', phone: '13900139002', description: '上海市浦东新区', location: '上海' },
  { id: 3, name: '王五', phone: '', description: '广州市天河区', location: '广州' },
])

onMounted(async () => {
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    user.value = currentUser
    const phone = currentUser.email?.replace('@example.com', '')
    if (phone === adminPhone) {
      isAdmin.value = true
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', currentUser.id)
        .single()
      
      if (error) {
        console.error('获取用户姓名失败:', error)
      } else if (profile) {
        userName.value = profile.name || ''
      }
    } catch (e) {
      console.error('获取用户信息异常:', e)
    }
  }
})

const saveName = async () => {
  nameError.value = ''
  
  if (!user.value) {
    nameError.value = '用户信息未加载'
    return
  }
  
  if (!userName.value.trim()) {
    nameError.value = '请输入姓名'
    return
  }
  
  try {
    console.log('保存姓名:', { userId: user.value.id, name: userName.value })
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.value.id, name: userName.value.trim() })
    
    if (error) {
      console.error('保存姓名失败:', error)
      nameError.value = error.message
    } else {
      editingName.value = false
      alert('姓名修改成功')
    }
  } catch (error: any) {
    console.error('保存姓名异常:', error)
    nameError.value = error.message || '修改姓名失败'
  }
}

const cancelEditName = () => {
  editingName.value = false
}

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
    
    <div class="profile-main">
      <div class="profile-sidebar">
        <div class="sidebar-menu">
          <button 
            class="menu-item" 
            :class="{ active: activeTab === 'mapMarkers' }"
            @click="activeTab = 'mapMarkers'"
          >
            📍 地图标点
          </button>
          <button 
            class="menu-item" 
            :class="{ active: activeTab === 'personalInfo' }"
            @click="activeTab = 'personalInfo'"
          >
            👤 个人信息
          </button>
          <button 
            class="menu-item" 
            :class="{ active: activeTab === 'changePassword' }"
            @click="activeTab = 'changePassword'"
          >
            🔐 修改密码
          </button>
        </div>
      </div>
      
      <div class="profile-content">
        <div v-if="activeTab === 'mapMarkers'" class="content-panel">
          <div class="panel-header">
            <h2>📍 地图标点列表</h2>
          </div>
          <div class="panel-body">
            <div class="markers-list">
              <div v-for="marker in markers" :key="marker.id" class="marker-item">
                <div class="marker-info">
                  <h4>{{ marker.name }}</h4>
                  <p v-if="marker.phone">📞 {{ marker.phone }}</p>
                  <p>{{ marker.description }}</p>
                  <span class="location-tag">{{ marker.location }}</span>
                </div>
                <div class="marker-actions">
                  <button class="action-btn edit-btn">编辑</button>
                  <button class="action-btn delete-btn">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="activeTab === 'personalInfo'" class="content-panel">
          <div class="panel-header">
            <h2>👤 个人信息</h2>
          </div>
          <div class="panel-body">
            <div class="info-grid">
              <div class="info-row">
                <label class="info-label">账号</label>
                <span class="info-value">{{ user?.email?.replace('@example.com', '') || '未知' }}</span>
              </div>
              <div class="info-row">
                <label class="info-label">姓名</label>
                <div class="info-value">
                  <template v-if="editingName">
                    <input
                      v-model="userName"
                      type="text"
                      class="name-input"
                      placeholder="请输入姓名"
                    />
                    <button class="small-btn save-btn" @click="saveName">保存</button>
                    <button class="small-btn cancel-btn" @click="cancelEditName">取消</button>
                  </template>
                  <template v-else>
                    <span>{{ userName || '未设置' }}</span>
                    <button class="edit-btn-sm" @click="editingName = true">编辑</button>
                  </template>
                </div>
              </div>
              <div v-if="nameError" class="error-message">{{ nameError }}</div>
              <div class="info-row">
                <label class="info-label">角色</label>
                <span :class="isAdmin ? 'admin-badge' : 'user-badge'">
                  {{ isAdmin ? '管理员' : '普通用户' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="activeTab === 'changePassword'" class="content-panel">
          <div class="panel-header">
            <h2>🔐 修改密码</h2>
          </div>
          <div class="panel-body">
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

.profile-main {
  display: flex;
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
  gap: 24px;
}

.profile-sidebar {
  width: 200px;
  flex-shrink: 0;
}

.sidebar-menu {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 12px;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s;
  margin-bottom: 4px;
}

.menu-item:last-child {
  margin-bottom: 0;
}

.menu-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.menu-item.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.profile-content {
  flex: 1;
  min-width: 0;
}

.content-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.panel-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.panel-header h2 {
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.panel-body {
  padding: 24px;
}

.markers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.marker-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.marker-info h4 {
  margin: 0 0 8px 0;
  color: #1e293b;
  font-size: 16px;
}

.marker-info p {
  margin: 4px 0;
  color: #64748b;
  font-size: 14px;
}

.location-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 20px;
  font-size: 12px;
  margin-top: 8px;
}

.marker-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.edit-btn {
  background: #f1f5f9;
  color: #475569;
}

.edit-btn:hover {
  background: #e2e8f0;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-label {
  font-weight: 500;
  color: #64748b;
}

.info-value {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1e293b;
  font-weight: 500;
}

.name-input {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  width: 150px;
}

.name-input:focus {
  border-color: #6366f1;
}

.small-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.small-btn.save-btn {
  background: #6366f1;
  color: white;
}

.small-btn.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.edit-btn-sm {
  padding: 4px 10px;
  background: #f1f5f9;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  color: #6366f1;
  cursor: pointer;
}

.admin-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 20px;
  font-size: 12px;
}

.user-badge {
  padding: 4px 12px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 20px;
  font-size: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-group input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.3s;
}

.form-group input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 8px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 16px;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

@media (max-width: 768px) {
  .profile-main {
    flex-direction: column;
  }
  
  .profile-sidebar {
    width: 100%;
  }
  
  .sidebar-menu {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
  }
  
  .menu-item {
    flex: 1;
    min-width: 120px;
    text-align: center;
  }
}
</style>
