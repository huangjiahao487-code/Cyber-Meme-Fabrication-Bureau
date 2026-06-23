// ========== 融合方式与风格选择 ==========
import { state } from './app.js';
import { $$ } from './utils.js';

export function initFusionSelector() {
    // 融合方式选择
    $$('.fusion-type-card').forEach(card => {
        card.addEventListener('click', () => selectFusionType(card));
    });
    
    // 风格选择
    $$('.style-card').forEach(card => {
        card.addEventListener('click', () => selectStyle(card));
    });
}

function selectFusionType(card) {
    // 移除所有选中状态
    $$('.fusion-type-card').forEach(c => c.classList.remove('selected'));
    // 添加当前选中状态
    card.classList.add('selected');
    // 更新状态
    state.fusionType = card.dataset.type;
}

function selectStyle(card) {
    // 移除所有选中状态
    $$('.style-card').forEach(c => c.classList.remove('selected'));
    // 添加当前选中状态
    card.classList.add('selected');
    // 更新状态
    state.style = card.dataset.style;
}
