import React from 'react';
import { SubtitleSegment } from '../types';
import { User, Copy, Check, FileText } from 'lucide-react';

interface SubtitleTableProps {
  segments: SubtitleSegment[];
}

export const SubtitleTable: React.FC<SubtitleTableProps> = ({ segments }) => {
  const [copied, setCopied] = React.useState(false);

  const formatTimestamp = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const handleCopyAll = () => {
    const fullText = segments.map(s => `[${formatTimestamp(s.start)} -> ${formatTimestamp(s.end)}] [${s.speaker}]: ${s.text}`).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!segments || segments.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-white">转写字幕片段清单</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {segments.length} 条
          </span>
        </div>
        <button
          onClick={handleCopyAll}
          className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '已复制全文' : '一键复制全部'}</span>
        </button>
      </div>

      <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-800/60">
        {segments.map((seg, idx) => (
          <div key={seg.id || idx} className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-start space-x-4">
            <span className="text-xs font-mono text-slate-500 pt-0.5 select-none w-6 text-right">
              {idx + 1}
            </span>
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-brand-400 select-none shrink-0">
              <span>{formatTimestamp(seg.start)}</span>
              <span className="text-slate-600">→</span>
              <span>{formatTimestamp(seg.end)}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 select-none shrink-0">
              <User className="w-3 h-3 text-indigo-400" />
              <span>{seg.speaker || '说话人 1'}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed flex-1">
              {seg.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
