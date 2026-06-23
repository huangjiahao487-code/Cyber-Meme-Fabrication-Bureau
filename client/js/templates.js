// ========== 模板选择 ==========
import { state } from './app.js';
import { $, $$, readFileAsDataURL } from './utils.js';

export function initTemplates() {
    // 内置模板选择
    $$('.template-card:not(.upload-template-card)').forEach((card) => {
        card.addEventListener('click', () => selectTemplate(card));
    });

    // 上传模板
    const uploadCard = $('#uploadTemplateCard');
    const fileInput = $('#templateFileInput');

    uploadCard.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleTemplateUpload);
}

function selectTemplate(el) {
    $$('.template-card').forEach((c) => c.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedTemplate = el.dataset.index;
    state.selectedTemplateUrl = el.querySelector('img')?.src || null;
}

async function handleTemplateUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const dataURL = await readFileAsDataURL(file);

    // 添加到用户模板列表
    const userTemplateGrid = $('#userTemplateGrid');
    const userTemplatesContainer = $('#userTemplatesContainer');

    const templateIndex = `user-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.index = templateIndex;
    card.dataset.url = dataURL;
    card.innerHTML = `
        <div class="template-check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="template-img-wrap">
            <img src="${dataURL}" alt="用户模板">
        </div>
        <div class="p-3 text-center" style="background: white;">
            <span class="text-sm font-bold" style="color: var(--orange);">📦 ${file.name.slice(0, 10)}</span>
        </div>
    `;

    card.addEventListener('click', () => selectTemplate(card));
    userTemplateGrid.appendChild(card);

    // 显示用户模板区域
    userTemplatesContainer.classList.remove('hidden');

    // 自动选中新上传的模板
    selectTemplate(card);

    // 清空 input 以便重复上传
    event.target.value = '';
}

