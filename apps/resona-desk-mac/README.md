# ResonaDesk (声纹工作台) — macOS 独立客户端

> **离线音视频极速转录、多说话人声纹分离与双语字幕工坊**
> 100% 离线隐私安全 • Apple Silicon Metal GPU 加速 • 零配置到手即用 • Final Cut Pro 剪辑工程一键导出

---

## 🌟 核心功能特性

1. **零依赖到手即用 (Zero-Config)**:
   - 内置针对 macOS Sonoma 深度优化的全静态 `whisper-cli`（Metal 加速）与极简 `ffmpeg`；
   - 捆绑 `ggml-base.bin` 基础模型（141MB），下载即用，无需配置 Python、CUDA 或 node 环境。
2. **交互式波形播放器 (Waveform Player)**:
   - Canvas 实时音频波形振幅图、毫秒级播放头定位、当前句子蓝光高亮联动；
   - 空格键快捷播放/暂停、多档倍速播放、+/- 3秒 快进快退。
3. **逐句时间轴精修工坊**:
   - 毫秒级时间戳微调（±100ms）；
   - 字幕一键拆分（Split）、合并（Merge）、增删（Add/Delete）；
   - 原文/译文双语双轨对照视图。
4. **多说话人声纹切分与角色管理**:
   - 自动发言时长占比看板；
   - 角色全局重命名（一键修改全文归属）；
   - 角色误识别一键合并归并。
5. **AI 智能精修工坊 (BYOK)**:
   - 自带 API Key（DeepSeek / OpenAI / Claude）；
   - 一键去语气词口语润色、双语逐句翻译、会议纪要提炼与小红书图文文案生成。
6. **专业多格式导出**:
   - 支持 **SRT、WebVTT、LRC 歌词、纯文本 TXT、Final Cut Pro XML (FCPXML 1.10)**；
   - 基于 Ed25519 非对称签名的 100% 离线 Pro 终身授权。

---

## 🚀 启动方式

```bash
# 启动本地完整桌面工作台
./start.sh

# 或者分别启动
node server.mjs          # 启动后台引擎 (端口 3188)
npx vite --port 5188     # 启动前端控制台 (端口 5188)
```

## 🧪 自动化测试

```bash
node tests/e2e_full_flow.test.mjs   # 全链路端到端自动化验收
```
