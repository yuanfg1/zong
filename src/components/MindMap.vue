<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, onUnmounted } from 'vue'
import { supabase } from '../supabase'
import * as XLSX from 'xlsx'

const props = defineProps<{
  user?: any
}>()

const emit = defineEmits<{
  logout: []
  goProfile: []
}>()

interface Node {
  id: string
  text: string
  x: number
  y: number
  children: Node[]
  color: string
}

const container = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const selectedNode = ref<Node | null>(null)
const editingNode = ref<Node | null>(null)
const editInput = ref<HTMLTextAreaElement | null>(null)
const searchQuery = ref('')
const searchResults = ref<Node[]>([])
const currentSearchIndex = ref(-1)
const editMode = ref(false)
const isNodeDragging = ref(false)
const draggedNode = ref<Node | null>(null)
const dragOverNode = ref<Node | null>(null)
const showSidebar = ref(true)
const isAdmin = ref(false)
const adminPhone = '16683122850'

const checkAdmin = (phone: string) => {
  if (phone === adminPhone) {
    isAdmin.value = true
    localStorage.setItem('mindmap_admin', 'true')
  } else {
    isAdmin.value = false
  }
}

const handleAdminToggle = async () => {
  try {
    await supabase.auth.signOut()
    isAdmin.value = false
    localStorage.removeItem('mindmap_admin')
    emit('logout')
  } catch (error) {
    console.error('退出登录失败:', error)
    alert('退出登录失败')
  }
}

onMounted(async () => {
  if (window.innerWidth <= 768) {
    showSidebar.value = false
  }
  
  if (props.user) {
    const phone = props.user.email?.replace('@example.com', '')
    if (phone === adminPhone) {
      isAdmin.value = true
      localStorage.setItem('mindmap_admin', 'true')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('user_profiles').upsert({
          id: user.id,
          phone: phone,
          role: 'admin'
        })
      }
    }
  }
  
  await loadFromDatabase()
})

const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const scrollStart = reactive({ left: 0, top: 0 })

const scale = ref(1)
const targetScale = ref(1)
const minScale = 0.25
const maxScale = 2
let animationFrameId: number | null = null

const touchStartDist = ref(0)
const touchStartScale = ref(1)
const isPinching = ref(false)

const smoothScale = () => {
  const diff = targetScale.value - scale.value
  if (Math.abs(diff) < 0.001) {
    scale.value = targetScale.value
    animationFrameId = null
    return
  }
  scale.value += diff * 0.2
  animationFrameId = requestAnimationFrame(smoothScale)
}

const colors: readonly string[] = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316', 
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6'
] as const

const defaultColor = '#6366f1'

const getColor = (index: number): string => {
  const color = colors[index]
  return color !== undefined ? color : defaultColor
}

const getRandomColor = (): string => {
  const index = Math.floor(Math.random() * colors.length)
  const color = colors[index]
  return color !== undefined ? color : defaultColor
}

const root = ref<Node>({
  id: 'root',
  text: '新思维导图',
  x: 0,
  y: 0,
  color: getColor(0),
  children: []
})

const NODE_PADDING = ref(4)
const MIN_NODE_WIDTH = ref(50)
const MIN_NODE_HEIGHT = ref(100)
const VERTICAL_SPACING = ref(130)
const HORIZONTAL_SPACING = ref(20)

const getAllNodes = (node: Node): Node[] => {
  let result: Node[] = [node]
  node.children.forEach(child => {
    result = result.concat(getAllNodes(child))
  })
  return result
}

const getNodeWidth = (node: Node): number => {
  const textWidth = Math.max(node.text.length * 6, MIN_NODE_WIDTH.value)
  return textWidth + NODE_PADDING.value * 2
}

const getSubtreeWidth = (node: Node): number => {
  if (node.children.length === 0) {
    return getNodeWidth(node)
  }
  const totalWidth = node.children.reduce((sum, child) => {
    return sum + getSubtreeWidth(child)
  }, 0)
  const gaps = node.children.length - 1
  return totalWidth + gaps * HORIZONTAL_SPACING.value
}

