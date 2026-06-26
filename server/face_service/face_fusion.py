"""
人脸融合服务 - 基于 MediaPipe 关键点检测 + OpenCV 图像对齐融合
技术原理（类似抖音静态特效）：
  1. MediaPipe Face Landmarker 检测 478 个人脸关键点
  2. 提取人脸区域 + 计算仿射变换
  3. 把源人脸对齐到目标图的人脸位置
  4. 无缝融合（seamlessClone）+ 色彩校正 + 边缘羽化
"""
import os
import sys
import time
import base64
import io
from typing import Optional, Tuple

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from PIL import Image

# 模型文件路径
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'face_landmarker.task')


# MediaPipe Face Mesh 关键点索引
# 脸部轮廓（用于提取人脸区域）
FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109
]
# 左眼轮廓
LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
# 右眼轮廓
RIGHT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]
# 嘴部轮廓
MOUTH = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
# 鼻子（用于辅助对齐）
NOSE_TIP = 1


def decode_image(image_input: str) -> np.ndarray:
    """解码图片：支持文件路径或 base64 data URI"""
    if image_input.startswith('data:'):
        # base64 data URI: data:image/jpeg;base64,/9j/...
        header, b64 = image_input.split(',', 1)
        img_bytes = base64.b64decode(b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(image_input, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f'无法解码图片: {image_input[:50]}...')
    return img


def detect_face_landmarks(image: np.ndarray) -> Optional[dict]:
    """用 MediaPipe Tasks API 检测人脸关键点，返回关键点坐标和人脸区域"""
    h, w = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # 创建 FaceLandmarker（每次新建，避免并发问题）
    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)

    # MediaPipe Image 格式
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    detection_result = landmarker.detect(mp_image)
    landmarker.close()

    if not detection_result.face_landmarks:
        return None

    landmarks = detection_result.face_landmarks[0]
    # 所有关键点转像素坐标（归一化坐标 × 图像尺寸）
    points = np.array([(lm.x * w, lm.y * h) for lm in landmarks], dtype=np.float32)

    # 人脸轮廓点（用于计算人脸区域）
    oval_points = points[FACE_OVAL].astype(np.int32)

    # 计算人脸边界框（带外扩余量）
    x_min, y_min = oval_points.min(axis=0)
    x_max, y_max = oval_points.max(axis=0)
    face_w = x_max - x_min
    face_h = y_max - y_min
    # 外扩 20%，确保覆盖完整
    margin_x = int(face_w * 0.2)
    margin_y = int(face_h * 0.3)  # 上下多扩一点覆盖额头和下巴
    x_min = max(0, x_min - margin_x)
    y_min = max(0, y_min - margin_y)
    x_max = min(w, x_max + margin_x)
    y_max = min(h, y_max + margin_y)

    # 眼睛中心（用于计算对齐角度）
    left_eye_center = points[LEFT_EYE].mean(axis=0)
    right_eye_center = points[RIGHT_EYE].mean(axis=0)

    return {
        'points': points,
        'oval': oval_points,
        'bbox': (x_min, y_min, x_max, y_max),
        'left_eye_center': left_eye_center,
        'right_eye_center': right_eye_center,
        'nose_tip': points[NOSE_TIP],
    }


def extract_face_region(image: np.ndarray, face_info: dict) -> np.ndarray:
    """提取人脸区域（用轮廓做 mask）"""
    x_min, y_min, x_max, y_max = face_info['bbox']
    oval = face_info['oval']

    # 创建人脸 mask
    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(mask, oval, 255)

    # 羽化 mask 边缘
    mask = cv2.GaussianBlur(mask, (15, 15), 0)

    # 提取人脸区域图像
    face_region = image.copy()
    face_region[mask == 0] = 0

    return face_region[y_min:y_max, x_min:x_max], mask[y_min:y_max, x_min:x_max]


