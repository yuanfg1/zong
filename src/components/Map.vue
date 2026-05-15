<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '../supabase'

declare const AMap: any

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
      viewMode: '3D',
      features: ['bg', 'road', 'building', 'land', 'point', 'label'],
      renderer: 'webgl',
      mapStyle: 'amap://styles/normal',
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

const checkLocationPermission = async (): Promise<boolean> => {
  if (!('permissions' in navigator)) {
    return true
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    if (result.state === 'granted') {
      return true
    } else if (result.state === 'prompt') {
      return true
    } else {
      showToast('位置权限已被拒绝，请在浏览器设置中开启')
      return false
    }
  } catch {
    return true
  }
}

const getCurrentLocation = async (AMap: any, showMarker: boolean = false) => {
  return new Promise<void>(async (resolve) => {
    const hasPermission = await checkLocationPermission()
    if (!hasPermission) {
      resolve()
      return
    }

    const showPosition = (lng: number, lat: number, accuracy: number, source: string) => {
      console.log(`=== 定位结果 (${source}) ===`)
      console.log('坐标:', { lng, lat })
      console.log('精度:', accuracy, '米')
      
      map.value.setCenter([lng, lat])
      
      if (accuracy > 0 && accuracy <= 10) {
        map.value.setZoom(19)
      } else if (accuracy > 10 && accuracy <= 100) {
        map.value.setZoom(17)
      } else if (accuracy > 100 && accuracy <= 500) {
        map.value.setZoom(15)
      } else {
        map.value.setZoom(13)
      }
      
      if (showMarker) {
        const marker = new AMap.Marker({
          position: [lng, lat],
          title: `我的位置 (精度: ${accuracy > 0 ? accuracy + 'm' : '未知'})`,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          }),
        })
        map.value.add(marker)
      }
      
      if (accuracy > 0 && accuracy <= 1000) {
        const circle = new AMap.Circle({
          center: [lng, lat],
          radius: accuracy,
          strokeColor: '#6366f1',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#6366f1',
          fillOpacity: 0.1
        })
        map.value.add(circle)
      }
      
      if (accuracy > 0 && accuracy <= 100) {
        showToast(`定位成功，精度: ${accuracy}米`)
      } else if (accuracy > 100 && accuracy <= 1000) {
        showToast(`定位成功，精度: ${accuracy}米（建议开启GPS提高精度）`)
      } else if (accuracy > 1000) {
        showToast(`定位精度较低: ${accuracy}米，请检查定位服务`)
      }
    }

    const tryBrowserLocation = () => {
      return new Promise<{lng: number, lat: number, accuracy: number} | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude: lng, latitude: lat, accuracy } = position.coords
            resolve({ lng, lat, accuracy })
          },
          () => {
            resolve(null)
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      })
    }

    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      noConvert: true,
      showButton: true,
      buttonPosition: 'RB',
      showMarker: true,
      showCircle: true,
      panToLocation: true,
      zoomToAccuracy: true,
      useNative: true
    })

    geolocation.getCurrentPosition(async (status: string, result: any) => {
      if (status === 'complete') {
        const { lng, lat } = result.position
        const accuracy = result.accuracy || 0
        const locationType = result.locationType || 'unknown'
        
        console.log('定位类型:', locationType)
        
        const isIPLocation = locationType === 'ip' || locationType === 'IP'
        
        if (isIPLocation) {
          console.log('检测到IP定位，精度较低')
          console.log('尝试浏览器原生定位...')
          
          const browserLoc = await tryBrowserLocation()
          if (browserLoc && browserLoc.accuracy <= 500) {
            showPosition(browserLoc.lng, browserLoc.lat, browserLoc.accuracy, '浏览器原生')
          } else {
            console.log('浏览器定位也失败，尝试IP城市定位...')
            tryIPCityLocation()
          }
          resolve()
          return
        }
        
        if (accuracy <= 500) {
          showPosition(lng, lat, accuracy, '高德地图')
        } else {
          console.log(`高德定位精度不足(${accuracy}m)，尝试浏览器原生定位...`)
          const browserLoc = await tryBrowserLocation()
          
          if (browserLoc && browserLoc.accuracy < accuracy) {
            showPosition(browserLoc.lng, browserLoc.lat, browserLoc.accuracy, '浏览器原生')
          } else {
            showToast(`定位精度较低(${accuracy}米)，建议开启GPS以获得更准确的位置`)
          }
        }
        resolve()
      } else {
        console.error('高德定位失败:', result.message || result)
        console.log('尝试浏览器原生定位...')
        
        const browserLoc = await tryBrowserLocation()
        if (browserLoc && browserLoc.accuracy <= 500) {
          showPosition(browserLoc.lng, browserLoc.lat, browserLoc.accuracy, '浏览器原生')
        } else {
          console.log('浏览器定位也失败，尝试IP城市定位...')
          tryIPCityLocation()
        }
        resolve()
      }
    })

    const tryIPCityLocation = () => {
      const citySearch = new AMap.CitySearch()
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete' && result && result.city) {
          const cityCenter = result.rectangle.split(';')[0].split(',')
          const cityLng = parseFloat(cityCenter[0])
          const cityLat = parseFloat(cityCenter[1])
          
          if (!isNaN(cityLng) && !isNaN(cityLat)) {
            showPosition(cityLng, cityLat, 5000, 'IP城市定位')
            showToast(`已定位到${result.city}，精度约5公里。建议开启GPS以获得更准确的位置`)
          }
        } else {
          showToast('获取位置失败，请确保已授权位置权限并开启GPS。如需精确定位，请在手机设置中开启定位服务')
        }
      })
    }
  })
}