const layoutTree = (node: Node, x: number, y: number) => {
  const nodeWidth = getNodeWidth(node)
  node.x = x - nodeWidth / 2
  node.y = y
  
  if (node.children.length === 0) {
    return
  }
  
  let currentX = x - getSubtreeWidth(node) / 2
  
  node.children.forEach(child => {
    const subtreeWidth = getSubtreeWidth(child)
    const childX = currentX + subtreeWidth / 2
    layoutTree(child, childX, y + VERTICAL_SPACING.value)
    currentX += subtreeWidth + HORIZONTAL_SPACING.value
  })
}

const handleNodeClick = (node: Node, event: MouseEvent) => {
  event.stopPropagation()
  selectedNode.value = node
}

const handleNodeDoubleClick = (node: Node, event: MouseEvent) => {
  event.stopPropagation()
  editingNode.value = node
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

const finishEditing = () => {
  editingNode.value = null
}

const handleEditLineBreak = () => {
  if (editingNode.value && editInput.value) {
    const textarea = editInput.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = editingNode.value.text
    editingNode.value.text = text.substring(0, start) + '\n' + text.substring(end)
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1
    })
  }
}

const addChildNode = () => {
  if (!selectedNode.value) {
    selectedNode.value = root.value
  }
  
  const newId = `node-${Date.now()}`
  const newNode: Node = {
    id: newId,
    text: '新部门',
    x: 0,
    y: 0,
    color: getRandomColor(),
    children: []
  }
  
  selectedNode.value.children.push(newNode)
  selectedNode.value = newNode
  updateLayout()
}

const addParentNode = () => {
  if (!selectedNode.value) {
    selectedNode.value = root.value
  }
  
  const newId = `node-${Date.now()}`
  const newNode: Node = {
    id: newId,
    text: '新父节点',
    x: 0,
    y: 0,
    color: getRandomColor(),
    children: []
  }
  
  if (selectedNode.value.id === root.value.id) {
    newNode.children.push({ ...root.value })
    Object.assign(root.value, newNode)
    root.value.id = newId
  } else {
    const findAndReplace = (parent: Node): boolean => {
      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i]
        if (child && child.id === selectedNode.value?.id) {
          parent.children.splice(i, 1, newNode)
          newNode.children.push(child)
          return true
        }
        if (child && findAndReplace(child)) {
          return true
        }
      }
      return false
    }
    findAndReplace(root.value)
  }
  
  selectedNode.value = newNode
  updateLayout()
}

const importFromExcel = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        alert('Excel 文件没有工作表')
        return
      }
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        alert('无法读取工作表内容')
        return
      }
      
      const range = XLSX.utils.decode_range(worksheet['!ref'] || '')
      const rows: string[][] = []
      
      for (let row = range.s.r; row <= range.e.r; row++) {
        const rowData: string[] = []
        let hasNonEmpty = false
        
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
          const value = cell ? cell.v : ''
          const trimmed = String(value || '').trim()
          rowData.push(trimmed)
          if (trimmed) hasNonEmpty = true
        }
        
        if (hasNonEmpty) {
          rows.push(rowData)
        }
      }
      
      if (!rows || rows.length === 0) {
        alert('Excel 文件为空或格式不正确')
        return
      }
      
      const nodeMap = new Map<string, Node>()
      const rootNode: Node = {
        id: 'root',
        text: '祖源',
        x: 0,
        y: 0,
        color: getColor(0),
        children: []
      }
      nodeMap.set('祖源', rootNode)
      
      let prevLevelNodes: Node[] = []
      
      for (let i = 0; i < rows.length; i++) {
        const currentRow = rows[i]
        if (!currentRow) continue
        const currentLevelNodes: Node[] = []
        
        for (let j = 0; j < currentRow.length; j++) {
          const name = currentRow[j]
          if (!name || !name.trim()) {
            currentLevelNodes.push(null as any)
            continue
          }
          
          const node: Node = {
            id: `node-${Date.now()}-${name}-${j}-${i}`,
            text: name,
            x: 0,
            y: 0,
            color: getRandomColor(),
            children: []
          }
          nodeMap.set(name, node)
          currentLevelNodes.push(node)
          
          if (i === 0) {
            rootNode.children.push(node)
          } else {
            let parentNode: Node = rootNode
            
            let searchIndex = j
            while (searchIndex >= 0) {
              const foundNode = prevLevelNodes[searchIndex]
              if (foundNode) {
                parentNode = foundNode
                break
              }
              searchIndex--
            }
            
            parentNode.children.push(node)
          }
        }
        
        prevLevelNodes = currentLevelNodes
      }
      
      Object.assign(root.value, rootNode)
      selectedNode.value = root.value
      updateLayout()
      alert('Excel 数据导入成功！')
    } catch (error: any) {
      console.error('导入失败:', error)
      alert('导入失败: ' + (error.message || '未知错误'))
    }
  }
  input.click()
}

