import { SubtitleSegment } from '../types';

export interface AISettings {
  provider: 'deepseek' | 'openai' | 'claude' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}


export const AI_MODEL_PROVIDERS: Record<string, { name: string; defaultModel: string; baseUrl: string }> = {
  deepseek: {
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
  claude: {
    name: 'Claude (OpenAI兼容)',
    defaultModel: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  custom: {
    name: '自定义端点',
    defaultModel: 'custom-model',
    baseUrl: 'https://api.openai.com/v1',
  },
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
};

export async function requestAICompletion(
  prompt: string,
  settings: AISettings,
  systemPrompt = '你是一个专业的音视频字幕处理与文案精修大师。'
): Promise<string> {
  const { apiKey, baseUrl, model } = settings;
  if (!apiKey) {
    throw new Error('请先在「设置」中配置您的 AI API Key (BYOK)');
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`AI 请求失败 (${res.status}): ${errData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 1. 口语润色 (保持行数与顺序对应)
export async function polishSubtitles(segments: SubtitleSegment[], settings: AISettings): Promise<string[]> {
  const rawLines = segments.map((s, idx) => `${idx + 1}. ${s.text}`).join('\n');
  const prompt = `请对以下音视频字幕进行口语化精修与去语气词（去除“嗯、啊、那个、就是说”等口头禅，修正错别字与语病，规范标点符号）。
【极其重要】：必须保持与原文完全一致的行数和序号，每行格式为："序号. 精修后的文字"，不要输出任何多余的解释说明！

字幕列表：
${rawLines}`;

  const result = await requestAICompletion(prompt, settings);
  const lines = result.split('\n').map(l => l.replace(/^\d+[.\s、]+/, '').trim()).filter(Boolean);
  return lines;
}

// 2. 双语翻译
export async function translateSubtitles(segments: SubtitleSegment[], targetLang: string, settings: AISettings): Promise<string[]> {
  const rawLines = segments.map((s, idx) => `${idx + 1}. ${s.text}`).join('\n');
  const prompt = `请将以下音视频字幕逐行翻译为 ${targetLang}。
【极其重要】：必须保持与原文完全一致的行数和序号，每行格式为："序号. 翻译文本"，不要输出任何多余说明！

字幕列表：
${rawLines}`;

  const result = await requestAICompletion(prompt, settings);
  const lines = result.split('\n').map(l => l.replace(/^\d+[.\s、]+/, '').trim()).filter(Boolean);
  return lines;
}

// 3. 会议智能纪要与 Action Items
export async function generateMeetingSummary(segments: SubtitleSegment[], settings: AISettings): Promise<string> {
  const fullTranscript = segments.map(s => `[${s.speaker}]: ${s.text}`).join('\n');
  const prompt = `请根据以下录音对话记录，提炼一份清晰、专业的【会议/播客智能纪要】：
1. 💡 核心议题与背景概括
2. 🗣️ 各说话人核心观点提炼
3. 📌 关键决议与待办事项清单 (Action Items)

对话全文：
${fullTranscript}`;

  return await requestAICompletion(prompt, settings);
}

// 4. 小红书 / 社交媒体图文文案
export async function generateSocialPost(segments: SubtitleSegment[], settings: AISettings): Promise<string> {
  const fullTranscript = segments.map(s => s.text).join(' ');
  const prompt = `请根据以下音视频内容，写一篇适合发布在小红书/即刻/微信公众号的高赞图文文案：
1. 吸引眼球的爆款标题（带 Emoji）
2. 痛点共鸣与核心干货分点拆解（结构清晰，短句排版）
3. 互动引导与精炼金句
4. 相关热门标签话题 (#)

音视频内容：
${fullTranscript.slice(0, 3000)}`;

  return await requestAICompletion(prompt, settings);
}
