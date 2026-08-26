#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "==============================================================="
echo "  🚀 启动 ResonaDesk (声纹工作台) - macOS 独立桌面工作台"
echo "  ⚡ 算力核心: Apple Silicon Metal GPU (全静态二进制)"
echo "  📦 预置双模型: ggml-base (140MB) + ggml-small (465MB) [0 等待]"
echo "==============================================================="

# 1. Kill any existing process on 3188 or 5188 to prevent port collision
lsof -ti :3188 | xargs kill -9 2>/dev/null || true
lsof -ti :5188 | xargs kill -9 2>/dev/null || true

# 2. Ensure binaries executable
chmod +x "$DIR/bin/ffmpeg" "$DIR/bin/whisper-cli"

# 3. Start backend server
echo ">> 启动后台转写引擎 (端口 3188)..."
PORT=3188 node server.mjs &
SERVER_PID=$!

cleanup() {
  echo "\n正在优雅退出后台服务 (PID: $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for backend health check
echo ">> 等待后台引擎就绪..."
for i in {1..15}; do
  if curl -s "http://127.0.0.1:3188/api/health" >/dev/null 2>&1; then
    echo "   ✓ 后台引擎已成功在 http://127.0.0.1:3188 就绪！"
    break
  fi
  sleep 0.5
done

# 4. Start Vite UI on dedicated port 5188
echo ">> 启动前端交互工作台 (http://localhost:5188)..."
npx vite --port 5188 --strictPort --open
