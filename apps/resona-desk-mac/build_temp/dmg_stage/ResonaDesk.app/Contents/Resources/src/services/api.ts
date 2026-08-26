import { TranscriptionJob, ModelInfo } from '../types';

export const API_BASE = '/api';

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
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAvailableModels(): Promise<ModelInfo[]> {
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
  const res = await fetchWithTimeout(`${API_BASE}/jobs/${jobId}`, {}, 5000);
  if (!res.ok) throw new Error('获取任务状态失败');
  return res.json();
}
