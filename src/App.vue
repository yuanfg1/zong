<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import MindMap from './components/MindMap.vue'
import AuthForm from './components/AuthForm.vue'
import Profile from './components/Profile.vue'
import Map from './components/Map.vue'
import { supabase } from './supabase'
import { useMindMapStore } from './stores/mindmap'
import { useMapStore } from './stores/map'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const mindMapStore = useMindMapStore()
const mapStore = useMapStore()

const user = ref<any>(null)
const loading = ref(true)
const currentPage = ref<'mindmap' | 'profile' | 'map'>('map')

const handleAuthStateChange = async (event: AuthChangeEvent, session: Session | null) => {
  if (session) {
    user.value = session.user
    await mindMapStore.loadFromDatabase()
    await mapStore.loadMarkersFromDB()
  } else {
    user.value = null
    mindMapStore.resetLoaded()
    mapStore.resetLoaded()
  }
  loading.value = false
}

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('登出失败:', error)
  }
}

const updateUrl = (page: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('page', page)
  window.history.replaceState({}, '', url.toString())
}

const goProfile = () => {
  currentPage.value = 'profile'
  updateUrl('profile')
}

const goMindMap = () => {
  currentPage.value = 'mindmap'
  updateUrl('mindmap')
}

const goMap = () => {
  currentPage.value = 'map'
  updateUrl('map')
}

const loadPageFromUrl = () => {
  const url = new URL(window.location.href)
  const page = url.searchParams.get('page') as 'mindmap' | 'profile' | 'map'
  if (page && ['mindmap', 'profile', 'map'].includes(page)) {
    currentPage.value = page
  }
}

watch(currentPage, (newPage) => {
  updateUrl(newPage)
})

let authSubscription: { unsubscribe: () => void } | null = null

onMounted(async () => {
  loadPageFromUrl()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    user.value = session.user
    await mindMapStore.loadFromDatabase()
    await mapStore.loadMarkersFromDB()
  } else {
    user.value = null
  }
  loading.value = false
  
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
  
  <MindMap 
    v-else-if="currentPage === 'mindmap'" 
    :user="user" 
    @logout="logout"
    @go-profile="goProfile"
    @go-map="goMap"
  />
  
  <Profile 
    v-else-if="currentPage === 'profile'"
    @logout="logout"
    @back="goMindMap"
  />
  
  <Map
    v-else-if="currentPage === 'map'"
    @back="goMindMap"
    @go-profile="goProfile"
  />
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