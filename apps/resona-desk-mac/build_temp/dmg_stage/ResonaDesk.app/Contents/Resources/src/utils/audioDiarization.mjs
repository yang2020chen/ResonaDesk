import fs from 'fs';

/**
 * Extract 16-bit signed integer PCM samples from a 16kHz Mono WAV file
 */
export function readWavPcmSamples(wavPath) {
  const buf = fs.readFileSync(wavPath);
  let dataOffset = 44;
  for (let i = 12; i < buf.length - 8; i++) {
    if (buf.toString('ascii', i, i + 4) === 'data') {
      dataOffset = i + 8;
      break;
    }
  }

  const numSamples = Math.floor((buf.length - dataOffset) / 2);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const int16 = buf.readInt16LE(dataOffset + i * 2);
    samples[i] = int16 / 32768.0;
  }
  return samples;
}

/**
 * Enhanced Autocorrelation-based pitch estimator with first-prominent-peak selection
 * to prevent octave halving / pitch doubling errors.
 */
function estimatePitchAutocorrelation(frame, sampleRate = 16000) {
  const minHz = 75;   // lowest male pitch
  const maxHz = 350;  // highest female/child pitch
  const minLag = Math.floor(sampleRate / maxHz); // ~45
  const maxLag = Math.floor(sampleRate / minHz); // ~213
  const N = frame.length;

  let energy = 0;
  for (let i = 0; i < N; i++) energy += frame[i] * frame[i];
  if (energy < 0.001) return null; // Silence

  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < N - lag; i++) {
      sum += frame[i] * frame[i + lag];
      norm1 += frame[i] * frame[i];
      norm2 += frame[i + lag] * frame[i + lag];
    }
    const denom = Math.sqrt(norm1 * norm2);
    corr[lag] = denom > 0 ? sum / denom : 0;
  }

  // Pick first significant local peak to prevent octave errors
  const threshold = 0.40;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corr[lag] > threshold && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      return sampleRate / lag;
    }
  }

  return null;
}

/**
 * Extract acoustic feature vector for a subtitle segment:
 * [avgPitchHz, zeroCrossingRate, rmsEnergy, spectralBrightness]
 */
export function extractSegmentAcousticFeatures(allSamples, startSec, endSec, sampleRate = 16000) {
  const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
  const endIdx = Math.min(allSamples.length, Math.floor(endSec * sampleRate));
  const segLen = endIdx - startIdx;

  if (segLen <= 0) {
    return { pitch: 150, zcr: 0.1, energy: 0.05, brightness: 0.5, hasVoiced: false };
  }

  const segSamples = allSamples.subarray(startIdx, endIdx);
  const frameSize = 1024;
  const hopSize = 512;
  const pitches = [];
  let totalZcr = 0;
  let totalEnergy = 0;
  let numFrames = 0;
  let highFreqEnergy = 0;
  let lowFreqEnergy = 0;

  for (let i = 0; i + frameSize <= segLen; i += hopSize) {
    const frame = segSamples.subarray(i, i + frameSize);
    numFrames++;

    // Pitch
    const p = estimatePitchAutocorrelation(frame, sampleRate);
    if (p !== null) pitches.push(p);

    // ZCR & Energy
    let zcrCount = 0;
    let frameEnergy = 0;
    for (let j = 0; j < frameSize; j++) {
      frameEnergy += frame[j] * frame[j];
      if (j > 0 && ((frame[j] >= 0 && frame[j - 1] < 0) || (frame[j] < 0 && frame[j - 1] >= 0))) {
        zcrCount++;
      }
      if (j % 2 === 0) lowFreqEnergy += Math.abs(frame[j]);
      else highFreqEnergy += Math.abs(frame[j]);
    }
    totalZcr += zcrCount / frameSize;
    totalEnergy += Math.sqrt(frameEnergy / frameSize);
  }

  let avgPitch = 150;
  if (pitches.length > 0) {
    pitches.sort((a, b) => a - b);
    avgPitch = pitches[Math.floor(pitches.length / 2)];
  }

  const avgZcr = numFrames > 0 ? totalZcr / numFrames : 0.1;
  const avgEnergy = numFrames > 0 ? totalEnergy / numFrames : 0.05;
  const brightness = lowFreqEnergy > 0 ? highFreqEnergy / (lowFreqEnergy + highFreqEnergy) : 0.5;

  return {
    pitch: avgPitch,
    zcr: avgZcr,
    energy: avgEnergy,
    brightness,
    hasVoiced: pitches.length > 0
  };
}

