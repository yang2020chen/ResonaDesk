import type { SubtitleSegment } from '../types';

export type ExportContentMode = 'original' | 'translation' | 'bilingual';

export interface ExportOptions {
  contentMode?: ExportContentMode;
  includeSpeakers?: boolean;
  includeTimestamps?: boolean;
  title?: string;
  fps?: number;
}

export function formatSRTTime(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function formatVTTTime(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function formatLRCTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}]`;
}

function resolveSegmentText(seg: SubtitleSegment, mode: ExportContentMode = 'original'): string {
  const hasTrans = !!(seg.translation && seg.translation.trim().length > 0);
  if (mode === 'translation') {
    return hasTrans ? seg.translation! : seg.text;
  }
  if (mode === 'bilingual') {
    return hasTrans ? `${seg.text}\n${seg.translation}` : seg.text;
  }
  return seg.text;
}

// 1. SRT Exporter
export function exportToSRT(segments: SubtitleSegment[], options: ExportOptions = {}): string {
  const mode = options.contentMode || 'original';
  return segments.map((seg, idx) => {
    const timeRange = `${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}`;
    const speakerPrefix = options.includeSpeakers && seg.speaker ? `[${seg.speaker}] ` : '';
    const mainText = resolveSegmentText(seg, mode);
    return `${idx + 1}\n${timeRange}\n${speakerPrefix}${mainText}\n`;
  }).join('\n');
}

// 2. VTT Exporter
export function exportToVTT(segments: SubtitleSegment[], options: ExportOptions = {}): string {
  const mode = options.contentMode || 'original';
  const body = segments.map((seg) => {
    const timeRange = `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}`;
    const speakerTag = options.includeSpeakers && seg.speaker ? `<v ${seg.speaker}>` : '';
    const mainText = resolveSegmentText(seg, mode);
    return `${timeRange}\n${speakerTag}${mainText}\n`;
  }).join('\n');

  return `WEBVTT - Exported by ResonaDesk\n\n${body}`;
}

// 3. LRC Exporter
export function exportToLRC(segments: SubtitleSegment[], options: ExportOptions = {}): string {
  const mode = options.contentMode || 'original';
  const header = `[ti:ResonaDesk Transcript]\n[ar:ResonaDesk Auto-Transcribe]\n\n`;
  const lines = segments.map(seg => {
    const spk = options.includeSpeakers && seg.speaker ? `[${seg.speaker}]: ` : '';
    const mainText = resolveSegmentText(seg, mode).replace(/\n/g, ' / ');
    return `${formatLRCTime(seg.start)}${spk}${mainText}`;
  });
  return header + lines.join('\n');
}

// 4. Plain TXT Exporter
export function exportToTXT(segments: SubtitleSegment[], options: ExportOptions = {}): string {
  const mode = options.contentMode || 'original';
  return segments.map(seg => {
    const time = options.includeTimestamps ? `[${formatVTTTime(seg.start)}] ` : '';
    const spk = options.includeSpeakers && seg.speaker ? `[${seg.speaker}]: ` : '';
    if (mode === 'bilingual' && seg.translation) {
      return `${time}${spk}${seg.text}\n    ↳ 译文: ${seg.translation}`;
    }
    if (mode === 'translation' && seg.translation) {
      return `${time}${spk}${seg.translation}`;
    }
    return `${time}${spk}${seg.text}`;
  }).join('\n\n');
}

// 5. Final Cut Pro XML (FCPXML 1.10)
export function exportToFCPXML(segments: SubtitleSegment[], options: ExportOptions = {}): string {
  const fps = options.fps || 30;
  const title = options.title || 'ResonaDesk Subtitles';
  const mode = options.contentMode || 'original';

  const titlesXml = segments.map((seg, idx) => {
    const startFrames = Math.round(seg.start * fps);
    const durFrames = Math.max(1, Math.round((seg.end - seg.start) * fps));
    const rawText = resolveSegmentText(seg, mode);
    const safeText = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
    const speaker = options.includeSpeakers && seg.speaker ? `[${seg.speaker}] ` : '';

    return `        <title name="${speaker}${safeText}" lane="1" offset="${startFrames}/${fps}s" duration="${durFrames}/${fps}s" ref="r2">
          <text>
            <text-style ref="ts${idx + 1}">${speaker}${safeText}</text-style>
          </text>
          <text-style-def id="ts${idx + 1}">
            <text-style font="Helvetica" fontSize="48" fontFace="Regular" fontColor="0.95 0.95 0.95 1" alignment="center"/>
          </text-style-def>
        </title>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" frameDuration="1/${fps}s" width="1920" height="1080"/>
    <effect id="r2" name="Basic Title" uid=".../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti"/>
  </resources>
  <library>
    <event name="ResonaDesk Event">
      <project name="${title}">
        <sequence format="r1">
          <spine>
${titlesXml}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

// File Download Helper
export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
