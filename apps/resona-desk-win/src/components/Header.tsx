import React, { useState, useEffect } from 'react';
import { Mic2, Settings, Crown, Cpu, Minus, Square, X, Copy } from 'lucide-react';
import { isElectronEnv } from '../services/api';

interface HeaderProps {
  isProUser: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isProUser, onOpenSettings }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isElectronEnv()) {
      (window as any).electronAPI?.isMaximized?.().then((max: boolean) => {
        setIsMaximized(Boolean(max));
      });
    }
  }, []);

  const handleMinimize = () => {
    if (isElectronEnv()) {
      (window as any).electronAPI?.minimize?.();
    }
  };

  const handleMaximize = async () => {
    if (isElectronEnv()) {
      const max = await (window as any).electronAPI?.maximize?.();
      setIsMaximized(Boolean(max));
    }
  };

  const handleClose = () => {
    if (isElectronEnv()) {
      (window as any).electronAPI?.close?.();
    }
  };

  return (
    <header
      style={{ WebkitAppRegion: 'drag' } as any}
      className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 select-none cursor-default"
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left Brand Title */}
        <div className="flex items-center space-x-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-lg shadow-brand-500/20 text-white">
            <Mic2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-white">ResonaDesk</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/80 font-bold">
                Windows x64
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
            <p className="text-[10px] text-slate-400">离线多说话人声纹转录与剪辑工坊</p>
          </div>
        </div>

        {/* Right Actions & Windows Titlebar Controls */}
        <div className="flex items-center space-x-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* AVX/OpenBLAS Indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-emerald-400 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5" />
            <span>AVX / OpenBLAS 就绪</span>
          </div>

          {/* 升级 Pro 专属入口 */}
          {!isProUser && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer"
              title="升级解锁 Pro 终身特权"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950 fill-current" />
              <span>升级 Pro</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-950/60 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-all"
            title="系统设置与授权"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Windows Native Window Controls (Minimize / Maximize / Close) */}
          {isElectronEnv() && (
            <div className="flex items-center ml-2 border-l border-slate-800 pl-2 space-x-1">
              <button
                onClick={handleMinimize}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="最小化"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleMaximize}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title={isMaximized ? '还原' : '最大化'}
              >
                {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
                title="关闭"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
