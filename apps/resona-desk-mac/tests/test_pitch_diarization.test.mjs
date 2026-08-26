import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clusterSegmentsToSpeakers } from '../src/utils/audioDiarization.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Testing Acoustic F0 Pitch & Spectral Energy Diarization Clustering ===');

// Helper: Generate WAV buffer with specific fundamental frequencies
function createMultiSpeakerWav(sections, sampleRate = 16000) {
  let totalSamples = 0;
  sections.forEach(s => totalSamples += Math.floor(s.durationSec * sampleRate));

  const byteRate = sampleRate * 2;
  const dataSize = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 0;
  sections.forEach(sec => {
    const numSamples = Math.floor(sec.durationSec * sampleRate);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Harmonics generation to simulate human voice timbre
      const f0 = sec.freq;
      const sample = 0.6 * Math.sin(2 * Math.PI * f0 * t) + 
                     0.3 * Math.sin(2 * Math.PI * 2 * f0 * t) + 
                     0.1 * Math.sin(2 * Math.PI * 3 * f0 * t);
      const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 25000)));
      buffer.writeInt16LE(int16, 44 + (offset + i) * 2);
    }
    offset += numSamples;
  });

  return buffer;
}

// 1. Create a 3-part conversation:
// - Part 1: Male voice (110 Hz) -> 0.0s to 3.0s
// - Part 2: Female voice (230 Hz) -> 3.0s to 6.0s
// - Part 3: Male voice (110 Hz) -> 6.0s to 9.0s
const testWavPath = path.join(__dirname, 'dialogue_pitch_test.wav');
const testWavBuffer = createMultiSpeakerWav([
  { freq: 110, durationSec: 3.0 },
  { freq: 230, durationSec: 3.0 },
  { freq: 110, durationSec: 3.0 }
]);
fs.writeFileSync(testWavPath, testWavBuffer);
console.log(`1. Synthesized 3-part dual-speaker conversation WAV (${fs.statSync(testWavPath).size} bytes).`);

// 2. Mock subtitle segments corresponding to the 3 parts
const rawSegments = [
  { id: 1, start: 0.1, end: 2.9, text: '你知道咱们网站有个超厉害的功能吗？' },
  { id: 2, start: 3.1, end: 5.9, text: '当然啦，可以让多个人同时对口型！' },
  { id: 3, start: 6.1, end: 8.9, text: '那我们赶紧来演示一下吧。' }
];

console.log('2. Running clusterSegmentsToSpeakers (F0 pitch & spectral analysis)...');
const clustered = clusterSegmentsToSpeakers(rawSegments, testWavPath, 2);

console.log('3. Verification Results:');
clustered.forEach(seg => {
  console.log(`   - [${seg.start}s -> ${seg.end}s] [${seg.speaker}]: ${seg.text}`);
});

// Part 1 and Part 3 should be Speaker 1, Part 2 should be Speaker 2
if (clustered[0].speaker !== '说话人 1') throw new Error(`Expected Part 1 to be 说话人 1, got ${clustered[0].speaker}`);
if (clustered[1].speaker !== '说话人 2') throw new Error(`Expected Part 2 to be 说话人 2, got ${clustered[1].speaker}`);
if (clustered[2].speaker !== '说话人 1') throw new Error(`Expected Part 3 to be 说话人 1, got ${clustered[2].speaker}`);

console.log('\n>>> ACOUSTIC PITCH & DIARIZATION CLUSTERING TEST PASSED 100%! <<<');

// Cleanup
if (fs.existsSync(testWavPath)) fs.unlinkSync(testWavPath);
