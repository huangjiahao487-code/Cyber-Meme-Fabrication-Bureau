// ========== AI 融合服务 ==========
// 支持 mock、aliyun（阿里云人脸融合）、dashscope（通义万相）、doubao（豆包 Seedream，推荐）
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import config from '../config.js';

const require = createRequire(import.meta.url);
const Facebody = require('@alicloud/facebody20191230').default;
const {
    AddFaceImageTemplateRequest,
    MergeImageFaceRequest,
    MergeImageFaceRequestMergeInfos,
} = require('@alicloud/facebody20191230');
const { Config: OpenApiConfig } = require('@alicloud/openapi-client');
const { RuntimeOptions } = require('@alicloud/tea-util');
const ViapiUtil = require('@alicloud/viapi-utils').default;

// mock 结果图（模拟 AI 融合输出）
const mockResults = [
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TRkCyFl4eolq0/giphy.gif',
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3hiY2JvYW54OHJvYXFwem0wZjhtYnU5cXZid3hhN2J5bzJtazhxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/D6InoH7TLxMsM/200.gif',
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VZzhwBfkShAHN2LC45/200.gif',
];

// 模板缓存：避免同一模板重复注册
// key = 模板标识（路径或 URL）, value = { templateId, faceIds }
const templateCache = new Map();

let facebodyClient = null;

/**
 * 融合图片
 * @param {string} photoPath - 用户照片路径
 * @param {string} templatePath - 模板图片路径或 URL
 * @param {string} fusionType - 融合方式: face_swap | expression_transfer
 * @param {string} style - 风格: humor | natural | cartoon
 * @returns {Promise<string>} 结果图 URL
 */
export async function fuseImage(photoPath, templatePath, fusionType, style) {
    if (config.ai.provider === 'mock') {
        return mockFuse(photoPath, templatePath, fusionType, style);
    }
    if (config.ai.provider === 'doubao') {
        try {
            return await doubaoFuse(photoPath, templatePath, fusionType, style);
        } catch (err) {
            const friendly = mapDoubaoError(err);
            const e = new Error(friendly);
            e.original = err;
            throw e;
        }
    }
    if (config.ai.provider === 'dashscope') {
        try {
            return await dashscopeFuse(photoPath, templatePath, fusionType, style);
        } catch (err) {
            const friendly = mapDashscopeError(err);
            const e = new Error(friendly);
            e.original = err;
            throw e;
        }
    }
    if (config.ai.provider === 'aliyun') {
        try {
            return await aliyunFuse(photoPath, templatePath, fusionType, style);
        } catch (err) {
            const friendly = mapAliyunError(err);
            const e = new Error(friendly);
            e.original = err;
            throw e;
        }
    }
    throw new Error(`不支持的 AI provider: ${config.ai.provider}`);
}

// ========== 豆包 Seedream 图像生成（火山引擎 Ark）==========
// OpenAI 兼容格式，支持多图 Base64 输入，一次请求出图
// 换脸/换装场景效果较好，接入简单

/**
 * 豆包 Seedream 图像生成完整流程
 */
async function doubaoFuse(photoPath, templatePath, fusionType, style) {
    const { apiKey, model, endpoint } = config.ai.doubao;
    if (!apiKey) {
        throw new Error('豆包 API Key 未配置，请在 .env 中设置 DOUBAO_API_KEY');
    }

    console.log(`[doubao] 开始生成: photo=${photoPath}, template=${templatePath}, type=${fusionType}, style=${style}`);

    // 1. 准备图片内容（本地文件转 data URI，URL 直接使用）
    const photoImage = await fileToImageContent(photoPath);
    const templateImage = await fileToImageContent(templatePath);

    // 2. 构造提示词
    const prompt = buildPrompt(fusionType, style);

    // 3. 调用豆包图像生成 API（OpenAI 兼容格式，多图输入用数组）
    const body = {
        model,
        prompt,
        // 多图输入：第一张是用户照片（提供人脸），第二张是模板（提供构图/背景）
        image: [photoImage, templateImage],
        // Seedream 5.0 要求最小 3686400 像素，2048x2048=4194304 满足要求
        size: '2048x2048',
        // 不加水印，表情包画面更干净
        watermark: false,
        // 返回 URL 形式，避免大 base64 占带宽
        response_format: 'url',
    };

    const response = await axios.post(endpoint, body, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        // 图像生成耗时较长，给 2 分钟超时
        timeout: 120000,
    });

    // 响应格式：data.data[0].url
    const resultUrl = response.data?.data?.[0]?.url;
    if (!resultUrl) {
        const errMsg = response.data?.error?.message || response.data?.message;
        throw new Error(errMsg || 'AI 生成返回空结果');
    }

    console.log(`[doubao] 生成完成: resultUrl=${resultUrl}`);
    return resultUrl;
}

