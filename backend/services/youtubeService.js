const { execFile } = require('child_process');
const winston = require('winston');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const os = require('os');
const glob = require('glob');

const TMP_DIR = path.join(os.tmpdir(), 'ytmp3');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'ytmp3.log' }),
    new winston.transports.Console()
  ]
});

// Scheduled temp file cleanup (every hour)
setInterval(() => {
  const threshold = Date.now() - 60 * 60 * 1000; // 1 hour
  fs.readdir(TMP_DIR, (err, files) => {
    if (err) return logger.error(`Temp cleanup error: ${err}`);
    files.forEach(file => {
      const filePath = path.join(TMP_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && stats.mtimeMs < threshold) {
          fs.unlink(filePath, err => {
            if (err) logger.error(`Failed to delete temp file ${filePath}: ${err}`);
            else logger.info(`Deleted old temp file: ${filePath}`);
          });
        }
      });
    });
  });
}, 60 * 60 * 1000);

// Helper: run yt-dlp and return JSON
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) {
        console.error('yt-dlp error:', err);
        if (stderr) console.error('yt-dlp stderr (first 500 chars):', stderr.slice(0, 500));
        if (stdout) console.error('yt-dlp stdout (first 500 chars):', stdout.slice(0, 500));
        return reject(new Error(stderr || err.message));
      }
      try {
        // Try parsing as a single JSON object
        resolve(JSON.parse(stdout));
      } catch (e) {
        // Try parsing as NDJSON (newline-delimited JSON)
        try {
          const lines = stdout.split(/\r?\n/).filter(Boolean);
          const jsons = lines.map(line => JSON.parse(line));
          if (jsons.length > 0) return resolve(jsons);
        } catch (ndjsonErr) {
          // Log only a sample of the output for debugging
          console.error('Failed to parse yt-dlp output as JSON or NDJSON.');
          console.error('Sample yt-dlp stdout (first 500 chars):', stdout.slice(0, 500));
          if (stderr) console.error('yt-dlp stderr (first 500 chars):', stderr.slice(0, 500));
        }
        reject(new Error('Failed to parse yt-dlp output as JSON or NDJSON'));
      }
    });
  });
}

// Extract info for a video or playlist
async function extractInfo(url) {
  const args = ['--dump-json', '--flat-playlist', url];
  const info = await runYtDlp(args);
  if (Array.isArray(info)) {
    // NDJSON playlist: info is an array of video objects
    return info.map(e => ({
      id: e.id,
      title: e.title,
      duration: e.duration,
      thumbnail: e.thumbnail
    }));
  } else if (info.entries && Array.isArray(info.entries)) {
    // Playlist: fetch details for each entry
    const entries = await Promise.all(
      info.entries.map(e => runYtDlp(['--dump-json', `https://youtube.com/watch?v=${e.id}`]))
    );
    return entries.map(e => ({
      id: e.id,
      title: e.title,
      duration: e.duration,
      thumbnail: e.thumbnail
    }));
  } else {
    // Single video
    return [{
      id: info.id,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail
    }];
  }
}

// In-memory progress tracker
const downloadProgress = {};
function setDownloadProgress(id, data) {
  downloadProgress[id] = { ...downloadProgress[id], ...data };
}
function getDownloadProgress(id) {
  return downloadProgress[id] || null;
}

