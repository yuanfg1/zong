<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
const toastMessage = ref('')

const activeTab = ref('personalInfo')
const markers = ref<any[]>([])
const allUsers = ref<any[]>([])
const editingMarker = ref<any>(null)
const editingMarkerForm = ref({
  name: '',
  phone: '',
  description: '',
  location: ''
})
const searchQuery = ref('')

const showToast = (message: string) => {
  toastMessage.value = message
  setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

const filteredMarkers = computed(() => {
  if (!searchQuery.value.trim()) return markers.value
  const query = searchQuery.value.toLowerCase()
  return markers.value.filter(marker => 
    marker.name?.toLowerCase().includes(query) ||
    marker.phone?.toLowerCase().includes(query) ||
    marker.location?.toLowerCase().includes(query) ||
    marker.description?.toLowerCase().includes(query)
  )
})

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return allUsers.value
  const query = searchQuery.value.toLowerCase()
  return allUsers.value.filter(u => 
    u.email?.toLowerCase().includes(query) ||
    u.phone?.toLowerCase().includes(query) ||
    u.profileName?.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    const phone = currentUser.email?.replace('@example.com', '')
    
    if (phone === adminPhone) {
      isAdmin.value = true
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('id', currentUser.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('获取用户姓名失败:', error)
      } else if (profile) {
        userName.value = profile.name || ''
        if (profile.role === 'admin') {
          isAdmin.value = true
        }
      }
    } catch (e) {
      console.error('获取用户信息异常:', e)
    }
    
    await loadMarkers()
    if (isAdmin.value) {
      await loadAllUsers()
    }
  }
})

const loadAllUsers = async () => {
  try {
    const { data: users, error } = await supabase.from('users').select('*')
    console.log('从users表获取到的用户:', users)
    
    if (error) {
      console.error('获取用户列表失败:', error)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('users表为空')
      allUsers.value = []
      return
    }
    
    const usersWithProfiles = await Promise.all(
      users.map(async (u: any) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name, role')
          .eq('id', u.id)
          .maybeSingle()
        
        return {
          id: u.id,
          phone: u.phone || '',
          email: u.email || `${u.phone}@example.com`,
          profileName: profile?.name || '',
          role: profile?.role || (u.phone === adminPhone ? 'admin' : 'user'),
          created_at: u.created_at
        }
      })
    )
    
    allUsers.value = usersWithProfiles
    console.log('处理后的用户列表:', allUsers.value)
  } catch (error) {
    console.error('加载用户列表异常:', error)
  }
}

const saveName = async () => {
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
      showToast('姓名修改成功')
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
      showToast('密码修改成功，请重新登录')
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

const loadMarkers = async () => {
  try {
    const { data, error } = await supabase.from('markers').select('*')
    
    if (error) {
      console.error('加载标点失败:', error)
      return
    }

    markers.value = data || []
  } catch (error) {
    console.error('加载标点时发生错误:', error)
  }
}

const startEditMarker = (marker: any) => {
  editingMarker.value = marker
  editingMarkerForm.value = {
    name: marker.name || '',
    phone: marker.phone || '',
    description: marker.description || '',
    location: marker.location || ''
  }
}

const cancelEditMarker = () => {
  editingMarker.value = null
  editingMarkerForm.value = {
    name: '',
    phone: '',
    description: '',
    location: ''
  }
}

const saveMarker = async () => {
  if (!editingMarker.value) return
  
  try {
    const { error } = await supabase
      .from('markers')
      .update({
        name: editingMarkerForm.value.name.trim(),
        phone: editingMarkerForm.value.phone || null,
        description: editingMarkerForm.value.description || null,
        location: editingMarkerForm.value.location || null
      })
      .eq('id', editingMarker.value.id)
    
    if (error) {
      console.error('更新标点失败:', error)
      showToast('更新失败')
    } else {
      showToast('标点更新成功')
      cancelEditMarker()
      await loadMarkers()
    }
  } catch (error) {
    console.error('更新标点异常:', error)
    showToast('更新失败')
  }
}

const deleteMarker = async (id: number) => {
  try {
    const { error } = await supabase
      .from('markers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除标点失败:', error)
      showToast('删除失败')
    } else {
      await loadMarkers()
      showToast('删除成功')
    }
  } catch (error) {
    console.error('删除标点时发生错误:', error)
    showToast('删除失败')
  }
}

const deleteUser = async (userId: string) => {
  try {
    await supabase.from('user_profiles').delete().eq('id', userId)
    
    const { error } = await supabase.from('users').delete().eq('id', userId)
    
    if (error) {
      console.error('删除用户失败:', error)
      showToast('删除失败')
    } else {
      showToast('用户已删除')
      await loadAllUsers()
    }
  } catch (error) {
    console.error('删除用户异常:', error)
    showToast('删除失败')
  }
}