/**
 * 将豆包 API 错误映射为友好的中文提示
 */
function mapDoubaoError(err) {
    const msg = err.message || '';
    const status = err.response?.status;
    const code = err.response?.data?.error?.code || '';
    const apiMsg = err.response?.data?.error?.message || err.response?.data?.message || '';

    // API Key 问题
    if (msg.includes('未配置') || status === 401 || code.includes('InvalidApiKey') || code.includes('Unauthorized') || code.includes('Authentication')) {
        return '豆包 API Key 无效或未配置，请检查 .env 中的 DOUBAO_API_KEY';
    }
    // 未开通服务 / 无权限
    if (status === 403 || code.includes('Forbidden') || code.includes('AccessDenied') || code.includes('Permission') || code.includes('NoAccess')) {
        return '豆包 Seedream 服务未开通或无权限，请先在火山方舟控制台开通 doubao-seedream 模型';
    }
    // 限流
    if (status === 429 || code.includes('Throttling') || code.includes('RateLimit') || code.includes('TooManyRequests')) {
        return 'AI 服务调用过于频繁，请稍后重试';
    }
    // 超时
    if (msg.includes('timeout') || code.includes('Timeout') || msg.includes('ETIMEDOUT')) {
        return 'AI 生成超时，请稍后重试';
    }
    // 网络错误
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET')) {
        return '网络连接失败，请检查网络后重试';
    }
    // 图片格式问题
    if (code.includes('InvalidImage') || code.includes('Image') || apiMsg.includes('image') || apiMsg.includes('图片')) {
        return '图片格式或尺寸不符合要求，请更换图片重试';
    }
    // 参数错误
    if (status === 400 || code.includes('InvalidParameter') || code.includes('BadRequest')) {
        return apiMsg || '请求参数有误，请检查后重试';
    }
    // 余额不足
    if (status === 402 || code.includes('InsufficientBalance') || code.includes('Payment')) {
        return '账户余额不足，请前往火山引擎控制台充值';
    }

    return apiMsg || msg || 'AI 生成失败，请重试';
}

// ========== 通义万相图像生成（DashScope）==========
// 流程：本地图片转 Base64 → 一次 HTTP 请求 → 返回结果图 URL
// 无需 OSS 上传、无需模板注册，比阿里云人脸融合简单得多

/**
 * 通义万相图像生成完整流程
 */
async function dashscopeFuse(photoPath, templatePath, fusionType, style) {
    const { apiKey, model, endpoint } = config.ai.dashscope;
    if (!apiKey) {
        throw new Error('DashScope API Key 未配置，请在 .env 中设置 DASHSCOPE_API_KEY');
    }

    console.log(`[dashscope] 开始生成: photo=${photoPath}, template=${templatePath}, type=${fusionType}, style=${style}`);

    // 1. 准备图片内容（本地文件转 data URI，URL 直接使用）
    const photoImage = await fileToImageContent(photoPath);
    const templateImage = await fileToImageContent(templatePath);

    // 2. 构造提示词
    const prompt = buildPrompt(fusionType, style);

    // 3. 调用万相图像生成 API（同步调用，一次请求拿结果）
    const body = {
        model,
        input: {
            messages: [{
                role: 'user',
                content: [
                    { image: photoImage },
                    { image: templateImage },
                    { text: prompt },
                ],
            }],
        },
        parameters: {
            size: '1024*1024',
        },
    };

    const response = await axios.post(endpoint, body, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        // 图像生成耗时较长，给 2 分钟超时
        timeout: 120000,
    });

    // 响应格式：data.output.choices[0].message.content[0].image
    const resultUrl = response.data?.output?.choices?.[0]?.message?.content?.[0]?.image;
    if (!resultUrl) {
        const errMsg = response.data?.message || response.data?.output?.message;
        throw new Error(errMsg || 'AI 生成返回空结果');
    }

    console.log(`[dashscope] 生成完成: resultUrl=${resultUrl}`);
    return resultUrl;
}

/**
 * 将本地文件路径或 URL 转为万相 API 可接受的图片内容
 * - URL：直接返回
 * - 本地文件：读取并转为 data URI（data:image/xxx;base64,...）
 */
