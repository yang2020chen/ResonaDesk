# Third-Party Notices and Open Source Licenses (Windows Edition)

This application incorporates open-source software under various permissive and copyleft licenses. All copyleft dependencies (such as FFmpeg) are executed strictly in isolated subprocesses as independent binaries, in full compliance with license terms.

---

## 1. whisper.cpp (Windows OpenBLAS / AVX)
- **Homepage**: https://github.com/ggerganov/whisper.cpp
- **Bundled version**: 1.9.1 (Windows x64 with OpenBLAS / AVX runtime)
- **License**: MIT License
- **Copyright**: (c) 2023 Georgi Gerganov
- **Usage**: Executed as an independent local CLI process (`whisper.exe`).

---

## 2. FFmpeg
- **Homepage**: https://ffmpeg.org/
- **Bundled Windows version**: 7.x x64 standalone
- **License**: LGPL 2.1 or later
- **Usage**: Executed via external CLI process (`ffmpeg.exe`). No static or dynamic linking into proprietary code.

---

## 3. React
- **Homepage**: https://react.dev/
- **License**: MIT License
- **Copyright**: (c) Meta Platforms, Inc. and affiliates.

---

## 4. Lucide Icons
- **Homepage**: https://lucide.dev/
- **License**: ISC License
- **Copyright**: (c) Lucide Contributors
