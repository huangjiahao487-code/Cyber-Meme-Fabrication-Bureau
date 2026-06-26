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
        // mock | aliyun | dashscope | doubao | siliconflow
        provider: process.env.AI_PROVIDER || 'mock',
        // 阿里云视觉智能开放平台配置（provider=aliyun 时使用）
        aliyun: {
            accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
            accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
            // 人脸人体服务 endpoint（上海地域）
            endpoint: process.env.ALIYUN_ENDPOINT || 'facebody.cn-shanghai.aliyuncs.com',
        },
        // 通义万相（百炼 DashScope）配置（provider=dashscope 时使用）
        // 获取 API Key：https://bailian.console.aliyun.com/?tab=model#/api-key
        dashscope: {
            apiKey: process.env.DASHSCOPE_API_KEY || '',
            // 万相图像生成与编辑模型，支持图文混排和图像编辑
            model: process.env.DASHSCOPE_MODEL || 'wan2.6-image',
            endpoint: process.env.DASHSCOPE_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        },
        // 豆包 Seedream（火山引擎 Ark）配置（provider=doubao 时使用）
        // 获取 API Key：https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey
        // 开通模型：在火山方舟控制台开通 doubao-seedream 模型
        doubao: {
            apiKey: process.env.DOUBAO_API_KEY || '',
            // 豆包图像生成模型，支持多图输入（换脸/换装场景效果好）
            model: process.env.DOUBAO_MODEL || 'doubao-seedream-4-0-250828',
            endpoint: process.env.DOUBAO_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        },
        // 硅基流动 SiliconFlow 配置（provider=siliconflow 时使用）
        // 获取 API Key：https://cloud.siliconflow.cn/  注册送 2000 万 Token 免费额度
        // 支持图生图（Kolors 模型），以用户照片为参考图生成搞怪变体
        siliconflow: {
            apiKey: process.env.SILICONFLOW_API_KEY || '',
            // Kolors 模型支持图生图 + negative_prompt + batch_size
            model: process.env.SILICONFLOW_MODEL || 'Kwai-Kolors/Kolors',
            endpoint: process.env.SILICONFLOW_ENDPOINT || 'https://api.siliconflow.cn/v1/images/generations',
        },
        // 本地人脸融合服务（provider=local 时使用）
        // 基于 MediaPipe 关键点检测 + OpenCV 对齐融合，无需 API Key，完全免费
        // 需要先启动 Python 服务：cd server/face_service && python3 server.py
        local: {
            endpoint: process.env.FACE_SERVICE_URL || 'http://localhost:5000',
        },
    },
};