// Download and convert a single video to MP3
async function downloadAudio(id) {
  console.log(`[downloadAudio] Begin for ID: ${id}`);
  setDownloadProgress(id, { phase: 'starting', percent: 0, started: Date.now(), error: null });
  // Remove all old files for this id
  const oldFiles = glob.sync(path.join(TMP_DIR, `${id}-*.mp3`));
  oldFiles.forEach(f => fs.unlinkSync(f));
  // Output pattern will be set after title is fetched
  let outPattern = `${id}.%(ext)s`;
  const { makeSafeFilename } = require('./filenameUtil');

  // Step 1: Fetch video info for duration and title
  let duration = null;
  let title = null;
  try {
    const infoArgs = ['--dump-json', `https://youtube.com/watch?v=${id}`];
    const info = await runYtDlp(infoArgs);
    duration = info && info.duration ? info.duration : null;
    title = info && info.title ? info.title : null;
    setDownloadProgress(id, { phase: 'fetched-metadata', duration, title });
    let fullTitle = info && info.title ? info.title : id;
    let safeName = makeSafeFilename('', fullTitle); // Only use title
    outPattern = safeName.replace(/\.mp3$/, '.%(ext)s');
    console.log(`[downloadAudio] yt-dlp output pattern: ${outPattern} (title: ${fullTitle})`);
  } catch (e) {
    setDownloadProgress(id, { phase: 'fetched-metadata', duration: null, title: null, error: e.message });
    console.warn(`[downloadAudio] Could not fetch duration/title for ${id}: ${e.message}`);
    let safeName = makeSafeFilename('', id);
    outPattern = safeName.replace(/\.mp3$/, '.%(ext)s');
    console.log(`[downloadAudio] yt-dlp fallback output pattern: ${outPattern}`);
  }

  // Step 2: Calculate timeout
  const MIN_TIMEOUT_MS = 600000; // 10 min fallback
  const timeoutMs = duration ? Math.max(duration * 2000, MIN_TIMEOUT_MS) : MIN_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    setDownloadProgress(id, { phase: 'downloading', percent: 0 });
    console.log(`[downloadAudio] Starting yt-dlp (mp3 direct) for ${id} (timeout: ${timeoutMs}ms)`);
    const ytdlp = execFile('yt-dlp', [
      '-f', 'bestaudio',
      '-x', '--audio-format', 'mp3',
      '-o', outPattern,
      `https://youtube.com/watch?v=${id}`
    ], { cwd: TMP_DIR });
    let convertingStart = null;
    let mp3FileName = null;
    ytdlp.stdout && ytdlp.stdout.on('data', d => {
      process.stdout.write(`[yt-dlp stdout] ${d}`);
      // Parse yt-dlp progress lines for percent
      const match = String(d).match(/\[download\]\s+(\d+\.\d+)%/);
      if (match) {
        setDownloadProgress(id, { percent: parseFloat(match[1]), phase: 'downloading' });
      }
      // Parse filename from yt-dlp output
      const fileMatch = String(d).match(/Destination:\s*(.+\.mp3)/);
      if (fileMatch) {
        mp3FileName = fileMatch[1].trim();
        setDownloadProgress(id, { outputFile: mp3FileName });
        console.log(`[downloadAudio] yt-dlp reports Destination: ${mp3FileName}`);
      }
      if (String(d).includes('[ExtractAudio]')) {
        convertingStart = Date.now();
        setDownloadProgress(id, { phase: 'converting', convertingStarted: convertingStart });
        console.log(`[downloadAudio] Entering converting phase for ID: ${id}`);
      }
    });
    ytdlp.stderr && ytdlp.stderr.on('data', d => process.stderr.write(`[yt-dlp stderr] ${d}`));
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        ytdlp.kill();
        setDownloadProgress(id, { phase: 'error', error: 'Download/conversion timed out' });
        console.error(`[downloadAudio] Timeout for ${id}`);
        reject(new Error('Download/conversion timed out'));
      }
    }, timeoutMs);
    ytdlp.on('close', code => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        // Debug: list all .mp3 files in TMP_DIR after yt-dlp
        const filesInTmp = fs.readdirSync(TMP_DIR);
        const mp3Files = filesInTmp
          .filter(f => f.endsWith('.mp3'))
          .map(f => {
            const stat = fs.statSync(path.join(TMP_DIR, f));
            return { f, mtime: stat.mtimeMs, size: stat.size };
          });
        console.log(`[downloadAudio] All .mp3 files in TMP_DIR after yt-dlp:`, mp3Files);
        // Pick the largest file created in the last 2 minutes
        const now = Date.now();
        const recentMp3s = mp3Files.filter(f => now - f.mtime < 2 * 60 * 1000);
        let filePath = null;
        if (recentMp3s.length > 0) {
          recentMp3s.sort((a, b) => b.size - a.size);
          filePath = path.join(TMP_DIR, recentMp3s[0].f);
          console.log(`[downloadAudio] Selected file for resolve: ${recentMp3s[0].f}`);
        }
        let convertingElapsed = null;
        if (convertingStart) {
          convertingElapsed = Date.now() - convertingStart;
        }
        if (filePath && fs.existsSync(filePath)) {
          setDownloadProgress(id, { phase: 'finished', percent: 100, finished: Date.now(), outputFile: path.basename(filePath), convertingElapsed });
          console.log(`[downloadAudio] Finished for ${id}: ${filePath}`);
          resolve(filePath);
        } else {
          setDownloadProgress(id, { phase: 'error', error: 'MP3 file not found after yt-dlp' });
          console.error(`[downloadAudio] No MP3 found for ${id}`);
          reject(new Error('MP3 file not found after yt-dlp'));
        }
      }
    });
  });
}

