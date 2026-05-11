<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

const isLogin = ref(true)
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const captcha = ref('')
const captchaCode = ref('')
const loading = ref(false)
const error = ref('')

const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  captchaCode.value = code
}

const captchaImage = computed(() => {
  if (!captchaCode.value) return ''
  
  const canvas = document.createElement('canvas')
  canvas.width = 110
  canvas.height = 40
  const ctx = canvas.getContext('2d')!
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  ctx.font = 'bold 22px Arial'
  const charWidth = 24
  const startX = (canvas.width - captchaCode.value.length * charWidth) / 2 + 4
  
  for (let i = 0; i < captchaCode.value.length; i++) {
    const char = captchaCode.value[i] || ''
    const x = startX + i * charWidth
    const y = canvas.height / 2 + 7
    
    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 45%)`
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((Math.random() - 0.5) * 0.15)
    ctx.fillText(char, 0, 0)
    ctx.restore()
  }
  
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.2})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.stroke()
  }
  
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`
    ctx.beginPath()
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2)
    ctx.fill()
  }
  
  return canvas.toDataURL()
})

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  
  if (!isLogin.value) {
    if (captcha.value.toLowerCase() !== captchaCode.value.toLowerCase()) {
      error.value = '验证码错误'
      generateCaptcha()
      captcha.value = ''
      loading.value = false
      return
    }
    
    if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致'
      loading.value = false
      return
    }
  }
  
  try {
    if (isLogin.value) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: `${phone.value}@example.com`,
        password: password.value
      })
      
      if (loginError) {
        error.value = loginError.message
      } else {
        const adminPhone = '16683122850'
        const role = phone.value === adminPhone ? 'admin' : 'user'
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('user_profiles').upsert({
            id: user.id,
            phone: phone.value,
            role: role
          })
        }
        
        if (role === 'admin') {
          localStorage.setItem('mindmap_admin', 'true')
        }
      }
    } else {
      const { data: signUpData, error: signupError } = await supabase.auth.signUp({
        email: `${phone.value}@example.com`,
        password: password.value
      })
      
      if (signupError) {
        error.value = signupError.message
      } else {
        if (signUpData.user) {
          const adminPhone = '16683122850'
          const role = phone.value === adminPhone ? 'admin' : 'user'
          
          await supabase.from('user_profiles').upsert({
            id: signUpData.user.id,
            phone: phone.value,
            role: role
          })
        }
        alert('注册成功，请检查邮箱验证')
        isLogin.value = true
        generateCaptcha()
      }
    }
  } catch (e: any) {
    error.value = e.message || '操作失败'
    if (!isLogin.value) {
      generateCaptcha()
      captcha.value = ''
    }
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  password.value = ''
  confirmPassword.value = ''
  captcha.value = ''
  generateCaptcha()
}

generateCaptcha()
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">{{ isLogin ? '登录' : '注册' }}</h2>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="phone">手机号码</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="请输入手机号码"
            pattern="[0-9]{11}"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>
        
        <div v-if="!isLogin" class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
          />
        </div>
        
        <div v-if="!isLogin" class="form-group captcha-group">
          <label for="captcha">验证码</label>
          <div class="captcha-row">
            <input
              id="captcha"
              v-model="captcha"
              type="text"
              placeholder="请输入验证码"
              maxlength="4"
              required
            />
            <img 
              :src="captchaImage" 
              alt="验证码" 
              class="captcha-img"
              @click="generateCaptcha"
              title="点击刷新验证码"
            />
          </div>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <button type="submit" class="auth-btn" :disabled="loading">
          {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
        </button>
        
        <p class="toggle-text" @click="toggleMode">
          {{ isLogin ? '没有账号？点击注册' : '已有账号？点击登录' }}
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
}

.auth-title {
  text-align: center;
  margin-bottom: 30px;
  color: #1e293b;
  font-size: 28px;
  font-weight: 600;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #475569;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  outline: none;
}

.form-group input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.form-group input::placeholder {
  color: #94a3b8;
}

.captcha-group {
  gap: 8px;
}

.captcha-row {
  display: flex;
  gap: 12px;
}

.captcha-row input {
  flex: 1;
}

.captcha-img {
  width: 110px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: contain;
  border: 2px solid #e2e8f0;
  transition: all 0.3s;
}

.captcha-img:hover {
  border-color: #667eea;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  text-align: center;
}

.auth-btn {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-text {
  text-align: center;
  color: #64748b;
  cursor: pointer;
  margin-top: 10px;
  transition: color 0.3s;
}

.toggle-text:hover {
  color: #667eea;
}
</style>