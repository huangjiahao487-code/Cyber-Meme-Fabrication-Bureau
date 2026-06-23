// ========== Fabric.js 编辑器 ==========
import { state } from './app.js';
import { $, $$ } from './utils.js';

let canvas = null;
let currentTool = null;
let currentColor = '#FF6B35';
let isDrawingMode = false;

// 预设颜色
const colors = [
    '#FF6B35', '#FF4757', '#FFD93D', '#A8E06C',
    '#48DBFB', '#FF9FF3', '#2D1B0E', '#FFFFFF'
];

// 预设气泡样式
const bubbleStyles = [
    { name: '圆角气泡', type: 'rounded' },
    { name: '尖角气泡', type: 'pointer' },
    { name: '方形气泡', type: 'square' }
];

export function initEditor() {
    // 初始化按钮事件
    $('#editorUndo')?.addEventListener('click', undo);
    $('#editorRedo')?.addEventListener('click', redo);
    $('#editorDownload')?.addEventListener('click', downloadEditor);
    $('#editorBack')?.addEventListener('click', backToResult);
    
    // 工具按钮
    $$('.tool-button').forEach(btn => {
        btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });
    
    // 颜色选择
    $$('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => selectColor(swatch.dataset.color));
    });
    
    // 文字输入
    $('#editorTopText')?.addEventListener('input', updateTopText);
    $('#editorBottomText')?.addEventListener('input', updateBottomText);
    
    // 气泡样式
    $('#editorBubbleStyle')?.addEventListener('change', addBubble);
}

// 初始化画布
export function initCanvas(imageUrl) {
    const canvasEl = $('#editorCanvas');
    if (!canvasEl) return;
    
    // 清理旧画布
    if (canvas) {
        canvas.dispose();
    }
    
    // 创建新画布
    canvas = new fabric.Canvas('editorCanvas', {
        width: 500,
        height: 500,
        backgroundColor: '#FFF8F0'
    });
    
    // 加载背景图
    fabric.Image.fromURL(imageUrl, (img) => {
        // 缩放图片适应画布
        const scale = Math.min(500 / img.width, 500 / img.height);
        img.scale(scale);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    }, { crossOrigin: 'anonymous' });
    
    // 显示编辑器
    $('#editorOverlay').classList.remove('hidden');
}

// 选择工具
function selectTool(tool) {
    currentTool = tool;
    
    // 更新按钮状态
    $$('.tool-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    // 切换画布模式
    if (canvas) {
        canvas.isDrawingMode = (tool === 'doodle');
        
        if (tool === 'doodle') {
            canvas.freeDrawingBrush.color = currentColor;
            canvas.freeDrawingBrush.width = 5;
        } else if (tool === 'crop') {
            startCropMode();
        }
    }
}

// 选择颜色
function selectColor(color) {
    currentColor = color;
    
    // 更新颜色选择器状态
    $$('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color === color);
    });
    
    // 更新画笔颜色
    if (canvas && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color;
    }
}

// 更新顶部文字
function updateTopText(e) {
    const text = e.target.value;
    updateText('top', text);
}

// 更新底部文字
function updateBottomText(e) {
    const text = e.target.value;
    updateText('bottom', text);
}

// 更新文字
function updateText(position, text) {
    if (!canvas) return;
    
    // 移除旧文字
    const objects = canvas.getObjects();
    const oldText = objects.find(obj => obj.data?.position === position);
    if (oldText) {
        canvas.remove(oldText);
    }
    
    // 添加新文字
    if (text) {
        const yPos = position === 'top' ? 40 : 460;
        const fabricText = new fabric.Text(text, {
            left: 250,
            top: yPos,
            fontFamily: 'Noto Sans SC, Arial, sans-serif',
            fontSize: 36,
            fontWeight: 'bold',
            fill: position === 'top' ? '#FFD93D' : '#FF6B35',
            originX: 'center',
            originY: 'center',
            shadow: new fabric.Shadow({
                color: position === 'top' ? '#FF6B35' : '#FF4757',
                blur: 8,
                offsetX: 0,
                offsetY: 0
            }),
            data: { position }
        });
        
        canvas.add(fabricText);
        canvas.renderAll();
    }
}

// 添加气泡
function addBubble(e) {
    if (!canvas) return;
    
    const style = e.target.value;
    if (!style) return;
    
    const group = createBubble(style);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    
    // 重置选择
    e.target.value = '';
}

// 创建气泡
function createBubble(style) {
    const bubble = new fabric.Rect({
        width: 200,
        height: 80,
        fill: 'white',
        stroke: '#FF6B35',
        strokeWidth: 3,
        rx: style === 'rounded' ? 20 : 0,
        ry: style === 'rounded' ? 20 : 0
    });
    
    const text = new fabric.Text('点击编辑', {
        fontFamily: 'Noto Sans SC, Arial, sans-serif',
        fontSize: 24,
        fill: '#2D1B0E',
        originX: 'center',
        originY: 'center',
        editable: true
    });
    
    const group = new fabric.Group([bubble, text], {
        left: 150,
        top: 150,
        data: { type: 'bubble' }
    });
    
    // 双击编辑文字
    group.on('mousedblclick', () => {
        text.set('editable', true);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
    });
    
    return group;
}

// 裁剪模式
function startCropMode() {
    if (!canvas) return;
    
    // 创建裁剪框
    const rect = new fabric.Rect({
        left: 50,
        top: 50,
        width: 400,
        height: 400,
        fill: 'rgba(255, 107, 53, 0.2)',
        stroke: '#FF6B35',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        cornerColor: '#FF6B35',
        cornerSize: 10,
        transparentCorners: false,
        hasRotatingPoint: false,
        data: { type: 'crop' }
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    
    // 应用裁剪
    $('#editorApplyCrop')?.classList.remove('hidden');
    $('#editorApplyCrop')?.addEventListener('click', applyCrop);
}

// 应用裁剪
function applyCrop() {
    if (!canvas) return;
    
    const objects = canvas.getObjects();
    const cropRect = objects.find(obj => obj.data?.type === 'crop');
    
    if (cropRect) {
        const left = cropRect.left;
        const top = cropRect.top;
        const width = cropRect.width * cropRect.scaleX;
        const height = cropRect.height * cropRect.scaleY;
        
        // 移除裁剪框
        canvas.remove(cropRect);
        
        // 裁剪画布
        const dataURL = canvas.toDataURL({
            left,
            top,
            width,
            height,
            format: 'png'
        });
        
        // 重新加载裁剪后的图片
        canvas.clear();
        canvas.setWidth(width);
        canvas.setHeight(height);
        
        fabric.Image.fromURL(dataURL, (img) => {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        });
        
        $('#editorApplyCrop')?.classList.add('hidden');
    }
}

// 撤销
function undo() {
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
        canvas.remove(objects[objects.length - 1]);
        canvas.renderAll();
    }
}

// 重做（简化版）
function redo() {
    // Fabric.js 不内置重做，这里留空
    console.log('重做功能待实现');
}

// 下载
function downloadEditor() {
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1
    });
    
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

// 返回结果页
function backToResult() {
    $('#editorOverlay').classList.add('hidden');
    $('#resultOverlay').classList.remove('hidden');
}
