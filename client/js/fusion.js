// ========== 融合生成流程 ==========
import { state } from './app.js';
import { $, randomId } from './utils.js';
import { showResult } from './result.js';

// 结果占位图（mock，阶段一替换为真实后端调用）
const resultImages = [
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TRkCyFl4eolq0/giphy.gif',
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3hiY2JvYW54OHJvYXFwem0wZjhtYnU5cXZid3hhN2J5bzJtazhxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/D6InoH7TLxMsM/200.gif',
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VZzhwBfkShAHN2LC45/200.gif',
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3hiY2JvYW54OHJvYXFwem0wZjhtYnU5cXZid3hhN2J5bzJtazhxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l41Yq2tI3wSgOVQ1q/200.gif',
    'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0Om9UjOvTmBZQH5eFe/giphy.gif'
];

export function initFusion() {
    $('#generateBtn').addEventListener('click', startGeneration);
}

function startGeneration() {
    const main = $('#mainInterface');
    const loading = $('#loadingOverlay');

    main.style.display = 'none';
    loading.classList.remove('hidden');

    $('#memeId').textContent = randomId();
    $('#threadId').textContent = '#' + randomId();

    // 模拟加载阶段（阶段一替换为真实后端调用）
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

    setTimeout(() => {
        // mock：随机选一张结果图（阶段一改为调用后端）
        state.resultImageUrl = resultImages[Math.floor(Math.random() * resultImages.length)];
        showResult();
    }, 3200);
}
