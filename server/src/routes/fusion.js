// ========== 融合接口 ==========
import { Router } from 'express';
import { uploadPhoto } from '../middleware/upload.js';
import { fuseImage } from '../services/aiService.js';
import { getFileUrl } from '../services/storage.js';

const router = Router();

// POST /api/fusion
// 请求: multipart/form-data
//   - photo: 用户照片文件
//   - templateUrl: 模板图片 URL（与 templateFile 二选一）
//   - templateFile: 模板图片文件（与 templateUrl 二选一）
//   - fusionType: face_swap | expression_transfer
//   - style: humor | natural | cartoon
// 响应: { success: true, resultUrl: "..." } | { success: false, message: "..." }
router.post('/', uploadPhoto.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '请上传照片' });
        }

        const { fusionType = 'face_swap', style = 'humor', templateUrl } = req.body;

        // 验证参数
        const validFusionTypes = ['face_swap', 'expression_transfer'];
        const validStyles = ['humor', 'natural', 'cartoon'];
        if (!validFusionTypes.includes(fusionType)) {
            return res.status(400).json({ success: false, message: '无效的融合方式' });
        }
        if (!validStyles.includes(style)) {
            return res.status(400).json({ success: false, message: '无效的风格' });
        }

        const photoPath = req.file.path;
        // 阶段一：templateUrl 直接传入 AI 服务；templateFile 处理待补
        const templatePath = templateUrl || '';

        const resultUrl = await fuseImage(photoPath, templatePath, fusionType, style);

        res.json({
            success: true,
            resultUrl,
            meta: {
                fusionType,
                style,
                photoUrl: getFileUrl(req, req.file.filename),
            },
        });
    } catch (err) {
        console.error('融合失败:', err);
        res.status(500).json({ success: false, message: err.message || '融合失败，请重试' });
    }
});

export default router;
