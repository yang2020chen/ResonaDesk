import React from 'react';
import { Mic2, Settings, Crown, Cpu, Sparkles } from 'lucide-react';

interface HeaderProps {
  isProUser: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isProUser, onOpenSettings }) => {
  return (
    <header
      data-tauri-drag-region="deep"
      className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 select-none cursor-default"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left Brand Title (With left padding for macOS traffic lights) */}
        <div className="flex items-center space-x-3 pl-16">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-lg shadow-brand-500/20 text-white">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white">ResonaDesk</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/80 font-bold">
                macOS arm64
              </span>
              {isProUser ? (
                <span className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-sm">
                  <Crown className="w-3 h-3 text-amber-400 fill-current" />
                  <span>PRO 终身版</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  基础免费版
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">离线多说话人声纹转录与剪辑工坊</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Metal GPU Indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-emerald-400 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5" />
            <span>Metal GPU 就绪</span>
          </div>

          {/* 升级 Pro 专属高亮入口 (未激活状态常显) */}
          {!isProUser && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer animate-pulse"
              title="升级解锁 Pro 终身商业特权"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950 fill-current" />
              <span>👑 升级 Pro</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-950/60 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-all hover:scale-105"
            title="系统偏好设置与授权"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
