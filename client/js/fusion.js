// ========== 融合生成流程 ==========
import { state } from './app.js';
import { $, randomId } from './utils.js';
import { showResult } from './result.js';

export function initFusion() {
    $('#generateBtn').addEventListener('click', startGeneration);
}

async function startGeneration() {
    const main = $('#mainInterface');
    const loading = $('#loadingOverlay');

    main.style.display = 'none';
    loading.classList.remove('hidden');

    $('#memeId').textContent = randomId();
    $('#threadId').textContent = '#' + randomId();

    // 启动持续滚动的进度动画（AI 生成耗时 10-40 秒，不能用固定时间）
    let progress = 5;
    const progressTimer = setInterval(() => {
        // 缓慢逼近 90%，永远不到 100%，等真实结果回来再填满
        progress = progress + (90 - progress) * 0.08;
        $('#progressFill').style.width = progress + '%';
    }, 400);

    const stageTexts = [
        '🔍 正在提取面部特征...', '🧬 正在匹配基因序列...',
        '✂️ 正在进行基因缝合...', '🎨 正在注入灵魂...',
        '⏳ AI 正在生成中，请稍候...', '✨ 正在渲染最终画面...',
    ];
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
        $('#loadingText').textContent = stageTexts[stageIdx % stageTexts.length];
        $('#loadingSubtext').textContent = 'PROCESSING... ' + Math.floor(progress) + '%';
        $('#threadId').textContent = '#' + randomId();
        stageIdx++;
    }, 2000);

    try {
        // 准备表单数据
        const formData = new FormData();
        
        // 将用户上传的照片转换为 Blob
        const photoResponse = await fetch(state.uploadedImage);
        const photoBlob = await photoResponse.blob();
        formData.append('photo', photoBlob, 'photo.jpg');
        
        // 处理模板：如果是 dataURL（用户上传），转为文件上传；否则传 URL
        if (state.selectedTemplateUrl && state.selectedTemplateUrl.startsWith('data:')) {
            const templateResponse = await fetch(state.selectedTemplateUrl);
            const templateBlob = await templateResponse.blob();
            formData.append('templateFile', templateBlob, 'template.jpg');
        } else {
            formData.append('templateUrl', state.selectedTemplateUrl);
        }
        
        // 添加融合方式和风格
        formData.append('fusionType', state.fusionType);
        formData.append('style', state.style);

        // 调用后端 API（带 3 分钟超时，AI 生成耗时较长）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        const apiResponse = await fetch('/api/fusion', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // 防御性解析：先拿文本，再尝试 JSON 解析，避免 SyntaxError
        const responseText = await apiResponse.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error('服务器返回了非预期的内容，请重试');
        }

        if (apiResponse.ok && result.success) {
            // 保存结果图片 URL
            state.resultImageUrl = result.resultUrl;
            // 进度填满后展示结果
            clearInterval(progressTimer);
            clearInterval(stageTimer);
            $('#progressFill').style.width = '100%';
            $('#loadingText').textContent = '✨ 生成完成！';
            setTimeout(() => showResult(), 400);
        } else {
            throw new Error(result.message || `生成失败（HTTP ${apiResponse.status}）`);
        }
    } catch (error) {
        clearInterval(progressTimer);
        clearInterval(stageTimer);
        console.error('生成失败:', error);
        
        // 友好的错误提示
        let errorMsg = '生成失败，请重试';
        if (error.name === 'AbortError') {
            errorMsg = 'AI 生成超时（超过 3 分钟），请稍后重试';
        } else if (error.message?.includes('timeout')) {
            errorMsg = 'AI 服务响应超时，请稍后重试';
        } else if (error.message?.includes('no face') || error.message?.includes('未在照片')) {
            errorMsg = '未在照片中发现人脸，请上传清晰的人脸照片';
        } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
            errorMsg = '网络连接失败，请检查网络后重试';
        } else if (error.message?.includes('非预期')) {
            errorMsg = 'AI 服务响应异常，请稍后重试';
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        alert(errorMsg);
        
        // 恢复界面
        loading.classList.add('hidden');
        main.style.display = 'block';
        $('#progressFill').style.width = '0%';
    }
}
