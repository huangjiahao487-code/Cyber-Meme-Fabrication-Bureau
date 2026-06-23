// ========== 融合接口 ==========
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import config from '../config.js';
import { fuseImage } from '../services/aiService.js';
import { getFileUrl, ensureDir } from '../services/storage.js';

const router = Router();

// 配置同时处理两个文件的中间件
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            ensureDir(config.uploadsDir);
            cb(null, config.uploadsDir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const prefix = file.fieldname === 'photo' ? 'photo' : 'template';
            cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (config.upload.allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
        }
    },
    limits: { fileSize: config.upload.maxFileSize },
});

// POST /api/fusion
// 请求: multipart/form-data
//   - photo: 用户照片文件（必填）
//   - templateFile: 模板图片文件（与 templateUrl 二选一）
//   - templateUrl: 模板图片 URL（与 templateFile 二选一）
//   - fusionType: face_swap | expression_transfer
//   - style: humor | natural | cartoon
// 响应: { success: true, resultUrl: "..." } | { success: false, message: "..." }
router.post('/', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'templateFile', maxCount: 1 }
]), async (req, res) => {
    try {
        // 验证照片
        if (!req.files?.photo?.[0]) {
            return res.status(400).json({ success: false, message: '请上传照片' });
        }

        const photoFile = req.files.photo[0];
        const templateFile = req.files?.templateFile?.[0];
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

        const photoPath = photoFile.path;
        const templatePath = templateFile?.path || templateUrl || '';

        await processFusion(req, res, photoPath, templatePath, fusionType, style, photoFile.filename);
    } catch (err) {
        console.error('融合失败:', err);
        res.status(500).json({ success: false, message: err.message || '融合失败，请重试' });
    }
});

// 处理融合逻辑
async function processFusion(req, res, photoPath, templatePath, fusionType, style, photoFilename) {
    try {
        const resultUrl = await fuseImage(photoPath, templatePath, fusionType, style);
        
        res.json({
            success: true,
            resultUrl,
            meta: {
                fusionType,
                style,
                photoUrl: getFileUrl(req, photoFilename),
            },
        });
    } catch (err) {
        console.error('融合失败:', err);
        
        // 友好的错误提示
        let errorMessage = '融合失败，请重试';
        if (err.message?.includes('timeout')) {
            errorMessage = 'AI 服务响应超时，请稍后重试';
        } else if (err.message?.includes('no face')) {
            errorMessage = '未在照片中发现人脸，请上传清晰的人脸照片';
        } else if (err.message?.includes('network')) {
            errorMessage = '网络连接失败，请检查网络后重试';
        }
        
        res.status(500).json({ success: false, message: errorMessage });
    }
}

export default router;