const deleteNode = () => {
  if (!selectedNode.value || selectedNode.value.id === 'root') return
  
  const findParent = (parent: Node, targetId: string): Node | null => {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i]
      if (child && child.id === targetId) {
        parent.children.splice(i, 1)
        return parent
      }
      if (child) {
        const found = findParent(child, targetId)
        if (found) return found
      }
    }
    return null
  }
  
  findParent(root.value, selectedNode.value.id)
  selectedNode.value = root.value
  updateLayout()
}

const getNodePath = (targetNode: Node | null): Node[] => {
  if (!targetNode) return []
  
  const path: Node[] = []
  const findPath = (parent: Node, targetId: string): boolean => {
    if (parent.id === targetId) {
      path.unshift(parent)
      return true
    }
    for (const child of parent.children) {
      if (findPath(child, targetId)) {
        path.unshift(parent)
        return true
      }
    }
    return false
  }
  
  findPath(root.value, targetNode.id)
  return path
}

const searchNodes = (query: string): Node[] => {
  const results: Node[] = []
  const search = (node: Node) => {
    if (node.text.toLowerCase().includes(query.toLowerCase())) {
      results.push(node)
    }
    node.children.forEach(child => search(child))
  }
  search(root.value)
  return results
}

const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    currentSearchIndex.value = -1
    return
  }
  searchResults.value = searchNodes(searchQuery.value)
  currentSearchIndex.value = 0
  if (searchResults.value.length > 0) {
    const firstResult = searchResults.value[0]
    if (firstResult) selectAndScrollToNode(firstResult)
  }
}

const selectAndScrollToNode = (node: Node) => {
  selectedNode.value = node
  nextTick(() => {
    const containerEl = container.value
    if (containerEl) {
      const containerRect = containerEl.getBoundingClientRect()
      const nodeWidth = getNodeWidth(node)
      
      const scaledNodeX = node.x * scale.value
      const scaledNodeWidth = nodeWidth * scale.value
      const scaledNodeY = node.y * scale.value
      
      const targetScrollLeft = scaledNodeX - containerRect.width / 2 + scaledNodeWidth / 2
      const targetScrollTop = scaledNodeY - containerRect.height / 2 + MIN_NODE_HEIGHT.value * scale.value / 2
      
      containerEl.scrollTo({
        left: Math.max(0, targetScrollLeft),
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      })
    }
  })
}

const nextSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length
  const nextResult = searchResults.value[currentSearchIndex.value]
  if (nextResult) selectAndScrollToNode(nextResult)
}

const prevSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value - 1 + searchResults.value.length) % searchResults.value.length
  const prevResult = searchResults.value[currentSearchIndex.value]
  if (prevResult) selectAndScrollToNode(prevResult)
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  currentSearchIndex.value = -1
}

const removeNodeFromParent = (parent: Node, nodeId: string): boolean => {
  const index = parent.children.findIndex(child => child.id === nodeId)
  if (index !== -1) {
    parent.children.splice(index, 1)
    return true
  }
  for (const child of parent.children) {
    if (removeNodeFromParent(child, nodeId)) {
      return true
    }
  }
  return false
}

