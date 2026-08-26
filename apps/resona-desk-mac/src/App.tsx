import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { TranscriptionProgress } from './components/TranscriptionProgress';
import { WaveformPlayer } from './components/WaveformPlayer';
import { BilingualToolbar } from './components/BilingualToolbar';
import { SubtitleTimelineEditor } from './components/SubtitleTimelineEditor';
import { SpeakerStatsCard } from './components/SpeakerStatsCard';
import { SpeakerRoleModal } from './components/SpeakerRoleModal';
import { TranslationModal } from './components/TranslationModal';
import { AIPolishModal } from './components/AIPolishModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { SubtitleSegment, TranscriptionJob, SpeakerProfile } from './types';
import { Play, Sparkles, ArrowLeft } from 'lucide-react';
import { startTranscription, getJobStatus } from './services/api';
import { resolveAudioSource } from './services/mediaSource';
import { AISettings, DEFAULT_AI_SETTINGS } from './services/aiService';
import { LicensePayload, verifyLicenseKey } from './utils/licenseVerifier';
import { COLOR_PALETTES } from './utils/speakerColors';

export const App: React.FC = () => {
  const [filePath, setFilePath] = useState<string>('');
  const [model, setModel] = useState<string>('ggml-base.bin');
  const [language, setLanguage] = useState<string>('auto');
  const [diarize, setDiarize] = useState<boolean>(true);
  const [currentJob, setCurrentJob] = useState<TranscriptionJob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Editor States
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([
    { id: 'spk_1', name: '说话人 1', color: COLOR_PALETTES[0].color, bgColor: COLOR_PALETTES[0].bgColor, borderColor: COLOR_PALETTES[0].borderColor },
    { id: 'spk_2', name: '说话人 2', color: COLOR_PALETTES[1].color, bgColor: COLOR_PALETTES[1].bgColor, borderColor: COLOR_PALETTES[1].borderColor },
  ]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bilingualMode, setBilingualMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // 4 Independent Modals
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isAIPolishModalOpen, setIsAIPolishModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Settings & License
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('resona_ai_settings');
    return saved ? JSON.parse(saved) : DEFAULT_AI_SETTINGS;
  });
  const [licenseKey, setLicenseKey] = useState<string>(() => localStorage.getItem('resona_license_key') || '');
  const [licensePayload, setLicensePayload] = useState<LicensePayload | null>(null);
  const [isProUser, setIsProUser] = useState<boolean>(false);

  // Check license on mount
  useEffect(() => {
    if (licenseKey) {
      verifyLicenseKey(licenseKey).then(res => {
        if (res.valid && res.payload) {
          setIsProUser(true);
          setLicensePayload(res.payload);
        }
      });
    }
  }, [licenseKey]);

  const handleSaveAISettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    localStorage.setItem('resona_ai_settings', JSON.stringify(newSettings));
  };

  const handleSaveLicenseKey = (key: string) => {
    setLicenseKey(key);
    localStorage.setItem('resona_license_key', key);
    verifyLicenseKey(key).then(res => {
      if (res.valid && res.payload) {
        setIsProUser(true);
        setLicensePayload(res.payload);
      }
    });
  };

  const handleSelectFile = (path: string) => {
    setFilePath(path);
  };

  const handleStart = async () => {
    if (!filePath) return;
    setIsProcessing(true);

    try {
      const { jobId } = await startTranscription({
        filePath,
        model,
        language,
        diarize,
      });

      // Poll job progress
      const interval = setInterval(async () => {
        try {
          const job = await getJobStatus(jobId);
          setCurrentJob(job);
          if (job.status === 'completed') {
            clearInterval(interval);
            setIsProcessing(false);
            setSegments(job.segments || []);

            const detectedNames = Array.from(new Set((job.segments || []).map(s => s.speaker)));
            const newProfiles = detectedNames.map((name, i) => ({
              id: `spk_${i+1}`,
              name,
              color: COLOR_PALETTES[i % COLOR_PALETTES.length].color,
              bgColor: COLOR_PALETTES[i % COLOR_PALETTES.length].bgColor,
              borderColor: COLOR_PALETTES[i % COLOR_PALETTES.length].borderColor,
            }));
            if (newProfiles.length > 0) setSpeakers(newProfiles);
          } else if (job.status === 'error') {
            clearInterval(interval);
            setIsProcessing(false);
          }
        } catch (e) {
          clearInterval(interval);
          setIsProcessing(false);
        }
      }, 500);
    } catch (err: any) {
      alert('启动转录失败: ' + err.message);
      setIsProcessing(false);
    }
  };

  // Subtitle Operations
  const handleUpdateSegment = (id: number, updated: Partial<SubtitleSegment>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    setIsSaved(false);
  };

  const handleSplitSegment = (index: number) => {
    const target = segments[index];
    if (!target) return;

    const midTime = Number(((target.start + target.end) / 2).toFixed(3));
    const textHalf = Math.floor(target.text.length / 2);
    const text1 = target.text.slice(0, textHalf).trim();
    const text2 = target.text.slice(textHalf).trim();

    const seg1: SubtitleSegment = { ...target, end: midTime, text: text1 || target.text };
    const seg2: SubtitleSegment = {
      id: Date.now(),
      start: midTime,
      end: target.end,
      speaker: target.speaker,
      text: text2 || '...',
      translation: '',
    };

    const newSegs = [...segments.slice(0, index), seg1, seg2, ...segments.slice(index + 1)];
    setSegments(newSegs);
    setIsSaved(false);
  };

  const handleMergeSegment = (index: number) => {
    if (index >= segments.length - 1) return;
    const curr = segments[index];
    const next = segments[index + 1];

    const merged: SubtitleSegment = {
      ...curr,
      end: next.end,
      text: `${curr.text} ${next.text}`.trim(),
      translation: curr.translation && next.translation ? `${curr.translation} ${next.translation}`.trim() : curr.translation || next.translation,
    };

    const newSegs = [...segments.slice(0, index), merged, ...segments.slice(index + 2)];
    setSegments(newSegs);
    setIsSaved(false);
  };

  const handleDeleteSegment = (id: number) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    setIsSaved(false);
  };

  const handleAddSegmentBelow = (index: number) => {
    const curr = segments[index];
    const startTime = curr ? curr.end : 0;
    const endTime = Number((startTime + 3.0).toFixed(3));

    const newSeg: SubtitleSegment = {
      id: Date.now(),
      start: startTime,
      end: endTime,
      speaker: curr ? curr.speaker : '说话人 1',
      text: '新增字幕文本...',
      translation: '',
    };

    const newSegs = [...segments.slice(0, index + 1), newSeg, ...segments.slice(index + 1)];
    setSegments(newSegs);
    setIsSaved(false);
  };

  const handleSaveSegments = async () => {
    if (!currentJob) return;
    try {
      await fetch(`/api/jobs/${currentJob.id}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments }),
      });
      setIsSaved(true);
    } catch (e) {
      alert('保存失败');
    }
  };

  // AI Handlers
  const handleApplyPolishedTexts = (newTexts: string[]) => {
    setSegments(prev => prev.map((s, i) => newTexts[i] ? { ...s, text: newTexts[i] } : s));
    setIsSaved(false);
  };

  const handleApplyTranslations = (translations: string[]) => {
    setSegments(prev => prev.map((s, i) => translations[i] ? { ...s, translation: translations[i] } : s));
    setBilingualMode(true);
    setIsSaved(false);
  };

  // Speaker Role Management Handlers
  const handleRenameSpeakerGlobal = (oldName: string, newName: string) => {
    setSegments(prev => prev.map(s => s.speaker === oldName ? { ...s, speaker: newName } : s));
    setSpeakers(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    setIsSaved(false);
  };

  const handleMergeSpeakersGlobal = (sourceSpeaker: string, targetSpeaker: string) => {
    setSegments(prev => prev.map(s => s.speaker === sourceSpeaker ? { ...s, speaker: targetSpeaker } : s));
    setSpeakers(prev => prev.filter(p => p.name !== sourceSpeaker));
    setIsSaved(false);
  };

  const handleUpdateSpeakerColor = (speakerName: string, paletteIndex: number) => {
    const pal = COLOR_PALETTES[paletteIndex % COLOR_PALETTES.length];
    setSpeakers(prev => prev.map(p => p.name === speakerName ? {
      ...p,
      color: pal.color,
      bgColor: pal.bgColor,
      borderColor: pal.borderColor,
    } : p));
  };

  const activeSegment = segments.find(s => currentTime >= s.start && currentTime <= s.end);
  const audioSource = resolveAudioSource(currentJob);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header isProUser={isProUser} onOpenSettings={() => setIsSettingsModalOpen(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* If no completed job yet: show upload & config */}
        {(!currentJob || currentJob.status !== 'completed') && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-brand-400" />
                <h2 className="text-base font-semibold text-white">音视频转录配置</h2>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={diarize}
                    onChange={(e) => setDiarize(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-0"
                  />
                  <span>启用说话人声纹分离 (Diarization)</span>
                </label>
              </div>
            </div>

            <UploadZone onSelectFile={handleSelectFile} disabled={isProcessing} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  转录引擎模型 (全系已内置免下载)
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="ggml-base.bin">ggml-base.bin (已内置 140MB - 极速轻量推荐)</option>
                  <option value="ggml-small.bin">ggml-small.bin (已内置 465MB - 高精度多语种 • 免下载零等待)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  源音频语言识别
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="auto">🌐 智能自动检测 (Auto Detect)</option>
                  <option value="zh">🇨🇳 中文 (Chinese)</option>
                  <option value="en">🇺🇸 英语 (English)</option>
                  <option value="ja">🇯🇵 日语 (Japanese)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleStart}
                disabled={!filePath || isProcessing}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                  !filePath || isProcessing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white shadow-brand-500/25 hover:scale-[1.02]'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isProcessing ? '正在转录处理中...' : '开始离线极速转写'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Realtime Progress */}
        {currentJob && currentJob.status !== 'completed' && (
          <TranscriptionProgress job={currentJob} />
        )}

        {/* Studio Editor View (When Completed) */}
        {currentJob && currentJob.status === 'completed' && (
          <div className="space-y-5">
            {/* Top Bar for Resetting / Back */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentJob(null)}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>转录新文件</span>
              </button>
              <div className="text-xs text-slate-400 font-medium">
                当前项目：<span className="text-slate-200">{currentJob.fileName}</span>
              </div>
            </div>

            {/* Speaker Proportions Bar */}
            <SpeakerStatsCard
              segments={segments}
              speakers={speakers}
              onOpenRoleManager={() => setIsRoleModalOpen(true)}
            />

            {/* Waveform Player */}
            <WaveformPlayer
              audioUrl={audioSource.url}
              sourceError={audioSource.error}
              currentTime={currentTime}
              duration={duration}
              activeSegment={activeSegment}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onSeek={setCurrentTime}
            />

            {/* 4 Action Cards Toolbar */}
            <BilingualToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSaveSegments={handleSaveSegments}
              isSaved={isSaved}
              onOpenTranslationModal={() => setIsTranslationModalOpen(true)}
              onOpenRoleManager={() => setIsRoleModalOpen(true)}
              onOpenAIPolishModal={() => setIsAIPolishModalOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />

            {/* Subtitle Timeline Editor */}
            <SubtitleTimelineEditor
              segments={segments}
              speakers={speakers}
              currentTime={currentTime}
              bilingualMode={bilingualMode}
              searchQuery={searchQuery}
              onSelectSegment={(t) => setCurrentTime(t)}
              onUpdateSegment={handleUpdateSegment}
              onSplitSegment={handleSplitSegment}
              onMergeSegment={handleMergeSegment}
              onDeleteSegment={handleDeleteSegment}
              onAddSegmentBelow={handleAddSegmentBelow}
              onOpenRoleManager={() => setIsRoleModalOpen(true)}
            />

            {/* 1. Translation Modal */}
            <TranslationModal
              isOpen={isTranslationModalOpen}
              onClose={() => setIsTranslationModalOpen(false)}
              segments={segments}
              aiSettings={aiSettings}
              bilingualMode={bilingualMode}
              onToggleBilingual={setBilingualMode}
              onApplyTranslations={handleApplyTranslations}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />

            {/* 2. Speaker Role Modal */}
            <SpeakerRoleModal
              isOpen={isRoleModalOpen}
              onClose={() => setIsRoleModalOpen(false)}
              segments={segments}
              speakers={speakers}
              onRenameSpeakerGlobal={handleRenameSpeakerGlobal}
              onMergeSpeakersGlobal={handleMergeSpeakersGlobal}
              onUpdateSpeakerColor={handleUpdateSpeakerColor}
            />

            {/* 3. AI Polish & Summary Modal */}
            <AIPolishModal
              isOpen={isAIPolishModalOpen}
              onClose={() => setIsAIPolishModalOpen(false)}
              segments={segments}
              aiSettings={aiSettings}
              onApplyPolishedTexts={handleApplyPolishedTexts}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />

            {/* 4. Multi-format Export Modal */}
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              segments={segments}
              fileName={currentJob.fileName}
              isProUser={isProUser}
              onOpenUpgrade={() => setIsSettingsModalOpen(true)}
            />

          </div>
        )}
      </main>

      {/* Global Settings & License Modal (Accessible anytime from Header) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        aiSettings={aiSettings}
        onSaveAISettings={handleSaveAISettings}
        licenseKey={licenseKey}
        onSaveLicenseKey={handleSaveLicenseKey}
        licensePayload={licensePayload}
        isProUser={isProUser}
      />
    </div>
  );
};
