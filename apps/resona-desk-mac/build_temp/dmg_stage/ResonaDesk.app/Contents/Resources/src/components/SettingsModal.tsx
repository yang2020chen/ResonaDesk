import React, { useState } from 'react';
import { X, Key, ShieldCheck, Cpu, ExternalLink, Check, Copy, Crown, Sparkles, BookOpen, FileText } from 'lucide-react';
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
  const [keyError, setKeyError] = useState<string>('');
  const [keySuccess, setKeySuccess] = useState<boolean>(false);

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

  const handleVerifyAndSaveKey = async () => {
    setKeyError('');
    setKeySuccess(false);

    if (!inputKey.trim()) {
      onSaveLicenseKey('');
      return;
    }

    const res = await verifyLicenseKey(inputKey.trim());
    if (res.valid) {
      onSaveLicenseKey(inputKey.trim());
      setKeySuccess(true);
    } else {
      setKeyError(res.error || '激活码无效或已损坏');
    }
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
            <h3 className="text-sm font-semibold text-white">系统偏好设置与合规中心</h3>
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
            <span>商业授权管理</span>
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
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className={`w-5 h-5 ${isProUser ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div>
                      <h4 className="font-semibold text-white">
                        {isProUser ? 'ResonaDesk Pro 终身商业授权' : 'ResonaDesk 免费基础版'}
                      </h4>
                      <p className="text-slate-400 text-[11px]">
                        {isProUser
                          ? `授权用户: ${licensePayload?.email || '已激活'}`
                          : '解锁 Final Cut Pro XML 剪辑工程一键导出与全量 AI 智能精修'}
                      </p>
                    </div>
                  </div>
                  {isProUser && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                      PRO ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Input Key */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block">离线激活码 (Ed25519 纯本地验签)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="RD-PRO-eyJlbWFpbCI..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={handleVerifyAndSaveKey}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-all shadow-sm"
                  >
                    验证激活
                  </button>
                </div>
                {keyError && <p className="text-rose-400 text-[11px] font-medium">{keyError}</p>}
                {keySuccess && <p className="text-emerald-400 text-[11px] font-medium">✓ 激活成功！已解锁全部 Pro 终身权益。</p>}
              </div>

              <div className="border-t border-slate-800/80 pt-3 text-slate-400 text-[11px] space-y-1 leading-relaxed">
                <p>💡 <strong>100% 离线隐私保证</strong>：激活码采用非对称密码学（Ed25519）在您的 Mac 本地验签，无需向任何远程服务器联网汇报。</p>
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
                <label className="text-slate-300 font-semibold block mb-1">API Key (BYOK 密钥本地加密存储)</label>
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
