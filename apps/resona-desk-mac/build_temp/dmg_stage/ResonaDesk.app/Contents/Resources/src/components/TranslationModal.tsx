import React, { useState } from 'react';
import { X, Languages, Sparkles, Loader2, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { SubtitleSegment } from '../types';
import { AISettings, translateSubtitles } from '../services/aiService';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  aiSettings: AISettings;
  bilingualMode: boolean;
  onToggleBilingual: (enabled: boolean) => void;
  onApplyTranslations: (translations: string[]) => void;
  onOpenSettings: () => void;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  segments,
  aiSettings,
  bilingualMode,
  onToggleBilingual,
  onApplyTranslations,
  onOpenSettings,
}) => {
  const [targetLang, setTargetLang] = useState<string>('英语 (English)');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translations, setTranslations] = useState<string[]>([]);
  const [applied, setApplied] = useState<boolean>(false);

  if (!isOpen) return null;

  const hasExistingTranslations = segments.some(s => s.translation && s.translation.trim().length > 0);

  const handleStartTranslation = async () => {
    if (!aiSettings.apiKey) {
      onOpenSettings();
      return;
    }

    setIsLoading(true);
    setApplied(false);

    try {
      const results = await translateSubtitles(segments, targetLang, aiSettings);
      setTranslations(results);
    } catch (err: any) {
      alert('AI 翻译请求失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (translations.length > 0) {
      onApplyTranslations(translations);
      onToggleBilingual(true);
      setApplied(true);
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">一键双语字幕翻译工坊</h3>
              <p className="text-[11px] text-slate-400">调用大语言模型逐句对齐翻译并生成双轨对照字幕</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Target Language Selection Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              选择目标翻译语种
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '英语 (English)', label: '🇺🇸 英语 (English)' },
                { id: '中文 (Chinese)', label: '🇨🇳 中文 (Chinese)' },
                { id: '日语 (Japanese)', label: '🇯🇵 日语 (Japanese)' },
                { id: '韩语 (Korean)', label: '🇰🇷 韩语 (Korean)' },
                { id: '西班牙语 (Spanish)', label: '🇪🇸 西班牙语' },
                { id: '法语 (French)', label: '🇫🇷 法语 (French)' },
                { id: '德语 (German)', label: '🇩🇪 德语 (German)' },
                { id: '俄语 (Russian)', label: '🇷🇺 俄语 (Russian)' },
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setTargetLang(lang.id)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    targetLang === lang.id
                      ? 'bg-brand-500/20 border-brand-500/60 text-brand-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Settings Info & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">
              <span>当前驱动: </span>
              <span className="font-mono text-brand-400 font-semibold">{aiSettings.model}</span>
              {!aiSettings.apiKey && (
                <span className="text-amber-400 text-[11px] ml-2 font-medium">(未配置 API Key，点击设置)</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleStartTranslation}
                disabled={isLoading}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isLoading ? 'AI 正在逐句智能翻译中...' : '开始一键生成双语'}</span>
              </button>
            </div>
          </div>

          {/* Translation Preview Box */}
          {translations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>翻译结果预览 ({translations.length} 句对照)</span>
                <span className="text-emerald-400 font-medium">✓ 翻译完成</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 max-h-48 overflow-y-auto divide-y divide-slate-800/60 space-y-2">
                {translations.map((t, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 space-y-1 text-xs">
                    <div className="text-slate-400 flex items-center space-x-2">
                      <span className="font-mono text-[10px] text-slate-600">#{idx + 1}</span>
                      <span>{segments[idx]?.text}</span>
                    </div>
                    <div className="text-brand-300 font-medium pl-4">
                      ↳ {t}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Track Display Control */}
          {hasExistingTranslations && (
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span>时间轴双轨视图当前状态:</span>
              <button
                onClick={() => onToggleBilingual(!bilingualMode)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              >
                {bilingualMode ? <Eye className="w-3.5 h-3.5 text-brand-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>{bilingualMode ? '已展开双轨显示' : '已折叠双轨显示'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end space-x-3 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200">
            关闭
          </button>
          {translations.length > 0 && (
            <button
              onClick={handleApply}
              className={`flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                applied
                  ? 'bg-emerald-600'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 hover:scale-105'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{applied ? '已应用到时间轴！' : '应用到双语时间轴并展开'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
