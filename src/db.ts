// IndexedDB 数据库服务

const DB_NAME = 'MapSiteDB';
const DB_VERSION = 1;

// 数据库接口
export interface User {
  id: string;
  username: string;
  password: string;
  isAdmin?: boolean;
}

export interface MarkerData {
  id: string;
  position: [number, number];
  title: string;
  description: string;
  userId: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface MindMapData {
  id: string;
  userId: string;
  nodes: any[];
  edges: any[];
  updatedAt?: number;
}

class Database {
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建用户表
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
        }

        // 创建标记表
        if (!db.objectStoreNames.contains('markers')) {
          const markerStore = db.createObjectStore('markers', { keyPath: 'id' });
          markerStore.createIndex('userId', 'userId', { unique: false });
          markerStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 创建思维导图表
        if (!db.objectStoreNames.contains('mindMaps')) {
          const mindMapStore = db.createObjectStore('mindMaps', { keyPath: 'id' });
          mindMapStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  // 用户相关操作
  async getAllUsers(): Promise<User[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('username');
      const request = index.get(username);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addUser(user: User): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.add(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(user: User): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 标记相关操作
  async getAllMarkers(): Promise<MarkerData[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['markers'], 'readonly');
      const store = transaction.objectStore('markers');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getMarkersByUserId(userId: string): Promise<MarkerData[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['markers'], 'readonly');
      const store = transaction.objectStore('markers');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getMarkerById(id: string): Promise<MarkerData | undefined> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['markers'], 'readonly');
      const store = transaction.objectStore('markers');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addMarker(marker: MarkerData): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['markers'], 'readwrite');
      const store = transaction.objectStore('markers');
      const request = store.add(marker);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateMarker(marker: MarkerData): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['markers'], 'readwrite');
      const store = transaction.objectStore('markers');
      const request = store.put(marker);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMarker(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['markers'], 'readwrite');
      const store = transaction.objectStore('markers');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMarkersByUserId(userId: string): Promise<void> {
    if (!this.db) await this.init();
    const markers = await this.getMarkersByUserId(userId);
    for (const marker of markers) {
      await this.deleteMarker(marker.id);
    }
  }

  // 思维导图相关操作
  async getMindMapByUserId(userId: string): Promise<MindMapData | undefined> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mindMaps'], 'readonly');
      const store = transaction.objectStore('mindMaps');
      const index = store.index('userId');
      const request = index.get(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveMindMap(mindMap: MindMapData): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mindMaps'], 'readwrite');
      const store = transaction.objectStore('mindMaps');
      const request = store.put(mindMap);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 数据导入导出
  async exportAllData(): Promise<{ users: User[]; markers: MarkerData[]; mindMaps: MindMapData[] }> {
    const users = await this.getAllUsers();
    const markers = await this.getAllMarkers();
    const mindMaps = await this.getAllMindMaps();
    return { users, markers, mindMaps };
  }

  async getAllMindMaps(): Promise<MindMapData[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mindMaps'], 'readonly');
      const store = transaction.objectStore('mindMaps');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async importData(data: { users: User[]; markers: MarkerData[]; mindMaps: MindMapData[] }): Promise<void> {
    // 清空现有数据
    await this.clearAllData();

    // 导入用户
    for (const user of data.users) {
      await this.addUser(user);
    }

    // 导入标记
    for (const marker of data.markers) {
      await this.addMarker(marker);
    }

    // 导入思维导图
    for (const mindMap of data.mindMaps) {
      await this.saveMindMap(mindMap);
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    
    const stores = ['users', 'markers', 'mindMaps'];
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // 从localStorage迁移数据
  async migrateFromLocalStorage(): Promise<void> {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const markers = JSON.parse(localStorage.getItem('markers') || '[]');
    const mindMapData = JSON.parse(localStorage.getItem('mindMapData') || 'null');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    // 迁移用户
    for (const user of users) {
      try {
        await this.addUser(user);
      } catch (e) {
        // 用户已存在，跳过
      }
    }

    // 迁移标记
    for (const marker of markers) {
      try {
        await this.addMarker(marker);
      } catch (e) {
        // 标记已存在，更新
        await this.updateMarker(marker);
      }
    }

    // 迁移思维导图（使用默认用户ID）
    if (mindMapData) {
      try {
        await this.saveMindMap({
          id: 'default',
          userId: 'default',
          nodes: mindMapData.nodes,
          edges: mindMapData.edges,
          updatedAt: Date.now(),
        });
      } catch (e) {
        // 忽略错误
      }
    }

    console.log('数据迁移完成');
  }
}

// 导出单例
export const db = new Database();

// 初始化数据库
export const initDatabase = async () => {
  await db.init();
  await db.migrateFromLocalStorage();
  console.log('数据库初始化完成');
};
