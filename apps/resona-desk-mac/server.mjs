import os from 'os';
import http from 'http';
import https from 'https';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { clusterSegmentsToSpeakers } from './src/utils/audioDiarization.mjs';

console.log('[DEBUG] server.mjs module evaluated');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3188;
const BIN_DIR = path.join(__dirname, 'bin');
const MODELS_DIR = path.join(BIN_DIR, 'models');
const FFMPEG_BIN = path.join(BIN_DIR, 'ffmpeg');
const WHISPER_BIN = path.join(BIN_DIR, 'whisper-cli');

const UPLOADS_DIR = path.join('/tmp', 'resona_uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {}

// In-memory static cache for 0ms UI delivery
const STATIC_CACHE = new Map();
const DIST_DIR = path.join(__dirname, 'dist');

function initStaticCache(dir = DIST_DIR, prefix = '') {
  try {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      const urlPath = prefix + '/' + it.name;
      if (it.isDirectory()) {
        initStaticCache(full, urlPath);
      } else if (it.isFile()) {
        const ext = path.extname(it.name).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.wav': 'audio/wav',
          '.mp3': 'audio/mpeg',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const buffer = fs.readFileSync(full);
        STATIC_CACHE.set(urlPath, { buffer, contentType });
      }
    }
  } catch (e) {}
}
initStaticCache();

// In-memory jobs map
const jobs = new Map();

// Model definitions
const MODEL_CATALOG = [
  {
    id: 'ggml-base.bin',
    name: 'ggml-base.bin',
    sizeMb: 140,
    isBundled: true,
    description: '已内置快速基础模型 (极速轻量)',
    recommendedVram: '1GB',
    downloadUrls: [
      'https://www.modelscope.cn/models/cjc1887415157/whisper.cpp/resolve/master/ggml-base.bin',
      'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin'
    ]
  },
  {
    id: 'ggml-small.bin',
    name: 'ggml-small.bin',
    sizeMb: 465,
    isBundled: true,
    description: '已内置高精度多语种平衡模型 (465MB - 免下载零等待)',
    recommendedVram: '2GB',
    downloadUrls: [
      'https://www.modelscope.cn/models/cjc1887415157/whisper.cpp/resolve/master/ggml-small.bin',
      'https://modelscope.cn/api/v1/models/cjc1887415157/whisper.cpp/repo?Revision=master&FilePath=ggml-small.bin',
      'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin'
    ]
  },
];

// Helper for JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
  });
  res.end(JSON.stringify(data));
}

// Resolve path with macOS Unicode (NFC / NFD) normalization
function resolvePhysicalPath(inputPath) {
  if (!inputPath) return inputPath;
  if (fs.existsSync(inputPath)) return inputPath;

  const nfc = inputPath.normalize('NFC');
  if (fs.existsSync(nfc)) return nfc;

  const nfd = inputPath.normalize('NFD');
  if (fs.existsSync(nfd)) return nfd;

  return inputPath;
}

