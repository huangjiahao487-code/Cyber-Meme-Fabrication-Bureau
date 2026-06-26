// ========== 视觉特效：浮动 emoji + 彩纸 ==========
import { $ } from './utils.js';

const emojiPool = ['😂', '🤣', '😭', '🔥', '💀', '🤡', '👀', '✨', '🎉', '💅', '🤷', '🤦', '🫠', '😎', '🥴'];

// 持续生成浮动 emoji
export function startEmojiFloat() {
    setInterval(createEmoji, 1200);
    for (let i = 0; i < 10; i++) {
        setTimeout(createEmoji, i * 300);
    }
}

function createEmoji() {
    const emoji = document.createElement('div');
    emoji.className = 'float-emoji';
    emoji.textContent = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    emoji.style.left = Math.random() * 100 + 'vw';
    emoji.style.bottom = '-30px';
    emoji.style.fontSize = (Math.random() * 16 + 16) + 'px';
    emoji.style.animationDuration = (Math.random() * 10 + 8) + 's';
    $('#emojiContainer').appendChild(emoji);
    setTimeout(() => emoji.remove(), 18000);
}

// 彩纸庆祝
export function launchConfetti() {
    const container = $('#confettiContainer');
    container.innerHTML = '';
    const colors = ['#FF6B35', '#FF4757', '#FFD93D', '#A8E06C', '#FF9FF3', '#48DBFB'];
    const shapes = ['circle', 'square'];

    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const size = Math.random() * 10 + 5;

        confetti.style.width = size + 'px';
        confetti.style.height = size + 'px';
        confetti.style.background = color;
        confetti.style.borderRadius = shape === 'circle' ? '50%' : '2px';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-20px';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = (Math.random() * 0.8) + 's';

        container.appendChild(confetti);
    }

    setTimeout(() => { container.innerHTML = ''; }, 5000);
}