const handleNodeDragStart = (node: Node, event: MouseEvent) => {
  if (!editMode.value || node.id === 'root') return
  event.stopPropagation()
  isNodeDragging.value = true
  draggedNode.value = node
  dragOverNode.value = null
}

const handleNodeDragOver = (node: Node, event: MouseEvent) => {
  if (!editMode.value || !isNodeDragging.value || !draggedNode.value) return
  event.preventDefault()
  event.stopPropagation()
  if (node.id !== draggedNode.value?.id) {
    dragOverNode.value = node
  }
}

const handleNodeDragLeave = (node: Node, event: MouseEvent) => {
  if (!editMode.value) return
  if (dragOverNode.value?.id === node.id) {
    dragOverNode.value = null
  }
}

const handleNodeDrop = (node: Node, event: MouseEvent) => {
  if (!editMode.value || !isNodeDragging.value || !draggedNode.value) return
  event.preventDefault()
  event.stopPropagation()
  
  if (node.id !== draggedNode.value.id) {
    const isDescendant = (parent: Node, targetId: string): boolean => {
      if (parent.id === targetId) return true
      for (const child of parent.children) {
        if (isDescendant(child, targetId)) return true
      }
      return false
    }
    if (isDescendant(draggedNode.value, node.id)) {
      alert('不能将节点拖到自己的子节点中')
    } else {
      removeNodeFromParent(root.value, draggedNode.value.id)
      node.children.push(draggedNode.value)
      updateLayout()
    }
  }
  
  isNodeDragging.value = false
  draggedNode.value = null
  dragOverNode.value = null
}

const handleDragEnd = () => {
  isNodeDragging.value = false
  draggedNode.value = null
  dragOverNode.value = null
}

const DEFAULT_MAP_NAME = '组织结构图'

const saveToDatabase = async () => {
  const mapName = DEFAULT_MAP_NAME
  
  try {
    const { data, error } = await supabase
      .from('mindmaps')
      .upsert({
        id: mapName.toLowerCase().replace(/\s+/g, '-'),
        data: JSON.stringify(root.value),
        title: mapName,
        user_id: props.user?.id,
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('保存失败:', error)
      alert('保存失败: ' + error.message)
    } else {
      alert('保存成功！')
    }
  } catch (e: any) {
    console.error('保存异常:', e)
    alert('保存异常: ' + (e.message || '未知错误'))
  }
}

const loadFromDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('mindmaps')
      .select('id, title, data')
      .eq('id', DEFAULT_MAP_NAME.toLowerCase().replace(/\s+/g, '-'))
      .single()
    
    if (error || !data) {
      console.log('数据库中没有思维导图，使用默认数据')
      updateLayout()
      return
    }
    
    if (data && data.data) {
      const loadedData = JSON.parse(data.data)
      Object.assign(root.value, loadedData)
    }
    updateLayout()
  } catch (e: any) {
    console.error('加载异常:', e)
    updateLayout()
  }
}

interface Connection {
  path: string
}

const connections = ref<Connection[]>([])

