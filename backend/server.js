const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { handleList, handleDownload, handleDownloadAll, handleBatchProgress } = require('./controllers/youtubeController');
const { getDownloadProgress } = require('./services/youtubeService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
// Global request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log('[health] Responding with status ok');
  res.json({ status: 'ok' });
});

// List videos in a YouTube link (single or playlist)
app.post('/list', (req, res) => {
  console.log('[list] Body:', req.body);
  handleList(req, res);
});

// Download a single MP3 by ID
app.get('/download/:id', (req, res) => {
  console.log(`[download/:id] Params:`, req.params);
  handleDownload(req, res);
});

// Download selected or all MP3s as ZIP
app.post('/download-all', (req, res) => {
  console.log('[download-all] Body:', req.body);
  handleDownloadAll(req, res);
});

// Progress endpoint for batch/selected downloads
app.get('/progress/all', (req, res) => {
  console.log('[progress/all] Called');
  handleBatchProgress(req, res);
});
app.get('/progress/selected', (req, res) => {
  console.log('[progress/selected] Called');
  handleBatchProgress(req, res);
});

// Progress endpoint for a single download
app.get('/progress/:id', (req, res) => {
  console.log(`[progress/:id] Params:`, req.params);
  const progress = getDownloadProgress(req.params.id);
  if (!progress) {
    console.log(`[progress/:id] No progress found for id ${req.params.id}`);
    return res.status(404).json({ error: 'No progress found for this id.' });
  }
  console.log(`[progress/:id] Progress:`, progress);
  res.json(progress);
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
