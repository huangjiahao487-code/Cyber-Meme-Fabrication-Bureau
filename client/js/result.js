// ========== 结果展示与下载 ==========
import { state } from './app.js';
import { $ } from './utils.js';
import { launchConfetti } from './effects.js';
import { initCanvas } from './editor.js';

export function initResult() {
    $('#saveBtn').addEventListener('click', saveResult);
    $('#editBtn').addEventListener('click', enterEditor);
    $('#redoBtn').addEventListener('click', redo);

    // ESC 返回重做
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !$('#resultOverlay').classList.contains('hidden')) {
            redo();
        }
    });
}

export function showResult() {
    $('#loadingOverlay').classList.add('hidden');
    $('#resultOverlay').classList.remove('hidden');

    // 显示用户输入的文字
    const topText = $('#topText').value;
    const bottomText = $('#bottomText').value;
    $('#resultTopText').textContent = topText ? `"${topText}"` : '';
    $('#resultBottomText').textContent = bottomText ? `"${bottomText}"` : '';

    // 显示结果图
    const resultImg = $('#resultImg');
    resultImg.src = state.resultImageUrl;
    resultImg.onerror = function () {
        this.src = 'https://picsum.photos/seed/funny' + Date.now() + '/500/500';
    };

    launchConfetti();
}

function enterEditor() {
    // 隐藏结果页，显示编辑器
    $('#resultOverlay').classList.add('hidden');
    
    // 初始化画布
    initCanvas(state.resultImageUrl);
    
    // 预填充文字
    const topText = $('#topText').value;
    const bottomText = $('#bottomText').value;
    if (topText) {
        $('#editorTopText').value = topText;
    }
    if (bottomText) {
        $('#editorBottomText').value = bottomText;
    }
}

function saveResult() {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 500, 500);

    const imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    imgEl.onload = function () {
        ctx.drawImage(imgEl, 0, 0, 500, 500);

        const topText = $('#topText').value;
        const bottomText = $('#bottomText').value;

        ctx.font = 'bold 36px "Noto Sans SC", Arial, sans-serif';
        ctx.textAlign = 'center';

        if (topText) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, 500, 55);
            ctx.fillStyle = '#FFD93D';
            ctx.shadowColor = '#FF6B35';
            ctx.shadowBlur = 8;
            ctx.fillText(topText, 250, 40);
            ctx.shadowBlur = 0;
        }

        if (bottomText) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 445, 500, 55);
            ctx.fillStyle = '#FF6B35';
            ctx.shadowColor = '#FF4757';
            ctx.shadowBlur = 8;
            ctx.fillText(bottomText, 250, 485);
            ctx.shadowBlur = 0;
        }

        downloadCanvas(canvas);
    };
    imgEl.onerror = function () {
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#FF6B35';
        ctx.textAlign = 'center';
        ctx.fillText('🧬 赛博表情包制造局', 250, 240);
        ctx.fillStyle = '#FF4757';
        ctx.fillText($('#topText').value || 'MEME', 250, 200);
        ctx.fillText($('#bottomText').value || 'GENERATED', 250, 300);
        downloadCanvas(canvas);
    };
    imgEl.src = state.resultImageUrl;
}

function downloadCanvas(canvas) {
    const link = document.createElement('a');
    link.download = 'meme-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function redo() {
    $('#resultOverlay').classList.add('hidden');
    $('#mainInterface').style.display = '';
    $('#progressFill').style.width = '0%';
}