const generateConnections = (node: Node): Connection[] => {
  const result: Connection[] = []
  
  if (node.children.length > 0) {
    const nodeWidth = getNodeWidth(node)
    const startX = node.x + nodeWidth / 2
    const startY = node.y + MIN_NODE_HEIGHT.value
    const lineLength = 15
    const yLine = startY + lineLength
    
    if (node.children.length === 1) {
      const child = node.children[0]
      if (child) {
        const childWidth = getNodeWidth(child)
        const childX = child.x + childWidth / 2
        const childY = child.y

        const path = `M ${startX} ${startY} L ${startX} ${yLine} L ${childX} ${yLine} L ${childX} ${childY}`
        result.push({ path })
      }
    } else {
      const firstChild = node.children[0]
      const lastChild = node.children[node.children.length - 1]

      if (firstChild && lastChild) {
        const firstChildWidth = getNodeWidth(firstChild)
        const lastChildWidth = getNodeWidth(lastChild)
        const leftX = firstChild.x + firstChildWidth / 2
        const rightX = lastChild.x + lastChildWidth / 2

        const path1 = `M ${startX} ${startY} L ${startX} ${yLine}`
        result.push({ path: path1 })

        const path2 = `M ${startX} ${yLine} L ${leftX} ${yLine}`
        result.push({ path: path2 })

        const path3 = `M ${leftX} ${yLine} L ${rightX} ${yLine}`
        result.push({ path: path3 })

        node.children.forEach((child) => {
          if (child) {
            const childWidth = getNodeWidth(child)
            const childX = child.x + childWidth / 2
            const childY = child.y
            const path = `M ${childX} ${yLine} L ${childX} ${childY}`
            result.push({ path })
          }
        })
      }
    }
  }
  
  node.children.forEach(child => {
    if (child) {
      result.push(...generateConnections(child))
    }
  })
  
  return result
}

const svgWidth = ref(80000)
const svgHeight = ref(80000)

const updateLayout = () => {
  const containerWidth = container.value?.clientWidth || 1200
  
  const treeWidth = getSubtreeWidth(root.value)
  const startX = Math.max(containerWidth / 2, treeWidth / 2 + 50)
  
  layoutTree(root.value, startX, 60)
  connections.value = generateConnections(root.value)
  
  const allNodes = getAllNodes(root.value)
  let maxX = 0
  let maxY = 0
  allNodes.forEach(node => {
    maxX = Math.max(maxX, node.x + getNodeWidth(node))
    maxY = Math.max(maxY, node.y + MIN_NODE_HEIGHT.value)
  })
  
  svgWidth.value = Math.max(maxX + 500, 80000)
  svgHeight.value = Math.max(maxY + 500, 80000)
}

const handleMouseDown = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('.node')) {
    if (editMode.value) {
      document.addEventListener('mousemove', handleGlobalDragMove)
      document.addEventListener('mouseup', handleGlobalDragEnd)
    }
    return
  }
  
  if (!editMode.value) {
    isDragging.value = true
    dragStart.x = event.clientX
    dragStart.y = event.clientY
    scrollStart.left = container.value?.scrollLeft || 0
    scrollStart.top = container.value?.scrollTop || 0
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !container.value) return
  
  const deltaX = event.clientX - dragStart.x
  const deltaY = event.clientY - dragStart.y
  
  container.value.scrollLeft = scrollStart.left - deltaX
  container.value.scrollTop = scrollStart.top - deltaY
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

const handleGlobalDragMove = (event: MouseEvent) => {
}

const handleGlobalDragEnd = () => {
  handleDragEnd()
  document.removeEventListener('mousemove', handleGlobalDragMove)
  document.removeEventListener('mouseup', handleGlobalDragEnd)
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const containerEl = container.value
  if (!containerEl) return
  
  const rect = containerEl.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const zoomSpeed = 0.0015
  const delta = event.deltaY * zoomSpeed
  const newScale = Math.max(minScale, Math.min(maxScale, targetScale.value - delta))
  
  const scaleDelta = newScale / targetScale.value
  
  const newScrollLeft = mouseX - (mouseX - containerEl.scrollLeft) * scaleDelta
  const newScrollTop = mouseY - (mouseY - containerEl.scrollTop) * scaleDelta
  
  targetScale.value = newScale
  containerEl.scrollLeft = newScrollLeft
  containerEl.scrollTop = newScrollTop
  
  if (!animationFrameId) {
    smoothScale()
  }
}

const resetView = () => {
  targetScale.value = 1
  if (!animationFrameId) {
    smoothScale()
  }
  if (container.value) {
    container.value.scrollLeft = 0
    container.value.scrollTop = 0
  }
}

