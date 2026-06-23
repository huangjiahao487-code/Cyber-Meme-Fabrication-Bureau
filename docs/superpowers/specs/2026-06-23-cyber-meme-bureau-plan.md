# 赛博表情包制造局 - 实现计划

## 阶段一：项目初始化与核心框架

### 1.1 项目结构搭建
```
/workspace
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── services/      # API 服务
│   │   └── utils/         # 工具函数
│   └── public/
├── backend/               # 后端项目
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── services/      # 业务逻辑
│   │   ├── routes/        # 路由
│   │   └── utils/         # 工具函数
│   └── uploads/           # 上传文件目录
└── docs/                  # 文档
```

### 1.2 前端技术栈
- **框架：** React 18 + Vite
- **样式：** Tailwind CSS
- **图像编辑：** Fabric.js
- **状态管理：** Zustand
- **HTTP 客户端：** Axios

### 1.3 后端技术栈
- **运行环境：** Node.js 18+
- **框架：** Express.js
- **文件上传：** Multer
- **AI API：** 预留接口（阿里云/腾讯云换脸 API）

---

## 阶段二：页面与组件开发

### 2.1 首页布局
| 组件 | 说明 |
|------|------|
| `PhotoUploader` | 照片上传组件，支持拖拽、预览、压缩 |
| `TemplateGallery` | 模板展示区，内置 Tab + 用户上传 Tab |
| `FusionSettings` | 融合参数设置面板 |
| `EditorCanvas` | 编辑画布（Fabric.js） |
| `TextTool` | 文字添加工具 |
| `DoodleTool` | 涂鸦工具 |
| `CropTool` | 裁剪工具 |
| `DownloadButton` | 下载按钮 |

### 2.2 工作流
1. 用户上传照片 → 前端压缩 → 显示预览
2. 用户选择模板 → 显示模板预览
3. 用户选择融合方式和风格
4. 点击"生成"→ 调用后端 API → 显示结果
5. 进入编辑模式 → 添加文字/涂鸦/裁剪
6. 下载最终表情包

---

## 阶段三：后端 API

### 3.1 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload/photo` | POST | 上传用户照片 |
| `/api/upload/template` | POST | 上传用户模板 |
| `/api/templates` | GET | 获取内置模板列表 |
| `/api/fusion` | POST | AI 融合（调用第三方 API） |

### 3.2 融合 API 请求格式
```json
{
  "photoUrl": "用户照片 URL",
  "templateUrl": "模板 URL",
  "fusionType": "face_swap | expression_transfer",
  "style": "humor | natural | cartoon"
}
```

### 3.3 第三方 AI API 预留
```javascript
// services/aiService.js - 预留接口
const aiProviders = {
  aliyun: 'https://face Swap-api.aliyun.com',
  tencent: 'https://face Swap-api.tencentcloud.com'
};
```

---

## 阶段四：内置模板库

### 4.1 初始模板清单
- 熊猫头系列（5张）
- 张学友"食屎啦你"系列
- 金馆长系列
- 假面骑士/奥特曼系列
- 经典 GIF 动图（3个）

### 4.2 模板存储
- 内置模板存放于 `/public/templates/`
- 用户上传模板存放于 `/backend/uploads/templates/`

---

## 阶段五：编辑功能实现

### 5.1 Fabric.js 编辑能力
- 添加顶部/底部文字（可调字体、颜色、大小）
- 添加对话气泡（预设样式）
- 手绘涂鸦（自由画笔）
- 裁剪（调整画布尺寸）

### 5.2 导出格式
- 输出格式：PNG / JPEG
- 默认尺寸：跟随模板原始尺寸
- 质量：压缩至 1MB 以下便于分享

---

## 阶段六：用户上传与审核

### 6.1 上传限制
- 支持格式：JPG、PNG、GIF
- 文件大小限制：5MB
- 仅支持静态图片和 GIF

### 6.2 审核机制（预留）
- 用户上传模板标记为"待审核"状态
- 审核通过后公开可见

---

## 实施顺序

| 顺序 | 任务 | 优先级 |
|------|------|--------|
| 1 | 项目初始化（前后端框架） | P0 |
| 2 | 照片上传与预览 | P0 |
| 3 | 模板选择与展示 | P0 |
| 4 | 后端融合 API（预留 AI 接口） | P0 |
| 5 | 编辑器（文字+涂鸦+裁剪） | P1 |
| 6 | 内置模板库 | P1 |
| 7 | 用户上传功能 | P2 |
| 8 | 审核机制（预留） | P2 |

---

## 技术验证点

1. **照片压缩** - 前端使用 Canvas 压缩至 500KB 以内
2. **AI API 对接** - 预留接口，验证时可用占位图
3. **Fabric.js 编辑** - 验证文字/涂鸦/裁剪功能
4. **跨域上传** - 后端正确处理 multipart/form-data
