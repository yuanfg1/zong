# GitHub Pages 部署诊断清单

## 1. 检查GitHub Pages设置

访问: https://github.com/yuanfg1/zong/settings/pages

### 确认以下设置:
- [ ] **Source** 必须选择 **GitHub Actions**
- [ ] 如果显示 "Build and deployment from a branch"，请改为 "GitHub Actions"
- [ ] 点击 **Save** 保存

## 2. 检查Actions工作流

访问: https://github.com/yuanfg1/zong/actions

### 查看最近的部署:
- [ ] 是否有 "Deploy to GitHub Pages" 工作流运行?
- [ ] 工作流状态是绿色(成功)还是红色(失败)?
- [ ] 如果失败，点击查看错误信息

## 3. 手动触发部署

如果工作流没有自动运行:

1. 访问 https://github.com/yuanfg1/zong/actions
2. 点击左侧菜单的 **Deploy to GitHub Pages**
3. 点击 **Run workflow** 按钮
4. 选择 **main** 分支
5. 点击绿色的 **Run workflow** 按钮

## 4. 等待部署完成

- 部署通常需要 1-3 分钟
- 刷新 Actions 页面查看进度
- 看到绿色勾号表示成功

## 5. 访问网站

部署成功后访问:
https://yuanfg1.github.io/zong/

## 6. 如果仍然404，检查浏览器控制台

1. 打开 https://yuanfg1.github.io/zong/
2. 按 F12 打开开发者工具
3. 切换到 **Console** 标签
4. 查看具体的404错误信息

### 常见的404错误:

**错误1: `/vite.svg` 404**
- 原因: vite.svg 文件未正确部署
- 解决: 已在代码中添加，重新部署即可

**错误2: `/assets/xxx.js` 404**
- 原因: base路径配置不正确
- 解决: vite.config.ts 中已设置 `base: '/zong/'`

**错误3: 整个页面404**
- 原因: GitHub Pages未启用或配置错误
- 解决: 按照步骤1-5重新配置

## 7. 替代方案: 使用GitHub Pages的默认分支部署

如果GitHub Actions方式有问题，可以改用传统方式:

1. 访问 https://github.com/yuanfg1/zong/settings/pages
2. **Source** 选择 **Deploy from a branch**
3. **Branch** 选择 **main** 和 **/ (root)**
4. 点击 **Save**

然后需要修改工作流文件，或者手动构建并推送dist目录。

## 8. 联系支持

如果以上步骤都无法解决问题，请提供:
- Actions工作流的错误日志
- 浏览器控制台的完整错误信息
- GitHub Pages设置页面的截图
