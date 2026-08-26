import React from 'react';
import { Mic2, Cpu, ShieldCheck, Settings, Crown } from 'lucide-react';

interface HeaderProps {
  isProUser: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isProUser, onOpenSettings }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Mic2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white">ResonaDesk</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              macOS Arm64
            </span>
            {isProUser && (
              <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>PRO LIFETIME</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">离线音视频转录与声纹精修工坊</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
          <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-medium">Metal GPU 就绪</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          title="系统设置与 BYOK 密钥配置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
