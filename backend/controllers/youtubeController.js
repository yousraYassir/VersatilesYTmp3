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
    const filePath = await downloadAudio(id);
    // Use makeSafeFilename for robust, consistent naming
    const { makeSafeFilename } = require('../services/filenameUtil');
    const pathParts = filePath.split(path.sep);
    const fileName = pathParts[pathParts.length - 1];
    let title = fileName.replace(/^.*?-/, '').replace(/\.mp3$/, '');
    if (!title.trim()) title = 'audio';
    const safeName = makeSafeFilename(id, title);
    const stream = fs.createReadStream(filePath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
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

// Add process-level error handler to prevent server crash
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

module.exports = { handleList, handleDownload, handleDownloadAll };
