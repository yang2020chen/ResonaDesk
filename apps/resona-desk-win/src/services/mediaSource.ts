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

function isElectronRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).electronAPI);
}

export function resolveAudioSource(job: AudioSourceJob | null): AudioSourceResult {
  if (!job) {
    return { url: '', error: null };
  }

  if (isElectronRuntime()) {
    if (!job.audioWavPath) {
      return {
        url: '',
        error: '未找到转码后的音频文件，请重新转录当前媒体。',
      };
    }
    const cleanPath = job.audioWavPath.replace(/\\/g, '/');
    const fileUrl = cleanPath.startsWith('file://') ? cleanPath : `file:///${cleanPath.replace(/^\/+/, '')}`;
    return {
      url: fileUrl,
      error: null,
    };
  }

  if (isTauriRuntime()) {
    if (!job.audioWavPath) {
      return {
        url: '',
        error: '未找到转码后的音频文件，请重新转录当前媒体。',
      };
    }
    return {
      url: `file://${job.audioWavPath}`,
      error: null,
    };
  }

  return {
    url: `/api/audio?jobId=${encodeURIComponent(job.id)}`,
    error: null,
  };
}
