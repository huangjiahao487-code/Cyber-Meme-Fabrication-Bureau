// ========== AI 融合服务 ==========
// 当前为 mock 实现，阶段一接入真实 AI API
import config from '../config.js';

// mock 结果图（模拟 AI 融合输出）
const mockResults = [
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TRkCyFl4eolq0/giphy.gif',
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3hiY2JvYW54OHJvYXFwem0wZjhtYnU5cXZid3hhN2J5bzJtazhxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/D6InoH7TLxMsM/200.gif',
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VZzhwBfkShAHN2LC45/200.gif',
];

/**
 * 融合图片
 * @param {string} photoPath - 用户照片路径
 * @param {string} templatePath - 模板图片路径
 * @param {string} fusionType - 融合方式: face_swap | expression_transfer
 * @param {string} style - 风格: humor | natural | cartoon
 * @returns {Promise<string>} 结果图 URL
 */
export async function fuseImage(photoPath, templatePath, fusionType, style) {
    if (config.ai.provider === 'mock') {
        return mockFuse(photoPath, templatePath, fusionType, style);
    }

    // TODO: 阶段一接入真实 AI API
    // 1. 根据 config.ai.provider 选择阿里云/腾讯云
    // 2. 上传 photo 和 template
    // 3. 根据 fusionType 调用换脸/表情驱动
    // 4. 根据 style 调整参数
    // 5. 返回融合结果 URL
    return mockFuse(photoPath, templatePath, fusionType, style);
}

// mock 融合：随机返回一张图，模拟处理耗时
async function mockFuse(photoPath, templatePath, fusionType, style) {
    // 模拟 AI 处理耗时
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    console.log(`[mock] 融合完成: type=${fusionType}, style=${style}`);
    return result;
}
