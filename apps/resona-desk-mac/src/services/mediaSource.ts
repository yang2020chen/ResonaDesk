import { convertFileSrc } from '@tauri-apps/api/core';

export interface AudioSourceJob {
  id: string;
  audioWavPath?: string;
}

export interface AudioSourceResult {
  url: string;
  error: string | null;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined'
    && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export function resolveAudioSource(job: AudioSourceJob | null): AudioSourceResult {
  if (!job) {
    return { url: '', error: null };
  }

  if (isTauriRuntime()) {
    if (!job.audioWavPath) {
      return {
        url: '',
        error: '未找到转码后的音频文件，请重新转录当前媒体。',
      };
    }

    return {
      url: convertFileSrc(job.audioWavPath),
      error: null,
    };
  }

  return {
    url: `/api/audio?jobId=${encodeURIComponent(job.id)}`,
    error: null,
  };
}
