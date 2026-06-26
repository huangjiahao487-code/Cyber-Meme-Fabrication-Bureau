// ========== 模板管理接口 ==========
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { uploadTemplate } from '../middleware/upload.js';
import { getFileUrl, ensureDir } from '../services/storage.js';

const router = Router();

// 内置模板定义（阶段四扩充，图片存于 client/assets/templates/）
const builtinTemplates = [
    { id: 'doge', name: 'Doge 神烦狗', url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3hiY2JvYW54OHJvYXFwem0wZjhtYnU5cXZid3hhN2J5bzJtazhxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8FUmlOoL72HB3rR7wm/200.gif' },
    { id: 'drake', name: 'Drake 选择', url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3hiY2JvYW54OHJvYXFwem0wZjhtYnU5cXZid3hhN2J5bzJtazhxdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/D6InoH7TLxMsM/200.gif' },
    { id: 'cat', name: '暴躁猫猫', url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TRkCyFl4eolq0/giphy.gif' },
    { id: 'brain', name: '膨胀大脑', url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDRtY2ZqcXJiZmI3OGRhdnQxNDZwYmsyYm0xMWMzMXc0MXFsZWZ1cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VZzhwBfkShAHN2LC45/200.gif' },
];

// GET /api/templates - 获取内置模板列表
router.get('/', (req, res) => {
    res.json({ success: true, templates: builtinTemplates });
});

// POST /api/templates/upload - 用户上传模板
router.post('/upload', uploadTemplate.single('template'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '请上传模板图片' });
        }
        res.json({
            success: true,
            template: {
                id: req.file.filename,
                name: req.body.name || '自定义模板',
                url: getFileUrl(req, req.file.filename),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
