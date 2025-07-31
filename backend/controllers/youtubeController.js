const { extractInfo, downloadAudio, zipAudios } = require('../services/youtubeService');
const path = require('path');
const fs = require('fs');

// POST /list
async function handleList(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing YouTube URL' });
  try {
    const info = await extractInfo(url);
    res.json(info);
  } catch (err) {
    console.error('Error in /list:', err); // Log error for debugging
    res.status(500).json({ error: err.message });
  }
}

// GET /download/:id
async function handleDownload(req, res) {
  const { id } = req.params;
  try {
    console.log(`[handleDownload] Requested ID: ${id}`);
    await downloadAudio(id);
    const tmpDir = require('os').tmpdir() + '/ytmp3';
    const files = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.mp3'))
      .map(f => ({ f, time: fs.statSync(path.join(tmpDir, f)).mtimeMs, size: fs.statSync(path.join(tmpDir, f)).size }))
      .sort((a, b) => b.time - a.time);
    console.log(`[handleDownload] MP3 files in temp dir:`, files.map(f => f.f));
    if (!files.length) throw new Error('No MP3 file found after download');
    const fileName = files[0].f;
    const filePath = path.join(tmpDir, fileName);
    console.log(`[handleDownload] Selected file for download: ${fileName} (path: ${filePath})`);
    // Sanitize filename for Content-Disposition header
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
    console.log(`[handleDownload] Safe filename for browser: ${safeFileName}`);
    const stream = fs.createReadStream(filePath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    stream.pipe(res);
    let finished = false;
    stream.on('error', err => {
      if (!finished) {
        finished = true;
        console.error('Stream error (mp3):', err);
        res.destroy();
      }
    });
    res.on('close', () => {
      if (!finished) {
        finished = true;
        stream.destroy();
        fs.unlink(filePath, () => {});
      }
    });
  } catch (err) {
    console.error('Error in /download/:id:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
} 

// POST /download-all
async function handleDownloadAll(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
  try {
    const zipPath = await zipAudios(ids, res);
    const stream = fs.createReadStream(zipPath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="mp3s.zip"');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    stream.pipe(res);
    let finished = false;
    stream.on('error', err => {
      if (!finished) {
        finished = true;
        console.error('Stream error (zip):', err);
        res.destroy();
      }
    });
    res.on('close', () => {
      if (!finished) {
        finished = true;
        stream.destroy();
        fs.unlink(zipPath, () => {});
      }
    });
  } catch (err) {
    console.error('Error in /download-all:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// GET /progress/all or /progress/selected (dummy implementation for now)
function handleBatchProgress(req, res) {
  // This is a placeholder. You should implement real batch progress tracking if needed.
  // For now, just return a dummy response so the frontend doesn't get 404.
  console.log(`[handleBatchProgress] Called for ${req.originalUrl}`);
  const response = { phase: 'finished', percent: 100 };
  console.log(`[handleBatchProgress] Responding:`, response);
  res.json(response);
}

// Add process-level error handler to prevent server crash
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

module.exports = { handleList, handleDownload, handleDownloadAll, handleBatchProgress };
