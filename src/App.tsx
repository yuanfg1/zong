import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ReactFlow, { Controls, Background, MiniMap, addEdge, removeElements, updateEdge, ConnectionLineType, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
// 导入markmap-autoloader
import 'markmap-autoloader';

// 类型定义
interface User {
  id: string;
  username: string;
  password: string;
  isAdmin?: boolean;
}

interface MarkerData {
  id: string;
  position: [number, number];
  title: string;
  description: string;
  userId: string;
}

interface MindMapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string };
}

interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style: { stroke: string };
  label?: string;
}

// 自定义竖排节点组件
const VerticalNode = ({ data, isConnectable, id, onNodesChange }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(data.label);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onNodesChange) {
      onNodesChange([{
        id,
        type: 'update',
        changes: {
          data: {
            ...data,
            label: value
          }
        }
      }]);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setValue(data.label);
    }
  };

  return (
    <div 
      style={{
        width: '60px',
        height: '200px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        writingMode: 'vertical-rl',
        textOrientation: 'upright',
        textAlign: 'center',
        padding: '10px',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
      />
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyPress={handleKeyPress}
          autoFocus
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            textAlign: 'center',
            outline: 'none',
            width: '100%',
            height: '100%'
          }}
        />
      ) : (
        <>
          <div style={{ fontSize: '14px', flex: 1, display: 'flex', alignItems: 'center' }}>{data.label}</div>
          <button
            onClick={handleEditClick}
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '2px 8px',
              fontSize: '10px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            修改
          </button>
        </>
      )}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
      />
    </div>
  );
};

// 模拟数据库
let users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
let markers: MarkerData[] = JSON.parse(localStorage.getItem('markers') || '[]');

