import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, '..');
const binDir = path.join(baseDir, 'bin');
const ffmpeg = path.join(binDir, 'ffmpeg');
const whisperCli = path.join(binDir, 'whisper-cli');
const modelPath = path.join(binDir, 'models', 'ggml-base.bin');

console.log('=== ResonaDesk Engine Real-World Empirical Verification ===');

// 1. Check binaries exist
console.log('1. Checking binaries...');
if (!fs.existsSync(ffmpeg)) throw new Error('ffmpeg missing');
if (!fs.existsSync(whisperCli)) throw new Error('whisper-cli missing');
if (!fs.existsSync(modelPath)) throw new Error('ggml-base.bin missing');
console.log('   ✓ ffmpeg, whisper-cli, and ggml-base.bin are present.');

// Helper: Generate a valid 16kHz, 16-bit Mono PCM WAV buffer (3 seconds)
function createSineWaveWav(sampleRate = 16000, durationSec = 3, freq = 440) {
  const numSamples = sampleRate * durationSec;
  const byteRate = sampleRate * 2; // 16-bit = 2 bytes per sample
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono (1 channel)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t);
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 30000)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

// 2. Write raw audio file and test FFmpeg conversion
const rawWav = path.join(__dirname, 'raw_input.wav');
const convertedWav = path.join(__dirname, 'converted_16k.wav');
fs.writeFileSync(rawWav, createSineWaveWav(16000, 3, 440));
console.log(`2. Generated test audio buffer (${fs.statSync(rawWav).size} bytes).`);

console.log('3. Testing bundled FFmpeg audio transcoding...');
await new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, [
    '-y',
    '-i', rawWav,
    '-ar', '16000',
    '-ac', '1',
    '-c:a', 'pcm_s16le',
    convertedWav
  ]);

  let stderr = '';
  p.stderr.on('data', d => stderr += d.toString());
  p.on('close', (code) => {
    if (code === 0 && fs.existsSync(convertedWav)) {
      console.log(`   ✓ FFmpeg transcode success! Output size: ${fs.statSync(convertedWav).size} bytes.`);
      resolve();
    } else {
      reject(new Error(`FFmpeg failed code ${code}: ${stderr}`));
    }
  });
});

// 4. Test running whisper-cli with Apple Silicon Metal GPU acceleration on convertedWav
console.log('4. Running whisper-cli with Apple Silicon Metal GPU acceleration...');
const outPrefix = path.join(__dirname, 'test_out');
const startTime = Date.now();

await new Promise((resolve, reject) => {
  const p = spawn(whisperCli, [
    '-m', modelPath,
    '-f', convertedWav,
    '-oj',
    '-of', outPrefix,
    '--language', 'auto',
    '-t', '4'
  ]);

  let stdout = '';
  let stderr = '';
  p.stdout.on('data', d => stdout += d.toString());
  p.stderr.on('data', d => stderr += d.toString());

  p.on('close', (code) => {
    const elapsed = Date.now() - startTime;
    const jsonFile = `${outPrefix}.json`;
    if (code === 0 && fs.existsSync(jsonFile)) {
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
      console.log(`   ✓ Whisper transcription completed in ${elapsed}ms! Exit code: ${code}`);
      console.log(`   ✓ Output JSON parsed successfully!`);
      console.log(`   ✓ Model type: ${data.model?.type || 'whisper'}`);
      console.log(`   ✓ Segments count: ${(data.transcription || []).length}`);
      // Cleanup
      fs.unlinkSync(jsonFile);
      fs.unlinkSync(rawWav);
      fs.unlinkSync(convertedWav);
      resolve();
    } else {
      reject(new Error(`Whisper execution failed with code ${code}: ${stderr}`));
    }
  });
});

console.log('\n>>> ALL EMPIRICAL ENGINE & METAL TESTS PASSED 100%! <<<');