/**
 * Cluster segments into speakers using K-Means on acoustic feature vectors
 */
export function clusterSegmentsToSpeakers(segments, wavPath, numSpeakers = 2) {
  if (!segments || segments.length === 0) return segments;
  if (!fs.existsSync(wavPath)) return segments;

  try {
    const allSamples = readWavPcmSamples(wavPath);
    const features = segments.map(seg => {
      const feat = extractSegmentAcousticFeatures(allSamples, seg.start, seg.end);
      return {
        seg,
        feat,
        vec: [
          (feat.pitch - 75) / 275,  // pitch normalized 0..1
          feat.zcr * 3.0,           // ZCR
          feat.brightness           // Spectral brightness
        ]
      };
    });

    // Check pitch variance across voiced segments
    const voicedPitches = features.filter(f => f.feat.hasVoiced).map(f => f.feat.pitch);
    if (voicedPitches.length >= 2) {
      const mean = voicedPitches.reduce((a, b) => a + b, 0) / voicedPitches.length;
      const variance = voicedPitches.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / voicedPitches.length;
      const stdDev = Math.sqrt(variance);

      // If voice pitch is extremely uniform (stdDev < 15Hz), it's a single speaker monologue
      if (stdDev < 15) {
        return segments.map(s => ({ ...s, speaker: '说话人 1' }));
      }
    }

    // Run K-Means with K = 2
    const K = Math.min(numSpeakers, Math.max(2, Math.min(3, segments.length)));
    
    // Pick initial centroids from pitch min and max
    const sortedByPitch = [...features].sort((a, b) => a.vec[0] - b.vec[0]);
    const centroids = [];
    for (let k = 0; k < K; k++) {
      const idx = Math.floor((k / (K - 1 || 1)) * (sortedByPitch.length - 1));
      centroids.push([...sortedByPitch[idx].vec]);
    }

    let assignments = new Array(features.length).fill(0);

    // K-Means iterations
    for (let iter = 0; iter < 15; iter++) {
      for (let i = 0; i < features.length; i++) {
        let bestDist = Infinity;
        let bestCluster = 0;
        for (let k = 0; k < K; k++) {
          const dPitch = (features[i].vec[0] - centroids[k][0]) * 4.0; // pitch weighted 4x
          const dZcr = (features[i].vec[1] - centroids[k][1]) * 1.0;
          const dBright = (features[i].vec[2] - centroids[k][2]) * 1.0;
          const dist = dPitch * dPitch + dZcr * dZcr + dBright * dBright;
          if (dist < bestDist) {
            bestDist = dist;
            bestCluster = k;
          }
        }
        assignments[i] = bestCluster;
      }

      for (let k = 0; k < K; k++) {
        const clusterPoints = features.filter((_, idx) => assignments[idx] === k);
        if (clusterPoints.length > 0) {
          for (let d = 0; d < 3; d++) {
            const sum = clusterPoints.reduce((acc, p) => acc + p.vec[d], 0);
            centroids[k][d] = sum / clusterPoints.length;
          }
        }
      }
    }

    // Map clusters chronologically
    const clusterOrder = [];
    assignments.forEach(c => {
      if (!clusterOrder.includes(c)) clusterOrder.push(c);
    });

    const clusterToSpeakerMap = new Map();
    clusterOrder.forEach((c, idx) => {
      clusterToSpeakerMap.set(c, `说话人 ${idx + 1}`);
    });

    return segments.map((seg, idx) => {
      const spk = clusterToSpeakerMap.get(assignments[idx]) || '说话人 1';
      return {
        ...seg,
        speaker: spk
      };
    });

  } catch (err) {
    console.error('Audio clustering fallback error:', err);
    return segments;
  }
}
