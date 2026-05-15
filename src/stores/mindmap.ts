import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../supabase'

export interface Node {
  id: string
  text: string
  x: number
  y: number
  children: Node[]
  color: string
}

const DEFAULT_MAP_NAME = '组织结构图'

export const useMindMapStore = defineStore('mindmap', () => {
  const root = ref<Node>({
    id: 'root',
    text: '新思维导图',
    x: 0,
    y: 0,
    color: '#6366f1',
    children: []
  })
  
  const isLoaded = ref(false)
  const loading = ref(false)

  const loadFromDatabase = async () => {
    if (isLoaded.value && !loading.value) {
      return root.value
    }
    
    loading.value = true
    
    try {
      const { data, error } = await supabase
        .from('mindmaps')
        .select('id, title, data')
        .eq('id', DEFAULT_MAP_NAME.toLowerCase().replace(/\s+/g, '-'))
        .single()
      
      if (error || !data) {
        console.log('数据库中没有思维导图，使用默认数据')
        isLoaded.value = true
        loading.value = false
        return root.value
      }
      
      if (data && data.data) {
        const loadedData = JSON.parse(data.data)
        Object.assign(root.value, loadedData)
      }
      
      isLoaded.value = true
      loading.value = false
      return root.value
    } catch (e: any) {
      console.error('加载异常:', e)
      isLoaded.value = true
      loading.value = false
      return root.value
    }
  }

  const saveToDatabase = async (userId: string) => {
    const mapName = DEFAULT_MAP_NAME
    
    try {
      const { data, error } = await supabase
        .from('mindmaps')
        .upsert({
          id: mapName.toLowerCase().replace(/\s+/g, '-'),
          data: JSON.stringify(root.value),
          title: mapName,
          user_id: userId,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('保存失败:', error)
        throw new Error('保存失败: ' + error.message)
      }
      
      return data
    } catch (e: any) {
      console.error('保存异常:', e)
      throw new Error('保存异常: ' + (e.message || '未知错误'))
    }
  }

  const updateRoot = (newRoot: Node) => {
    Object.assign(root.value, newRoot)
  }

  const resetLoaded = () => {
    isLoaded.value = false
  }

  return {
    root,
    isLoaded,
    loading,
    loadFromDatabase,
    saveToDatabase,
    updateRoot,
    resetLoaded
  }
})