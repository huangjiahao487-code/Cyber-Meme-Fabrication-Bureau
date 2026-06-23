// ========== 全局状态与模块协调 ==========
import { initUpload } from './upload.js';
import { initTemplates } from './templates.js';
import { initFusion } from './fusion.js';
import { initResult } from './result.js';
import { initEditor } from './editor.js';
import { startEmojiFloat } from './effects.js';
import { initFusionSelector } from './fusionSelector.js';

// 全局状态（各模块共享）
export const state = {
    uploadedImage: null,      // 用户上传的照片 DataURL
    selectedTemplate: null,   // 选中的模板 index
    selectedTemplateUrl: null, // 选中的模板图片 URL
    fusionType: 'face_swap',  // 融合方式: face_swap | expression_transfer
    style: 'humor',           // 融合风格: humor | natural | cartoon
    resultImageUrl: null,     // 融合结果图 URL
};

// 模块初始化入口
function init() {
    initUpload();
    initTemplates();
    initFusionSelector();
    initFusion();
    initResult();
    initEditor();
    startEmojiFloat();
}

document.addEventListener('DOMContentLoaded', init);
