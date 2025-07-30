const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { handleList, handleDownload, handleDownloadAll } = require('./controllers/youtubeController');

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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