const updateUserRole = async (userId: string, isAdmin: boolean) => {
  try {
    await supabase
      .from('user_profiles')
      .upsert({ id: userId, role: isAdmin ? 'admin' : 'user' })
    showToast('用户角色已更新')
    await loadAllUsers()
  } catch (error) {
    console.error('更新用户角色异常:', error)
    showToast('更新失败')
  }
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
            :class="{ active: activeTab === 'personalInfo' }"
            @click="activeTab = 'personalInfo'"
          >
            👤 个人信息
          </button>
          <button 
            class="menu-item" 
            :class="{ active: activeTab === 'mapMarkers' }"
            @click="activeTab = 'mapMarkers'"
          >
            📍 地图标点
          </button>
          <button 
            class="menu-item" 
            :class="{ active: activeTab === 'changePassword' }"
            @click="activeTab = 'changePassword'"
          >
            🔐 修改密码
          </button>
          <template v-if="isAdmin">
            <div class="menu-divider"></div>
            <div class="menu-title">管理员功能</div>
            <button 
              class="menu-item admin-item" 
              :class="{ active: activeTab === 'userManagement' }"
              @click="activeTab = 'userManagement'"
            >
              👥 用户管理
            </button>
            <button 
              class="menu-item admin-item" 
              :class="{ active: activeTab === 'markerManagement' }"
              @click="activeTab = 'markerManagement'"
            >
              📋 标点管理
            </button>
          </template>
        </div>
      </div>
      
      <div class="profile-content">
        <div v-if="activeTab === 'personalInfo'" class="content-panel">
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

        <div v-else-if="activeTab === 'mapMarkers'" class="content-panel">
          <div class="panel-header">
            <h2>📍 我的地图标点</h2>
          </div>
          <div class="panel-body">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索标点..."
              />
            </div>
            <div class="markers-list">
              <div v-for="marker in filteredMarkers" :key="marker.id" class="marker-item">
                <div class="marker-info">
                  <h4>{{ marker.name }}</h4>
                  <p v-if="marker.phone">📞 {{ marker.phone }}</p>
                  <p>{{ marker.description || '无描述' }}</p>
                  <span class="location-tag">{{ marker.location || '未知位置' }}</span>
                </div>
                <div class="marker-actions">
                  <button class="action-btn view-btn" @click="startEditMarker(marker)">查看详情</button>
                </div>
              </div>
              <div v-if="filteredMarkers.length === 0" class="empty-state">
                暂无标点数据
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

        <div v-else-if="activeTab === 'userManagement'" class="content-panel">
          <div class="panel-header">
            <h2>👥 用户管理</h2>
            <span class="header-count">共 {{ allUsers.length }} 位用户</span>
          </div>
          <div class="panel-body">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索用户..."
              />
            </div>
            <div class="users-list">
              <div v-for="u in filteredUsers" :key="u.id" class="user-item">
                <div class="user-info">
                  <div class="user-main">
                    <h4>{{ u.profileName || u.phone }}</h4>
                    <span :class="u.phone === adminPhone || u.role === 'admin' ? 'admin-badge' : 'user-badge'">
                      {{ u.phone === adminPhone ? '超级管理员' : (u.role === 'admin' ? '管理员' : '普通用户') }}
                    </span>
                  </div>
                  <p class="user-email">{{ u.email || u.phone }}</p>
                  <p class="user-meta">
                    创建于: {{ new Date(u.created_at).toLocaleDateString() }}
                  </p>
                </div>
                <div class="user-actions">
                  <template v-if="u.phone !== adminPhone">
                    <button 
                      class="action-btn role-btn"
                      @click="updateUserRole(u.id, u.role !== 'admin')"
                    >
                      {{ u.role === 'admin' ? '撤销管理' : '设为管理' }}
                    </button>
                    <button 
                      class="action-btn delete-btn"
                      @click="deleteUser(u.id)"
                    >
                      删除
                    </button>
                  </template>
                  <span v-else class="protected-label">受保护</span>
                </div>
              </div>
              <div v-if="filteredUsers.length === 0" class="empty-state">
                暂无用户数据
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'markerManagement'" class="content-panel">
          <div class="panel-header">
            <h2>📋 标点管理</h2>
            <span class="header-count">共 {{ markers.length }} 个标点</span>
          </div>
          <div class="panel-body">
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索标点..."
              />
            </div>
            <div class="markers-list">
              <div v-for="marker in filteredMarkers" :key="marker.id" class="marker-item">
                <div class="marker-info">
                  <h4>{{ marker.name }}</h4>
                  <p v-if="marker.phone">📞 {{ marker.phone }}</p>
                  <p>{{ marker.description || '无描述' }}</p>
                  <div class="marker-meta">
                    <span class="location-tag">{{ marker.location || '未知位置' }}</span>
                    <span class="coord-tag">📍 {{ marker.lat?.toFixed(4) }}, {{ marker.lng?.toFixed(4) }}</span>
                  </div>
                  <p class="marker-creator" v-if="marker.created_by">
                    创建者ID: {{ marker.created_by.substring(0, 8) }}...
                  </p>
                </div>
                <div class="marker-actions">
                  <button class="action-btn edit-btn" @click="startEditMarker(marker)">编辑</button>
                  <button class="action-btn delete-btn" @click="deleteMarker(marker.id)">删除</button>
                </div>
              </div>
              <div v-if="filteredMarkers.length === 0" class="empty-state">
                暂无标点数据
              </div>
            </div>
          </div>
        </div>

        <div v-if="editingMarker" class="modal-overlay" @click.self="cancelEditMarker">
          <div class="modal-content">
            <h3>编辑标点</h3>
            <div class="form-group">
              <label>姓名</label>
              <input v-model="editingMarkerForm.name" type="text" placeholder="请输入姓名" />
            </div>
            <div class="form-group">
              <label>手机号</label>
              <input v-model="editingMarkerForm.phone" type="tel" placeholder="请输入手机号" />
            </div>
            <div class="form-group">
              <label>介绍</label>
              <textarea v-model="editingMarkerForm.description" placeholder="请输入介绍" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>位置</label>
              <input v-model="editingMarkerForm.location" type="text" placeholder="请输入位置" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-cancel" @click="cancelEditMarker">取消</button>
              <button class="btn btn-submit" @click="saveMarker">保存</button>
            </div>
          </div>
        </div>

        <div v-if="toastMessage" class="toast-notification">
          {{ toastMessage }}
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
  min-height: calc(100vh - 80px);
  margin: 0;
  padding: 0;
  gap: 0;
}