async function fileToImageContent(filePath) {
    if (!filePath) {
        throw new Error('图片路径为空');
    }
    // 公网 URL 直接使用
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }
    // 本地文件转 data URI
    if (!fs.existsSync(filePath)) {
        throw new Error(`图片文件不存在: ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : (ext || 'jpeg');
    return `data:image/${mime};base64,${buffer.toString('base64')}`;
}

/**
 * 根据融合方式和风格构造提示词
 */
function buildPrompt(fusionType, style) {
    const styleDesc = {
        humor: '搞笑夸张的表情包风格，画面生动有趣',
        natural: '自然真实的风格，光影和肤色协调',
        cartoon: '卡通动漫风格，线条明快色彩鲜艳',
    }[style] || '搞笑表情包风格';

    if (fusionType === 'expression_transfer') {
        return `参考图一中人物的表情和神态，将其应用到图二中的人物脸上，保持图二的背景、构图和服装不变，生成一张${styleDesc}的图片`;
    }
    // face_swap：换脸
    return `将图一中人物的脸替换到图二中的人物脸上，保持图二的整体构图、背景和服装不变，要求人脸自然融合、边缘平滑，生成一张${styleDesc}的图片`;
}

/**
 * 将 DashScope API 错误映射为友好的中文提示
 */
function mapDashscopeError(err) {
    const msg = err.message || '';
    const status = err.response?.status;
    const code = err.response?.data?.code || '';
    const apiMsg = err.response?.data?.message || '';

    // API Key 问题
    if (msg.includes('未配置') || status === 401 || code.includes('Unauthorized') || code.includes('InvalidApiKey') || code.includes('AccessKey')) {
        return 'DashScope API Key 无效或未配置，请检查 .env 中的 DASHSCOPE_API_KEY';
    }
    // 未开通服务 / 无权限
    if (status === 403 || code.includes('Forbidden') || code.includes('AccessDenied') || code.includes('Permission')) {
        return '通义万相服务未开通或无权限，请先在百炼平台开通 wan2.6-image 模型';
    }
    // 限流
    if (status === 429 || code.includes('Throttling') || code.includes('RateLimit')) {
        return 'AI 服务调用过于频繁，请稍后重试';
    }
    // 超时
    if (msg.includes('timeout') || code.includes('Timeout') || msg.includes('ETIMEDOUT')) {
        return 'AI 生成超时，请稍后重试';
    }
    // 网络错误
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET')) {
        return '网络连接失败，请检查网络后重试';
    }
    // 图片格式问题
    if (code.includes('InvalidImage') || code.includes('Image') || apiMsg.includes('image')) {
        return '图片格式或尺寸不符合要求，请更换图片重试';
    }
    // 参数错误
    if (status === 400 || code.includes('InvalidParameter') || code.includes('BadRequest')) {
        return apiMsg || '请求参数有误，请检查后重试';
    }

    return apiMsg || msg || 'AI 生成失败，请重试';
}

// ========== 阿里云人脸融合 ==========

/**
 * 获取阿里云 facebody 客户端（单例）
 */
function getClient() {
    if (facebodyClient) return facebodyClient;

    const { accessKeyId, accessKeySecret, endpoint } = config.ai.aliyun;
    if (!accessKeyId || !accessKeySecret) {
        throw new Error('阿里云 AccessKey 未配置，请在 .env 中设置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET');
    }

    const openApiConfig = new OpenApiConfig({
        accessKeyId,
        accessKeySecret,
        endpoint,
        type: 'access_key',
    });
    facebodyClient = new Facebody(openApiConfig);
    return facebodyClient;
}

/**
 * 上传本地文件或 URL 到阿里云 OSS，返回公网可访问的 URL
 */
async function uploadToOss(filePath) {
    const { accessKeyId, accessKeySecret } = config.ai.aliyun;
    const url = await ViapiUtil.upload(accessKeyId, accessKeySecret, filePath);
    return url;
}

/**
 * 判断是否为本地文件路径
 */
function isLocalFile(p) {
    if (!p) return false;
    if (p.startsWith('http://') || p.startsWith('https://')) return false;
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

/**
 * 注册模板：将模板图上传并注册到阿里云，获取 templateId 和人脸 ID 列表
 * @param {string} templateUrl - 模板图的 OSS URL
 * @param {string} cacheKey - 缓存标识
 * @returns {Promise<{templateId: string, faceIds: string[]}>}
 */
async function registerTemplate(templateUrl, cacheKey) {
    if (cacheKey && templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey);
    }

    const client = getClient();
    const request = new AddFaceImageTemplateRequest({ imageURL: templateUrl });
    const runtime = new RuntimeOptions({ readTimeout: 30000, connectTimeout: 10000 });

    const response = await client.addFaceImageTemplateWithOptions(request, runtime);
    const data = response?.body?.data;

    if (!data?.templateId) {
        throw new Error('模板注册失败：未返回 templateId');
    }

    const templateId = data.templateId;
    const faceIds = (data.faceInfos || []).map((f) => f.templateFaceID).filter(Boolean);

    const result = { templateId, faceIds };
    if (cacheKey) {
        templateCache.set(cacheKey, result);
    }

    console.log(`[aliyun] 模板注册成功: templateId=${templateId}, faceCount=${faceIds.length}`);
    return result;
}

/**
 * 人脸融合：将用户照片的人脸融合到模板中
 * @param {string} templateId - 模板 ID
 * @param {string[]} faceIds - 模板中的人脸 ID 列表
 * @param {string} mergeUrl - 用户照片的 OSS URL
 * @param {string} style - 风格参数
 * @returns {Promise<string>} 融合结果图 URL
 */
async function mergeFace(templateId, faceIds, mergeUrl, style) {
    const client = getClient();

    // 默认替换模板中第一张（最大）人脸
    const targetFaceId = faceIds[0];

    const mergeInfo = new MergeImageFaceRequestMergeInfos({
        imageURL: mergeUrl,
        templateFaceID: targetFaceId,
    });

    const request = new MergeImageFaceRequest({
        templateId,
        mergeInfos: [mergeInfo],
        // 表情包场景不添加 AI 水印，保证画面干净
        addWatermark: false,
        modelVersion: 'v1',
    });

    const runtime = new RuntimeOptions({
        readTimeout: 60000,
        connectTimeout: 10000,
    });

    const response = await client.mergeImageFaceWithOptions(request, runtime);
    const resultUrl = response?.body?.data?.imageURL;

    if (!resultUrl) {
        throw new Error('AI 融合返回空结果');
    }

    return resultUrl;
}

/**
 * 阿里云人脸融合完整流程
 */
async function aliyunFuse(photoPath, templatePath, fusionType, style) {
    // 先验证 AccessKey 配置，避免上传阶段才报错
    getClient();

    console.log(`[aliyun] 开始融合: photo=${photoPath}, template=${templatePath}, type=${fusionType}, style=${style}`);

    // 1. 上传用户照片到 OSS
    const mergeUrl = await uploadToOss(photoPath);
    console.log(`[aliyun] 用户照片已上传: ${mergeUrl}`);

    // 2. 获取模板 URL（本地文件需上传，URL 直接使用）
    let templateUrl;
    let cacheKey;
    if (isLocalFile(templatePath)) {
        templateUrl = await uploadToOss(templatePath);
        cacheKey = templatePath;
        console.log(`[aliyun] 模板已上传: ${templateUrl}`);
    } else {
        templateUrl = templatePath;
        cacheKey = templatePath;
    }

    // 3. 注册模板（带缓存）
    const { templateId, faceIds } = await registerTemplate(templateUrl, cacheKey);
    if (!faceIds.length) {
        const err = new Error('no face detected in template');
        err.code = 'NO_FACE_IN_TEMPLATE';
        throw err;
    }

    // 4. 执行人脸融合
    const resultUrl = await mergeFace(templateId, faceIds, mergeUrl, style);
    console.log(`[aliyun] 融合完成: resultUrl=${resultUrl}`);

    return resultUrl;
}

/**
 * 将阿里云 SDK 错误映射为友好的中文提示
 */
function mapAliyunError(err) {
    const msg = err.message || '';
    const code = err.code || err.statusCode || '';

    // AccessKey 问题
    if (msg.includes('AccessKey') || msg.includes('accessKeyId') || msg.includes('accessKeySecret') || msg.includes('未配置') || code === 'InvalidAccessKeyId.NotFound' || code === 'ParameterMissing') {
        return '阿里云 AccessKey 配置无效或未设置，请检查 .env 文件中的 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET';
    }
    // 未开通服务 / 无权限
    if (msg.includes('Forbidden') || code === 'Forbidden' || code === 'AccessDenied') {
        return '阿里云人脸融合服务未开通或无权限，请先在视觉智能开放平台开通服务';
    }
    // 无人脸
    if (msg.includes('no face') || msg.includes('NoFace') || msg.includes('NO_FACE') || code === 'InvalidImage.NoFace') {
        return '未在照片中发现人脸，请上传清晰的人脸照片';
    }
    // 超时
    if (msg.includes('timeout') || code === 'RequestTimeout' || code === 'TimeOut') {
        return 'AI 服务响应超时，请稍后重试';
    }
    // 网络错误
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('network')) {
        return '网络连接失败，请检查网络后重试';
    }
    // 图片格式/大小问题
    if (msg.includes('InvalidImage') || code === 'InvalidImage') {
        return '图片格式或尺寸不符合要求，请更换图片重试';
    }
    // 配额不足
    if (code === 'Throttling' || msg.includes('throttl')) {
        return 'AI 服务调用过于频繁，请稍后重试';
    }

    return msg || '融合失败，请重试';
}

// ========== Mock 融合 ==========

async function mockFuse(photoPath, templatePath, fusionType, style) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    console.log(`[mock] 融合完成: type=${fusionType}, style=${style}`);
    return result;
}