const handleLocate = async () => {
  const AMap = (window as Window).AMap
  if (!AMap) {
    showToast('地图加载中，请稍候')
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

      // 添加名字标签
      const text = new AMap.Text({
        position: new AMap.LngLat(lng, lat),
        text: markerData.name,
        offset: new AMap.Pixel(0, -35),
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
        padding: '4px 8px'
      })

      marker.on('click', () => {
        showMarkerDetail.value = markerData
        updateNodePath(markerData.name)
        showDetailModal.value = true
      })

      map.value.add(marker)
      map.value.add(text)
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
    if (!satelliteLayer) {
      satelliteLayer = new AMap.TileLayer.Satellite({
        zooms: [1, 18],
      })
    }
    map.value.add(satelliteLayer)
  } else {
    if (satelliteLayer) {
      map.value.remove(satelliteLayer)
    }
  }
}

const handleSearch = async () => {
  if (!searchQuery.value.trim() || !map.value) {
    showToast('请输入搜索地点')
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
        
        showToast(`已定位到: ${result.geocodes[0].formattedAddress}`)
      } else {
        console.error('搜索结果:', result)
        showToast('未找到该地点，请尝试其他关键词')
      }
    })
  } catch (error) {
    console.error('搜索失败:', error)
    showToast(`搜索失败: ${error}`)
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
    showToast('姓名为必填项')
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
      showToast(`保存失败: ${error.message || error}`)
      return
    }

    const AMap = (window as Window).AMap
    if (AMap && currentMarkerPosition.value) {
      const markerData = {
        id: data.id,
        name: markerForm.value.name.trim(),
        phone: markerForm.value.phone || null,
        description: markerForm.value.description || null,
        location,
        lng: Number(lng),
        lat: Number(lat),
        created_by: user.value?.id || null
      }

      const marker = new AMap.Marker({
        position: new AMap.LngLat(currentMarkerPosition.value[0], currentMarkerPosition.value[1]),
        title: markerForm.value.name,
        extData: markerData
      })

      // 添加名字标签
      const text = new AMap.Text({
        position: new AMap.LngLat(currentMarkerPosition.value[0], currentMarkerPosition.value[1]),
        text: markerForm.value.name.trim(),
        offset: new AMap.Pixel(0, -35),
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
        padding: '4px 8px'
      })

      marker.on('click', () => {
        showMarkerDetail.value = markerData
        updateNodePath(markerData.name)
        showDetailModal.value = true
      })

      map.value.add(marker)
      map.value.add(text)
      markers.value.push({ marker, data: markerData })
    }

    closeMarkerModal()
    showToast('标点成功！')
  } catch (e) {
    console.error('保存标点异常:', e)
    showToast('保存失败')
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
    showToast('无法删除此标点')
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
      showToast(`删除失败: ${error.message || error}`)
      return
    }

    showDetailModal.value = false
    showToast('删除成功！')
    
    location.reload()
  } catch (error) {
    console.error('删除标点时发生错误:', error)
    showToast('删除失败')
  }
}

