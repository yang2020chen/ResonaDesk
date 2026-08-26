import React from 'react';
import { Loader2, Gauge, Clock, Activity, DownloadCloud } from 'lucide-react';
import { TranscriptionJob } from '../types';

interface TranscriptionProgressProps {
  job: TranscriptionJob;
}

export const TranscriptionProgress: React.FC<TranscriptionProgressProps> = ({ job }) => {
  const isDownloading = job.currentStep?.includes('下载') || job.currentStep?.includes('download');

  const getStepTitle = () => {
    if (job.status === 'error') {
      return '转录异常: ' + (job.error || '未知错误');
    }
    if (job.status === 'completed') {
      return '转录完成！';
    }
    if (isDownloading) {
      return job.currentStep;
    }
    if (job.status === 'extracting_audio') {
      return '正在使用 FFmpeg 提取与转换 16kHz 高保真音频...';
    }
    if (job.status === 'transcribing') {
      return 'Whisper.cpp Metal GPU 正在进行深度神经网络转录与声纹聚类...';
    }
    return job.currentStep || '准备中...';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {job.status !== 'completed' && job.status !== 'error' ? (
            isDownloading ? (
              <DownloadCloud className="w-5 h-5 text-indigo-400 animate-bounce" />
            ) : (
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            )
          ) : (
            <Activity className="w-5 h-5 text-emerald-400" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-white">{getStepTitle()}</h4>
            <p className="text-xs text-slate-400">正在处理: {job.fileName}</p>
          </div>
        </div>
        <span className="text-lg font-mono font-bold text-brand-400">
          {Math.round(job.progressPercent)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
          style={{ width: `${Math.max(3, job.progressPercent)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-brand-400" />
          <div>
            <div className="text-slate-400 text-[10px]">处理状态</div>
            <div className="font-mono font-semibold text-slate-200 truncate">{job.speed || (isDownloading ? '下载模型中...' : '推理中...')}</div>
          </div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <div>
            <div className="text-slate-400 text-[10px]">当前模型</div>
            <div className="font-mono font-semibold text-slate-200">{job.model}</div>
          </div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-slate-400 text-[10px]">已生成片段</div>
            <div className="font-mono font-semibold text-slate-200">{job.segments?.length || 0} 条</div>
          </div>
        </div>
      </div>
    </div>
  );
};
