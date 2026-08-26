import React, { useState } from 'react';
import { X, Users, Edit3, ArrowRightLeft, Check } from 'lucide-react';
import { SubtitleSegment, SpeakerProfile } from '../types';
import { COLOR_PALETTES } from '../utils/speakerColors';

interface SpeakerRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  speakers: SpeakerProfile[];
  onRenameSpeakerGlobal: (oldName: string, newName: string) => void;
  onMergeSpeakersGlobal: (sourceSpeaker: string, targetSpeaker: string) => void;
  onUpdateSpeakerColor: (speakerName: string, paletteIndex: number) => void;
}

export const SpeakerRoleModal: React.FC<SpeakerRoleModalProps> = ({
  isOpen,
  onClose,
  segments,
  speakers,
  onRenameSpeakerGlobal,
  onMergeSpeakersGlobal,
  onUpdateSpeakerColor,
}) => {
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [mergeSource, setMergeSource] = useState<string>('');
  const [mergeTarget, setMergeTarget] = useState<string>('');

  if (!isOpen) return null;

  // Extract unique speaker list
  const speakerNames = Array.from(new Set(segments.map(s => s.speaker)));

  const handleStartRename = (name: string) => {
    setEditingSpeaker(name);
    setRenameValue(name);
  };

  const handleSaveRename = (oldName: string) => {
    if (renameValue && renameValue !== oldName) {
      onRenameSpeakerGlobal(oldName, renameValue.trim());
    }
    setEditingSpeaker(null);
  };

  const handleExecuteMerge = () => {
    if (mergeSource && mergeTarget && mergeSource !== mergeTarget) {
      onMergeSpeakersGlobal(mergeSource, mergeTarget);
      setMergeSource('');
      setMergeTarget('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">声纹角色管理与全局归并</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-800/80">
          {/* Section 1: Speaker List & Renaming */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              当前检测到的角色清单
            </h4>

            <div className="space-y-2">
              {speakerNames.map((name, idx) => {
                const profile = speakers.find(s => s.name === name) || {
                  id: name,
                  name,
                  color: COLOR_PALETTES[idx % COLOR_PALETTES.length].color,
                  bgColor: COLOR_PALETTES[idx % COLOR_PALETTES.length].bgColor,
                  borderColor: COLOR_PALETTES[idx % COLOR_PALETTES.length].borderColor,
                };
                const lineCount = segments.filter(s => s.speaker === name).length;

                return (
                  <div
                    key={name}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: profile.color }}
                      />

                      {editingSpeaker === name ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(name)}
                            autoFocus
                            className="bg-slate-900 border border-brand-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-48"
                          />
                          <button
                            onClick={() => handleSaveRename(name)}
                            className="p-1 rounded bg-brand-600 text-white hover:bg-brand-500"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-white">{name}</span>
                          <span className="text-[11px] text-slate-400">({lineCount} 句)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Color Picker Buttons */}
                      <div className="flex items-center space-x-1 pr-2 border-r border-slate-800">
                        {COLOR_PALETTES.slice(0, 4).map((pal, pIdx) => (
                          <button
                            key={pal.name}
                            onClick={() => onUpdateSpeakerColor(name, pIdx)}
                            className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                            style={{ backgroundColor: pal.color }}
                          />
                        ))}
                      </div>

                      {editingSpeaker !== name && (
                        <button
                          onClick={() => handleStartRename(name)}
                          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>改名</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Speaker Merging */}
          <div className="pt-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>声纹误识别与角色合并</span>
            </h4>
            <p className="text-xs text-slate-500">
              如果系统将同一个人切分成了两个说话人，可在此一键将源角色合并至目标角色。
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-slate-400 block mb-1">源角色 (将被合并)</label>
                <select
                  value={mergeSource}
                  onChange={(e) => setMergeSource(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">选择源说话人...</option>
                  {speakerNames.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <span className="text-slate-600 font-bold self-center pt-3 sm:pt-4">→</span>

              <div className="flex-1 w-full">
                <label className="text-[10px] text-slate-400 block mb-1">目标角色 (合并后保留)</label>
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">选择目标说话人...</option>
                  {speakerNames.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 sm:pt-4 w-full sm:w-auto">
                <button
                  onClick={handleExecuteMerge}
                  disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}
                  className={`w-full px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    !mergeSource || !mergeTarget || mergeSource === mergeTarget
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  一键合并
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
