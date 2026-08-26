import React from 'react';
import { Users, Clock, Percent } from 'lucide-react';
import { SubtitleSegment, SpeakerProfile } from '../types';
import { COLOR_PALETTES } from '../utils/speakerColors';

interface SpeakerStatsCardProps {
  segments: SubtitleSegment[];
  speakers: SpeakerProfile[];
  onOpenRoleManager: () => void;
}

export const SpeakerStatsCard: React.FC<SpeakerStatsCardProps> = ({
  segments,
  speakers,
  onOpenRoleManager,
}) => {
  // Calculate speech time per speaker
  const statsMap = new Map<string, { totalTime: number; count: number }>();
  let totalAudioTime = 0;

  segments.forEach(seg => {
    const dur = Math.max(0, seg.end - seg.start);
    totalAudioTime += dur;
    const curr = statsMap.get(seg.speaker) || { totalTime: 0, count: 0 };
    curr.totalTime += dur;
    curr.count += 1;
    statsMap.set(seg.speaker, curr);
  });

  const speakerStats = Array.from(statsMap.entries()).map(([name, data], idx) => {
    const profile = speakers.find(s => s.name === name) || {
      id: name,
      name,
      color: COLOR_PALETTES[idx % COLOR_PALETTES.length].color,
      bgColor: COLOR_PALETTES[idx % COLOR_PALETTES.length].bgColor,
      borderColor: COLOR_PALETTES[idx % COLOR_PALETTES.length].borderColor,
    };
    const percent = totalAudioTime > 0 ? (data.totalTime / totalAudioTime) * 100 : 0;
    return {
      name,
      totalTimeSec: data.totalTime,
      count: data.count,
      percent,
      profile,
    };
  });

  if (speakerStats.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-white">说话人发言占比与声纹统计</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {speakerStats.length} 位角色
          </span>
        </div>
        <button
          onClick={onOpenRoleManager}
          className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          管理与归并角色 →
        </button>
      </div>

      {/* Multi-Segment Proportion Bar */}
      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
        {speakerStats.map((item) => (
          <div
            key={item.name}
            style={{ width: `${item.percent}%`, backgroundColor: item.profile.color }}
            title={`${item.name}: ${item.percent.toFixed(1)}% (${item.totalTimeSec.toFixed(1)}s)`}
            className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      {/* Speaker Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
        {speakerStats.map((item) => (
          <div
            key={item.name}
            className={`p-2 rounded-xl border flex items-center justify-between text-xs ${item.profile.bgColor} ${item.profile.borderColor}`}
          >
            <div className="flex items-center space-x-2 truncate">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.profile.color }}
              />
              <span className="font-semibold text-slate-100 truncate">{item.name}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 shrink-0 pl-1">
              {item.percent.toFixed(0)}% ({item.count}句)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
