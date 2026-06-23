# 赛博表情包制造局 - 实现计划（基于现有原型）

## 现状评估

### 已有原型（index.html）
单文件 HTML 原型，已实现：
- ✅ 暖色调视觉风格（橙/珊瑚/金黄）
- ✅ 照片上传（拖拽 + 点击 + 预览）
- ✅ 4 个内置模板（Doge/Drake/暴躁猫/膨胀大脑）
- ✅ 上下文字输入
- ✅ 模拟生成流程（5 阶段齿轮 loading + 进度条）
- ✅ 结果展示 + 彩纸庆祝
- ✅ Canvas 合成文字 + 下载

### 核心缺口
- ❌ **假生成**：随机返回 GIPHY 图，未真正融合用户照片
- ❌ 无融合方式选择（换脸/表情驱动）
- ❌ 无风格选择（幽默/自然/魔性）
- ❌ 无对话气泡、涂鸦、裁剪
- ❌ 无用户上传模板
- ❌ 无后端 API

---

## 技术决策

### 保持单文件架构 vs 拆分前后端

**决策：渐进式演进，先增强单文件原型，再按需拆分**

理由：
1. 现有原型视觉完成度高，单文件便于迭代和部署
2. AI 融合必须后端（API Key 不能暴露在前端）
3. 先用最小后端（仅融合接口）验证效果，再决定是否全面拆分

### 技术栈
| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | 原生 HTML + Tailwind CDN + Canvas | 沿用现有原型 |
| 编辑器 | Fabric.js（CDN 引入） | 文字/气泡/涂鸦/裁剪 |
| 后端 | Node.js + Express | 最小化，仅处理融合 |
| AI API | 第三方换脸 API（预留） | 阿里云/腾讯云 |

---

## 项目结构

采用前后端分离的清晰目录结构，前端单文件 HTML 拆分为独立的 HTML/CSS/JS 模块。

```
/workspace
├── client/                     # 前端
│   ├── index.html              # 页面结构（纯 HTML，不含样式和逻辑）
│   ├── css/
│   │   ├── base.css            # 基础样式：变量、reset、全局
│   │   ├── components.css      # 组件样式：上传区、模板卡、按钮、badge
│   │   ├── editor.css          # 编辑器样式：工具栏、画布、面板
│   │   └── animations.css      # 动画：loading、彩纸、浮动 emoji
│   ├── js/
│   │   ├── app.js              # 入口：初始化、状态管理
│   │   ├── upload.js           # 照片上传与预览
│   │   ├── templates.js        # 模板选择与展示
│   │   ├── fusion.js           # 融合参数选择 + 调用后端
│   │   ├── editor.js           # Fabric.js 编辑器（文字/气泡/涂鸦/裁剪）
│   │   ├── result.js           # 结果展示与下载
│   │   └── utils.js            # 工具函数：压缩、DOM 辅助
│   └── assets/
│       └── templates/          # 内置模板图片
│
├── server/                     # 后端
│   ├── src/
│   │   ├── app.js              # Express 应用入口
│   │   ├── routes/
│   │   │   ├── fusion.js       # 融合接口
│   │   │   └── templates.js    # 模板管理接口
│   │   ├── services/
│   │   │   ├── aiService.js    # AI API 适配层（mock + 真实）
│   │   │   └── storage.js      # 文件存储
│   │   ├── middleware/
│   │   │   └── upload.js       # Multer 上传配置
│   │   └── config.js           # 配置：端口、路径、API Key
│   ├── uploads/                # 用户上传文件（gitignore）
│   └── package.json
│
├── docs/
│   └── superpowers/specs/      # 设计文档
│
├── package.json                # 根 package.json（脚本统一启动）
└── .gitignore
```

### 拆分原则

| 关注点 | 归属 |
|--------|------|
| 页面结构 | `client/index.html` |
| 视觉样式 | `client/css/*.css`（按职责拆分） |
| 交互逻辑 | `client/js/*.js`（按功能模块拆分） |
| 业务接口 | `server/src/routes/` |
| AI 能力 | `server/src/services/aiService.js` |
| 静态资源 | `client/assets/`、`server/uploads/` |

### 前端模块职责

| 文件 | 职责 | 依赖 |
|------|------|------|
| `app.js` | 初始化、全局状态、模块协调 | 所有模块 |
| `upload.js` | 照片上传、拖拽、预览、压缩 | `utils.js` |
| `templates.js` | 模板加载、选择、用户上传 | `utils.js` |
| `fusion.js` | 融合方式/风格选择、调用 `/api/fusion` | `app.js` |
| `editor.js` | Fabric.js 画布、文字/气泡/涂鸦/裁剪 | `result.js` |
| `result.js` | 结果展示、Canvas 合成、下载 | `utils.js` |
| `utils.js` | 图片压缩、DOM 查询、格式化等纯函数 | 无 |