// Follow redirects helper for HTTPS download
function downloadWithRedirect(targetUrl, destPath, onProgress, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many HTTP redirects'));

    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
      timeout: 30000,
    };

    client.get(targetUrl, reqOptions, (res) => {
      // Handle HTTP redirects (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http')) {
          nextUrl = new URL(nextUrl, targetUrl).href;
        }
        return downloadWithRedirect(nextUrl, destPath, onProgress, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && onProgress) {
          const percent = Math.min(100, Math.floor((downloadedBytes / totalBytes) * 100));
          const dlMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
          const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
          onProgress(percent, `${dlMB}MB / ${totalMB}MB (${percent}%)`);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => resolve(destPath));
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Download model on-demand if missing
async function ensureModelDownloaded(modelName, onProgress) {
  const modelPath = path.join(MODELS_DIR, modelName);
  if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 1024 * 1024) {
    return modelPath; // already downloaded
  }

  const modelInfo = MODEL_CATALOG.find(m => m.id === modelName);
  if (!modelInfo || !modelInfo.downloadUrls || modelInfo.downloadUrls.length === 0) {
    throw new Error(`未知模型且无下载源配置: ${modelName}`);
  }

  const tempPath = `${modelPath}.downloading`;
  let lastError = null;

  for (const dlUrl of modelInfo.downloadUrls) {
    try {
      if (onProgress) onProgress(0, `正在连接高速模型镜像源下载 ${modelName}...`);
      await downloadWithRedirect(dlUrl, tempPath, onProgress);

      // Verify and rename
      if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 1024 * 1024) {
        fs.renameSync(tempPath, modelPath);
        return modelPath;
      }
    } catch (err) {
      lastError = err;
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  throw new Error(`模型下载失败: ${lastError?.message || '网络连接超时'}`);
}

// Convert audio to 16kHz 16-bit mono PCM WAV for whisper
function extractAudio16kHz(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const safeInputPath = resolvePhysicalPath(inputPath);
    if (!fs.existsSync(safeInputPath)) {
      return reject(new Error(`Input file does not exist on disk: ${inputPath}`));
    }

    const args = [
      '-y',
      '-i', safeInputPath,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      outputPath,
    ];

    const proc = spawn(FFMPEG_BIN, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg extraction failed with code ${code}: ${stderr.slice(-250)}`));
      }
    });
  });
}

// Run whisper-cli and parse segments
function runWhisperCli(wavPath, modelName, language, onProgress) {
  return new Promise((resolve, reject) => {
    const modelPath = path.join(MODELS_DIR, modelName);
    if (!fs.existsSync(modelPath)) {
      return reject(new Error(`Model file not found: ${modelPath}`));
    }

    const outputPrefix = path.join('/tmp', `resona_out_${Date.now()}`);
    const args = [
      '-m', modelPath,
      '-f', wavPath,
      '-oj',
      '-of', outputPrefix,
      '-pp',
      '--language', language || 'auto',
      '-t', '4',
    ];

    const proc = spawn(WHISPER_BIN, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      const text = d.toString();
      stderr += text;

      const match = text.match(/progress\s*=\s*(\d+)%/);
      if (match && onProgress) {
        onProgress(parseInt(match[1], 10));
      }
    });

    proc.on('close', (code) => {
      const jsonFile = `${outputPrefix}.json`;
      if (code === 0 && fs.existsSync(jsonFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
          const rawTranscription = raw.transcription || [];
          const segments = rawTranscription.map((item, idx) => {
            const offsets = item.offsets || {};
            const startSec = (offsets.from || 0) / 1000;
            const endSec = (offsets.to || 0) / 1000;
            return {
              id: idx + 1,
              start: Number(startSec.toFixed(3)),
              end: Number(endSec.toFixed(3)),
              speaker: '说话人 1',
              text: (item.text || '').trim(),
              translation: '',
            };
          });

          if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
          resolve(segments);
        } catch (e) {
          reject(new Error(`Failed to parse whisper output JSON: ${e.message}`));
        }
      } else {
        reject(new Error(`Whisper-cli exited with code ${code}: ${stderr.slice(-300)}`));
      }
    });
  });
}

// Background transcription runner
async function processJob(job) {
  const tmpWav = path.join('/tmp', `resona_audio_${job.id}.wav`);
  const startTime = Date.now();

  try {
    // Step 0: Ensure Model is Downloaded (On-demand auto download)
    const modelPath = path.join(MODELS_DIR, job.model);
    if (!fs.existsSync(modelPath)) {
      job.status = 'extracting_audio';
      job.progressPercent = 5;
      job.currentStep = `正在首次按需下载 ${job.model} 模型...`;
      await ensureModelDownloaded(job.model, (percent, detail) => {
        job.progressPercent = Math.floor(percent * 0.15); // 0% -> 15%
        job.currentStep = `下载高精度模型 ${job.model}: ${detail}`;
      });
    }

    // Step 1: Audio Extraction
    job.status = 'extracting_audio';
    job.progressPercent = 15;
    job.currentStep = 'Extracting 16kHz WAV with FFmpeg';
    await extractAudio16kHz(job.filePath, tmpWav);
    job.audioWavPath = tmpWav;

    // Step 2: Whisper Transcription
    job.status = 'transcribing';
    job.progressPercent = 20;
    job.currentStep = 'Neural transcription running on Metal GPU';

    let segments = await runWhisperCli(
      tmpWav,
      job.model,
      job.language,
      (percent) => {
        job.progressPercent = 20 + Math.floor(percent * 0.70);
        const elapsed = (Date.now() - startTime) / 1000;
        job.speed = `${((percent / 100) / (elapsed || 1) * 60).toFixed(1)}x`;
      }
    );

    // Step 2.5: Acoustic F0 & Spectral Energy Diarization Clustering
    if (job.diarization && segments.length > 0) {
      job.status = 'transcribing';
      job.currentStep = 'Performing acoustic F0 pitch & spectral diarization clustering';
      job.progressPercent = 95;
      segments = clusterSegmentsToSpeakers(segments, tmpWav, 2);
    }

    // Step 3: Complete
    job.status = 'completed';
    job.progressPercent = 100;
    job.segments = segments;
    job.completedAt = Date.now();
    const totalElapsedSec = ((job.completedAt - startTime) / 1000).toFixed(1);
    job.speed = `${totalElapsedSec}s 完成`;
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
  }
}

// HTTP Request Handler
async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
    });
    return res.end();
  }

  // POST /api/upload (High-speed local stream upload fallback)
  if (req.method === 'POST' && parsed.pathname === '/api/upload') {
    const rawFileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : `upload_${Date.now()}.mp4`;
    const ext = path.extname(rawFileName) || '.mp4';
    const safeBase = path.basename(rawFileName, ext).replace(/[^\w\u4e00-\u9fa5-_]/g, '_').slice(0, 60);
    const targetPath = path.join(UPLOADS_DIR, `upload_${Date.now()}_${safeBase}${ext}`);

    const fileStream = fs.createWriteStream(targetPath);
    req.pipe(fileStream);

    fileStream.on('finish', () => {
      const stat = fs.statSync(targetPath);
      return sendJSON(res, 200, {
        filePath: targetPath,
        originalName: rawFileName,
        size: stat.size
      });
    });

    fileStream.on('error', (err) => {
      return sendJSON(res, 500, { error: `Upload stream failed: ${err.message}` });
    });
    return;
  }

  // POST /api/save-file (Native File Saver to ~/Downloads)
  if (req.method === 'POST' && parsed.pathname === '/api/save-file') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filename, content } = JSON.parse(body || '{}');
        if (!filename || content === undefined) {
          return sendJSON(res, 400, { error: 'Missing filename or content' });
        }
        const downloadsDir = path.join(os.homedir(), 'Downloads');
        if (!fs.existsSync(downloadsDir)) {
          fs.mkdirSync(downloadsDir, { recursive: true });
        }
        let cleanFilename = filename.replace(/[\/]/g, '_');
        let targetPath = path.join(downloadsDir, cleanFilename);
        
        if (fs.existsSync(targetPath)) {
          const ext = path.extname(cleanFilename);
          const base = path.basename(cleanFilename, ext);
          let count = 1;
          while (fs.existsSync(path.join(downloadsDir, `${base}_${count}${ext}`))) {
            count++;
          }
          targetPath = path.join(downloadsDir, `${base}_${count}${ext}`);
          cleanFilename = `${base}_${count}${ext}`;
        }

        fs.writeFileSync(targetPath, content, 'utf8');
        return sendJSON(res, 200, {
          success: true,
          filePath: targetPath,
          filename: cleanFilename,
          folder: downloadsDir
        });
      } catch (err) {
        return sendJSON(res, 500, { error: `Save file error: ${err.message}` });
      }
    });
    return;
  }

  // POST /api/reveal-file (Reveal file in macOS Finder)
  if (req.method === 'POST' && parsed.pathname === '/api/reveal-file') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filePath } = JSON.parse(body || '{}');
        if (filePath && fs.existsSync(filePath)) {
          spawn('/usr/bin/open', ['-R', filePath]);
          return sendJSON(res, 200, { success: true });
        }
        return sendJSON(res, 404, { error: 'File not found' });
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  // POST /api/system/open-url (Open system default browser on macOS)
  if (req.method === 'POST' && parsed.pathname === '/api/system/open-url') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const targetUrl = payload.url;
        if (targetUrl && (targetUrl.startsWith('https://') || targetUrl.startsWith('http://'))) {
          spawn('/usr/bin/open', [targetUrl]);
          return sendJSON(res, 200, { success: true });
        }
        return sendJSON(res, 400, { error: 'Invalid URL' });
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  // GET /api/health
  if (req.method === 'GET' && parsed.pathname === '/api/health') {
    return sendJSON(res, 200, { status: 'ok', engine: 'ResonaDesk Metal GPU Engine', timestamp: Date.now() });
  }

  // GET /api/models (Instant response)
  if (req.method === 'GET' && parsed.pathname === '/api/models') {
    const models = MODEL_CATALOG.map(m => ({
      id: m.id,
      name: m.name,
      sizeMb: m.sizeMb,
      isBundled: !!m.isBundled,
      isDownloaded: !!m.isBundled,
      description: m.description,
      recommendedVram: m.recommendedVram,
    }));
    return sendJSON(res, 200, models);
  }

  // POST /api/transcribe
  if (req.method === 'POST' && parsed.pathname === '/api/transcribe') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.filePath) {
          return sendJSON(res, 400, { error: 'filePath is required' });
        }

        const resolvedPath = resolvePhysicalPath(payload.filePath);
        const displayName = payload.fileName || path.basename(payload.filePath);
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const job = {
          id: jobId,
          filePath: resolvedPath,
          fileName: displayName,
          fileSize: fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath).size : 0,
          status: 'idle',
          progressPercent: 0,
          speed: '',
          currentStep: 'Queued',
          model: payload.model || 'ggml-base.bin',
          language: payload.language || 'auto',
          diarization: !!payload.diarize,
          segments: [],
          createdAt: Date.now(),
        };

        jobs.set(jobId, job);
        processJob(job);

        return sendJSON(res, 200, { jobId });
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  // GET /api/jobs/:id
  if (req.method === 'GET' && parsed.pathname.startsWith('/api/jobs/')) {
    const jobId = parsed.pathname.replace('/api/jobs/', '');
    const job = jobs.get(jobId);
    if (!job) {
      return sendJSON(res, 404, { error: 'Job not found' });
    }
    return sendJSON(res, 200, job);
  }

  // POST /api/jobs/:id/segments
  if (req.method === 'POST' && parsed.pathname.includes('/segments')) {
    const jobId = parsed.pathname.split('/')[3];
    const job = jobs.get(jobId);
    if (!job) {
      return sendJSON(res, 404, { error: 'Job not found' });
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { segments } = JSON.parse(body);
        if (Array.isArray(segments)) {
          job.segments = segments;
          return sendJSON(res, 200, { success: true, count: segments.length });
        }
        return sendJSON(res, 400, { error: 'segments must be an array' });
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  // GET /api/audio
  if (req.method === 'GET' && parsed.pathname === '/api/audio') {
    let targetPath = parsed.query.path;
    const jobId = parsed.query.jobId;

    if (jobId && jobs.has(jobId)) {
      targetPath = jobs.get(jobId).audioWavPath || jobs.get(jobId).filePath;
    }

    targetPath = resolvePhysicalPath(targetPath);

    if (!targetPath || !fs.existsSync(targetPath)) {
      return sendJSON(res, 404, { error: 'Audio file not found' });
    }

    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(targetPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/wav',
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav',
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(200, head);
      fs.createReadStream(targetPath).pipe(res);
    }
    return;
  }

  // Serve static UI assets from memory cache (0.1ms latency)
  if (req.method === 'GET' || req.method === 'HEAD') {
    let reqPath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
    let item = STATIC_CACHE.get(reqPath);
    if (!item && !parsed.pathname.startsWith('/api')) {
      item = STATIC_CACHE.get('/index.html');
    }

    if (item) {
      res.writeHead(200, {
        'Content-Type': item.contentType,
        'Content-Length': item.buffer.length,
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') return res.end();
      return res.end(item.buffer);
    }
  }

  
  // Static File Serving for Standalone App Bundle (dist/)
  const DIST_DIR = path.join(__dirname, 'dist');
  if (fs.existsSync(DIST_DIR) && !parsed.pathname.startsWith('/api')) {
    let reqPath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
    let filePath = path.join(DIST_DIR, reqPath);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html'); // SPA fallback
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // Static file serving from ./dist for standalone native desktop app
  if (!parsed.pathname.startsWith('/api')) {
    let relPath = parsed.pathname === '/' ? 'index.html' : parsed.pathname.replace(/^\/+/, '');
    let targetFile = path.join(DIST_DIR, relPath);

    // Fallback to index.html for SPA client-side routing
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      targetFile = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
      const ext = path.extname(targetFile).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(targetFile).pipe(res);
    }
  }

  return sendJSON(res, 404, { error: 'Not found' });
}

function startServer(port, maxAttempts = 30) {
  if (maxAttempts <= 0) {
    console.error('Failed to find an open port after 30 attempts.');
    process.exit(1);
  }

  const s = http.createServer(handleRequest);

  s.once('error', (err) => {
    try { s.close(); } catch(e) {}
    if (err.code === 'EADDRINUSE') {
      console.log(`[ResonaDesk Engine] Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1, maxAttempts - 1);
    } else {
      console.error('Server error:', err);
    }
  });

  s.listen(port, '0.0.0.0', () => {
    console.log(`[ResonaDesk Engine] Server listening on http://localhost:${port} and http://127.0.0.1:${port}`);
    try {
      fs.writeFileSync(path.join(__dirname, '.active_port'), port.toString());
    } catch (e) {}
  });
}

const initialPort = Number(process.env.PORT) || 5188;
startServer(initialPort);