.profile-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
  padding: 24px 0;
}

.sidebar-menu {
  padding: 0;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 16px 24px;
  background: transparent;
  border: none;
  border-radius: 0;
  font-size: 15px;
  font-weight: 500;
  color: #cbd5e1;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s;
  margin-bottom: 0;
  border-left: 3px solid transparent;
}

.menu-item:last-child {
  margin-bottom: 0;
}

.menu-item:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #f1f5f9;
  border-left-color: rgba(99, 102, 241, 0.5);
}

.menu-item.active {
  background: rgba(99, 102, 241, 0.15);
  color: white;
  border-left-color: #6366f1;
}

.menu-item.admin-item {
  color: #fbbf24;
}

.menu-item.admin-item:hover {
  background: rgba(251, 191, 36, 0.1);
}

.menu-item.admin-item.active {
  background: rgba(251, 191, 36, 0.15);
  border-left-color: #fbbf24;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px 24px;
}

.menu-title {
  padding: 8px 24px;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.profile-content {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
  padding: 0;
  overflow-y: auto;
  position: relative;
}

.content-panel {
  background: white;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.header-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
}

.panel-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.markers-list,
.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.marker-item,
.user-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.marker-item:hover,
.user-item:hover {
  border-color: #6366f1;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
}

.marker-info h4,
.user-info h4 {
  margin: 0 0 8px 0;
  color: #1e293b;
  font-size: 16px;
}

.marker-info p,
.user-email,
.user-meta {
  margin: 4px 0;
  color: #64748b;
  font-size: 14px;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.user-main h4 {
  margin: 0;
}

.marker-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.location-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 6px;
  font-size: 12px;
}

.coord-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 6px;
  font-size: 12px;
}

.marker-creator {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.marker-actions,
.user-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn {
  background: #6366f1;
  color: white;
}

.edit-btn:hover {
  background: #4f46e5;
}

.view-btn {
  background: #6366f1;
  color: white;
}

.view-btn:hover {
  background: #4f46e5;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

.role-btn {
  background: #fbbf24;
  color: #1e293b;
}

.role-btn:hover {
  background: #f59e0b;
}

.protected-label {
  padding: 8px 14px;
  background: #f1f5f9;
  color: #94a3b8;
  border-radius: 6px;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  font-size: 14px;
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
  border-radius: 8px;
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
  border-radius: 6px;
  font-size: 12px;
  color: #6366f1;
  cursor: pointer;
}

.admin-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 6px;
  font-size: 12px;
}

.user-badge {
  padding: 4px 12px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
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

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.form-group textarea {
  resize: none;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #f1f5f9;
  border: none;
  color: #64748b;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-submit {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: white;
}

.btn-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.toast-notification {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2000;
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
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
