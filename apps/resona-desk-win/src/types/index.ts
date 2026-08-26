export interface SubtitleSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  speaker: string;
  text: string;
  translation?: string;
  confidence?: number;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  totalTimeSec?: number;
  segmentCount?: number;
}

export interface TranscriptionJob {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  durationSec?: number;
  status: 'idle' | 'extracting_audio' | 'transcribing' | 'completed' | 'error';
  progressPercent: number;
  speed: string;
  currentStep: string;
  model: string;
  language: string;
  diarization: boolean;
  segments: SubtitleSegment[];
  error?: string;
  createdAt: number;
  completedAt?: number;
  audioWavPath?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  sizeMb: number;
  isBundled: boolean;
  isDownloaded: boolean;
  description: string;
  recommendedVram: string;
}
