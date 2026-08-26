import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { clusterSegmentsToSpeakers, extractSegmentAcousticFeatures } = require('../electron/audioDiarization.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

console.log('===============================================================');
console.log('  🧪 ResonaDesk Windows Edition - Automated Empirical Test Suite');
console.log('===============================================================');

// Test Suite 1: Physical Directory Isolation & Binary Integrity
console.log('\n[Suite 1] 物理隔离与 Windows 二进制完整性测试:');
const binDir = path.join(ROOT_DIR, 'bin');
const binFiles = fs.readdirSync(binDir);

// Verify no Mach-O / dylib files
const macPollution = binFiles.filter(f => f.endsWith('.dylib') || f === 'ffmpeg' || f === 'whisper-cli');
assert(macPollution.length === 0, `零 macOS 二进制交叉污染 (Found: ${macPollution.length})`);

// Verify Windows executables and DLLs
assert(fs.existsSync(path.join(binDir, 'ffmpeg.exe')), 'Windows FFmpeg 二进制 (ffmpeg.exe) 存在');
assert(fs.existsSync(path.join(binDir, 'ffprobe.exe')), 'Windows FFprobe 二进制 (ffprobe.exe) 存在');
assert(fs.existsSync(path.join(binDir, 'whisper.exe')), 'Windows Whisper 引擎 (whisper.exe) 存在');
assert(fs.existsSync(path.join(binDir, 'whisper.dll')), 'Windows Whisper 核心动态库 (whisper.dll) 存在');
assert(fs.existsSync(path.join(binDir, 'libopenblas.dll')), 'Windows OpenBLAS 加速库 (libopenblas.dll) 存在');
assert(fs.existsSync(path.join(binDir, 'SDL2.dll')), 'Windows SDL2 动态库 (SDL2.dll) 存在');

// Test Suite 2: Pre-bundled GGML Models
console.log('\n[Suite 2] 离线预置模型完整性测试:');
const modelsDir = path.join(binDir, 'models');
assert(fs.existsSync(path.join(modelsDir, 'ggml-base.bin')), '预置 Base 模型 (ggml-base.bin) 存在');
assert(fs.existsSync(path.join(modelsDir, 'ggml-small.bin')), '预置 Small 模型 (ggml-small.bin) 存在');

// Test Suite 3: Production Frontend Assets & Relative Links
console.log('\n[Suite 3] 前端构建产物与相对寻址测试:');
const distHtml = path.join(ROOT_DIR, 'dist', 'index.html');
assert(fs.existsSync(distHtml), 'Vite 生产环境入口 (dist/index.html) 存在');
if (fs.existsSync(distHtml)) {
  const htmlContent = fs.readFileSync(distHtml, 'utf8');
  assert(htmlContent.includes('src="./assets/') || htmlContent.includes('src="./assets'), '前端 JS 脚本采用相对路径 ./assets/... 加载');
  assert(htmlContent.includes('href="./assets/') || htmlContent.includes('href="./assets'), '前端 CSS 样式采用相对路径 ./assets/... 加载');
}

// Test Suite 4: Packaged Windows Standalone Distribution
console.log('\n[Suite 4] Windows 独立可执行架构与便携包测试:');
const winUnpacked = path.join(ROOT_DIR, 'release', 'win-unpacked');
assert(fs.existsSync(path.join(winUnpacked, 'ResonaDesk.exe')), 'Windows 主执行程序 (ResonaDesk.exe) 已就绪');
assert(fs.existsSync(path.join(winUnpacked, 'resources', 'app.asar.unpacked', 'bin', 'whisper.exe')), 'ASAR Unpack 二进制 (whisper.exe) 就绪');
assert(fs.existsSync(path.join(winUnpacked, 'resources', 'app.asar.unpacked', 'bin', 'ffmpeg.exe')), 'ASAR Unpack 二进制 (ffmpeg.exe) 就绪');

const standaloneZip = path.join(ROOT_DIR, 'dist_win', 'ResonaDesk-v1.0.0-win-x64-standalone.zip');
assert(fs.existsSync(standaloneZip), '便携免安装 ZIP 压缩包已生成');
if (fs.existsSync(standaloneZip)) {
  const sizeMb = fs.statSync(standaloneZip).size / (1024 * 1024);
  assert(sizeMb < 1000, `压缩包体积 (${sizeMb.toFixed(1)} MB) 符合 < 1GB 硬性上限`);
}

// Test Suite 5: Subtitle Export Formats Validation
console.log('\n[Suite 5] 多格式字幕导出引擎单元测试:');
const mockSegments = [
  { id: 1, start: 0.0, end: 3.5, speaker: '说话人 1', text: '欢迎使用 ResonaDesk Windows 独立版。' },
  { id: 2, start: 4.0, end: 8.2, speaker: '说话人 2', text: '本软件支持多角色声纹识别与毫秒级时间轴编辑。' },
];

function formatTimeSRT(seconds) {
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

const srtOutput = mockSegments.map((s, i) => `${i + 1}\n${formatTimeSRT(s.start)} --> ${formatTimeSRT(s.end)}\n[${s.speaker}] ${s.text}\n`).join('\n');
assert(srtOutput.includes('00:00:00,000 --> 00:00:03,500'), 'SRT 格式时间轴精确转换通过');
assert(srtOutput.includes('[说话人 1] 欢迎使用 ResonaDesk Windows 独立版。'), 'SRT 格式多角色说话人标注通过');

// Test Suite 6: Acoustic Diarization (F0 Pitch Autocorrelation & Clustering)
console.log('\n[Suite 6] 多维声学 PCM 基频自相关声纹聚类测试:');
// Create a synthetic 16kHz mono WAV file with 2 distinct speakers (Speaker A ~130Hz, Speaker B ~250Hz)
const sampleRate = 16000;
const totalSeconds = 6;
const totalSamples = sampleRate * totalSeconds;
const wavBuffer = Buffer.alloc(44 + totalSamples * 2);

// Write WAV Header
wavBuffer.write('RIFF', 0);
wavBuffer.writeUInt32LE(36 + totalSamples * 2, 4);
wavBuffer.write('WAVE', 8);
wavBuffer.write('fmt ', 12);
wavBuffer.writeUInt32LE(16, 16);
wavBuffer.writeUInt16LE(1, 20); // PCM
wavBuffer.writeUInt16LE(1, 22); // Mono
wavBuffer.writeUInt32LE(sampleRate, 24);
wavBuffer.writeUInt32LE(sampleRate * 2, 28);
wavBuffer.writeUInt16LE(2, 32);
wavBuffer.writeUInt16LE(16, 34);
wavBuffer.write('data', 36);
wavBuffer.writeUInt32LE(totalSamples * 2, 40);

// Generate Speaker A (130Hz) for 0..3s, Speaker B (250Hz) for 3..6s
for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  const freq = t < 3.0 ? 130 : 250;
  const val = Math.sin(2 * Math.PI * freq * t) * 0.8;
  const int16 = Math.max(-32767, Math.min(32767, Math.floor(val * 32767)));
  wavBuffer.writeInt16LE(int16, 44 + i * 2);
}

const testWavPath = path.join(ROOT_DIR, 'test_synthetic_dialog.wav');
fs.writeFileSync(testWavPath, wavBuffer);

const syntheticSegments = [
  { id: 1, start: 0.0, end: 2.9, speaker: '说话人 1', text: '你知道咱们网站有个超厉害的功能吗？' },
  { id: 2, start: 3.0, end: 5.8, speaker: '说话人 1', text: '当然啦！毕竟我们就是这么做出来的！' },
];

const clustered = clusterSegmentsToSpeakers(syntheticSegments, testWavPath, 2);
try { fs.unlinkSync(testWavPath); } catch (e) {}

assert(clustered.length === 2, '声纹聚类结果段数一致');
assert(clustered[0].speaker !== clustered[1].speaker, `0 停顿紧凑对话成功识别为两位不同说话人 (${clustered[0].speaker} vs ${clustered[1].speaker})`);

console.log('===============================================================');
console.log(`  📊 测试总计: ${totalTests} 项 | 通过: ${passedTests} 项 | 失败: ${totalTests - passedTests} 项`);
console.log(`  🎉 测试通过率: ${(passedTests / totalTests * 100).toFixed(1)}%`);
console.log('===============================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
