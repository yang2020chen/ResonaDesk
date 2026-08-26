# ResonaDesk 第三方开源软件与授权声明 (Open Source Notices)

ResonaDesk (声纹工作台) 使用了以下优秀的开源软件、模型与算法库。特此向所有开源作者与社区致以诚挚的感谢。

---

## 1. 核心推理与计算引擎

### whisper.cpp
- **版权声明**: Copyright (c) 2023 Georgi Gerganov and whisper.cpp contributors
- **开源协议**: MIT License
- **项目主页**: https://github.com/ggerganov/whisper.cpp
- **使用方式**: 原生静态二进制 CLI 进程隔离调用 (Metal GPU 深度神经网络加速)

### FFmpeg
- **版权声明**: Copyright (c) 2000-2024 the FFmpeg developers
- **开源协议**: LGPL v2.1+ / GPL
- **项目主页**: https://ffmpeg.org/
- **架构合规**: 独立子进程 CLI 调用（Stdio 隔离通信，无静态源码混编）

### OpenAI Whisper GGML Models
- **版权声明**: Copyright (c) 2022 OpenAI
- **开源协议**: MIT License
- **权重转换**: ggerganov/whisper.cpp (GGML Format)

---

## 2. 前端与界面库

### React & React DOM
- **开源协议**: MIT License
- **版权声明**: Copyright (c) Meta Platforms, Inc. and affiliates.

### Lucide Icons
- **开源协议**: ISC License
- **版权声明**: Copyright (c) Lucide Contributors

### Tailwind CSS
- **开源协议**: MIT License
- **版权声明**: Copyright (c) Tailwind Labs, Inc.

### Vite
- **开源协议**: MIT License
- **版权声明**: Copyright (c) 2019-present Evan You & Vite Contributors

### Tauri 2、Tauri JavaScript API 与 Dialog Plugin
- **开源协议**: Apache License 2.0 / MIT License
- **版权声明**: Copyright (c) 2019-2026 Tauri Programme within The Commons Conservancy
- **使用方式**: Rust 原生桌面外壳、WebView IPC、受限本地媒体协议与系统文件选择对话框

### http-range
- **开源协议**: MIT License
- **使用方式**: 由 Tauri 本地媒体协议间接使用，用于音频字节范围请求与拖动播放

---

## 3. 开源合规声明

ResonaDesk 严格遵循各开源项目之授权条款。对于采用 LGPL/GPL 协议之二进制工具（如 FFmpeg），本项目采用**严格的外部进程隔离架构 (Process-Isolated Architecture)**，通过标准标准输入输出管道与独立 IPC 进行交互，未修改其源码，亦未进行任何静态链接混编。