### 后端模块职责

| 文件 | 职责 |
|------|------|
| `app.js` | Express 实例、中间件、路由挂载、静态托管 |
| `routes/fusion.js` | `POST /api/fusion` 处理 |
| `routes/templates.js` | `GET /api/templates`、`POST /api/templates/upload` |
| `services/aiService.js` | AI API 调用（mock 优先，预留真实接口） |
| `services/storage.js` | 文件保存、读取、URL 生成 |
| `middleware/upload.js` | Multer 配置（限制大小、类型、存储路径） |
| `config.js` | 端口、路径、AI API Key 等配置 |

---

## 实施阶段

### 阶段零：原型拆分与项目骨架（P0 - 前置）

**目标：把臃肿的单文件 index.html 拆分为可维护的模块化结构**

#### 0.1 创建目录结构
按"项目结构"章节创建 `client/` 和 `server/` 目录树。

#### 0.2 拆分前端
将现有 `index.html` 的内容拆分：
- HTML 结构 → `client/index.html`（保留 DOM，移除 `<style>` 和 `<script>`）
- CSS 变量、reset、body → `client/css/base.css`
- 上传区、模板卡、按钮、badge 样式 → `client/css/components.css`
- loading、彩纸、浮动 emoji 动画 → `client/css/animations.css`
- 预留 `client/css/editor.css`（阶段三填充）
- 状态 + 模板选择 + 上传逻辑 → `client/js/app.js` + `upload.js` + `templates.js`
- 生成流程 + 结果展示 → `client/js/fusion.js` + `result.js`
- 工具函数（如压缩）→ `client/js/utils.js`
- 预留 `client/js/editor.js`（阶段三填充）

#### 0.3 搭建后端骨架
- `server/package.json`：express, multer, cors, axios
- `server/src/app.js`：Express 实例，托管 `client/` 静态文件
- 访问 `http://localhost:3001/` 能加载拆分后的前端

#### 0.4 验证
- 拆分后页面视觉、交互与原原型完全一致
- 现有假生成流程仍能跑通（作为后续替换的基线）

---

### 阶段一：后端融合服务（P0 - 核心）

**目标：把假生成变成真融合**

#### 1.1 搭建最小后端
- `server.js`：Express 服务，端口 3001
- 依赖：express, multer, cors, axios
- 静态文件托管 `public/` 和 `uploads/`

#### 1.2 融合接口
```
POST /api/fusion
请求：multipart/form-data
  - photo: 用户照片文件
  - template: 模板图片文件 或 templateUrl
  - fusionType: "face_swap" | "expression_transfer"
  - style: "humor" | "natural" | "cartoon"
响应：
  - success: { resultUrl: "..." }
  - error: { message: "..." }
```

#### 1.3 AI API 适配层
```javascript
// 预留接口，先用 mock 返回，便于前端联调
async function fuseImage(photo, template, fusionType, style) {
  // TODO: 接入真实 AI API
  // 1. 上传 photo 和 template 到 AI 服务
  // 2. 根据 fusionType 调用对应能力
  // 3. 根据 style 调整参数
  // 4. 返回融合结果 URL
}
```

#### 1.4 模板管理接口
```
GET  /api/templates          # 获取内置模板列表
POST /api/templates/upload   # 用户上传模板
```

---

### 阶段二：前端增强 - 参数选择（P0）

**目标：补齐融合方式和风格选择**

#### 2.1 新增融合方式选择器
在模板选择区下方添加：
```
🧬 融合方式
  ○ 换脸融合（动态GIF/已有角色）
  ○ 表情驱动（静态模板/熊猫头）
```

#### 2.2 新增风格选择器
```
🎨 融合风格
  ○ 幽默恶搞（违和萌反差）
  ○ 自然混搭（自然融合）
  ○ 魔性合成（Q版卡通）
```

#### 2.3 改造生成流程
- `startGeneration()` 改为调用 `/api/fusion`
- 保留现有 loading 动画（真实等待 + 视觉反馈）
- 失败时显示友好错误提示

---

### 阶段三：编辑器集成（P1）

**目标：在结果页加入完整编辑能力**