const submitEditMarker = async () => {
  if (!editForm.value.name.trim()) {
    showToast('姓名为必填项')
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
      showToast(`修改失败: ${error.message || error}`)
      return
    }

    closeEditModal()
    showToast('修改成功！')
    
    location.reload()
  } catch (e) {
    console.error('修改标点异常:', e)
    showToast('修改失败')
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

const searchResults = ref<any[]>([])
const editSearchResults = ref<any[]>([])
const showSearchDropdown = ref(false)
const showEditSearchDropdown = ref(false)

interface SearchResult {
  name: string
  fullPath: string
}

const swapNameOrder = (name: string): string => {
  const parts = name.split(' ')
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`
  }
  return name
}

const getAllNodesWithPath = (node: any, parentPath: string = '', depth: number = 0): SearchResult[] => {
  const swappedName = swapNameOrder(node.text)
  const currentPath = parentPath ? `${swappedName} → ${parentPath}` : swappedName
  const results: SearchResult[] = [{ name: node.text, fullPath: currentPath }]
  
  node.children.forEach((child: any) => {
    const pathParts = currentPath.split(' → ')
    if (pathParts.length >= 4) {
      const recentPath = pathParts.slice(0, 3).join(' → ')
      results.push(...getAllNodesWithPath(child, recentPath, depth + 1))
    } else {
      results.push(...getAllNodesWithPath(child, currentPath, depth + 1))
    }
  })
  
  return results
}

const handleNodeSearch = () => {
  if (!markerForm.value.name.trim()) {
    searchResults.value = []
    showSearchDropdown.value = false
    return
  }
  
  if (!mindmapData.value) {
    searchResults.value = []
    return
  }
  
  const allNodes = getAllNodesWithPath(mindmapData.value)
  const query = markerForm.value.name.toLowerCase()
  
  searchResults.value = allNodes.filter(node => 
    node.name.toLowerCase().includes(query)
  ).sort((a, b) => {
    const aIndex = a.name.toLowerCase().indexOf(query)
    const bIndex = b.name.toLowerCase().indexOf(query)
    return aIndex - bIndex
  }).slice(0, 10)
  
  showSearchDropdown.value = searchResults.value.length > 0
}

const handleEditNodeSearch = () => {
  if (!editForm.value.name.trim()) {
    editSearchResults.value = []
    showEditSearchDropdown.value = false
    return
  }
  
  if (!mindmapData.value) {
    editSearchResults.value = []
    return
  }
  
  const allNodes = getAllNodesWithPath(mindmapData.value)
  const query = editForm.value.name.toLowerCase()
  
  editSearchResults.value = allNodes.filter(node => 
    node.name.toLowerCase().includes(query)
  ).sort((a, b) => {
    const aIndex = a.name.toLowerCase().indexOf(query)
    const bIndex = b.name.toLowerCase().indexOf(query)
    return aIndex - bIndex
  }).slice(0, 10)
  
  showEditSearchDropdown.value = editSearchResults.value.length > 0
}

const selectNodeName = (node: SearchResult) => {
  markerForm.value.name = node.name
  searchResults.value = []
  showSearchDropdown.value = false
}

const selectEditNodeName = (node: SearchResult) => {
  editForm.value.name = node.name
  editSearchResults.value = []
  showEditSearchDropdown.value = false
}

const closeSearchDropdown = () => {
  setTimeout(() => {
    showSearchDropdown.value = false
  }, 200)
}

const closeEditSearchDropdown = () => {
  setTimeout(() => {
    showEditSearchDropdown.value = false
  }, 200)
}

const findNodePath = (name: string): string[] => {
  if (!mindmapData.value) return []
  
  const path: string[] = []
  const findPath = (node: any, targetName: string): boolean => {
    if (node.text === targetName) {
      path.unshift(swapNameOrder(node.text))
      return true
    }
    for (const child of node.children) {
      if (findPath(child, targetName)) {
        path.unshift(swapNameOrder(node.text))
        return true
      }
    }
    return false
  }
  
  findPath(mindmapData.value, name)
  return path
}

const markerNodePath = ref<string[]>([])
const showRelationModal = ref(false)
const markerRelations = ref<any[]>([])
const relationLines = ref<any[]>([])
let lineLayer: any = null

const updateNodePath = (name: string) => {
  markerNodePath.value = findNodePath(name)
}

const findMarkerRelations = async () => {
  if (!showMarkerDetail.value || !mindmapData.value) {
    markerRelations.value = []
    return
  }
  
  const currentName = showMarkerDetail.value.name
  const currentPath = findNodePath(currentName)
  
  if (!currentPath || currentPath.length === 0) {
    markerRelations.value = []
    return
  }
  
  try {
    const { data: markers, error } = await supabase.from('markers').select('*')
    
    if (error || !markers) {
      markerRelations.value = []
      return
    }
    
    const relations = []
    
    for (const marker of markers) {
      if (!marker.name || marker.name === currentName) continue
      
      const markerPath = findNodePath(marker.name)
      if (!markerPath || markerPath.length === 0) continue
      
      let commonDepth = 0
      const minLength = Math.min(currentPath.length, markerPath.length)
      
      while (commonDepth < minLength && currentPath[commonDepth] === markerPath[commonDepth]) {
        commonDepth++
      }
      
      if (commonDepth > 0) {
        const relationType = commonDepth === currentPath.length 
          ? '子辈' 
          : commonDepth === markerPath.length 
            ? '父辈' 
            : '同辈'
            
        relations.push({
          name: marker.name,
          phone: marker.phone || '未填写',
          relation: relationType,
          commonAncestor: currentPath[commonDepth - 1],
          sharedGenerations: commonDepth,
          lng: marker.lng,
          lat: marker.lat
        })
      }
    }
    
    markerRelations.value = relations.sort((a, b) => b.sharedGenerations - a.sharedGenerations)
  } catch (e) {
    console.error('查找关系失败:', e)
    markerRelations.value = []
  }
}

const openRelationModal = async () => {
  showDetailModal.value = false
  await drawRelationLines()
}

const closeRelationModal = () => {
  showRelationModal.value = false
}

const drawRelationLines = async () => {
  const AMap = (window as Window).AMap
  if (!AMap || !map.value) return
  
  clearRelationLines()
  
  try {
    const { data: markers, error } = await supabase.from('markers').select('*')
    
    if (error || !markers || markers.length < 2) return
    
    const parentChildrenMap: Record<string, { parent: any; children: any[] }> = {}
    
    for (let i = 0; i < markers.length; i++) {
      for (let j = i + 1; j < markers.length; j++) {
        const marker1 = markers[i]
        const marker2 = markers[j]
        
        if (!marker1.name || !marker2.name) continue
        if (!marker1.lng || !marker1.lat || !marker2.lng || !marker2.lat) continue
        
        const path1 = findNodePath(marker1.name)
        const path2 = findNodePath(marker2.name)
        
        if (!path1 || !path2 || path1.length === 0 || path2.length === 0) continue
        
        let commonDepth = 0
        const minLength = Math.min(path1.length, path2.length)
        
        while (commonDepth < minLength && path1[commonDepth] === path2[commonDepth]) {
          commonDepth++
        }
        
        if (commonDepth > 0) {
          const isMarker1DirectParent = commonDepth === path1.length && path2.length === path1.length + 1
          const isMarker2DirectParent = commonDepth === path2.length && path1.length === path2.length + 1
          
          if (isMarker1DirectParent) {
            const parentKey = `${marker1.lng},${marker1.lat}`
            if (!parentChildrenMap[parentKey]) {
              parentChildrenMap[parentKey] = { parent: marker1, children: [] }
            }
            parentChildrenMap[parentKey].children.push(marker2)
          } else if (isMarker2DirectParent) {
            const parentKey = `${marker2.lng},${marker2.lat}`
            if (!parentChildrenMap[parentKey]) {
              parentChildrenMap[parentKey] = { parent: marker2, children: [] }
            }
            parentChildrenMap[parentKey].children.push(marker1)
          }
        }
      }
    }
    
    if (Object.keys(parentChildrenMap).length === 0) {
      showToast('没有找到有族谱关系的标点')
      return
    }
    
    const polylineOptions = {
      strokeColor: '#6366f1',
      strokeWeight: 3,
      strokeOpacity: 0.7,
      strokeStyle: 'solid',
      lineJoin: 'round'
    }
    
    lineLayer = []
    const arrowMarkers: any[] = []
    
    Object.values(parentChildrenMap).forEach((group: any) => {
      const parent = group.parent
      const children = group.children
      
      if (children.length === 1) {
        const child = children[0]
        const polyline = new AMap.Polyline({
          path: [
            new AMap.LngLat(parent.lng, parent.lat),
            new AMap.LngLat(child.lng, child.lat)
          ],
          ...polylineOptions
        })
        map.value.add(polyline)
        lineLayer.push(polyline)
        
        addDynamicArrow(parent.lng, parent.lat, child.lng, child.lat, arrowMarkers)
      } else {
        const parentPoint = new AMap.LngLat(parent.lng, parent.lat)
        const childPoints = children.map((c: any) => new AMap.LngLat(c.lng, c.lat))
        
        let centerLng = 0, centerLat = 0
        childPoints.forEach((p: any) => {
          centerLng += p.lng
          centerLat += p.lat
        })
        centerLng /= childPoints.length
        centerLat /= childPoints.length
        
        const offset = 0.0005
        const direction = centerLat > parent.lat ? 1 : -1
        const branchPoint = new AMap.LngLat(
          parent.lng + (centerLng - parent.lng) * 0.3,
          parent.lat + (centerLat - parent.lat) * 0.3 + direction * offset
        )
        
        const mainLine = new AMap.Polyline({
          path: [parentPoint, branchPoint],
          ...polylineOptions
        })
        map.value.add(mainLine)
        lineLayer.push(mainLine)
        
        addDynamicArrow(parent.lng, parent.lat, branchPoint.lng, branchPoint.lat, arrowMarkers)
        
        children.forEach((child: any) => {
          const childPoint = new AMap.LngLat(child.lng, child.lat)
          const branchLine = new AMap.Polyline({
            path: [branchPoint, childPoint],
            ...polylineOptions
          })
          map.value.add(branchLine)
          lineLayer.push(branchLine)
          
          addDynamicArrow(branchPoint.lng, branchPoint.lat, child.lng, child.lat, arrowMarkers)
        })
      }
    })
    
    if (arrowMarkers.length > 0) {
      lineLayer.push(...arrowMarkers)
    }
    
    showToast(`已在地图上绘制关系线`)
  } catch (e) {
    console.error('绘制关系线失败:', e)
    showToast('绘制关系线失败，请重试')
  }
}

const addDynamicArrow = (fromLng: number, fromLat: number, toLng: number, toLat: number, arrowMarkers: any[]) => {
  const AMap = (window as Window).AMap
  if (!AMap || !map.value) return
  
  const arrowMarker = new AMap.Marker({
    position: new AMap.LngLat(fromLng, fromLat),
    icon: new AMap.Icon({
      size: new AMap.Size(12, 12),
      image: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E`,
      imageSize: new AMap.Size(12, 12)
    }),
    offset: new AMap.Pixel(-6, -6),
    zIndex: 100
  })
  
  map.value.add(arrowMarker)
  arrowMarkers.push(arrowMarker)
  
  const duration = 2000
  const startTime = Date.now()
  
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = (elapsed % duration) / duration
    
    const currentLng = fromLng + (toLng - fromLng) * progress
    const currentLat = fromLat + (toLat - fromLat) * progress
    
    arrowMarker.setPosition(new AMap.LngLat(currentLng, currentLat))
    
    requestAnimationFrame(animate)
  }
  
  animate()
}

