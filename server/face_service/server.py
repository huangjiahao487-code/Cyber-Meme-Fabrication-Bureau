"""
人脸融合 HTTP 服务
提供 REST API 供 Node.js 后端调用
  POST /fuse  接收两张图片，返回融合结果
  GET  /health 健康检查
"""
import os
import sys
import time
import uuid
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler

import cv2
import numpy as np

# 把当前目录加入 path，方便导入 face_fusion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from face_fusion import fuse_faces, decode_image  # noqa: E402

# 配置
PORT = int(os.environ.get('FACE_SERVICE_PORT', '5000'))
OUTPUT_DIR = os.environ.get('FACE_SERVICE_OUTPUT_DIR',
                            os.path.join(os.path.dirname(__file__), '..', 'uploads', 'fused'))
os.makedirs(OUTPUT_DIR, exist_ok=True)


class FaceFusionHandler(BaseHTTPRequestHandler):
    def _send_json(self, code, data):
        body = __import__('json').dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return self.rfile.read(length) if length > 0 else b''

    def do_GET(self):
        if self.path == '/health':
            self._send_json(200, {'status': 'ok', 'service': 'face-fusion', 'port': PORT})
        else:
            self._send_json(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/fuse':
            self._send_json(404, {'error': 'not found'})
            return

        try:
            import json
            body = self._read_body()
            req = json.loads(body)

            source = req.get('source')      # 文件路径或 data URI
            target = req.get('target')      # 文件路径或 data URI
            # 可选：直接返回 base64 而非保存文件
            return_base64 = req.get('return_base64', False)

            if not source or not target:
                self._send_json(400, {'success': False, 'message': '缺少 source 或 target 参数'})
                return

            if return_base64:
                # 直接返回 base64，不保存文件
                from face_fusion import detect_face_landmarks, align_face, color_transfer, seamless_blend
                source_img = decode_image(source)
                target_img = decode_image(target)
                source_face = detect_face_landmarks(source_img)
                if source_face is None:
                    self._send_json(200, {'success': False,
                                          'message': '未在用户照片中检测到人脸，请上传清晰的人脸照片'})
                    return
                target_face = detect_face_landmarks(target_img)
                if target_face is None:
                    self._send_json(200, {'success': False,
                                          'message': '未在模板图片中检测到人脸，请更换模板'})
                    return
                aligned, mask = align_face(source_img, source_face, target_img, target_face)
                aligned = color_transfer(aligned.copy(), target_img, mask)
                result = seamless_blend(aligned, mask, target_img, target_face)
                # 编码为 base64
                ok, buffer = cv2.imencode('.jpg', result, [cv2.IMWRITE_JPEG_QUALITY, 95])
                import base64
                b64 = base64.b64encode(buffer).decode('ascii')
                self._send_json(200, {
                    'success': True,
                    'message': '融合成功',
                    'image_base64': f'data:image/jpeg;base64,{b64}',
                })
                return

            # 保存到文件
            output_filename = f'fused-{uuid.uuid4().hex[:12]}.jpg'
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            result = fuse_faces(source, target, output_path)
            if result['success']:
                result['output_path'] = output_path
                result['output_filename'] = output_filename
            self._send_json(200, result)

        except ValueError as e:
            print(f'[ERROR] 参数错误: {e}', file=sys.stderr)
            self._send_json(200, {'success': False, 'message': str(e)})
        except Exception as e:
            print(f'[ERROR] 融合失败: {e}', file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            self._send_json(500, {'success': False, 'message': f'服务内部错误: {e}'})

    def log_message(self, fmt, *args):
        # 简化日志
        print(f'[face-service] {self.address_string()} - {fmt % args}')


def main():
    print(f'人脸融合服务启动中... 端口 {PORT}')
    print(f'输出目录: {OUTPUT_DIR}')
    server = HTTPServer(('0.0.0.0', PORT), FaceFusionHandler)
    print(f'人脸融合服务已启动: http://localhost:{PORT}')
    print(f'  POST /fuse   融合人脸')
    print(f'  GET  /health 健康检查')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务停止')
        server.server_close()


if __name__ == '__main__':
    main()