def align_face(source_img: np.ndarray, source_face: dict,
               target_img: np.ndarray, target_face: dict) -> Tuple[np.ndarray, tuple]:
    """
    把源人脸对齐到目标图的人脸位置
    使用眼睛中心和角度做仿射变换 + 缩放匹配
    """
    # 源人脸的眼睛中心和角度
    s_left = source_face['left_eye_center']
    s_right = source_face['right_eye_center']
    s_center = (s_left + s_right) / 2
    s_angle = np.degrees(np.arctan2(s_right[1] - s_left[1], s_right[0] - s_left[0]))
    s_eye_dist = np.linalg.norm(s_right - s_left)

    # 目标人脸的眼睛中心和角度
    t_left = target_face['left_eye_center']
    t_right = target_face['right_eye_center']
    t_center = (t_left + t_right) / 2
    t_angle = np.degrees(np.arctan2(t_right[1] - t_left[1], t_right[0] - t_left[0]))
    t_eye_dist = np.linalg.norm(t_right - t_left)

    # 计算缩放比例（让源人脸眼睛间距匹配目标）
    scale = t_eye_dist / s_eye_dist if s_eye_dist > 0 else 1.0
    # 缩小人脸比例，让人脸"融入"底板而非"遮住"底板（0.78 = 比目标脸小 22%）
    scale = scale * 0.78

    # 计算旋转角度差
    angle_diff = t_angle - s_angle

    # 构建仿射变换矩阵：先缩放+旋转，再平移到目标位置
    M = cv2.getRotationMatrix2D((float(s_center[0]), float(s_center[1])), angle_diff, scale)
    # 平移：把源中心移到目标中心
    M[0, 2] += t_center[0] - s_center[0]
    M[1, 2] += t_center[1] - s_center[1]

    h, w = target_img.shape[:2]
    aligned = cv2.warpAffine(source_img, M, (w, h),
                             flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_REFLECT)

    # 同样变换源人脸的 mask
    s_x_min, s_y_min, s_x_max, s_y_max = source_face['bbox']
    s_mask = np.zeros(source_img.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(s_mask, source_face['oval'], 255)
    s_mask = cv2.GaussianBlur(s_mask, (21, 21), 0)
    aligned_mask = cv2.warpAffine(s_mask, M, (w, h),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=0)

    return aligned, aligned_mask


def color_transfer(source: np.ndarray, target: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """色彩迁移：让源图像的肤色匹配目标图像"""
    # 在 mask 区域内统计目标图的颜色统计
    target_masked = target.copy()
    target_masked[mask == 0] = 0

    # 计算 mask 区域内目标图的均值和标准差
    mask_bool = mask > 127
    if mask_bool.sum() < 10:
        return source

    for c in range(3):
        t_channel = target[:, :, c][mask_bool]
        s_channel = source[:, :, c][mask_bool]
        t_mean, t_std = t_channel.mean(), t_channel.std() + 1e-6
        s_mean, s_std = s_channel.mean(), s_channel.std() + 1e-6
        source[:, :, c] = np.clip((source[:, :, c] - s_mean) / s_std * t_std + t_mean, 0, 255)

    return source


def seamless_blend(source: np.ndarray, source_mask: np.ndarray,
                   target: np.ndarray, target_face: dict,
                   blend_strength: float = 0.62) -> np.ndarray:
    """
    混合融合：用 alpha 混合让人脸"融入"底板，而非"遮住"底板。

    seamlessClone（泊松融合）会完全替换目标区域，导致底板被遮住。
    改为 alpha 混合：source 权重 blend_strength，底板透出 (1 - blend_strength)，
    让底板的色调/纹理从人脸区域透出来，达到"融入"效果。

    :param blend_strength: source 的权重，1.0=完全覆盖底板，0.62=底板透出 38%
    """
    h, w = target.shape[:2]

    # 确保 mask 是单通道
    if len(source_mask.shape) == 3:
        source_mask = cv2.cvtColor(source_mask, cv2.COLOR_BGR2GRAY)

    # 二值化
    _, mask_bin = cv2.threshold(source_mask, 10, 255, cv2.THRESH_BINARY)

    # 检查 mask 是否为空
    if mask_bin.sum() == 0:
        return target

    # 边缘羽化（让过渡更自然，避免硬边）
    mask_blur = cv2.GaussianBlur(mask_bin, (51, 51), 0)

    # 转 float 归一化到 0-1
    mask_f = mask_blur.astype(np.float32) / 255.0
    # 控制 source 的权重，让人脸"融入"底板，底板特征透出来
    mask_f = mask_f * blend_strength
    mask_f = mask_f[:, :, np.newaxis]

    # alpha 混合：result = source * mask + target * (1 - mask)
    source_f = source.astype(np.float32)
    target_f = target.astype(np.float32)
    result = (source_f * mask_f + target_f * (1.0 - mask_f)).astype(np.uint8)
    return result


def fuse_faces(source_path: str, target_path: str, output_path: str) -> dict:
    """
    人脸融合主函数
    :param source_path: 源人脸图片（用户照片）路径或 data URI
    :param target_path: 目标图片（模板）路径或 data URI
    :param output_path: 输出图片路径
    :return: {success, message, landmarks_count}
    """
    start = time.time()

    # 1. 解码图片
    source_img = decode_image(source_path)
    target_img = decode_image(target_path)
    print(f'[face_fusion] 源图尺寸: {source_img.shape}, 目标图尺寸: {target_img.shape}')

    # 2. 检测人脸关键点
    source_face = detect_face_landmarks(source_img)
    if source_face is None:
        return {'success': False, 'message': '未在用户照片中检测到人脸，请上传清晰的人脸照片'}

    target_face = detect_face_landmarks(target_img)
    if target_face is None:
        return {'success': False, 'message': '未在模板图片中检测到人脸，请更换模板'}

    print(f'[face_fusion] 检测到源人脸和目标人脸（各 468 个关键点）')

    # 3. 对齐源人脸到目标位置
    aligned_face, aligned_mask = align_face(source_img, source_face, target_img, target_face)
    print(f'[face_fusion] 人脸对齐完成')

    # 4. 色彩校正（让源人脸肤色匹配目标图）
    aligned_face = color_transfer(aligned_face.copy(), target_img, aligned_mask)
    print(f'[face_fusion] 色彩校正完成')

    # 5. 无缝融合
    result = seamless_blend(aligned_face, aligned_mask, target_img, target_face)
    print(f'[face_fusion] 无缝融合完成')

    # 6. 保存结果
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, result, [cv2.IMWRITE_JPEG_QUALITY, 95])

    elapsed = time.time() - start
    print(f'[face_fusion] 完成，耗时 {elapsed:.2f}s，输出: {output_path}')
    return {'success': True, 'message': '融合成功', 'elapsed': elapsed}


if __name__ == '__main__':
    # 命令行测试
    if len(sys.argv) < 4:
        print('用法: python face_fusion.py <源图> <目标图> <输出图>')
        sys.exit(1)
    result = fuse_faces(sys.argv[1], sys.argv[2], sys.argv[3])
    print(result)
