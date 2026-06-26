// ========== 融合生成流程（异步轮询模式）==========
// 因 AI 生成耗时 30-40 秒，超过代理超时，改为：
//   1. POST /api/fusion 提交任务，立即拿到 taskId
//   2. 每 2 秒轮询 /api/fusion/status/:taskId 直到完成
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

    // 进度条由轮询结果驱动，这里先启动文案轮播
    const stageTexts = [
        '🔍 正在提取面部特征...', '🧬 正在匹配基因序列...',
        '✂️ 正在进行基因缝合...', '🎨 正在注入灵魂...',
        '⏳ AI 正在生成中，请稍候...', '✨ 正在渲染最终画面...',
    ];
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
        $('#loadingText').textContent = stageTexts[stageIdx % stageTexts.length];
        $('#threadId').textContent = '#' + randomId();
        stageIdx++;
    }, 2500);

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

        // 1. 提交任务（快速返回 taskId）
        const submitResponse = await fetch('/api/fusion', {
            method: 'POST',
            body: formData,
        });
        const submitText = await submitResponse.text();
        let submitResult;
        try {
            submitResult = JSON.parse(submitText);
        } catch {
            throw new Error('服务器返回了非预期的内容，请重试');
        }

        if (!submitResponse.ok || !submitResult.success) {
            throw new Error(submitResult.message || `提交任务失败（HTTP ${submitResponse.status}）`);
        }

        const { taskId } = submitResult;

        // 2. 轮询任务状态，直到完成或失败
        const resultUrl = await pollTaskStatus(taskId, stageTimer);

        // 成功：展示结果
        clearInterval(stageTimer);
        $('#progressFill').style.width = '100%';
        $('#loadingText').textContent = '✨ 生成完成！';
        state.resultImageUrl = resultUrl;
        setTimeout(() => showResult(), 500);
    } catch (error) {
        clearInterval(stageTimer);
        console.error('生成失败:', error);

        let errorMsg = '生成失败，请重试';
        if (error.name === 'AbortError') {
            errorMsg = 'AI 生成超时，请稍后重试';
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

// 轮询任务状态，返回结果图 URL
async function pollTaskStatus(taskId, stageTimer) {
    const maxAttempts = 90; // 最多轮询 90 次（约 3 分钟）
    const interval = 2000;  // 每 2 秒一次

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, interval));

        let data;
        try {
            const resp = await fetch(`/api/fusion/status/${taskId}`);
            const text = await resp.text();
            data = JSON.parse(text);
        } catch {
            // 单次轮询失败不中断，继续重试
            continue;
        }

        // 更新进度条（以后端返回的进度为准）
        if (typeof data.progress === 'number') {
            $('#progressFill').style.width = data.progress + '%';
            $('#loadingSubtext').textContent = 'PROCESSING... ' + data.progress + '%';
        }

        if (data.status === 'success') {
            return data.resultUrl;
        }
        if (data.status === 'failed') {
            throw new Error(data.message || '融合失败，请重试');
        }
        // status === 'processing'，继续轮询
    }

    throw new Error('AI 生成超时，请稍后重试');
}
