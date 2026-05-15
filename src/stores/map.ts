import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../supabase'

export interface Marker {
  id: number
  name: string
  phone: string | null
  description: string | null
  location: string | null
  lng: number
  lat: number
  created_by: string | null
}

export const useMapStore = defineStore('map', () => {
  const markers = ref<Marker[]>([])
  const isLoaded = ref(false)
  const loading = ref(false)

  const loadMarkersFromDB = async () => {
    if (isLoaded.value && !loading.value) {
      return markers.value
    }
    
    loading.value = true
    
    try {
      const { data, error } = await supabase.from('markers').select('*')
      
      if (error) {
        console.error('加载标点失败:', error)
        isLoaded.value = true
        loading.value = false
        return markers.value
      }

      if (!data || data.length === 0) {
        console.log('数据库中没有标点')
        isLoaded.value = true
        loading.value = false
        return markers.value
      }

      markers.value = data as Marker[]
      isLoaded.value = true
      loading.value = false
      return markers.value
    } catch (error) {
      console.error('加载标点时发生错误:', error)
      isLoaded.value = true
      loading.value = false
      return markers.value
    }
  }

  const addMarker = (marker: Omit<Marker, 'id'>) => {
    markers.value.push({ ...marker, id: Date.now() } as Marker)
  }

  const updateMarker = (id: number, updates: Partial<Omit<Marker, 'id'>>) => {
    const index = markers.value.findIndex(m => m.id === id)
    if (index !== -1) {
      markers.value[index] = { ...markers.value[index], ...updates } as Marker
    }
  }

  const deleteMarker = (id: number) => {
    const index = markers.value.findIndex(m => m.id === id)
    if (index !== -1) {
      markers.value.splice(index, 1)
    }
  }

  const resetLoaded = () => {
    isLoaded.value = false
    markers.value = []
  }

  return {
    markers,
    isLoaded,
    loading,
    loadMarkersFromDB,
    addMarker,
    updateMarker,
    deleteMarker,
    resetLoaded
  }
})