// Download multiple audios and zip them
async function zipAudios(ids, res = null) {
  const zipPath = path.join(TMP_DIR, `mp3s_${Date.now()}.zip`);
  const { makeSafeFilename } = require('./filenameUtil');
  const usedNames = new Set();
  // Pool concurrency configurable via env; default to 32 for max speed
  const CONCURRENCY = parseInt(process.env.YTMP3_CONCURRENCY, 10) || 32;
  logger.info(`[Batch] Using concurrency: ${CONCURRENCY}`);
  const failures = [];
  const results = [];
  const runningProcs = new Set(); // Track running yt-dlp procs

  // Patch downloadAudio to allow process tracking/kill
  // Dynamic timeout logic for batch downloads
  async function downloadAudioTracked(id) {
    // Remove all old files
    const oldFiles = glob.sync(path.join(TMP_DIR, `${id}-*.mp3`));
    oldFiles.forEach(f => fs.unlinkSync(f));
    const outPattern = `${id}-%(title)s.%(ext)s`;
    // Fetch video info for duration
    let duration = null;
    try {
      const infoArgs = ['--dump-json', `https://youtube.com/watch?v=${id}`];
      const info = await runYtDlp(infoArgs);
      duration = info && info.duration ? info.duration : null;
    } catch (e) {
      logger.warn(`[Batch] Could not fetch duration for ${id}: ${e.message}`);
    }
    // Use .env or default for base timeout
    const BASE_TIMEOUT_MS = parseInt(process.env.YTMP3_TIMEOUT_MS, 10) || 600000;
    // If duration is available, set timeout to max(BASE_TIMEOUT_MS, duration * 2000)
    let timeoutMs = BASE_TIMEOUT_MS;
    if (duration) {
      timeoutMs = Math.max(BASE_TIMEOUT_MS, duration * 2000);
    }
    logger.info(`[Batch] Downloading ${id} with timeout ${timeoutMs}ms (duration: ${duration || 'unknown'})`);
    return new Promise((resolve, reject) => {
      const ytdlp = execFile('yt-dlp', [
        '-f', 'bestaudio',
        '-x', '--audio-format', 'mp3',
        '-o', outPattern,
        `https://youtube.com/watch?v=${id}`
      ], { cwd: TMP_DIR });
      runningProcs.add(ytdlp);
      ytdlp.stdout && ytdlp.stdout.on('data', d => process.stdout.write(`[yt-dlp stdout] ${d}`));
      ytdlp.stderr && ytdlp.stderr.on('data', d => process.stderr.write(`[yt-dlp stderr] ${d}`));
      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          ytdlp.kill();
          runningProcs.delete(ytdlp);
          reject(new Error('Download/conversion timed out'));
        }
      }, timeoutMs);
      ytdlp.on('close', code => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          runningProcs.delete(ytdlp);
          const filesInTmp = fs.readdirSync(TMP_DIR);
          const files = filesInTmp.filter(f => f.startsWith(`${id}-`) && f.endsWith('.mp3'));
          if (code === 0 && files.length > 0) {
            const filePath = path.join(TMP_DIR, files[0]);
            resolve(filePath);
          } else {
            reject(new Error('MP3 file not found after yt-dlp'));
          }
        }
      });
      ytdlp.on('error', err => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          runningProcs.delete(ytdlp);
          reject(err);
        }
      });
    });
  }

  // Concurrency pool
  async function pool(tasks, limit) {
    const ret = [];
    let i = 0;
    let active = 0;
    return new Promise((resolve) => {
      function next() {
        if (i === tasks.length && active === 0) return resolve(ret);
        while (active < limit && i < tasks.length) {
          const idx = i++;
          active++;
          tasks[idx]()
            .then((r) => { ret[idx] = { status: 'fulfilled', value: r }; })
            .catch((e) => { ret[idx] = { status: 'rejected', reason: e }; })
            .finally(() => { active--; next(); });
        }
      }
      next();
    });
  }

  // Prepare download tasks
  const tasks = ids.map(id => async () => {
    try {
      // Remove any duration/time-based skip logic (allow long videos)
      const mp3Path = await downloadAudioTracked(id);
      const fileName = mp3Path.split(path.sep).pop();
      let title = fileName.replace(/^.*?-/, '').replace(/\.mp3$/, '');
      if (!title.trim()) title = 'audio';
      const name = makeSafeFilename(id, title, usedNames);
      return { id, mp3Path, name };
    } catch (err) {
      logger.error(`[Batch] Download failed for ${id}: ${err.message}`);
      return { id, error: err.message };
    }
  });

  // Run downloads in parallel with concurrency limit
  let downloadResults;
  let aborted = false;
  // Write ZIP
  return new Promise(async (resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip');
    let finished = false;
    function cleanup(err) {
      if (!finished) {
        finished = true;
        output.close();
        archive.destroy();
        // Kill all running yt-dlp procs
        for (const proc of runningProcs) {
          try { proc.kill(); } catch (e) {}
        }
        runningProcs.clear();
        // Delete all temp files for this batch
        try {
          fs.readdir(TMP_DIR, (err, files) => {
            if (!err) {
              files.forEach(file => {
                if (file.endsWith('.mp3') || file.endsWith('.part')) {
                  fs.unlink(path.join(TMP_DIR, file), () => {});
                }
              });
              logger.info(`[Batch] Cleaned up temp files after batch`);
            }
          });
        } catch (e) { logger.error(`[Batch] Temp cleanup error: ${e}`); }
        if (err) reject(err); else resolve(zipPath);
      }
    }
    output.on('close', () => {
      logger.info(`[Batch] ZIP stream closed for batch`);
      cleanup();
    });
    output.on('error', err => {
      logger.error(`[Batch] ZIP output error: ${err}`);
      cleanup(err);
    });
    archive.on('error', err => {
      logger.error(`[Batch] Archive error: ${err}`);
      cleanup(err);
    });
    if (res) {
      res.on('close', () => {
        aborted = true;
        logger.warn(`[Batch] Client disconnected during ZIP download`);
        cleanup(new Error('Client disconnected during ZIP download'));
      });
    }
    archive.pipe(output);
    logger.info(`[Batch] Starting batch download for ${ids.length} videos with concurrency ${CONCURRENCY}`);
    downloadResults = await pool(tasks, CONCURRENCY);
    if (aborted) return; // Don't write ZIP if aborted
    for (const r of downloadResults) {
      if (r && r.status === 'fulfilled' && r.value && r.value.mp3Path) {
        archive.file(r.value.mp3Path, { name: r.value.name });
        logger.info(`[Batch] Added ${r.value.name} to ZIP`);
      } else if (r && r.value && r.value.error) {
        failures.push(`${r.value.id}: ${r.value.error}`);
        logger.error(`[Batch] Failure for ${r.value.id}: ${r.value.error}`);
      } else if (r && r.reason) {
        failures.push(`${r.value && r.value.id ? r.value.id : 'unknown'}: ${r.reason}`);
        logger.error(`[Batch] Unknown failure: ${r.reason}`);
      }
    }
    if (failures.length > 0) {
      const failText = 'Failed video IDs (not included in ZIP):\n' + failures.join('\n');
      archive.append(failText, { name: 'failures.txt' });
      logger.warn(`[Batch] Failures in batch: ${failures.join(', ')}`);
    }
    archive.finalize();
    logger.info(`[Batch] Finalized ZIP for batch`);
  });
}
 
module.exports = {
  extractInfo,
  downloadAudio,
  zipAudios,
  getDownloadProgress,
};