const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
  const dx = touch2.clientX - touch1.clientX
  const dy = touch2.clientY - touch1.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 2) {
    isPinching.value = true
    const touch1 = event.touches[0] as Touch
    const touch2 = event.touches[1] as Touch
    touchStartDist.value = getTouchDistance(touch1, touch2)
    touchStartScale.value = targetScale.value
  }
}

const handleTouchMove = (event: TouchEvent) => {
  if (event.touches.length === 2 && isPinching.value) {
    event.preventDefault()
    
    const containerEl = container.value
    if (!containerEl) return
    
    const touch1 = event.touches[0] as Touch
    const touch2 = event.touches[1] as Touch
    const currentDist = getTouchDistance(touch1, touch2)
    const scaleDelta = currentDist / touchStartDist.value
    const newScale = Math.max(minScale, Math.min(maxScale, touchStartScale.value * scaleDelta))
    
    const rect = containerEl.getBoundingClientRect()
    const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left
    const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top
    
    const scrollDelta = newScale / targetScale.value
    const newScrollLeft = centerX - (centerX - containerEl.scrollLeft) * scrollDelta
    const newScrollTop = centerY - (centerY - containerEl.scrollTop) * scrollDelta
    
    targetScale.value = newScale
    scale.value = newScale
    containerEl.scrollLeft = newScrollLeft
    containerEl.scrollTop = newScrollTop
  }
}

const handleTouchEnd = (event: TouchEvent) => {
  if (event.touches.length < 2) {
    isPinching.value = false
  }
}

