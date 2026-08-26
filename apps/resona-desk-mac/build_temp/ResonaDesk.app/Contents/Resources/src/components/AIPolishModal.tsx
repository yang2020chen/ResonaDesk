import React, { useState } from 'react';
import { X, Sparkles, Wand2, FileCheck, Share2, Loader2, Copy, Check } from 'lucide-react';
import { SubtitleSegment } from '../types';
import { AISettings, polishSubtitles, generateMeetingSummary, generateSocialPost } from '../services/aiService';

interface AIPolishModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  aiSettings: AISettings;
  onApplyPolishedTexts: (newTexts: string[]) => void;
  onOpenSettings: () => void;
}

export const AIPolishModal: React.FC<AIPolishModalProps> = ({
  isOpen,
  onClose,
  segments,
  aiSettings,
  onApplyPolishedTexts,
  onOpenSettings,
}) => {
  const [tab, setTab] = useState<'polish' | 'summary' | 'social'>('polish');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>('');
  const [parsedLines, setParsedLines] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExecuteAI = async () => {
    if (!aiSettings.apiKey) {
      onOpenSettings();
      return;
    }

    setIsLoading(true);
    setResultText('');
    setParsedLines([]);

    try {
      if (tab === 'polish') {
        const lines = await polishSubtitles(segments, aiSettings);
        setParsedLines(lines);
        setResultText(lines.map((l, i) => `${i + 1}. ${l}`).join('\n'));
      } else if (tab === 'summary') {
        const summary = await generateMeetingSummary(segments, aiSettings);
        setResultText(summary);
      } else if (tab === 'social') {
        const post = await generateSocialPost(segments, aiSettings);
        setResultText(post);
      }
    } catch (err: any) {
      alert('AI 处理失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (tab === 'polish' && parsedLines.length > 0) {
      onApplyPolishedTexts(parsedLines);
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI 润色与智能纪要工坊</h3>
              <p className="text-[11px] text-slate-400">口语去语气词润色、会议纪要提炼与社交媒体爆款文案</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Action Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'polish', label: '口语去词精修', desc: '去语气词、纠错标点', icon: Wand2 },
              { id: 'summary', label: '会议智能纪要', desc: '议题提炼、Action Items', icon: FileCheck },
              { id: 'social', label: '小红书爆款文案', desc: 'Emoji 痛点图文排版', icon: Share2 },
            ].map(t => {
              const Icon = t.icon;
              const isSelected = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id as any);
                    setResultText('');
                    setParsedLines([]);
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all text-xs font-semibold ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-300 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{t.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Configuration sub-row */}
          <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <span>当前驱动:</span>
              <span className="font-semibold text-purple-400 font-mono">
                {aiSettings.model}
              </span>
              {!aiSettings.apiKey && (
                <span className="text-amber-400 text-[11px]">(未配置 Key，点击配置)</span>
              )}
            </div>

            <button
              onClick={handleExecuteAI}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-sm transition-all"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'AI 正在推理中...' : '立即生成'}</span>
            </button>
          </div>

          {/* Result Output Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>AI 生成结果</span>
              {resultText && (
                <button onClick={handleCopy} className="text-purple-400 hover:underline flex items-center space-x-1">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '已复制全文' : '复制结果'}</span>
                </button>
              )}
            </div>
            <textarea
              rows={8}
              readOnly
              value={resultText || (isLoading ? 'AI 正在深度提炼中，请稍候...' : '点击上方「立即生成」开始 AI 处理')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end space-x-3 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200">
            关闭
          </button>
          {tab === 'polish' && parsedLines.length > 0 && (
            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
            >
              应用精修结果到时间轴
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
