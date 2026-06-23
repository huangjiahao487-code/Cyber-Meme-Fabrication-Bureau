// ========== Express 应用入口 ==========
import express from 'express';
import cors from 'cors';
import path from 'path';
import config from './config.js';
import fusionRoutes from './routes/fusion.js';
import templateRoutes from './routes/templates.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件：托管前端
app.use(express.static(config.clientDir));
// 静态文件：托管上传的文件
app.use('/uploads', express.static(config.uploadsDir));

// API 路由
app.use('/api/fusion', fusionRoutes);
app.use('/api/templates', templateRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 前端路由回退（SPA 支持）
app.get('*', (req, res) => {
    res.sendFile(path.join(config.clientDir, 'index.html'));
});

// 启动服务
app.listen(config.port, () => {
    console.log(`🚀 赛博表情包制造局服务已启动`);
    console.log(`   本地访问: http://localhost:${config.port}`);
    console.log(`   AI 模式: ${config.ai.provider}`);
});

export default app;
