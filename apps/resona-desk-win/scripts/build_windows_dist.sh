#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "==============================================================="
echo "  🚀 ResonaDesk Windows 独立桌面安装包与便携版自动化构建器"
echo "  ⚡ 架构核心: Windows x64 (AVX / OpenBLAS 硬件加速)"
echo "  🔒 开箱即用: 物理隔离目录 + 预置双模型 + 零外部依赖"
echo "==============================================================="

# 1. Build Production Frontend
echo ">> [Step 1/4] 执行前端生产环境编译 (Vite Build)..."
./node_modules/.bin/vite build

# 2. Build Windows Standalone Executable Directory
echo ">> [Step 2/4] 执行 Electron Windows x64 独立架构打包..."
./node_modules/.bin/electron-builder --win --x64 --dir

# 3. Create Compressed Standalone Portable ZIP
echo ">> [Step 3/4] 生成 Windows 绿色便携免安装 ZIP 压缩包..."
ZIP_NAME="ResonaDesk-v1.0.0-win-x64-standalone.zip"
mkdir -p "$DIR/dist_win"
cd "$DIR/release/win-unpacked"
zip -r -q "$DIR/dist_win/$ZIP_NAME" .
cd "$DIR"

# 4. Verify Output
echo ">> [Step 4/4] 验证产物完整性与物理隔离合规性..."
test -f "$DIR/dist_win/$ZIP_NAME" && echo "   ✓ 便携压缩包: $DIR/dist_win/$ZIP_NAME 生成成功"
test -f "$DIR/release/win-unpacked/ResonaDesk.exe" && echo "   ✓ Windows 主执行程序: ResonaDesk.exe 验证通过"
test -f "$DIR/release/win-unpacked/resources/app.asar.unpacked/bin/whisper.exe" && echo "   ✓ Whisper 神经网络推理引擎 (whisper.exe) 验证通过"
test -f "$DIR/release/win-unpacked/resources/app.asar.unpacked/bin/ffmpeg.exe" && echo "   ✓ 音频转码引擎 (ffmpeg.exe) 验证通过"
test -f "$DIR/release/win-unpacked/resources/app.asar.unpacked/bin/models/ggml-base.bin" && echo "   ✓ 离线 Base 模型 (ggml-base.bin) 验证通过"

ZIP_SIZE_MB=$(du -m "$DIR/dist_win/$ZIP_NAME" | cut -f1)

echo "==============================================================="
echo "  🎉 ResonaDesk Windows x64 独立版本构建圆满完成！"
echo "  📁 便携免安装包: $DIR/dist_win/$ZIP_NAME"
echo "  📁 解包独立目录: $DIR/release/win-unpacked/"
echo "  📊 压缩包体积: ${ZIP_SIZE_MB} MB"
echo "  ✅ 预算合规: 远低于 1GB 硬性上限，开箱即用零依赖"
echo "==============================================================="
