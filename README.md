# Vue GitHub App

一个简单的 Vue 3 应用，准备部署到 GitHub Pages。

## 技术栈

- Vue 3
- Vite

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev
```

## 构建生产版本

```bash
npm run build
```

## 预览生产构建

```bash
npm run preview
```

## 部署到 GitHub Pages

### 1. 修改 vite.config.js

将 `base` 配置改为你的仓库名称：

```js
export default defineConfig({
  base: '/你的仓库名/'
})
```

### 2. 构建项目

```bash
npm run build
```

### 3. 部署方式一：使用 gh-pages 工具

安装 gh-pages：

```bash
npm install -D gh-pages
```

在 package.json 添加脚本：

```json
{
  "scripts": {
    "deploy": "gh-pages -d dist"
  }
}
```

运行部署：

```bash
npm run deploy
```

### 4. 部署方式二：手动部署

1. 将 `dist` 目录的内容推送到 `gh-pages` 分支
2. 在 GitHub 仓库设置中启用 GitHub Pages，选择 `gh-pages` 分支

## 项目结构

```
vue-github-app/
├── src/
│   ├── components/
│   │   └── HelloWorld.vue
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── index.html
├── package.json
└── vite.config.js
```
