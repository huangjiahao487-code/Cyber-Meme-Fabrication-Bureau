// ========== 文件存储服务 ==========
import fs from 'fs';
import path from 'path';
import config from '../config.js';

// 确保目录存在
export function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 生成文件的访问 URL
export function getFileUrl(req, filename) {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

// 删除文件
export function deleteFile(filename) {
    const filePath = path.join(config.uploadsDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}
