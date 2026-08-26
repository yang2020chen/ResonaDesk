import React from 'react';
import { Languages, Search, Users, Download, Sparkles, Check, Save } from 'lucide-react';
interface BilingualToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSaveSegments: () => void;
  isSaved: boolean;
  onOpenTranslationModal: () => void;
  onOpenRoleManager: () => void;
  onOpenAIPolishModal: () => void;
  onOpenExportModal: () => void;
}

export const BilingualToolbar: React.FC<BilingualToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onSaveSegments,
  isSaved,
  onOpenTranslationModal,
  onOpenRoleManager,
  onOpenAIPolishModal,
  onOpenExportModal,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
      {/* 4 Clear Orthogonal Action Buttons */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        {/* 1. 一键双语翻译 */}
        <button
          onClick={onOpenTranslationModal}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-950/60 hover:bg-brand-900/60 border border-brand-500/50 text-brand-300 shadow-sm transition-all hover:scale-[1.02]"
        >
          <Languages className="w-3.5 h-3.5 text-brand-400" />
          <span>一键双语翻译</span>
        </button>

        {/* 2. 声纹角色归并 */}
        <button
          onClick={onOpenRoleManager}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 transition-all hover:scale-[1.02]"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>声纹角色归并</span>
        </button>

        {/* 3. AI 润色与纪要 */}
        <button
          onClick={onOpenAIPolishModal}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/60 text-purple-300 transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>AI 润色与纪要</span>
        </button>

        {/* 4. 导出字幕工程 */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 transition-all hover:scale-[1.02]"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>导出字幕工程</span>
        </button>
      </div>

      {/* Right Search & Save */}
      <div className="flex items-center space-x-2.5">
        <div className="relative flex-1 sm:flex-none">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索字幕文本..."
            className="w-full sm:w-44 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        <button
          onClick={onSaveSegments}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            isSaved
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm'
          }`}
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaved ? '已保存' : '保存修改'}</span>
        </button>
      </div>
    </div>
  );
};
