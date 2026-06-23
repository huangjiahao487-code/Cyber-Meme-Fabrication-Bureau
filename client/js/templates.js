// ========== 模板选择 ==========
import { state } from './app.js';
import { $$ } from './utils.js';

export function initTemplates() {
    $$('.template-card').forEach((card) => {
        card.addEventListener('click', () => selectTemplate(card));
    });
}

function selectTemplate(el) {
    $$('.template-card').forEach((c) => c.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedTemplate = el.dataset.index;
}
