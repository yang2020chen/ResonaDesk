# 🎙️ ResonaDesk (声纹工坊 · 离线多角色音视频智能转写桌面应用)

> **Zero-Config · 100% Local Privacy · Multi-Speaker Acoustic Diarization · Dual-Platform Native Desktop**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-Apple%20Silicon%20(Metal%20GPU)-success.svg)](https://github.com/yang2020chen/ResonaDesk/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-x64%20(AVX%20%2F%20OpenBLAS)-blue.svg)](https://github.com/yang2020chen/ResonaDesk/releases/latest)

---

## 📥 最新官方双平台安装包下载 (Latest Releases)

当前稳定版本：**v1.0.0**

| 平台架构 | 架构核心 | 安装包类型 | 下载直链 |
| :--- | :--- | :--- | :--- |
| 🍏 **macOS** (Apple Silicon M1/M2/M3/M4) | Tauri 2.0 + Metal GPU | 原生独立 DMG 安装包 (597 MB) | [ResonaDesk-macOS-arm64-v1.0.0.dmg](https://github.com/yang2020chen/ResonaDesk/releases/download/v1.0.0/ResonaDesk-macOS-arm64-v1.0.0.dmg) |
| 🪟 **Windows** (x64 / Intel & AMD) | Electron + AVX OpenBLAS | 绿色便携免安装 ZIP (851 MB) | [ResonaDesk-win-x64-standalone-v1.0.0.zip](https://github.com/yang2020chen/ResonaDesk/releases/download/v1.0.0/ResonaDesk-win-x64-standalone-v1.0.0.zip) |

---

## 🌟 核心杀手级特性

- 🛡️ **100% 离线端侧隐私**：
  - 音视频转码与 Whisper 神经网络推理完全在本地单机运行，零云端上传，极致保护商业与个人隐私。
- ⚡ **开箱即用，零环境依赖 (Zero-Config)**：
  - 安装包内置 FFmpeg 音视频转码引擎、Whisper 神经网络引擎以及 `base` / `small` 离线双模型，无需用户配置 Python、CUDA、Node.js 或环境变量。
- 🎙️ **多维声学 PCM 基频自相关声纹聚类 (Acoustic Diarization)**：
  - 真正基于 16kHz PCM 音频采样提取 F0 基频音高、过零率 (ZCR) 与频谱亮度；
  - 彻底摆脱对静音停顿时间的依赖，两人 0 停顿紧凑对话也能精准识别分离不同说话人。
- 🪟 **物理隔离的双端独立架构**：
  - **macOS 端**：基于 Tauri 2.0 + 原生 Rust 进程 + Metal GPU 硬件加速；
  - **Windows 端**：基于独立 Electron x64 架构 + OpenBLAS AVX 指令集硬件加速。
- 📝 **影视级多格式字幕编辑与导出**：
  - 毫秒级时间轴编辑、说话人角色快速归并、一键导出 SRT、VTT、TXT、Markdown 及主流剪辑软件工程。

---

## 🏗️ 物理隔离工程架构

```text
ResonaDesk/
├── apps/
│   ├── resona-desk-mac/    # macOS 独立工程 (Tauri 2.0 + Rust Engine + Metal GPU)
│   └── resona-desk-win/    # Windows 独立工程 (Electron + OpenBLAS AVX Engine)
├── README.md
├── NOTICE.md
└── LICENSE
```

---

## 📄 开源许可证

本项目遵循 [MIT License](LICENSE) 开源协议。
