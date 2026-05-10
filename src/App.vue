<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import MindMap from './components/MindMap.vue'
import AuthForm from './components/AuthForm.vue'
import { supabase } from './supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const user = ref<any>(null)
const loading = ref(true)

const handleAuthStateChange = (event: AuthChangeEvent, session: Session | null) => {
  if (session) {
    user.value = session.user
  } else {
    user.value = null
  }
  loading.value = false
}

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('登出失败:', error)
  }
}

let authSubscription: { unsubscribe: () => void } | null = null

onMounted(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    user.value = session?.user || null
    loading.value = false
  })
  
  authSubscription = supabase.auth.onAuthStateChange(handleAuthStateChange).data.subscription
})

onUnmounted(() => {
  if (authSubscription) {
    authSubscription.unsubscribe()
  }
})
</script>

<template>
  <div v-if="loading" class="loading">
    <div class="spinner"></div>
  </div>
  
  <AuthForm v-else-if="!user" />
  
  <MindMap v-else :user="user" @logout="logout" />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>