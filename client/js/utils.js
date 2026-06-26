// ========== 工具函数 ==========

// DOM 查询简写
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

// 生成随机整数 ID
export function randomId(min = 1000, max = 9999) {
    return Math.floor(min + Math.random() * (max - min));
}

// 读取文件为 DataURL
export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Canvas 压缩图片（预留，阶段五使用）
export function compressImage(dataURL, maxSize = 500 * 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const ratio = Math.min(1, Math.sqrt(maxSize / (width * height * 0.5)));
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataURL;
    });
}