onMounted(async () => {
  nextTick(() => {
    window.addEventListener('resize', updateLayout)
  })
  
  await loadFromDatabase()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="org-chart-container">
    <div class="sidebar" :class="{ show: showSidebar }">
      <div class="sidebar-header">
        <h3>节点路径</h3>
        <button class="sidebar-close" @click="showSidebar = false">×</button>
      </div>
      <div class="sidebar-content">
        <div v-if="selectedNode" class="node-path">
          <div 
            v-for="node in getNodePath(selectedNode)" 
            :key="node.id"
            class="path-item"
          >
            <span class="path-node">{{ node.text }}</span>
          </div>
        </div>
        <div v-else class="no-selection">
          请点击一个节点查看路径
        </div>
      </div>
    </div>
    <button class="sidebar-toggle" @click="showSidebar = !showSidebar">
      {{ showSidebar ? '隐藏' : '菜单' }}
    </button>
    
    <div class="main-content">
      <div class="toolbar">
      <button 
        v-if="isAdmin" 
        class="btn btn-primary" 
        @click="addChildNode"
      >
        + 添加子节点
      </button>
      <button 
        v-if="isAdmin" 
        class="btn btn-secondary" 
        @click="addParentNode"
      >
        + 添加父节点
      </button>
      <button 
        v-if="isAdmin"
        class="btn btn-danger" 
        @click="deleteNode"
        :disabled="!selectedNode || selectedNode.id === 'root'"
      >
        删除节点
      </button>
      
      <button 
        v-if="isAdmin" 
        class="btn btn-success" 
        @click="saveToDatabase"
      >
        保存到数据库
      </button>
      <button class="btn btn-info" @click="loadFromDatabase">
        从数据库加载
      </button>
      <button 
        v-if="isAdmin" 
        class="btn btn-warning" 
        @click="importFromExcel"
      >
        导入 Excel
      </button>
      <button 
        v-if="isAdmin"
        class="btn" 
        :class="editMode ? 'btn-success' : 'btn-secondary'"
        @click="editMode = !editMode"
      >
        {{ editMode ? '退出编辑模式' : '编辑模式' }}
      </button>
      
      <button 
        class="btn btn-outline" 
        @click="$emit('goProfile')"
      >
        个人中心
      </button>
      <div class="user-info">
        <span class="user-label">当前账号:</span>
        <span class="user-phone">{{ props.user?.email?.replace('@example.com', '') || '未知' }}</span>
        <span v-if="isAdmin" class="admin-badge">管理员</span>
      </div>
      
      <div class="search-container">
        <div class="search-wrapper">
          <input 
            type="text" 
            v-model="searchQuery" 
            class="search-input"
            placeholder="搜索节点..."
            @input="handleSearch"
            @keydown.enter="nextSearchResult"
            @keydown.arrowdown.prevent="nextSearchResult"
            @keydown.arrowup.prevent="prevSearchResult"
            @keydown.escape="clearSearch"
          />
          <button 
            v-if="searchQuery" 
            class="search-clear-btn" 
            @click="clearSearch"
          >
            ×
          </button>
        </div>
        <div v-if="searchResults.length > 0" class="search-results-info">
          <span>找到 {{ searchResults.length }} 个结果</span>
          <span v-if="searchResults.length > 1" class="search-nav">
            <button class="nav-btn" @click="prevSearchResult">←</button>
            <span>{{ currentSearchIndex + 1 }}/{{ searchResults.length }}</span>
            <button class="nav-btn" @click="nextSearchResult">→</button>
          </span>
        </div>
      </div>
      
      <div v-if="isAdmin" class="spacing-control">
        <div class="spacing-item">
          <label>水平间距</label>
          <input 
            type="range" 
            v-model.number="HORIZONTAL_SPACING" 
            min="20" 
            max="200" 
            @change="updateLayout"
          />
          <span>{{ HORIZONTAL_SPACING }}px</span>
        </div>
        <div class="spacing-item">
          <label>垂直间距</label>
          <input 
            type="range" 
            v-model.number="VERTICAL_SPACING" 
            min="50" 
            max="300" 
            @change="updateLayout"
          />
          <span>{{ VERTICAL_SPACING }}px</span>
        </div>
      </div>
      
      <div class="scale-control">
        <button class="btn btn-secondary" @click="resetView">
          重置视图
        </button>
        <span class="scale-display">{{ Math.round(scale * 100) }}%</span>
      </div>
      
      <div class="user-info">
        <span class="user-email">{{ props.user?.email }}</span>
        <button class="btn btn-outline" @click="emit('logout')">
          登出
        </button>
      </div>
    </div>
    
    <div 
      ref="container"
      class="org-chart"
      :class="{ dragging: isDragging }"
      @click="selectedNode = null"
      @mousedown="handleMouseDown"
      @wheel="handleWheel"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div 
        ref="content" 
        class="chart-content"
        :style="{ transform: `scale(${scale})`, transformOrigin: '0 0' }"
      >
        <svg 
          class="connections"
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          preserveAspectRatio="none"
          :style="{ width: svgWidth + 'px', height: svgHeight + 'px' }"
        >
          <path
            v-for="(conn, index) in connections"
            :key="index"
            :d="conn.path"
            stroke="#1e293b"
            stroke-width="2"
            fill="none"
          />
        </svg>
        
        <template v-for="node in getAllNodes(root)" :key="node.id">
          <div
            class="node"
            :class="{ 
              selected: selectedNode?.id === node.id,
              editing: editingNode?.id === node.id,
              'search-match': searchResults.some(n => n.id === node.id),
              'edit-mode': editMode,
              'dragging': isNodeDragging && draggedNode?.id === node.id,
              'drag-over': dragOverNode?.id === node.id
            }"
            :data-node-id="node.id"
            :style="{
              left: node.x + 'px',
              top: node.y + 'px',
              width: getNodeWidth(node) + 'px',
              '--node-color': node.color
            }"
            @click="handleNodeClick(node, $event)"
            @dblclick="handleNodeDoubleClick(node, $event)"
            @mousedown="handleNodeDragStart(node, $event)"
            @mousemove="handleNodeDragOver(node, $event)"
            @mouseleave="handleNodeDragLeave(node, $event)"
            @mouseup="handleNodeDrop(node, $event)"
          >
            <textarea
              v-if="editingNode?.id === node.id"
              ref="editInput"
              v-model="node.text"
              class="edit-input"
              @blur="finishEditing"
              @keydown.enter.exact="finishEditing"
              @keydown.ctrl.enter="handleEditLineBreak"
              @keydown.escape="finishEditing"
            ></textarea>
            <span v-else class="node-text">{{ node.text }}</span>
          </div>
        </template>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.org-chart-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: relative;
  overflow: hidden;
}

