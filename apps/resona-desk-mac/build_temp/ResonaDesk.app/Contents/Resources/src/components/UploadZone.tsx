import React, { useState } from 'react';
import { UploadCloud, FileAudio, FileVideo, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onSelectFile: (filePath: string, fileInfo: { name: string; size: number }) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onSelectFile, disabled }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const processFile = async (file: File) => {
    // Mode A: Direct desktop path (if available via electron / native container)
    const nativePath = (file as any).path;
    if (nativePath && typeof nativePath === 'string' && nativePath.startsWith('/')) {
      setSelectedFileName(file.name);
      onSelectFile(nativePath, { name: file.name, size: file.size });
      return;
    }

    // Mode B: High-speed local stream upload fallback (for Web / Sandboxed Webviews)
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }

      const data = await res.json();
      setSelectedFileName(file.name);
      onSelectFile(data.filePath, { name: file.name, size: file.size });
    } catch (err: any) {
      alert('音视频加载失败: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
        dragOver
          ? 'border-brand-500 bg-brand-500/10 scale-[0.99]'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
      } ${disabled || isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        disabled={disabled || isUploading}
        accept="audio/*,video/*,.mp4,.mkv,.mov,.avi,.mp3,.wav,.m4a,.flac,.aac,.ogg"
        onChange={handleFileInput}
      />
      <label htmlFor="fileInput" className="cursor-pointer block">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-brand-400 group-hover:scale-110 transition-transform">
          {isUploading ? (
            <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
          ) : (
            <UploadCloud className="w-7 h-7" />
          )}
        </div>
        
        {isUploading ? (
          <div className="text-sm font-semibold text-brand-400 animate-pulse">
            正在高速载入音视频文件...
          </div>
        ) : selectedFileName ? (
          <div className="flex items-center justify-center space-x-2 text-brand-400 font-medium text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="truncate max-w-md">已就绪: {selectedFileName}</span>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              点击或将音频/视频文件拖拽至此处
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              支持 MP4, MOV, MKV, MP3, WAV, M4A, FLAC 等主流格式
            </p>
          </>
        )}

        <div className="flex items-center justify-center space-x-4 mt-4 text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <FileAudio className="w-3.5 h-3.5" />
            <span>高保真 16kHz WAV 重采样</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <FileVideo className="w-3.5 h-3.5" />
            <span>视频自动无损剥离音轨</span>
          </span>
        </div>
      </label>
    </div>
  );
};
