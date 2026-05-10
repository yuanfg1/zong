-- 用户表（存储基本认证信息）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户配置表（存储用户个性化设置）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES users(id),
  nickname TEXT,
  avatar_url TEXT,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'zh-CN',
  preferences JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- 思维导图主表（兼容旧版本 data 字段）
CREATE TABLE IF NOT EXISTS mindmaps (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL,
  title TEXT NOT NULL DEFAULT '新思维导图',
  description TEXT,
  owner_id TEXT,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_mindmaps_id ON mindmaps(id);
CREATE INDEX idx_mindmaps_owner_id ON mindmaps(owner_id);
CREATE INDEX idx_mindmaps_status ON mindmaps(status);

-- 思维导图节点表（规范化存储）
CREATE TABLE IF NOT EXISTS mindmap_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mindmap_id TEXT REFERENCES mindmaps(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES mindmap_nodes(id),
  text TEXT NOT NULL,
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 120,
  height INTEGER DEFAULT 40,
  font_size INTEGER DEFAULT 14,
  node_type TEXT DEFAULT 'default' CHECK (node_type IN ('default', 'topic', 'branch', 'leaf')),
  style JSONB DEFAULT '{}'::JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 思维导图连接线表
CREATE TABLE IF NOT EXISTS mindmap_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mindmap_id TEXT REFERENCES mindmaps(id) ON DELETE CASCADE,
  from_node_id UUID REFERENCES mindmap_nodes(id),
  to_node_id UUID REFERENCES mindmap_nodes(id),
  line_type TEXT DEFAULT 'straight' CHECK (line_type IN ('straight', 'curved', 'bus')),
  color TEXT DEFAULT '#1e293b',
  width INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 思维导图协作者表
CREATE TABLE IF NOT EXISTS mindmap_collaborators (
  mindmap_id TEXT REFERENCES mindmaps(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  access_level TEXT DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor', 'viewer')),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (mindmap_id, user_id)
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- 活动日志表
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  mindmap_id TEXT REFERENCES mindmaps(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 思维导图版本历史表
CREATE TABLE IF NOT EXISTS mindmap_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mindmap_id TEXT REFERENCES mindmaps(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_mindmap_nodes_mindmap_id ON mindmap_nodes(mindmap_id);
CREATE INDEX idx_mindmap_nodes_parent_id ON mindmap_nodes(parent_id);
CREATE INDEX idx_mindmap_connections_mindmap_id ON mindmap_connections(mindmap_id);
CREATE INDEX idx_mindmap_collaborators_user_id ON mindmap_collaborators(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_mindmap_id ON activity_logs(mindmap_id);
CREATE INDEX idx_mindmap_versions_mindmap_id ON mindmap_versions(mindmap_id);

-- 插入默认角色
INSERT INTO roles (name, description) VALUES
  ('admin', '系统管理员'),
  ('editor', '编辑用户'),
  ('viewer', '查看用户')
ON CONFLICT (name) DO NOTHING;

-- 插入默认权限
INSERT INTO permissions (name, description) VALUES
  ('mindmap_create', '创建思维导图'),
  ('mindmap_read', '查看思维导图'),
  ('mindmap_update', '更新思维导图'),
  ('mindmap_delete', '删除思维导图'),
  ('mindmap_share', '分享思维导图'),
  ('user_manage', '管理用户'),
  ('role_manage', '管理角色'),
  ('setting_manage', '管理系统设置')
ON CONFLICT (name) DO NOTHING;

-- 插入默认角色权限
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
  (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
  (3, 2)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 启用 UUID 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 禁用 RLS（开发环境）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_versions DISABLE ROW LEVEL SECURITY;