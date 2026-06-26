// ========== 照片上传与预览 ==========
import { state } from './app.js';
import { $, readFileAsDataURL } from './utils.js';

export function initUpload() {
    const uploadZone = $('#uploadZone');
    const fileInput = $('#fileInput');

    // 点击上传
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // 拖拽上传
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--coral)';
        uploadZone.style.boxShadow = '0 8px 30px rgba(255,71,87,0.15)';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = '';
        uploadZone.style.boxShadow = '';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.boxShadow = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            showPreview(file);
        }
    });
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    await showPreview(file);
}

async function showPreview(file) {
    const dataURL = await readFileAsDataURL(file);
    state.uploadedImage = dataURL;
    $('#previewImg').src = dataURL;
    $('#uploadPlaceholder').classList.add('hidden');
    $('#uploadPreview').classList.remove('hidden');
}
