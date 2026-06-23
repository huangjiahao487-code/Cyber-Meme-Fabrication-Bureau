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

    // 显示加载阶段
    const stages = [
        { text: '🔍 正在提取面部特征...', sub: 'SCANNING facial_landmarks...', progress: 20, time: 600 },
        { text: '🧬 正在匹配基因序列...', sub: 'MATCHING meme_DNA_sequences...', progress: 45, time: 1200 },
        { text: '✂️ 正在进行基因缝合...', sub: 'STITCHING chromosomes_together...', progress: 70, time: 1800 },
        { text: '🎨 正在注入灵魂...', sub: 'INJECTing soul_essence_final...', progress: 90, time: 2500 },
        { text: '✨ 即将完成！', sub: 'FINALIZING masterpiece...', progress: 100, time: 2900 },
    ];

    stages.forEach((stage) => {
        setTimeout(() => {
            $('#loadingText').textContent = stage.text;
            $('#loadingSubtext').textContent = stage.sub;
            $('#progressFill').style.width = stage.progress + '%';
            $('#threadId').textContent = '#' + randomId();
        }, stage.time);
    });

    try {
        // 准备表单数据
        const formData = new FormData();
        
        // 将用户上传的照片转换为 Blob
        const photoResponse = await fetch(state.uploadedImage);
        const photoBlob = await photoResponse.blob();
        formData.append('photo', photoBlob, 'photo.jpg');
        
        // 添加模板 URL
        formData.append('templateUrl', state.selectedTemplateUrl);
        
        // 添加融合方式和风格
        formData.append('fusionType', state.fusionType);
        formData.append('style', state.style);

        // 调用后端 API
        const apiResponse = await fetch('/api/fusion', {
            method: 'POST',
            body: formData
        });

        const result = await apiResponse.json();

        if (result.success) {
            // 保存结果图片 URL
            state.resultImageUrl = result.resultUrl;
            showResult();
        } else {
            throw new Error(result.message || '生成失败');
        }
    } catch (error) {
        console.error('生成失败:', error);
        alert('生成失败: ' + error.message);
        
        // 恢复界面
        loading.classList.add('hidden');
        main.style.display = 'block';
    }
}
