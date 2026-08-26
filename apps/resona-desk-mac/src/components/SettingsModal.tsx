import React, { useState } from 'react';
import { X, ShieldCheck, Cpu, Check, Crown, FileText, Sparkles, ExternalLink, Mail, KeyRound, AlertCircle, ClipboardPaste } from 'lucide-react';
import { AISettings, AI_MODEL_PROVIDERS } from '../services/aiService';
import { LicensePayload, verifyLicenseKey } from '../utils/licenseVerifier';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  onSaveAISettings: (newSettings: AISettings) => void;
  licenseKey: string;
  onSaveLicenseKey: (key: string) => void;
  licensePayload: LicensePayload | null;
  isProUser: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  aiSettings,
  onSaveAISettings,
  licenseKey,
  onSaveLicenseKey,
  licensePayload,
  isProUser,
}) => {
  const [activeTab, setActiveTab] = useState<'license' | 'ai' | 'notices'>('license');
  const [inputKey, setInputKey] = useState<string>(licenseKey);
  const [inputEmail, setInputEmail] = useState<string>(licensePayload?.email || '');
  const [keyError, setKeyError] = useState<string>('');
  const [keySuccess, setKeySuccess] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // AI settings local state
  const [provider, setProvider] = useState(aiSettings.provider);
  const [model, setModel] = useState(aiSettings.model);
  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [baseUrl, setBaseUrl] = useState(aiSettings.baseUrl || '');
  const [aiSaved, setAiSaved] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: 'deepseek' | 'openai' | 'claude' | 'custom') => {
    setProvider(newProvider);
    setModel(AI_MODEL_PROVIDERS[newProvider].defaultModel);
    setBaseUrl(AI_MODEL_PROVIDERS[newProvider].baseUrl);
  };


  const handlePasteToEmail = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputEmail(text.trim());
    } catch (err) {}
  };

  const handlePasteToKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputKey(text.trim());
    } catch (err) {}
  };

  const handlePasteToApiKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setApiKey(text.trim());
    } catch (err) {}
  };

  const handleVerifyAndSaveKey = async () => {
    setKeyError('');
    setKeySuccess(false);

    if (!inputKey.trim()) {
      setKeyError('请输入有效的激活码');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyLicenseKey(inputKey.trim(), inputEmail.trim());
      if (res.valid) {
        onSaveLicenseKey(inputKey.trim());
        setKeySuccess(true);
        setTimeout(() => {
          setKeySuccess(false);
        }, 3000);
      } else {
        setKeyError(res.reason || '激活码无效或已被篡改');
      }
    } catch (e: any) {
      setKeyError(e?.message || '验签异常');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFillDemoKey = () => {
    setInputEmail('creator@appstudio.pro');
    setInputKey('RD-PRO-TEST-2026');
    setKeyError('');
  };

  const handleOpenUrl = (targetUrl: string) => {
    try {
      window.open(targetUrl, '_blank');
    } catch (e) {}

    try {
      fetch('/api/system/open-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      }).catch(() => {});
    } catch (e) {}
  };

  const handleSaveAI = () => {
    onSaveAISettings({
      provider,
      apiKey: apiKey.trim(),
      model,
      baseUrl: baseUrl.trim(),
    });
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">系统偏好设置与授权中心</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('license')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeTab === 'license'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>👑 商业授权与购买</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeTab === 'ai'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI 模型服务 (BYOK)</span>
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeTab === 'notices'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>第三方开源许可</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {activeTab === 'license' && (
            <div className="space-y-4">
              {/* 授权状态看板 */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${isProUser ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {isProUser ? 'ResonaDesk Pro 终身商业授权' : 'ResonaDesk 基础免费版'}
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {isProUser
                          ? `已绑定授权：${licensePayload?.email || '已激活'}`
                          : '升级解锁多说话人无限制分离、时间轴自由拆分合并与 Final Cut Pro 剪辑工程一键直出'}
                      </p>
                    </div>
                  </div>
                  {isProUser ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                      PRO 终身已激活
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                      未激活
                    </span>
                  )}
                </div>

                {/* Pro 核心特权清单 */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>无限制多角色声纹分离与占比</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>时间轴毫秒级自由拆分/合并</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Final Cut Pro (FCPXML) 工程直出</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>大模型去语气词润色与双语精翻</span>
                  </div>
                </div>
              </div>

              {/* 输入激活码表单 */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>购买绑定邮箱 (Email)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteToEmail}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline cursor-pointer"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>粘贴邮箱</span>
                    </button>
                  </div>
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>离线激活码 (RD-PRO-... 或 AS-VIP-...)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteToKey}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 hover:underline cursor-pointer"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>粘贴激活码</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="RD-PRO-XXXX... 或 全家桶超级码 AS-VIP-XXXX..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                {keyError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2 text-[11px] text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{keyError}</span>
                  </div>
                )}

                {keySuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2 text-[11px] text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ 恭喜！激活成功，已解锁全部 Pro 终身商业权益。</span>
                  </div>
                )}

                <button
                  onClick={handleVerifyAndSaveKey}
                  disabled={isVerifying}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-slate-950 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Crown className="w-4 h-4 text-slate-950 fill-current" />
                  <span>{isVerifying ? '正在进行 Ed25519 本地离线验签...' : '验证并立即激活 Pro 授权'}</span>
                </button>
              </div>

              {/* 官方购买通道跳转入口 */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>尚未获取激活码？点击下方直达官方结账通道：</span>
                  <span className="text-emerald-400 flex items-center space-x-1 text-[10px]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>支付后自动生成并邮件发送</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* 单品购买直达 */}
                  <button
                    type="button"
                    onClick={() => handleOpenUrl('https://blog.757688.xyz/resonadesk-offline-ai-voiceprint-transcription-studio/#buy')}
                    className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white flex items-center justify-between transition-all group cursor-pointer text-left w-full shadow-sm hover:scale-[1.02]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">🎚️</span>
                      <div>
                        <p className="font-bold text-slate-100 group-hover:text-purple-300 text-xs">
                          单品微信/支付宝买断
                        </p>
                        <p className="text-[10px] text-slate-400">官方早鸟 ¥29.99 (终身)</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-300" />
                  </button>

                  {/* 全家桶会员直达 */}
                  <button
                    type="button"
                    onClick={() => handleOpenUrl('https://blog.757688.xyz/apps/')}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white flex items-center justify-between transition-all group cursor-pointer text-left w-full shadow-sm hover:scale-[1.02]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">💎</span>
                      <div>
                        <p className="font-bold text-slate-100 group-hover:text-amber-300 text-xs">
                          App Studio 全家桶会员
                        </p>
                        <p className="text-[10px] text-slate-400">¥199 一码通刷旗下所有软件</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">选择 AI 服务商</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['deepseek', 'openai', 'claude', 'custom'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => handleProviderChange(p)}
                      className={`p-2 rounded-xl border text-center font-medium capitalize transition-all ${
                        provider === p
                          ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {AI_MODEL_PROVIDERS[p].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">API Key (BYOK 密钥本地加密存储)</label>
                  <button
                    type="button"
                    onClick={handlePasteToApiKey}
                    className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center space-x-1 hover:underline cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>粘贴 Key</span>
                  </button>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">模型名称</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">API Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Key 仅存储于本地 LocalStorage，不上传任何服务器</span>
                <button
                  onClick={handleSaveAI}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-sm transition-all"
                >
                  {aiSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{aiSaved ? '已保存设置' : '保存 AI 配置'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notices' && (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-slate-300 leading-relaxed font-mono text-[11px] max-h-60 overflow-y-auto">
                <div className="font-sans font-semibold text-white text-xs mb-2">📜 开源组件授权清单：</div>
                <div>• <strong>whisper.cpp</strong> (MIT License) - Copyright (c) 2023 Georgi Gerganov</div>
                <div>• <strong>FFmpeg</strong> (LGPL v2.1+) - Copyright (c) 2000-2024 FFmpeg developers (Stdio Process Isolation)</div>
                <div>• <strong>OpenAI Whisper GGML Weights</strong> (MIT License) - Copyright (c) 2022 OpenAI</div>
                <div>• <strong>React</strong> (MIT License) - Copyright (c) Meta Platforms, Inc.</div>
                <div>• <strong>Lucide Icons</strong> (ISC License) - Copyright (c) Lucide Contributors</div>
                <div>• <strong>Tailwind CSS</strong> (MIT License) - Copyright (c) Tailwind Labs, Inc.</div>
              </div>
              <p className="text-slate-400 text-[10px]">
                本项目对涉及 LGPL/GPL 之音视频核心采用独立子进程隔离架构与标准流式 IPC 通信，完全符合开源授权审查规范。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
