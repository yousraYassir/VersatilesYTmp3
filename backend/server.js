const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { handleList, handleDownload, handleDownloadAll } = require('./controllers/youtubeController');
const { getDownloadProgress } = require('./services/youtubeService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List videos in a YouTube link (single or playlist)
app.post('/list', handleList);

// Download a single MP3 by ID
app.get('/download/:id', handleDownload);

// Download selected or all MP3s as ZIP
app.post('/download-all', handleDownloadAll);

// Progress endpoint for a single download
app.get('/progress/:id', (req, res) => {
  const progress = getDownloadProgress(req.params.id);
  if (!progress) {
    return res.status(404).json({ error: 'No progress found for this id.' });
  }
  res.json(progress);
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