.sidebar {
  width: 80px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.sidebar-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
  display: none;
}

@media (max-width: 768px) {
  .sidebar-close {
    display: block;
  }
  
  .sidebar-toggle {
    display: flex;
  }
}

@media (min-width: 769px) {
  .sidebar-toggle {
    display: none;
  }
}

.sidebar-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.node-path {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-item {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.path-node {
  font-size: 12px;
  color: #334155;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 4px 6px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  white-space: pre-wrap;
  word-break: break-word;
  text-align: center;
}

.no-selection {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 14px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 80px;
}

.toolbar {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  align-items: center;
}

.spacing-control {
  display: flex;
  gap: 20px;
  padding: 0 20px;
  border-left: 1px solid #e2e8f0;
}

.spacing-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spacing-item label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.spacing-item input[type="range"] {
  width: 120px;
  height: 6px;
  cursor: pointer;
}

.spacing-item span {
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
}

.scale-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.scale-display {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  min-width: 50px;
  text-align: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
}

.btn-success:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.btn-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-warning:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.btn-info:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding-left: 16px;
  border-left: 1px solid #e2e8f0;
}

.user-label {
  font-size: 13px;
  color: #94a3b8;
}

.user-phone {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.admin-badge {
  padding: 2px 8px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 11px;
  border-radius: 10px;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 20px;
  border-left: 1px solid #e2e8f0;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 200px;
  padding: 10px 32px 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #f8fafc;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.search-clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  background: #cbd5e1;
  border-radius: 50%;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.search-clear-btn:hover {
  background: #94a3b8;
  color: white;
}

.search-results-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
}

.search-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.org-chart {
  flex: 1;
  position: relative;
  overflow: auto;
  cursor: grab;
}

.org-chart.dragging {
  cursor: grabbing;
}

.chart-content {
  min-width: 2000px;
  min-height: 2000px;
  position: relative;
  transition: transform 0.1s ease-out;
}

.connections {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
  width: 100%;
  height: 100%;
}

.node {
  position: absolute;
  min-width: 50px;
  min-height: 100px;
  max-width: 100px;
  max-height: 100px;
  padding: 2px 4px;
  background: white;
  border-radius: 8px;
  border: 2px solid #1e293b;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 1;
  box-sizing: border-box;
}

.node:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.node.search-match {
  animation: searchPulse 1.5s ease-in-out infinite;
  border-color: #f59e0b;
}

@keyframes searchPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
  }
}

.node.selected {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
  border-color: #6366f1;
}

.node.editing {
  cursor: text;
}

.node.edit-mode {
  cursor: grab;
}

.node.edit-mode:active {
  cursor: grabbing;
}

.node.dragging {
  opacity: 0.5;
  transform: scale(1.1);
  z-index: 1000;
}

.node.drag-over {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3) !important;
  background-color: #f0fdf4 !important;
}

.node-text {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: pre-wrap;
  word-break: break-word;
}

.edit-input {
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: pre-wrap;
  word-break: break-word;
  resize: none;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 1000;
  }
  
  .sidebar.show {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0 !important;
    width: 100%;
  }
  
  .toolbar {
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 8px;
  }
  
  .btn {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .search-container {
    order: -1;
    width: 100%;
    border-left: none;
    padding: 0;
  }
  
  .search-input {
    width: 100%;
    max-width: 100%;
  }
  
  .spacing-control {
    display: none;
  }
  
  .scale-control {
    margin-left: 0;
  }
  
  .user-info {
    border-left: none;
    padding-left: 0;
  }
  
  .sidebar-toggle {
    display: flex;
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 0 8px 8px 0;
    padding: 12px 8px;
    cursor: pointer;
    z-index: 999;
    font-size: 16px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
}
</style>