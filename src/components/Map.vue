<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits<{
  back: []
  goProfile: []
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapLoaded = ref(false)
const searchQuery = ref('')
const map = ref<any>(null)

const showMarkerModal = ref(false)
const markerForm = ref({
  name: '',
  phone: '',
  description: ''
})
const currentMarkerPosition = ref<[number, number] | null>(null)
const markers = ref<any[]>([])
const isMarkerMode = ref(false)
const isSatelliteMode = ref(false)
let satelliteLayer: any = null

const showMarkerDetail = ref<any>(null)
const showDetailModal = ref(false)
const showEditModal = ref(false)
const editForm = ref({
  name: '',
  phone: '',
  description: ''
})
const currentEditingMarkerId = ref<number | null>(null)
const user = ref<any>(null)

const AMapKey = 'd49515c6f31132bed48100958d82191e'

interface Window {
  initAMap?: () => void
  AMap?: any
}

const loadAMapScript = () => {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMapKey}&callback=initAMap&plugin=AMap.Geolocation,AMap.Geocoder`
    script.onerror = () => reject(new Error('地图加载失败'))
    ;(window as Window).initAMap = resolve
    document.body.appendChild(script)
  })
}

const initMap = async () => {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    user.value = currentUser

    await loadAMapScript()
    
    if (!mapContainer.value) return
    
    const AMap = (window as Window).AMap
    if (!AMap) {
      throw new Error('AMap API 未加载')
    }
    
    map.value = new AMap.Map(mapContainer.value, {
      zoom: 15,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      features: ['bg', 'road', 'building', 'land', 'point', 'label'],
    })

    await getCurrentLocation(AMap, true)

    map.value.on('click', (e: any) => {
      if (!isMarkerMode.value) return
      const position = e.lnglat
      currentMarkerPosition.value = [position.getLng(), position.getLat()]
      showMarkerModal.value = true
    })

    await loadMarkersFromDB(AMap)

    mapLoaded.value = true
  } catch (error) {
    console.error('地图加载失败:', error)
    mapLoaded.value = true
  }
}

const getCurrentLocation = async (AMap: any, showMarker: boolean = false) => {
  return new Promise<void>((resolve) => {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
    })

    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status === 'complete') {
        const { lng, lat } = result.position
        map.value.setCenter([lng, lat])
        map.value.setZoom(15)
        
        if (showMarker) {
          const marker = new AMap.Marker({
            position: [lng, lat],
            title: '我的位置',
            icon: new AMap.Icon({
              size: new AMap.Size(32, 32),
              image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
            }),
          })
          map.value.add(marker)
        }
      } else {
        console.log('获取位置失败，使用默认位置:', result.message)
        alert('获取位置失败，请确保已授权位置权限')
      }
      resolve()
    })
  })
}

const handleLocate = async () => {
  const AMap = (window as Window).AMap
  if (!AMap) {
    alert('地图加载中，请稍候')
    return
  }
  await getCurrentLocation(AMap, true)
}

const loadMarkersFromDB = async (AMap: any) => {
  try {
    const { data, error } = await supabase.from('markers').select('*')
    
    if (error) {
      console.error('加载标点失败:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log('数据库中没有标点')
      return
    }

    data.forEach((markerData: any) => {
      if (!markerData.lng || !markerData.lat) return

      const lng = parseFloat(markerData.lng)
      const lat = parseFloat(markerData.lat)

      if (isNaN(lng) || isNaN(lat)) {
        console.error('无效的经纬度:', markerData)
        return
      }

      const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        title: markerData.name,
        extData: markerData
      })

      marker.on('click', () => {
        showMarkerDetail.value = markerData
        updateNodePath(markerData.name)
        showDetailModal.value = true
      })

      map.value.add(marker)
    })

    console.log(`已加载 ${data.length} 个标点`)
  } catch (error) {
    console.error('加载标点时发生错误:', error)
  }
}

const toggleMarkerMode = () => {
  isMarkerMode.value = !isMarkerMode.value
}

const toggleSatelliteMode = () => {
  const AMap = (window as Window).AMap
  if (!AMap || !map.value) return

  isSatelliteMode.value = !isSatelliteMode.value

  if (isSatelliteMode.value) {
    satelliteLayer = new AMap.TileLayer.Satellite({
      zooms: [1, 16.5],
    })
    map.value.add(satelliteLayer)
  } else {
    if (satelliteLayer) {
      satelliteLayer.setMap(null)
      satelliteLayer = null
    }
  }
}

const handleSearch = async () => {
  if (!searchQuery.value.trim() || !map.value) {
    alert('请输入搜索地点')
    return
  }

  try {
    const AMap = (window as Window).AMap
    if (!AMap) {
      throw new Error('AMap API 未加载')
    }
    
    const geocoder = new AMap.Geocoder({
      city: '全国',
    })

    geocoder.getLocation(searchQuery.value, (status: string, result: any) => {
      if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
        const location = result.geocodes[0].location
        map.value.setCenter(location)
        map.value.setZoom(15)

        const marker = new AMap.Marker({
          position: location,
          title: searchQuery.value,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/%3E%3Ccircle cx="12" cy="10" r="3"/%3E%3C/svg%3E',
          }),
        })
        map.value.add(marker)
        
        alert(`已定位到: ${result.geocodes[0].formattedAddress}`)
      } else {
        console.error('搜索结果:', result)
        alert('未找到该地点，请尝试其他关键词')
      }
    })
  } catch (error) {
    console.error('搜索失败:', error)
    alert(`搜索失败: ${error}`)
  }
}

const closeMarkerModal = () => {
  showMarkerModal.value = false
  markerForm.value = {
    name: '',
    phone: '',
    description: ''
  }
  currentMarkerPosition.value = null
}

const submitMarker = async () => {
  if (!markerForm.value.name.trim()) {
    alert('姓名为必填项')
    return
  }

  if (!currentMarkerPosition.value || !map.value) return

  const [lng, lat] = currentMarkerPosition.value
  const location = await getLocationName(lng, lat)

  console.log('准备保存标点:', {
    name: markerForm.value.name.trim(),
    phone: markerForm.value.phone,
    description: markerForm.value.description,
    location,
    lng,
    lat
  })

  try {
    const { data, error } = await supabase
      .from('markers')
      .insert({
        name: markerForm.value.name.trim(),
        phone: markerForm.value.phone || null,
        description: markerForm.value.description || null,
        location,
        lng: Number(lng),
        lat: Number(lat),
        created_by: user.value?.id || null
      })
      .select()
      .single()

    if (error) {
      console.error('保存标点失败:', error)
      alert(`保存失败: ${error.message || error}`)
      return
    }

    const AMap = (window as Window).AMap
    if (AMap && currentMarkerPosition.value) {
      const marker = new AMap.Marker({
        position: new AMap.LngLat(currentMarkerPosition.value[0], currentMarkerPosition.value[1]),
        title: markerForm.value.name
      })

      const infoWindow = new AMap.InfoWindow({
        content: `
          <div style="padding: 12px;">
            <h4 style="margin: 0 0 8px 0; color: #1e293b;">${markerForm.value.name}</h4>
            ${markerForm.value.phone ? `<p style="margin: 4px 0; color: #64748b;">📞 ${markerForm.value.phone}</p>` : ''}
            ${markerForm.value.description ? `<p style="margin: 4px 0; color: #64748b;">${markerForm.value.description}</p>` : ''}
          </div>
        `,
        offset: new AMap.Pixel(0, -20)
      })

      marker.on('click', () => {
        infoWindow.open(map.value, marker.getPosition())
      })

      map.value.add(marker)
      markers.value.push({ marker, infoWindow, data: { ...markerForm.value, id: data.id } })
    }

    closeMarkerModal()
    alert('标点成功！')
  } catch (e) {
    console.error('保存标点异常:', e)
    alert('保存失败')
  }
}

const openEditModal = () => {
  if (!showMarkerDetail.value) return
  
  editForm.value = {
    name: showMarkerDetail.value.name || '',
    phone: showMarkerDetail.value.phone || '',
    description: showMarkerDetail.value.description || ''
  }
  currentEditingMarkerId.value = showMarkerDetail.value.id
  showDetailModal.value = false
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    name: '',
    phone: '',
    description: ''
  }
  currentEditingMarkerId.value = null
}

const deleteMarker = async () => {
  if (!showMarkerDetail.value || !showMarkerDetail.value.id) {
    alert('无法删除此标点')
    return
  }

  if (!confirm('确定要删除这个标点吗？')) {
    return
  }

  try {
    const { error } = await supabase
      .from('markers')
      .delete()
      .eq('id', showMarkerDetail.value.id)

    if (error) {
      console.error('删除标点失败:', error)
      alert(`删除失败: ${error.message || error}`)
      return
    }

    showDetailModal.value = false
    alert('删除成功！')
    
    location.reload()
  } catch (error) {
    console.error('删除标点时发生错误:', error)
    alert('删除失败')
  }
}

const submitEditMarker = async () => {
  if (!editForm.value.name.trim()) {
    alert('姓名为必填项')
    return
  }

  if (!currentEditingMarkerId.value) return

  try {
    const { error } = await supabase
      .from('markers')
      .update({
        name: editForm.value.name.trim(),
        phone: editForm.value.phone || null,
        description: editForm.value.description || null
      })
      .eq('id', currentEditingMarkerId.value)

    if (error) {
      console.error('修改标点失败:', error)
      alert(`修改失败: ${error.message || error}`)
      return
    }

    closeEditModal()
    alert('修改成功！')
    
    location.reload()
  } catch (e) {
    console.error('修改标点异常:', e)
    alert('修改失败')
  }
}

const getLocationName = async (lng: number, lat: number): Promise<string> => {
  const AMap = (window as Window).AMap
  if (!AMap) return ''

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder()
    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result.regeocode) {
        const addressComponent = result.regeocode.addressComponent
        const city = addressComponent.city || addressComponent.province || ''
        resolve(city)
      } else {
        resolve('')
      }
    })
  })
}

const mindmapData = ref<any>(null)

const loadMindmapData = async () => {
  try {
    const { data, error } = await supabase
      .from('mindmaps')
      .select('data')
      .eq('id', '组织结构图')
      .single()
    
    if (error || !data) {
      console.log('数据库中没有思维导图数据')
      return
    }
    
    if (data.data) {
      mindmapData.value = JSON.parse(data.data)
    }
  } catch (e: any) {
    console.error('加载思维导图数据失败:', e)
  }
}

const findNodePath = (name: string): string[] => {
  if (!mindmapData.value) return []
  
  const path: string[] = []
  const findPath = (node: any, targetName: string): boolean => {
    if (node.text === targetName) {
      path.unshift(node.text)
      return true
    }
    for (const child of node.children) {
      if (findPath(child, targetName)) {
        path.unshift(node.text)
        return true
      }
    }
    return false
  }
  
  findPath(mindmapData.value, name)
  return path
}

const markerNodePath = ref<string[]>([])

const updateNodePath = (name: string) => {
  markerNodePath.value = findNodePath(name)
}

const goBack = () => {
  emit('back')
}

onMounted(() => {
  initMap()
  loadMindmapData()
})

onUnmounted(() => {
  if (map.value) {
    map.value.destroy()
  }
})
</script>

<template>
  <div class="map-container">
    <div class="map-header">
      <button class="back-btn" @click="goBack">代序图</button>
      <h1>地图</h1>
      <button class="profile-btn" @click="$emit('goProfile')">👤 个人中心</button>
    </div>

    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜索地点..."
        @keydown.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </div>

    <div 
      ref="mapContainer" 
      class="map-wrapper"
      :class="{ loading: !mapLoaded }"
    >
      <div v-if="!mapLoaded" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在加载地图...</p>
      </div>
    </div>

    <div class="map-controls">
      <button class="control-btn" @click="map && map.setZoom(map.getZoom() + 1)">+ 放大</button>
      <button class="control-btn" @click="map && map.setZoom(map.getZoom() - 1)">- 缩小</button>
      <button class="control-btn" @click="map && map.setCenter([116.397428, 39.90923])">重置视角</button>
      <button class="control-btn locate-btn" @click="handleLocate">定位</button>
      <button class="control-btn marker-btn" :class="{ active: isMarkerMode }" @click="toggleMarkerMode">
        {{ isMarkerMode ? '标点模式' : '标点' }}
      </button>
      <button class="control-btn satellite-btn" :class="{ active: isSatelliteMode }" @click="toggleSatelliteMode">
        {{ isSatelliteMode ? '✓ 卫星图' : '🛰️ 卫星图' }}
      </button>
    </div>

    <div v-if="showMarkerModal" class="modal-overlay" @click.self="closeMarkerModal">
      <div class="modal-content">
        <h3>添加标记点</h3>
        <div class="form-group">
          <label>姓名 <span class="required">*</span></label>
          <input v-model="markerForm.name" type="text" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label>手机号</label>
          <input v-model="markerForm.phone" type="tel" placeholder="请输入手机号（选填）" />
        </div>
        <div class="form-group">
          <label>介绍</label>
          <textarea v-model="markerForm.description" placeholder="请输入介绍（选填）" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="closeMarkerModal">取消</button>
          <button class="btn btn-submit" @click="submitMarker">确定</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal && showMarkerDetail" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content">
        <h3>位置信息</h3>
        <div class="form-group">
          <label>姓名</label>
          <div class="detail-value">{{ showMarkerDetail.name }}</div>
        </div>
        <div class="form-group">
          <label>手机号</label>
          <div class="detail-value">{{ showMarkerDetail.phone || '未填写' }}</div>
        </div>
        <div class="form-group">
          <label>介绍</label>
          <div class="detail-value">{{ showMarkerDetail.description || '未填写' }}</div>
        </div>
        <div class="form-group">
          <label>族谱路径</label>
          <div class="detail-value ancestor-path">
            <template v-if="markerNodePath.length > 0">
              <span v-for="(node, index) in markerNodePath" :key="index">
                {{ node }}
                <span v-if="index < markerNodePath.length - 1" class="path-arrow">→</span>
              </span>
            </template>
            <span v-else class="no-data">未找到族谱信息</span>
          </div>
        </div>
        <div class="modal-actions">
          <button 
            v-if="!showMarkerDetail.created_by || showMarkerDetail.created_by === user?.id" 
            class="btn btn-edit" 
            @click="openEditModal"
          >
            修改
          </button>
          <button 
            v-if="!showMarkerDetail.created_by || showMarkerDetail.created_by === user?.id" 
            class="btn btn-delete" 
            @click="deleteMarker"
          >
            删除
          </button>
          <button class="btn btn-cancel" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content">
        <h3>修改标点</h3>
        <div class="form-group">
          <label>姓名 <span class="required">*</span></label>
          <input v-model="editForm.name" type="text" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label>手机号</label>
          <input v-model="editForm.phone" type="tel" placeholder="请输入手机号（选填）" />
        </div>
        <div class="form-group">
          <label>介绍</label>
          <textarea v-model="editForm.description" placeholder="请输入介绍（选填）" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="closeEditModal">取消</button>
          <button class="btn btn-submit" @click="submitEditMarker">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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

.profile-btn {
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

.profile-btn:hover {
  background: #6366f1;
  color: white;
}

.map-header h1 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.search-bar {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.search-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.search-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.map-wrapper {
  flex: 1;
  position: relative;
  background: #e8e8e8;
}

.map-wrapper.loading {
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(99, 102, 241, 0.3);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  color: #64748b;
  font-size: 14px;
}

.map-controls {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.control-btn {
  padding: 10px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s;
}

.control-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.locate-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.locate-btn:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
}

.marker-btn {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  color: white;
}

.marker-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
  color: white;
}

.marker-btn.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.5);
}

.satellite-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.satellite-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: white;
}

.satellite-btn.active {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.5);
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
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
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

.form-group .required {
  color: #ef4444;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.form-group textarea {
  resize: none;
}

.detail-value {
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.modal-actions .btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-edit {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  color: white;
}

.btn-edit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.btn-delete {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  color: white;
}

.btn-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
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

.ancestor-path {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.path-arrow {
  color: #6366f1;
  font-weight: bold;
  margin: 0 4px;
}

.no-data {
  color: #94a3b8;
  font-style: italic;
}
</style>
