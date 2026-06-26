// ========== 融合接口（异步架构）==========
// 因 AI 生成耗时 30-40 秒，超过预览代理超时，改为异步：
//   POST /api/fusion        提交任务，立即返回 taskId
//   GET  /api/fusion/status/:taskId  轮询任务状态
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import config from '../config.js';
import { fuseImage } from '../services/aiService.js';
import { getFileUrl, ensureDir } from '../services/storage.js';

const router = Router();

// 任务存储（内存，进程重启会丢失；足够当前场景使用）
const tasks = new Map();

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

// POST /api/fusion —— 提交融合任务，立即返回 taskId
// 请求: multipart/form-data
//   - photo: 用户照片文件（必填）
//   - templateFile: 模板图片文件（与 templateUrl 二选一）
//   - templateUrl: 模板图片 URL（与 templateFile 二选一）
//   - fusionType: face_swap | expression_transfer
//   - style: humor | natural | cartoon
// 响应: { success: true, taskId: "..." }
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
        const photoFilename = photoFile.filename;

        // 生成任务 ID
        const taskId = `task-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        // 记录任务初始状态
        tasks.set(taskId, {
            status: 'processing',
            createdAt: Date.now(),
            meta: { fusionType, style, photoUrl: getFileUrl(req, photoFilename) },
        });

        // 后台异步执行（不 await，立即返回 taskId）
        runFusionTask(taskId, photoPath, templatePath, fusionType, style).catch((err) => {
            console.error(`[task ${taskId}] 未捕获异常:`, err);
            const t = tasks.get(taskId);
            if (t && t.status === 'processing') {
                t.status = 'failed';
                t.message = err.message || '融合失败，请重试';
            }
        });

        console.log(`[task ${taskId}] 任务已提交`);
        res.json({ success: true, taskId });
    } catch (err) {
        console.error('提交任务失败:', err);
        res.status(500).json({ success: false, message: err.message || '提交任务失败' });
    }
});

// GET /api/fusion/status/:taskId —— 轮询任务状态
// 响应:
//   处理中: { status: "processing", progress: 50 }
//   成功:   { status: "success", resultUrl: "..." }
//   失败:   { status: "failed", message: "..." }
router.get('/status/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = tasks.get(taskId);

    if (!task) {
        return res.status(404).json({ success: false, message: '任务不存在或已过期' });
    }

    // 根据已耗时估算进度（AI 生成通常 20-40 秒）
    const elapsed = Date.now() - task.createdAt;
    const progress = task.status === 'processing'
        ? Math.min(95, Math.floor((elapsed / 35000) * 100))
        : 100;

    res.json({
        status: task.status,
        progress,
        resultUrl: task.resultUrl,
        message: task.message,
        meta: task.meta,
    });
});

// 后台执行融合任务
async function runFusionTask(taskId, photoPath, templatePath, fusionType, style) {
    const task = tasks.get(taskId);
    console.log(`[task ${taskId}] 开始融合: photo=${photoPath}, template=${templatePath}`);

    const resultUrl = await fuseImage(photoPath, templatePath, fusionType, style);

    task.status = 'success';
    task.resultUrl = resultUrl;
    console.log(`[task ${taskId}] 融合完成: ${resultUrl}`);
}

export default router;