// 加载思维导图数据
const loadMindMapData = (): { nodes: MindMapNode[]; edges: MindMapEdge[] } => {
  const savedData = localStorage.getItem('mindMapData');
  if (savedData) {
    const data = JSON.parse(savedData);
    const updatedNodes = data.nodes.map((node: MindMapNode) => ({
      ...node,
      type: 'custom'
    }));
    return { nodes: updatedNodes, edges: data.edges };
  }
  // 默认思维导图数据
  return {
    nodes: [
      {
        id: '1',
        type: 'custom',
        position: { x: 250, y: 5 },
        data: { label: '中心主题' },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 100, y: 250 },
        data: { label: '分支1' },
      },
      {
        id: '3',
        type: 'custom',
        position: { x: 250, y: 250 },
        data: { label: '分支2' },
      },
      {
        id: '4',
        type: 'custom',
        position: { x: 400, y: 250 },
        data: { label: '分支3' },
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        animated: true,
        style: { stroke: '#000' },
      },
      {
        id: 'e1-3',
        source: '1',
        target: '3',
        animated: true,
        style: { stroke: '#000' },
      },
      {
        id: 'e1-4',
        source: '1',
        target: '4',
        animated: true,
        style: { stroke: '#000' },
      },
    ],
  };
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showMarkerForm, setShowMarkerForm] = useState<boolean>(false);
  const [newMarker, setNewMarker] = useState<{
    position: [number, number];
    title: string;
    description: string;
  }>({
    position: [39.9042, 116.4074], // 默认北京
    title: '',
    description: '',
  });
  
  // 思维导图状态
  const [showMindMap, setShowMindMap] = useState<boolean>(false);
  const [showMarkMap, setShowMarkMap] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [nodes, setNodes] = useState<MindMapNode[]>(loadMindMapData().nodes);
  const [edges, setEdges] = useState<MindMapEdge[]>(loadMindMapData().edges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const markmapRef = useRef<HTMLDivElement>(null);

  // 检查用户登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  }, []);

  // 保存思维导图数据到本地存储
  useEffect(() => {
    // 确保所有节点都使用custom类型
    const updatedNodes = nodes.map((node: MindMapNode) => ({
      ...node,
      type: 'custom'
    }));
    localStorage.setItem('mindMapData', JSON.stringify({ nodes: updatedNodes, edges }));
  }, [nodes, edges]);

  // 处理节点和边的变化
  const onNodesChange = (changes: any) => {
    // 处理节点选择
    changes.forEach((change: any) => {
      if (change.type === 'select') {
        setSelectedNodeId(change.id);
      }
    });

    // 检查是否有删除节点的操作
    const removeChanges = changes.filter((change: any) => change.type === 'remove');
    const hasRemoveOperation = removeChanges.length > 0;

    // 首先更新节点列表
    const updatedNodes = changes.reduce((acc: any, change: any) => {
      if (change.type === 'remove') {
        if (change.id === selectedNodeId) {
          setSelectedNodeId(null);
        }
        return acc.filter((node: any) => node.id !== change.id);
      } else if (change.type === 'update') {
        return acc.map((node: any) => {
          if (node.id === change.id) {
            // 正确处理节点数据更新
            if (change.changes.data) {
              return {
                ...node,
                data: {
                  ...node.data,
                  ...change.changes.data
                }
              };
            }
            return { ...node, ...change.changes };
          }
          return node;
        });
      }
      return acc;
    }, nodes);

    // 如果有删除操作，更新边列表并调整节点位置
    if (hasRemoveOperation) {
      // 更新边列表，删除与被删除节点相关的边
      const updatedEdges = edges.filter(edge => {
        return !removeChanges.some((change: any) => 
          change.id === edge.source || change.id === edge.target
        );
      });

      // 找到被删除节点的父节点
      const removedNodeIds = removeChanges.map((change: any) => change.id);
      const parentEdges = edges.filter(edge => 
        removedNodeIds.includes(edge.target)
      );

      // 对每个父节点，调整其子节点的位置
      let finalNodes = updatedNodes;
      parentEdges.forEach(edge => {
        const parentNode = finalNodes.find((node: any) => node.id === edge.source);
        if (parentNode) {
          finalNodes = adjustSiblingNodes(parentNode, finalNodes, updatedEdges);
        }
      });

      setNodes(finalNodes);
      setEdges(updatedEdges);
    } else {
      // 没有删除操作，直接更新节点列表
      setNodes(updatedNodes);
    }
  };

  const onEdgesChange = (changes: any) => {
    setEdges((eds) => changes.reduce((acc: any, change: any) => {
      if (change.type === 'remove') {
        return acc.filter((edge: any) => edge.id !== change.id);
      }
      return acc;
    }, eds));
  };

  // 删除连线
  const deleteEdge = (edgeId: string) => {
    setEdges((prevEdges) => prevEdges.filter(edge => edge.id !== edgeId));
  };

  const onConnect = (params: any) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#000' } }, eds));
  };

  // 重置思维导图
  const resetMindMap = () => {
    const defaultData = loadMindMapData();
    setNodes(defaultData.nodes);
    setEdges(defaultData.edges);
    setSelectedNodeId(null);
  };

  // 调整同级节点的位置
  const adjustSiblingNodes = (parentNode: MindMapNode, updatedNodes: MindMapNode[], updatedEdges: MindMapEdge[]) => {
    // 找到所有与新节点同级的节点（即拥有相同父节点的节点）
    const siblingEdges = updatedEdges.filter(edge => edge.source === parentNode.id);
    const siblingNodeIds = siblingEdges.map(edge => edge.target);
    
    // 计算新的位置，确保节点之间有足够的间距
    const totalNodes = siblingNodeIds.length;
    // 根据子节点数量动态调整节点宽度，避免交叉
    const baseNodeWidth = 80;
    const nodeWidth = totalNodes > 3 ? baseNodeWidth + (totalNodes - 3) * 20 : baseNodeWidth;
    const startX = parentNode.position.x - ((totalNodes - 1) * nodeWidth) / 2;

    // 调整所有同级节点的位置
    let adjustedNodes = updatedNodes.map(node => {
      if (siblingNodeIds.includes(node.id)) {
        const index = siblingNodeIds.indexOf(node.id);
        return {
          ...node,
          position: {
            ...node.position,
            x: startX + (index * nodeWidth),
            y: parentNode.position.y + 250
          }
        };
      }
      return node;
    });

    // 处理同一行不同父节点的子节点，避免重叠
    const currentY = parentNode.position.y + 250;
    const sameRowNodes = adjustedNodes.filter(node => Math.abs(node.position.y - currentY) < 50);
    
    if (sameRowNodes.length > 0) {
      // 按x坐标排序
      sameRowNodes.sort((a, b) => a.position.x - b.position.x);
      
      // 检查并调整重叠的节点
      for (let i = 0; i < sameRowNodes.length - 1; i++) {
        const currentNode = sameRowNodes[i];
        const nextNode = sameRowNodes[i + 1];
        const currentRight = currentNode.position.x + 60; // 节点宽度
        const nextLeft = nextNode.position.x;
        
        // 如果节点重叠，调整位置
        if (currentRight > nextLeft) {
          const overlap = currentRight - nextLeft;
          const adjustAmount = overlap + 20; // 20px的间距
          
          // 调整当前节点后面的所有节点
          adjustedNodes = adjustedNodes.map(node => {
            if (node.position.x >= nextNode.position.x && Math.abs(node.position.y - currentY) < 50) {
              return {
                ...node,
                position: {
                  ...node.position,
                  x: node.position.x + adjustAmount
                }
              };
            }
            return node;
          });
        }
      }
    }

    // 当子节点出现交叉时，调整父节点的位置
    const parentParentEdge = updatedEdges.find(edge => edge.target === parentNode.id);
    if (parentParentEdge) {
      const parentParentNode = adjustedNodes.find(node => node.id === parentParentEdge.source);
      if (parentParentNode) {
        // 找到父节点的所有同级节点
        const parentSiblingEdges = updatedEdges.filter(edge => edge.source === parentParentNode.id);
        const parentSiblingNodeIds = parentSiblingEdges.map(edge => edge.target);
        
        // 按x坐标排序父节点的同级节点
        const parentSiblings = adjustedNodes.filter(node => parentSiblingNodeIds.includes(node.id));
        parentSiblings.sort((a, b) => a.position.x - b.position.x);
        
        // 检查父节点的子节点是否与其他父节点的子节点交叉
        for (let i = 0; i < parentSiblings.length; i++) {
          const currentParent = parentSiblings[i];
          const currentParentEdges = updatedEdges.filter(edge => edge.source === currentParent.id);
          const currentParentChildIds = currentParentEdges.map(edge => edge.target);
          const currentParentChildren = adjustedNodes.filter(node => currentParentChildIds.includes(node.id));
          
          // 检查当前父节点的子节点是否与其他父节点的子节点交叉
          for (let j = 0; j < parentSiblings.length; j++) {
            if (i !== j) {
              const otherParent = parentSiblings[j];
              const otherParentEdges = updatedEdges.filter(edge => edge.source === otherParent.id);
              const otherParentChildIds = otherParentEdges.map(edge => edge.target);
              const otherParentChildren = adjustedNodes.filter(node => otherParentChildIds.includes(node.id));
              
              // 检查是否有交叉
              currentParentChildren.forEach(currentChild => {
                otherParentChildren.forEach(otherChild => {
                  const currentChildLeft = currentChild.position.x;
                  const currentChildRight = currentChild.position.x + 60;
                  const otherChildLeft = otherChild.position.x;
                  const otherChildRight = otherChild.position.x + 60;
                  
                  // 检查是否交叉
                  if (currentChildRight > otherChildLeft && currentChildLeft < otherChildRight) {
                    // 计算需要调整的距离
                    let adjustAmount = 0;
                    if (currentParent.position.x < otherParent.position.x) {
                      // 当前父节点在左侧，向右调整
                      adjustAmount = otherChildRight - currentChildLeft + 20;
                      // 调整当前父节点及其所有子节点
                      adjustedNodes = adjustedNodes.map(node => {
                        if (node.id === currentParent.id || currentParentChildIds.includes(node.id)) {
                          return {
                            ...node,
                            position: {
                              ...node.position,
                              x: node.position.x + adjustAmount
                            }
                          };
                        }
                        return node;
                      });
                    } else {
                      // 当前父节点在右侧，向左调整
                      adjustAmount = currentChildRight - otherChildLeft + 20;
                      // 调整当前父节点及其所有子节点
                      adjustedNodes = adjustedNodes.map(node => {
                        if (node.id === currentParent.id || currentParentChildIds.includes(node.id)) {
                          return {
                            ...node,
                            position: {
                              ...node.position,
                              x: node.position.x - adjustAmount
                            }
                          };
                        }
                        return node;
                      });
                    }
                  }
                });
              });
            }
          }
        }
      }
    }

    // 当子节点过多时，调整父节点与其他节点的间距
    if (totalNodes > 4) {
      // 找到父节点的同级节点
      const parentParentEdge = updatedEdges.find(edge => edge.target === parentNode.id);
      if (parentParentEdge) {
        const parentParentNode = adjustedNodes.find(node => node.id === parentParentEdge.source);
        if (parentParentNode) {
          // 找到父节点的所有同级节点
          const parentSiblingEdges = updatedEdges.filter(edge => edge.source === parentParentNode.id);
          const parentSiblingNodeIds = parentSiblingEdges.map(edge => edge.target);
          
          // 按x坐标排序父节点的同级节点
          const parentSiblings = adjustedNodes.filter(node => parentSiblingNodeIds.includes(node.id));
          parentSiblings.sort((a, b) => a.position.x - b.position.x);
          
          // 调整父节点的同级节点之间的间距
          for (let i = 0; i < parentSiblings.length - 1; i++) {
            const currentParent = parentSiblings[i];
            const nextParent = parentSiblings[i + 1];
            const currentRight = currentParent.position.x + 60; // 节点宽度
            const nextLeft = nextParent.position.x;
            
            // 为子节点留出足够的空间
            const minSpacing = totalNodes * 20 + 100; // 根据子节点数量动态调整间距
            if (nextLeft - currentRight < minSpacing) {
              const adjustAmount = minSpacing - (nextLeft - currentRight);
              
              // 调整当前父节点后面的所有节点
              adjustedNodes = adjustedNodes.map(node => {
                if (node.position.x >= nextParent.position.x) {
                  return {
                    ...node,
                    position: {
                      ...node.position,
                      x: node.position.x + adjustAmount
                    }
                  };
                }
                return node;
              });
            }
          }
        }
      }
    }

    // 递归调整下一行的子节点
    siblingNodeIds.forEach(siblingNodeId => {
      const siblingNode = adjustedNodes.find(node => node.id === siblingNodeId);
      if (siblingNode) {
        adjustedNodes = adjustSiblingNodes(siblingNode, adjustedNodes, updatedEdges);
      }
    });

    return adjustedNodes;
  };

  // 添加新节点（只有在选择了节点的情况下）
  const addNewNode = () => {
    if (!selectedNodeId) {
      alert('请先选择一个节点');
      return;
    }

    // 获取选中节点的位置
    const selectedNode = nodes.find(node => node.id === selectedNodeId);
    if (!selectedNode) return;

    // 计算新节点的位置
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: { 
        x: selectedNode.position.x,
        y: selectedNode.position.y + 250 
      },
      data: { label: '新节点' },
    };

    // 添加新节点
    const updatedNodes = [...nodes, newNode];

    // 创建新节点与选中节点的连接
    const newEdge: MindMapEdge = {
      id: `edge-${Date.now()}`,
      source: selectedNodeId,
      target: newNode.id,
      animated: true,
      style: { stroke: '#000' },
    };

    const updatedEdges = [...edges, newEdge];

    // 调整同级节点和下一行子节点的位置
    const adjustedNodes = adjustSiblingNodes(selectedNode, updatedNodes, updatedEdges);

    setNodes(adjustedNodes);
    setEdges(updatedEdges);
  };

  // 处理登录
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      alert('用户名或密码错误');
    }
  };

  // 处理注册
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.find(u => u.username === username)) {
      alert('用户名已存在');
      return;
    }
    
    // 第一个注册的用户自动成为管理员
    const isFirstUser = users.length === 0;
    
    const newUser: User = {
      id: Date.now().toString(),
      username,
      password,
      isAdmin: isFirstUser, // 第一个用户是管理员
    };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    if (isFirstUser) {
      alert('注册成功！您是第一个用户，已自动成为管理员。');
    }
  };

  // 处理登出
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  // 处理添加/修改标记
  const handleAddMarker = (position: [number, number]) => {
    if (!currentUser) return;
    
    // 检查用户是否已有标记
    const existingMarker = markers.find(m => m.userId === currentUser.id);
    if (existingMarker) {
      setNewMarker({
        position: existingMarker.position,
        title: existingMarker.title,
        description: existingMarker.description,
      });
    } else {
      setNewMarker({
        position,
        title: '',
        description: '',
      });
    }
    setShowMarkerForm(true);
  };

  // 保存标记
  const handleSaveMarker = () => {
    if (!currentUser) return;
    
    // 检查用户是否已有标记
    const existingMarkerIndex = markers.findIndex(m => m.userId === currentUser.id);
    
    if (existingMarkerIndex >= 0) {
      // 更新现有标记
      markers[existingMarkerIndex] = {
        ...markers[existingMarkerIndex],
        position: newMarker.position,
        title: newMarker.title,
        description: newMarker.description,
      };
    } else {
      // 创建新标记
      const marker: MarkerData = {
        id: Date.now().toString(),
        position: newMarker.position,
        title: newMarker.title,
        description: newMarker.description,
        userId: currentUser.id,
      };
      markers.push(marker);
    }
    
    localStorage.setItem('markers', JSON.stringify(markers));
    setShowMarkerForm(false);
    setNewMarker({
      position: [39.9042, 116.4074],
      title: '',
      description: '',
    });
  };

  // 删除标记
  const handleDeleteMarker = (markerId: string) => {
    if (!currentUser) return;
    
    // 管理员可以删除任何标记，普通用户只能删除自己的标记
    const marker = markers.find(m => m.id === markerId);
    if (!marker) return;
    
    if (currentUser.isAdmin || marker.userId === currentUser.id) {
      markers = markers.filter(m => m.id !== markerId);
      localStorage.setItem('markers', JSON.stringify(markers));
    } else {
      alert('您没有权限删除此标记');
    }
  };

  // 管理员删除用户（同时删除该用户的所有标记）
  const handleDeleteUser = (userId: string) => {
    if (!currentUser?.isAdmin) {
      alert('只有管理员可以删除用户');
      return;
    }
    
    if (userId === currentUser.id) {
      alert('不能删除自己');
      return;
    }
    
    // 删除用户
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('users', JSON.stringify(users));
    
    // 删除该用户的所有标记
    markers = markers.filter(m => m.userId !== userId);
    localStorage.setItem('markers', JSON.stringify(markers));
    
    alert('用户及其标记已删除');
  };

  // 获取当前位置的组件
  const CurrentLocation = () => {
    const map = useMap();
    const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);

    useEffect(() => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const pos: [number, number] = [latitude, longitude];
            setCurrentPosition(pos);
            map.setView(pos, 13);
          },
          (error) => {
            console.error('获取位置失败:', error);
          }
        );
      }
    }, [map]);

    return currentPosition ? (
      <Marker position={currentPosition} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/148/148836.png', iconSize: [25, 25] })}>
        <Popup>当前位置</Popup>
      </Marker>
    ) : null;
  };

  // 地图点击事件处理
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (isAuthenticated) {
          handleAddMarker([e.latlng.lat, e.latlng.lng]);
        }
      },
    });
    return null;
  };

  // 渲染登录/注册表单
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <h2>{isRegistering ? '注册' : '登录'}</h2>
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <button type="submit">{isRegistering ? '注册' : '登录'}</button>
          </div>
        </form>
        <div className="auth-toggle">
          {isRegistering ? (
            <>
              已有账号？ <a href="#" onClick={() => setIsRegistering(false)}>去登录</a>
            </>
          ) : (
            <>
              没有账号？ <a href="#" onClick={() => setIsRegistering(true)}>去注册</a>
            </>
          )}
        </div>
      </div>
    );
  }

  // 渲染地图或思维导图
  return (
    <div className="map-container">
      {/* 用户信息 */}
      <div className="user-info">
        <span>欢迎, {currentUser?.username} {currentUser?.isAdmin && '(管理员)'}</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ padding: '5px 10px', backgroundColor: (!showMindMap && !showMarkMap && !showAdminPanel) ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => { setShowMindMap(false); setShowMarkMap(false); setShowAdminPanel(false); }}
          >
            地图
          </button>
          <button 
            style={{ padding: '5px 10px', backgroundColor: showMindMap ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => { setShowMindMap(true); setShowMarkMap(false); setShowAdminPanel(false); }}
          >
            思维导图
          </button>
          <button 
            style={{ padding: '5px 10px', backgroundColor: showMarkMap ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => { setShowMindMap(false); setShowMarkMap(true); setShowAdminPanel(false); }}
          >
            MarkMap
          </button>
          {currentUser?.isAdmin && (
            <button 
              style={{ padding: '5px 10px', backgroundColor: showAdminPanel ? '#dc3545' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              onClick={() => { setShowMindMap(false); setShowMarkMap(false); setShowAdminPanel(true); }}
            >
              管理面板
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout}>退出</button>
        </div>
      </div>

      {/* 地图 */}
      {!showMindMap && (
        <>
          <MapContainer
            center={[39.9042, 116.4074]} // 北京
            zoom={13}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}&key=0a4ff19668c791c8e13f4b78c89fb59c"
              attribution='© 高德地图'
              subdomains={['1', '2', '3', '4']}
            />
            
            {/* 渲染所有标记 */}
            {markers.map((marker) => (
              <Marker key={marker.id} position={marker.position}>
                <Popup>
                  <h3>{marker.title}</h3>
                  <p>{marker.description}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    创建者: {users.find(u => u.id === marker.userId)?.username || '未知'}
                  </p>
                  {currentUser && (marker.userId === currentUser.id || currentUser.isAdmin) && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                      {marker.userId === currentUser.id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewMarker({
                              position: marker.position,
                              title: marker.title,
                              description: marker.description,
                            });
                            setShowMarkerForm(true);
                          }}
                          style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          编辑
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser.isAdmin && marker.userId !== currentUser.id) {
                            if (confirm('确定要删除此标记吗？')) {
                              handleDeleteMarker(marker.id);
                            }
                          } else {
                            handleDeleteMarker(marker.id);
                          }
                        }}
                        style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        {currentUser.isAdmin && marker.userId !== currentUser.id ? '管理员删除' : '删除'}
                      </button>
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}
            
            {/* 地图点击事件处理 */}
            <MapClickHandler />
            {/* 显示当前位置 */}
            <CurrentLocation />
          </MapContainer>

          {/* 标记表单 */}
          {showMarkerForm && (
            <div className="marker-form">
              <h3>添加标记</h3>
              <div className="form-group">
                <label htmlFor="title">标题</label>
                <input
                  type="text"
                  id="title"
                  value={newMarker.title}
                  onChange={(e) => setNewMarker({ ...newMarker, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">描述</label>
                <input
                  type="text"
                  id="description"
                  value={newMarker.description}
                  onChange={(e) => setNewMarker({ ...newMarker, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setShowMarkerForm(false)}>取消</button>
                <button className="save-btn" onClick={handleSaveMarker}>保存</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 思维导图 */}
      {showMindMap && (
        <div style={{ width: '100%', height: '100%' }}>
          <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <h3>思维导图</h3>
            <p>提示：点击节点并拖拽可移动位置，点击节点边缘的手柄可创建连接，点击节点底部的"修改"按钮可编辑内容，按Delete键可删除节点或连接</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={addNewNode}
              >
                添加节点
              </button>
              <button 
                style={{ padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={resetMindMap}
              >
                重置思维导图
              </button>
            </div>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionLineType={ConnectionLineType.Step}
            onInit={setReactFlowInstance}
            style={{ width: '100%', height: 'calc(100% - 120px)' }}
            selectNodesOnDrag={false}
            multiSelectionKeyCode={null}
            nodeTypes={{ 
              custom: (props) => (
                <VerticalNode 
                  {...props} 
                  onNodesChange={onNodesChange} 
                />
              ) 
            }}
          >
            <Background variant="dots" gap={12} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      )}

      {/* MarkMap */}
      {showMarkMap && (
        <div style={{ width: '100%', height: '100%' }}>
          <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <h3>MarkMap</h3>
            <p>提示：MarkMap 是基于 Markdown 的思维导图工具，支持自动渲染和交互功能</p>
          </div>
          <div style={{ width: '100%', height: 'calc(100% - 80px)', padding: '20px' }}>
            <div ref={markmapRef} style={{ width: '100%', height: '100%' }}>
              <pre className="markmap">
                # 中心主题
                ## 分支 1
                ### 子分支 1.1
                ### 子分支 1.2
                ## 分支 2
                ### 子分支 2.1
                ### 子分支 2.2
                ## 分支 3
                ### 子分支 3.1
                ### 子分支 3.2
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 管理员面板 */}
      {showAdminPanel && currentUser?.isAdmin && (
        <div style={{ width: '100%', height: '100%', padding: '20px', overflow: 'auto' }}>
          <h2>管理员面板</h2>
          
          {/* 用户管理 */}
          <div style={{ marginBottom: '30px' }}>
            <h3>用户管理</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>用户名</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>用户ID</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>角色</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{user.username}</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{user.id}</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      {user.isAdmin ? '管理员' : '普通用户'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除用户 "${user.username}" 吗？这将同时删除该用户的所有标记。`)) {
                              handleDeleteUser(user.id);
                            }
                          }}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                          }}
                        >
                          删除用户
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 标记管理 */}
          <div>
            <h3>标记管理</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>标题</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>描述</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>所属用户</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {markers.map(marker => {
                  const markerUser = users.find(u => u.id === marker.userId);
                  return (
                    <tr key={marker.id}>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{marker.title}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{marker.description}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        {markerUser ? markerUser.username : '未知用户'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除标记 "${marker.title}" 吗？`)) {
                              handleDeleteMarker(marker.id);
                            }
                          }}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                          }}
                        >
                          删除标记
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {markers.length === 0 && (
              <p style={{ marginTop: '10px', color: '#6c757d' }}>暂无标记</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;