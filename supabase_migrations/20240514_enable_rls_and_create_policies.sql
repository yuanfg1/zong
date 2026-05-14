-- 启用所有表的 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE markers ENABLE ROW LEVEL SECURITY;

-- 为 users 表创建策略
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
CREATE POLICY "Enable insert access for all users" ON users
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for users" ON users;
CREATE POLICY "Enable update access for users" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 为 user_profiles 表创建策略
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
CREATE POLICY "Enable read access for all users" ON user_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for users" ON user_profiles;
CREATE POLICY "Enable insert access for users" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable update access for users" ON user_profiles;
CREATE POLICY "Enable update access for users" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 为 mindmaps 表创建策略
DROP POLICY IF EXISTS "Enable read access for all users" ON mindmaps;
CREATE POLICY "Enable read access for all users" ON mindmaps
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON mindmaps;
CREATE POLICY "Enable insert access for authenticated users" ON mindmaps
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON mindmaps;
CREATE POLICY "Enable update access for authenticated users" ON mindmaps
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON mindmaps;
CREATE POLICY "Enable delete access for authenticated users" ON mindmaps
  FOR DELETE
  TO authenticated
  USING (true);

-- 为 markers 表创建策略
DROP POLICY IF EXISTS "Enable read access for all users" ON markers;
CREATE POLICY "Enable read access for all users" ON markers
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON markers;
CREATE POLICY "Enable insert access for authenticated users" ON markers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON markers;
CREATE POLICY "Enable update access for authenticated users" ON markers
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON markers;
CREATE POLICY "Enable delete access for authenticated users" ON markers
  FOR DELETE
  TO authenticated
  USING (true);

-- 为其他表创建策略
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON roles;
CREATE POLICY "Enable read access for authenticated users" ON roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_roles;
CREATE POLICY "Enable read access for authenticated users" ON user_roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON permissions;
CREATE POLICY "Enable read access for authenticated users" ON permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON role_permissions;
CREATE POLICY "Enable read access for authenticated users" ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON mindmap_nodes;
CREATE POLICY "Enable read access for authenticated users" ON mindmap_nodes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON mindmap_connections;
CREATE POLICY "Enable read access for authenticated users" ON mindmap_connections
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON mindmap_collaborators;
CREATE POLICY "Enable read access for authenticated users" ON mindmap_collaborators
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sessions;
CREATE POLICY "Enable read access for authenticated users" ON sessions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON activity_logs;
CREATE POLICY "Enable read access for authenticated users" ON activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON mindmap_versions;
CREATE POLICY "Enable read access for authenticated users" ON mindmap_versions
  FOR SELECT
  TO authenticated
  USING (true);
