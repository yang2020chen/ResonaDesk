import React, { useRef, useEffect, useState } from 'react';
import { SubtitleSegment, SpeakerProfile } from '../types';
import { Play, Scissors, Link, Plus, Trash2, ChevronLeft, ChevronRight, User, ChevronDown } from 'lucide-react';
import { COLOR_PALETTES } from '../utils/speakerColors';

interface SubtitleTimelineEditorProps {
  segments: SubtitleSegment[];
  speakers: SpeakerProfile[];
  currentTime: number;
  bilingualMode: boolean;
  searchQuery: string;
  onSelectSegment: (time: number) => void;
  onUpdateSegment: (id: number, updated: Partial<SubtitleSegment>) => void;
  onSplitSegment: (index: number) => void;
  onMergeSegment: (index: number) => void;
  onDeleteSegment: (id: number) => void;
  onAddSegmentBelow: (index: number) => void;
  onOpenRoleManager: () => void;
}

export const SubtitleTimelineEditor: React.FC<SubtitleTimelineEditorProps> = ({
  segments,
  speakers,
  currentTime,
  bilingualMode,
  searchQuery,
  onSelectSegment,
  onUpdateSegment,
  onSplitSegment,
  onMergeSegment,
  onDeleteSegment,
  onAddSegmentBelow,
  onOpenRoleManager,
}) => {
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeSpeakerDropdownId, setActiveSpeakerDropdownId] = useState<number | null>(null);

  // Auto-scroll current active segment into view
  useEffect(() => {
    const activeSeg = segments.find(s => currentTime >= s.start && currentTime <= s.end);
    if (activeSeg) {
      const el = itemRefs.current.get(activeSeg.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentTime, segments]);

  const formatTimestamp = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const filteredSegments = segments.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.text.toLowerCase().includes(q) || (s.translation && s.translation.toLowerCase().includes(q));
  });

  const availableSpeakerNames = Array.from(new Set([
    ...speakers.map(s => s.name),
    ...segments.map(s => s.speaker),
  ]));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-20">
        <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
          <span>时间轴逐句精修编辑器</span>
        </h3>
        <div className="text-xs text-slate-400">
          快捷操作：点击时间戳定位音频 • 点击角色标签快速切换
        </div>
      </div>

      <div className="divide-y divide-slate-800/60 max-h-[560px] overflow-y-auto p-2 space-y-1">
        {filteredSegments.map((seg, idx) => {
          const isActive = currentTime >= seg.start && currentTime <= seg.end;
          const speakerProfile = speakers.find(s => s.name === seg.speaker) || {
            id: seg.speaker,
            name: seg.speaker,
            color: COLOR_PALETTES[0].color,
            bgColor: COLOR_PALETTES[0].bgColor,
            borderColor: COLOR_PALETTES[0].borderColor,
          };

          return (
            <div
              key={seg.id}
              ref={el => { if (el) itemRefs.current.set(seg.id, el); }}
              style={{ borderLeftColor: speakerProfile.color }}
              className={`p-3.5 rounded-xl border-l-4 transition-all duration-200 ${
                isActive
                  ? 'bg-brand-950/40 border border-brand-500/60 shadow-lg shadow-brand-500/10'
                  : 'bg-slate-950/40 hover:bg-slate-950/80 border border-transparent hover:border-slate-800'
              }`}
            >
              {/* Row Top: Speaker & Timestamps Fine-Tuning */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-slate-500 select-none w-5 text-right">
                    #{idx + 1}
                  </span>

                  {/* Speaker Selector Badge */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveSpeakerDropdownId(activeSpeakerDropdownId === seg.id ? null : seg.id)}
                      className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${speakerProfile.bgColor} ${speakerProfile.borderColor}`}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: speakerProfile.color }}
                      />
                      <span className="text-slate-200">{seg.speaker || '说话人 1'}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Speaker Dropdown */}
                    {activeSpeakerDropdownId === seg.id && (
                      <div className="absolute left-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 py-1 divide-y divide-slate-800/60 animate-fadeIn">
                        <div className="py-1">
                          {availableSpeakerNames.map((spk) => (
                            <button
                              key={spk}
                              onClick={() => {
                                onUpdateSegment(seg.id, { speaker: spk });
                                setActiveSpeakerDropdownId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
                            >
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{spk}</span>
                            </button>
                          ))}
                        </div>
                        <div className="p-1">
                          <button
                            onClick={() => {
                              setActiveSpeakerDropdownId(null);
                              onOpenRoleManager();
                            }}
                            className="w-full text-left px-2.5 py-1 text-[11px] text-brand-400 hover:bg-slate-800 rounded font-medium"
                          >
                            + 管理角色列表
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time Range Jump Button */}
                  <button
                    onClick={() => onSelectSegment(seg.start)}
                    className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-brand-400 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current text-brand-400" />
                    <span>{formatTimestamp(seg.start)}</span>
                    <span className="text-slate-600">→</span>
                    <span>{formatTimestamp(seg.end)}</span>
                  </button>

                  {/* Fine Tune Buttons */}
                  <div className="hidden sm:flex items-center space-x-1 text-[10px] text-slate-400">
                    <button
                      onClick={() => onUpdateSegment(seg.id, { start: Math.max(0, seg.start - 0.1) })}
                      title="起点提前 100ms"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span>起点</span>
                    <button
                      onClick={() => onUpdateSegment(seg.id, { start: seg.start + 0.1 })}
                      title="起点推后 100ms"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => onUpdateSegment(seg.id, { end: Math.max(seg.start + 0.1, seg.end - 0.1) })}
                      title="终点提前 100ms"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 ml-2"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span>终点</span>
                    <button
                      onClick={() => onUpdateSegment(seg.id, { end: seg.end + 0.1 })}
                      title="终点推后 100ms"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Right: Actions (Split, Merge, Add, Delete) */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onSplitSegment(idx)}
                    title="在此处拆分字幕"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                  >
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                  {idx < segments.length - 1 && (
                    <button
                      onClick={() => onMergeSegment(idx)}
                      title="与下一句合并"
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                    >
                      <Link className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  )}
                  <button
                    onClick={() => onAddSegmentBelow(idx)}
                    title="在下方插入新句"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => onDeleteSegment(seg.id)}
                    title="删除本句"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text Input Row */}
              <div className="space-y-2 pl-7">
                <textarea
                  rows={2}
                  value={seg.text}
                  onChange={(e) => onUpdateSegment(seg.id, { text: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none transition-colors"
                />

                {/* Bilingual Translation Track (Optional) */}
                {bilingualMode && (
                  <textarea
                    rows={1}
                    value={seg.translation || ''}
                    onChange={(e) => onUpdateSegment(seg.id, { translation: e.target.value })}
                    placeholder="译文/翻译轨道（点击输入翻译文本）..."
                    className="w-full bg-slate-950 border border-indigo-950/80 focus:border-indigo-500 rounded-xl p-2 text-xs text-indigo-200 placeholder-slate-600 focus:outline-none resize-none transition-colors"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
