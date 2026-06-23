// ========== Multer 上传中间件配置 ==========
import multer from 'multer';
import path from 'path';
import config from '../config.js';
import { ensureDir } from '../services/storage.js';

// 照片存储配置
const photoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDir(config.uploadsDir);
        cb(null, config.uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

// 模板存储配置
const templateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDir(config.uploadsDir);
        cb(null, config.uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `template-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

// 文件过滤器
function fileFilter(req, file, cb) {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
}

export const uploadPhoto = multer({
    storage: photoStorage,
    fileFilter,
    limits: { fileSize: config.upload.maxFileSize },
});

export const uploadTemplate = multer({
    storage: templateStorage,
    fileFilter,
    limits: { fileSize: config.upload.maxFileSize },
});