#### 3.1 引入 Fabric.js
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
```

#### 3.2 改造结果页为编辑器
将现有"结果展示"升级为"编辑画布"：

| 工具栏 | 功能 |
|--------|------|
| 文字工具 | 顶部/底部文字（沿用现有）+ 自由文字 |
| 气泡工具 | 预设对话气泡样式，可拖拽定位 |
| 涂鸦工具 | 自由画笔，可调颜色/粗细 |
| 裁剪工具 | 调整画布尺寸/裁剪区域 |
| 撤销/重做 | 操作历史 |
| 下载 | 导出最终 PNG |

#### 3.3 编辑器布局
```
┌─────────────────────────────┐
│  工具栏（顶部）              │
├──────────┬──────────────────┤
│          │                  │
│  工具    │   Fabric 画布    │
│  面板    │   （融合结果）   │
│          │                  │
├──────────┴──────────────────┤
│  下载 / 重做                 │
└─────────────────────────────┘
```

---

### 阶段四：模板库扩展（P1）

**目标：内置经典模板 + 用户上传**

#### 4.1 内置模板扩充
下载到 `public/templates/`：
- 熊猫头系列（3-5张）
- 张学友系列
- 金馆长系列
- 保留现有 4 个 GIPHY 模板

#### 4.2 模板选择区改造
```
🎭 选择底版
  [内置模板] [我的上传]
  
  内置：网格展示，分类筛选
  上传：用户上传过的模板
```

#### 4.3 用户上传模板
- 在模板区添加"上传我的模板"按钮
- 调用 `POST /api/templates/upload`
- 上传后立即可选

---

### 阶段五：体验打磨（P2）

#### 5.1 错误处理
- 照片无人脸 → 友好提示
- AI 服务超时 → 重试/降级
- 网络错误 → 提示重试

#### 5.2 性能优化
- 前端照片压缩（Canvas 压缩至 500KB）
- 模板懒加载
- 融合结果缓存

#### 5.3 移动端适配
- 现有响应式已基本可用
- 编辑器需针对触屏优化

---

## 实施顺序与优先级

| 顺序 | 任务 | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | 创建 client/server 目录结构 | P0 | - |
| 2 | 拆分 index.html → HTML/CSS/JS 模块 | P0 | 1 |
| 3 | 搭建后端骨架，托管前端静态文件 | P0 | 1 |
| 4 | 验证拆分后原型功能一致 | P0 | 2,3 |
| 5 | 实现融合接口（mock 版本） | P0 | 3 |
| 6 | 前端接入融合接口（替换假生成） | P0 | 4,5 |
| 7 | 添加融合方式 + 风格选择器 | P0 | 6 |
| 8 | 接入真实 AI API | P0 | 5 |
| 9 | 集成 Fabric.js 编辑器 | P1 | 6 |
| 10 | 实现气泡/涂鸦/裁剪工具 | P1 | 9 |
| 11 | 扩充内置模板库 | P1 | 3 |
| 12 | 用户上传模板功能 | P1 | 3 |
| 13 | 错误处理 + 性能优化 | P2 | 全部 |

---

## 验证标准

### 阶段零完成标准
- [ ] `client/` 和 `server/` 目录结构创建完成
- [ ] `index.html` 仅含 HTML 结构，无内联 `<style>`/`<script>`
- [ ] CSS 按职责拆分到 `client/css/*.css`
- [ ] JS 按功能拆分到 `client/js/*.js`
- [ ] 后端可启动，`http://localhost:3001/` 加载正常
- [ ] 拆分后视觉、交互与原原型完全一致
- [ ] 现有假生成流程仍可跑通

### 阶段一完成标准
- [ ] 后端可启动，`/api/fusion` 返回 mock 结果
- [ ] 前端能调用后端，loading 动画正常
- [ ] 失败时有错误提示

### 阶段二完成标准
- [ ] 用户可选择融合方式
- [ ] 用户可选择风格
- [ ] 参数正确传递到后端

### 阶段三完成标准
- [ ] 结果页可添加/编辑文字
- [ ] 可添加对话气泡
- [ ] 可手绘涂鸦
- [ ] 可裁剪画面
- [ ] 可下载最终图

### 阶段四完成标准
- [ ] 内置模板 ≥ 8 个
- [ ] 用户可上传自定义模板
- [ ] 上传后模板立即可选

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| AI API 效果不达预期 | 先用 mock 跑通流程，再接真实 API |
| AI API 成本高 | 限制免费次数，预留计费接口 |
| 跨域图片污染 Canvas | 后端代理图片，或 base64 传输 |
| GIF 编辑复杂 | 首期只支持静态图编辑，GIF 仅融合不编辑 |
