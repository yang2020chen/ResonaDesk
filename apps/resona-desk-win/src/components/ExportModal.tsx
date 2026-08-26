import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, FileText, Film, Music, Globe, File, Languages, AlertCircle, FolderOpen, Loader2 } from 'lucide-react';
import { SubtitleSegment } from '../types';
import { saveExportFile, revealFileInFinder } from '../services/api';
import {
  exportToSRT,
  exportToVTT,
  exportToLRC,
  exportToTXT,
  exportToFCPXML,
  downloadFile,
  ExportContentMode
} from '../utils/exporters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  fileName: string;
  isProUser: boolean;
  onOpenUpgrade: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  segments,
  fileName,
  isProUser,
  onOpenUpgrade,
}) => {
  const [activeFormat, setActiveFormat] = useState<'srt' | 'vtt' | 'lrc' | 'txt' | 'fcpxml'>('srt');
  const [includeSpeakers, setIncludeSpeakers] = useState<boolean>(true);
  const hasTranslation = segments.some(s => s.translation && s.translation.trim().length > 0);
  const [contentMode, setContentMode] = useState<ExportContentMode>(hasTranslation ? 'bilingual' : 'original');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; filePath?: string; filename?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const baseName = fileName.replace(/\.[^/.]+$/, '') || 'ResonaDesk_Export';

  const getExportContent = () => {
    const opts = { contentMode, includeSpeakers, includeTimestamps: true, title: baseName };
    switch (activeFormat) {
      case 'srt':
        return exportToSRT(segments, opts);
      case 'vtt':
        return exportToVTT(segments, opts);
      case 'lrc':
        return exportToLRC(segments, opts);
      case 'txt':
        return exportToTXT(segments, opts);
      case 'fcpxml':
        return exportToFCPXML(segments, opts);
      default:
        return '';
    }
  };

  const currentContent = getExportContent();

  const handleDownload = async () => {
    // FCPXML is a Pro feature
    if (activeFormat === 'fcpxml' && !isProUser) {
      onOpenUpgrade();
      return;
    }

    const modeSuffixMap: Record<ExportContentMode, string> = {
      original: '_原文',
      translation: '_译文',
      bilingual: '_双语'
    };
    const suffix = modeSuffixMap[contentMode] || '';

    const extMap = { srt: 'srt', vtt: 'vtt', lrc: 'lrc', txt: 'txt', fcpxml: 'fcpxml' };
    const ext = extMap[activeFormat];
    const targetFileName = `${baseName}${suffix}.${ext}`;

    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await saveExportFile({ filename: targetFileName, content: currentContent });
      if (res.success) {
        setSaveResult({ success: true, filePath: res.filePath, filename: res.filename });
      } else {
        throw new Error((res as any).error || '导出失败');
      }
    } catch (err: any) {
      setSaveResult({ success: false, error: err.message || '文件保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">多格式字幕与工程导出工坊</h3>
              <p className="text-[11px] text-slate-400">支持纯原文、纯译文与双语对照多轨灵活导出</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Format Selection Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">选择导出文件格式</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'srt', label: 'SRT 字幕', icon: FileText, pro: false },
                { id: 'vtt', label: 'WebVTT', icon: FileCode, pro: false },
                { id: 'lrc', label: 'LRC 歌词', icon: Music, pro: false },
                { id: 'txt', label: '纯文本 TXT', icon: FileText, pro: false },
                { id: 'fcpxml', label: 'Final Cut Pro', icon: Film, pro: true },
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeFormat === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFormat(tab.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition-all text-xs font-semibold relative ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {tab.pro && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        PRO
                      </span>
                    )}
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Content Mode Radio Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">字幕内容输出范围</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'original', label: '仅导出原文', desc: '纯原声音轨字幕', icon: File },
                { id: 'translation', label: '仅导出译文', desc: '纯翻译外文字幕', icon: Globe },
                { id: 'bilingual', label: '双语双轨对照', desc: '原文 + 译文双行对齐', icon: Languages },
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = contentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setContentMode(mode.id as ExportContentMode)}
                    className={`p-3 rounded-xl border flex flex-col items-start text-left space-y-1 transition-all ${
                      isSelected
                        ? 'bg-brand-500/20 border-brand-500/60 text-brand-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-semibold text-xs text-white">
                      <Icon className="w-3.5 h-3.5 text-brand-400" />
                      <span>{mode.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{mode.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert if translation selected but empty */}
          {(contentMode === 'translation' || contentMode === 'bilingual') && !hasTranslation && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 flex items-center space-x-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>当前字幕尚未包含翻译内容。您可以先使用顶部的「一键双语翻译」生成译文，或直接导出原文。</span>
            </div>
          )}

          {/* 3. Auxiliary Options */}
          <div className="flex items-center space-x-4 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSpeakers}
                onChange={(e) => setIncludeSpeakers(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-brand-500"
              />
              <span>包含说话人角色标识 (如 [说话人 1])</span>
            </label>
          </div>

          {/* Save Result Notification Banner */}
          {saveResult && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-fadeIn ${
              saveResult.success
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
            }`}>
              <div className="flex items-center space-x-2 overflow-hidden pr-2">
                {saveResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="truncate">
                  {saveResult.success
                    ? `✓ 文件已成功导出至: ${saveResult.filePath}`
                    : `导出失败: ${saveResult.error}`}
                </span>
              </div>
              {saveResult.success && saveResult.filePath && (
                <button
                  type="button"
                  onClick={() => revealFileInFinder(saveResult.filePath!)}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-emerald-500/30 transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>在资源管理器中定位</span>
                </button>
              )}
            </div>
          )}

          {/* 4. Real-time Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>导出产物实时预览 ({segments.length} 条)</span>
              <button onClick={handleCopy} className="text-emerald-400 hover:underline flex items-center space-x-1">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制内容'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto leading-relaxed select-all">
              {currentContent.slice(0, 1500)}
              {currentContent.length > 1500 ? '\n... (其余部分省略)' : ''}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="text-xs text-slate-400">
            导出模式: <span className="text-emerald-400 font-medium">
              {contentMode === 'original' ? '纯原文' : contentMode === 'translation' ? '纯译文' : '双语对照'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200">
              取消
            </button>
            <button
              onClick={handleDownload}
              disabled={isSaving}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isSaving ? '正在导出落盘...' : `导出并保存 ${activeFormat.toUpperCase()} 文件`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