const clearRelationLines = () => {
  if (lineLayer && lineLayer.length > 0 && map.value) {
    lineLayer.forEach((line: any) => {
      map.value.remove(line)
    })
    lineLayer = null
  }
  relationLines.value = []
}

const toggleRelationLines = async () => {
  if (lineLayer && lineLayer.length > 0) {
    clearRelationLines()
    showToast('已隐藏关系线')
  } else {
    await drawRelationLines()
  }
}

const goBack = () => {
  emit('back')
}

const toastMessage = ref('')
const showToast = (message: string) => {
  toastMessage.value = message
  setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
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
      <button class="control-btn relation-btn" :class="{ active: lineLayer }" @click="toggleRelationLines">
        {{ lineLayer ? '✓ 关系线' : '🔗 关系线' }}
      </button>
    </div>

    <div v-if="showMarkerModal" class="modal-overlay" @click.self="closeMarkerModal">
      <div class="modal-content">
        <h3>添加标记点</h3>
        <div class="form-group">
          <label>姓名 <span class="required">*</span></label>
          <div class="search-select-wrapper">
            <input 
              v-model="markerForm.name" 
              type="text" 
              placeholder="输入姓名搜索或直接输入..." 
              @input="handleNodeSearch"
              @focus="handleNodeSearch"
              ref="nameInput"
            />
            <div v-if="showSearchDropdown && searchResults.length > 0" class="search-dropdown">
              <div class="dropdown-header">从思维导图选择：</div>
              <div 
                v-for="(node, index) in searchResults" 
                :key="index"
                class="dropdown-item"
                @click="selectNodeName(node)"
                @mousedown.prevent
              >
                <div class="dropdown-item-name">{{ node.name }}</div>
                <div class="dropdown-item-path">{{ node.fullPath }}</div>
              </div>
            </div>
          </div>
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
          <button 
            class="btn btn-relation" 
            @click="openRelationModal"
          >
            关系
          </button>
          <button class="btn btn-cancel" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showRelationModal" class="modal-overlay" @click.self="closeRelationModal">
      <div class="modal-content relation-modal">
        <h3>标点关系</h3>
        <div class="form-group">
          <label>当前标点</label>
          <div class="detail-value">{{ showMarkerDetail?.name }}</div>
        </div>
        <div class="form-group">
          <label>相关标点</label>
          <div v-if="markerRelations.length > 0" class="relations-list">
            <div 
              v-for="(relation, index) in markerRelations" 
              :key="index"
              class="relation-item"
            >
              <div class="relation-name">{{ relation.name }}</div>
              <div class="relation-info">
                <span class="relation-tag" :class="relation.relation">
                  {{ relation.relation }}
                </span>
                <span class="relation-phone">{{ relation.phone }}</span>
              </div>
              <div class="relation-ancestor">
                共同祖先: {{ relation.commonAncestor }}
              </div>
            </div>
          </div>
          <div v-else class="no-data">
            未找到相关标点
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="closeRelationModal">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content">
        <h3>修改标点</h3>
        <div class="form-group">
          <label>姓名 <span class="required">*</span></label>
          <div class="search-select-wrapper">
            <input 
              v-model="editForm.name" 
              type="text" 
              placeholder="输入姓名搜索或直接输入..." 
              @input="handleEditNodeSearch"
              @focus="handleEditNodeSearch"
            />
            <div v-if="showEditSearchDropdown && editSearchResults.length > 0" class="search-dropdown">
              <div class="dropdown-header">从思维导图选择：</div>
              <div 
                v-for="(node, index) in editSearchResults" 
                :key="index"
                class="dropdown-item"
                @click="selectEditNodeName(node)"
                @mousedown.prevent
              >
                <div class="dropdown-item-name">{{ node.name }}</div>
                <div class="dropdown-item-path">{{ node.fullPath }}</div>
              </div>
            </div>
          </div>
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

    <div v-if="toastMessage" class="toast-notification">
      {{ toastMessage }}
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

.search-select-wrapper {
  position: relative;
  z-index: 10;
}

.search-select-wrapper input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box;
  background: #f8fafc;
}

.search-select-wrapper input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  background: white;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.dropdown-header {
  padding: 8px 14px;
  font-size: 12px;
  color: #94a3b8;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dropdown-item {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.dropdown-item-path {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-modal {
  max-width: 500px;
}

.relations-list {
  max-height: 300px;
  overflow-y: auto;
}

.relation-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
}

.relation-item:last-child {
  margin-bottom: 0;
}

.relation-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.relation-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.relation-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.relation-tag.父辈 {
  background: #dbeafe;
  color: #1d4ed8;
}

.relation-tag.子辈 {
  background: #dcfce7;
  color: #166534;
}

.relation-tag.同辈 {
  background: #fef3c7;
  color: #92400e;
}

.relation-phone {
  font-size: 13px;
  color: #64748b;
}

.relation-ancestor {
  font-size: 12px;
  color: #94a3b8;
}

.btn-relation {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  border: none;
  color: white;
}

.btn-relation:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
}

.relation-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
}

.relation-btn:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  color: white;
}

.relation-btn.active {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
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
</style>
