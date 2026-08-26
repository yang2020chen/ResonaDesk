import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAudioSource } from '../src/services/mediaSource.ts';

test('Tauri playback converts the completed job WAV path into an asset URL', () => {
  globalThis.window = {
    __TAURI_INTERNALS__: {
      convertFileSrc(filePath, protocol = 'asset') {
        return `${protocol}://localhost/${encodeURIComponent(filePath)}`;
      },
    },
  };

  const result = resolveAudioSource({
    id: 'job_123',
    audioWavPath: '/private/tmp/resona_transcriptions/job_123.wav',
  });

  assert.deepEqual(result, {
    url: 'asset://localhost/%2Fprivate%2Ftmp%2Fresona_transcriptions%2Fjob_123.wav',
    error: null,
  });
});

test('Tauri playback reports a missing generated WAV instead of using the development API', () => {
  globalThis.window = { __TAURI_INTERNALS__: {} };

  const result = resolveAudioSource({ id: 'job_123' });

  assert.equal(result.url, '');
  assert.match(result.error ?? '', /音频文件/);
});

test('browser development keeps the HTTP audio endpoint fallback', () => {
  globalThis.window = {};

  const result = resolveAudioSource({ id: 'job with spaces' });

  assert.deepEqual(result, {
    url: '/api/audio?jobId=job%20with%20spaces',
    error: null,
  });
});
