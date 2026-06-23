// ========== 配置 ==========
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    port: process.env.PORT || 3001,
    // 项目根目录（server/ 的上一级）
    rootDir: path.resolve(__dirname, '..', '..'),
    // 前端静态目录
    clientDir: path.resolve(__dirname, '..', '..', 'client'),
    // 上传文件目录
    uploadsDir: path.resolve(__dirname, '..', 'uploads'),
    // 上传限制
    upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
    // AI API 配置（阶段一接入真实 API 时填充）
    ai: {
        provider: process.env.AI_PROVIDER || 'mock', // mock | aliyun | tencent
        apiKey: process.env.AI_API_KEY || '',
        endpoint: process.env.AI_ENDPOINT || '',
    },
};
