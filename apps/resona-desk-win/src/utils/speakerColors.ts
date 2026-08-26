import { SpeakerProfile } from '../types';

export const COLOR_PALETTES = [
  { name: 'Indigo', color: '#818cf8', bgColor: 'bg-indigo-950/60', borderColor: 'border-indigo-800/60', textColor: 'text-indigo-300' },
  { name: 'Emerald', color: '#34d399', bgColor: 'bg-emerald-950/60', borderColor: 'border-emerald-800/60', textColor: 'text-emerald-300' },
  { name: 'Amber', color: '#fbbf24', bgColor: 'bg-amber-950/60', borderColor: 'border-amber-800/60', textColor: 'text-amber-300' },
  { name: 'Rose', color: '#fb7185', bgColor: 'bg-rose-950/60', borderColor: 'border-rose-800/60', textColor: 'text-rose-300' },
  { name: 'Cyan', color: '#22d3ee', bgColor: 'bg-cyan-950/60', borderColor: 'border-cyan-800/60', textColor: 'text-cyan-300' },
  { name: 'Purple', color: '#c084fc', bgColor: 'bg-purple-950/60', borderColor: 'border-purple-800/60', textColor: 'text-purple-300' },
];

export function getSpeakerColor(speakerName: string, existingProfiles: SpeakerProfile[]): SpeakerProfile {
  const found = existingProfiles.find(p => p.name === speakerName);
  if (found) return found;

  const idx = existingProfiles.length % COLOR_PALETTES.length;
  const palette = COLOR_PALETTES[idx];
  return {
    id: `spk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name: speakerName,
    color: palette.color,
    bgColor: palette.bgColor,
    borderColor: palette.borderColor,
  };
}
