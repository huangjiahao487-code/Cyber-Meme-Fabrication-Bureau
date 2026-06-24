// ========== 配置 ==========
import 'dotenv/config';
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
    // AI API 配置
    ai: {
        // mock: 本地模拟 | aliyun: 阿里云人脸融合
        provider: process.env.AI_PROVIDER || 'mock',
        // 阿里云视觉智能开放平台配置
        aliyun: {
            accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
            accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
            // 人脸人体服务 endpoint（上海地域）
            endpoint: process.env.ALIYUN_ENDPOINT || 'facebody.cn-shanghai.aliyuncs.com',
        },
    },
};
