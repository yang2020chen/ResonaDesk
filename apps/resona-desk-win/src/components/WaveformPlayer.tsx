import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Gauge } from 'lucide-react';
import { SubtitleSegment } from '../types';

interface WaveformPlayerProps {
  audioUrl: string;
  sourceError?: string | null;
  currentTime: number;
  duration: number;
  activeSegment?: SubtitleSegment | null;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSeek: (time: number) => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  sourceError,
  currentTime,
  duration,
  activeSegment,
  onTimeUpdate,
  onDurationChange,
  onSeek,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(sourceError ?? null);
  const [waveData, setWaveData] = useState<number[]>([]);

  // Generate synthetic waveform bars for visual rendering
  useEffect(() => {
    const barsCount = 120;
    const data: number[] = [];
    let prev = 0.4;
    for (let i = 0; i < barsCount; i++) {
      const change = (Math.random() - 0.5) * 0.4;
      prev = Math.max(0.15, Math.min(0.95, prev + change));
      data.push(prev);
    }
    setWaveData(data);
  }, [audioUrl]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => {
      onTimeUpdate(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        onDurationChange(audio.duration);
        setPlaybackError(null);
      }
    };

    const handleError = () => {
      setIsPlaying(false);
      setPlaybackError('音频加载失败，请重新转录当前媒体后再试。');
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onTimeUpdate, onDurationChange]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackError(sourceError ?? null);
    onTimeUpdate(0);
    onDurationChange(0);
    audioRef.current?.load();
  }, [audioUrl, sourceError, onTimeUpdate, onDurationChange]);

  // Play / Pause toggle
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setPlaybackError(null);
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
          setPlaybackError('无法开始播放，请确认音频文件仍然可用。');
        });
    }
  };

  // Keyboard shortcut (Space to play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger when typing in inputs
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Handle Seek from parent
  const seekToTime = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(duration || 100, time));
      onTimeUpdate(audio.currentTime);
    }
  };

  // Canvas Waveform rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveData.length;
    const progressPercent = duration > 0 ? currentTime / duration : 0;
    const activeStartPercent = activeSegment && duration > 0 ? activeSegment.start / duration : 0;
    const activeEndPercent = activeSegment && duration > 0 ? activeSegment.end / duration : 0;

    // Draw active segment highlight region
    if (activeSegment && duration > 0) {
      const startX = activeStartPercent * width;
      const endX = activeEndPercent * width;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, 0, endX - startX, height);
    }

    // Draw Waveform bars
    waveData.forEach((val, idx) => {
      const x = idx * barWidth;
      const barHeight = val * (height * 0.75);
      const y = (height - barHeight) / 2;
      const isPast = idx / waveData.length <= progressPercent;

      ctx.fillStyle = isPast ? '#38bdf8' : '#334155';
      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, 2);
      ctx.fill();
    });

    // Draw Playhead line
    const playheadX = progressPercent * width;
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(playheadX - 1, 0, 2, height);
  }, [currentTime, duration, waveData, activeSegment]);

  // Click on canvas to seek
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * duration;
    seekToTime(targetTime);
    onSeek(targetTime);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {playbackError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
        >
          {playbackError}
        </div>
      )}

      {/* Waveform Canvas */}
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={900}
          height={80}
          onClick={handleCanvasClick}
          className="w-full h-20 bg-slate-950/80 rounded-xl cursor-pointer border border-slate-800/80 transition-colors group-hover:border-slate-700"
        />
        <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-500 select-none pointer-events-none">
          点击波形直接跳播 / 空格键播放暂停
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Left: Time display */}
        <div className="flex items-center space-x-2 font-mono text-xs text-slate-300 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          <span className="text-brand-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTime(duration)}</span>
        </div>

        {/* Center: Play / Pause / Skip */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => seekToTime(currentTime - 3)}
            title="后退 3 秒"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-500/25 transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => seekToTime(currentTime + 3)}
            title="前进 3 秒"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Rate & Volume */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Rate Selector */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-xl">
            <Gauge className="w-3.5 h-3.5 text-brand-400" />
            <select
              value={playbackRate}
              onChange={(e) => {
                const r = parseFloat(e.target.value);
                setPlaybackRate(r);
                if (audioRef.current) audioRef.current.playbackRate = r;
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="0.75" className="bg-slate-900">0.75x</option>
              <option value="1.0" className="bg-slate-900">1.0x</option>
              <option value="1.25" className="bg-slate-900">1.25x</option>
              <option value="1.5" className="bg-slate-900">1.5x</option>
              <option value="2.0" className="bg-slate-900">2.0x</option>
            </select>
          </div>

          {/* Volume */}
          <button
            onClick={() => {
              if (audioRef.current) {
                const nextMuted = !isMuted;
                audioRef.current.muted = nextMuted;
                setIsMuted(nextMuted);
              }
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </div>
    </div>
  );
};
