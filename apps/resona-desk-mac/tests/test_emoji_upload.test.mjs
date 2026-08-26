import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSineWaveWav(sampleRate = 16000, durationSec = 3, frequency = 440) {
  const sampleCount = sampleRate * durationSec;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index++) {
    const sample = Math.sin(2 * Math.PI * frequency * (index / sampleRate));
    buffer.writeInt16LE(Math.floor(sample * 30000), 44 + index * 2);
  }

  return buffer;
}

console.log('=== Testing Dual-Mode Emoji File Upload & FFmpeg Transcription ===');

// 1. Generate test audio file with the exact Emoji name from the user screenshot
const emojiFileName = '@代码脑袋💆💻俺开发的网站😎分享一下教程 很适合用来做多人数字人播客～ AI多人唱歌、对话啥的也都支持 1080P.mp4';
const localEmojiPath = path.join('/tmp', emojiFileName);

fs.writeFileSync(localEmojiPath, createSineWaveWav());
console.log(`1. Created local file with complex Emojis: ${localEmojiPath} (${fs.statSync(localEmojiPath).size} bytes)`);

// 2. Start server in background to test HTTP /api/upload & /api/transcribe
const serverPath = path.resolve(__dirname, '..', 'server.mjs');
const serverProc = spawn('node', [serverPath], {
  env: { ...process.env, PORT: '3199' }
});

await new Promise(resolve => setTimeout(resolve, 1000));

try {
  // 3. Test POST /api/upload (Streaming upload of the emoji file)
  console.log('2. Simulating browser binary stream upload to POST /api/upload...');
  const fileBuffer = fs.readFileSync(localEmojiPath);

  const uploadResult = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3199,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'video/mp4',
        'X-File-Name': encodeURIComponent(emojiFileName),
        'Content-Length': fileBuffer.length,
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Upload failed HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });

  console.log('   ✓ Stream upload succeeded! Result:', uploadResult);

  // 4. Test POST /api/transcribe with the returned file path
  console.log('3. Triggering transcription on uploaded path...');
  const transcribeResult = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      filePath: uploadResult.filePath,
      fileName: uploadResult.originalName,
      model: 'ggml-base.bin',
      language: 'en',
      diarize: true,
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3199,
      path: '/api/transcribe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(body));
        else reject(new Error(`Transcribe start failed: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const jobId = transcribeResult.jobId;
  console.log(`   ✓ Job created: ${jobId}. Waiting for completion...`);

  // 5. Poll job status until completed
  let job;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    job = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:3199/api/jobs/${jobId}`, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    console.log(`   - Status: ${job.status} (${job.progressPercent}%) - ${job.currentStep}`);
    if (job.status === 'completed' || job.status === 'error') break;
  }

  if (job.status !== 'completed') {
    throw new Error(`Job ended with status: ${job.status}, error: ${job.error}`);
  }

  console.log('   ✓ Transcription completed with 0 errors!');
  console.log(`   ✓ Segments extracted: ${job.segments.length}`);
  console.log(`   ✓ Sample output: "${job.segments[0]?.text}"`);
  console.log('\n>>> EMOJI & DUAL-MODE FILE INGESTION TEST PASSED 100%! <<<');

} finally {
  serverProc.kill();
  if (fs.existsSync(localEmojiPath)) fs.unlinkSync(localEmojiPath);
}
