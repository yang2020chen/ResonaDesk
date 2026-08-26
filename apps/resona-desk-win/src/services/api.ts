import { TranscriptionJob, ModelInfo } from '../types';

export const isElectronEnv = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).electronAPI);
};

export const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export const API_BASE = '/api';

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(cmd, args);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`连接后台服务超时 (${timeoutMs / 1000}s)，请检查后端引擎是否正常启动`);
    }
    throw new Error(`无法连接后台引擎: ${err.message || '网络连接异常'}`);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  if (isElectronEnv()) {
    try {
      return await (window as any).electronAPI.checkHealth();
    } catch {
      return true;
    }
  }
  if (isTauriEnv()) {
    try {
      return await invokeTauri<boolean>('check_backend_health');
    } catch {
      return true;
    }
  }
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAvailableModels(): Promise<ModelInfo[]> {
  if (isElectronEnv()) {
    return await (window as any).electronAPI.getModels();
  }
  if (isTauriEnv()) {
    return await invokeTauri<ModelInfo[]>('get_available_models');
  }
  const res = await fetchWithTimeout(`${API_BASE}/models`);
  if (!res.ok) throw new Error('获取模型列表失败');
  return res.json();
}

export async function startTranscription(payload: {
  filePath: string;
  model: string;
  language: string;
  diarize?: boolean;
}): Promise<{ jobId: string }> {
  if (isElectronEnv()) {
    return await (window as any).electronAPI.startTranscription(payload);
  }
  if (isTauriEnv()) {
    return await invokeTauri<{ jobId: string }>('start_transcription', {
      filePath: payload.filePath,
      model: payload.model,
      language: payload.language,
      diarize: payload.diarize ?? true,
    });
  }
  const res = await fetchWithTimeout(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 10000);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `启动转录失败 (HTTP ${res.status})`);
  }
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<TranscriptionJob> {
  if (isElectronEnv()) {
    return await (window as any).electronAPI.getJobStatus(jobId);
  }
  if (isTauriEnv()) {
    return await invokeTauri<TranscriptionJob>('get_job_status', { jobId });
  }
  const res = await fetchWithTimeout(`${API_BASE}/jobs/${jobId}`, {}, 5000);
  if (!res.ok) throw new Error('获取任务状态失败');
  return res.json();
}
