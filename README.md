# VersatilesYTmp3

A robust batch YouTube-to-MP3 downloader with playlist support, parallel downloads, auto-cleanup, and a modern React frontend.

## Features
- Download individual videos or entire playlists as MP3
- Batch download with ZIP packaging
- Per-video and batch progress indicators
- Automatic cleanup of temp files
- Configurable parallelism
- Detailed logging

## Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Python](https://www.python.org/) (for yt-dlp)

## Installation

### 1. Install yt-dlp globally

Open PowerShell and run:

```powershell
python -m pip install -U yt-dlp
```

Ensure the Python Scripts directory is in your system PATH. Typically:
```
C:\Users\<YourUsername>\AppData\Roaming\Python\Python3x\Scripts
```
Replace `<YourUsername>` and `Python3x` with your actual username and Python version.

Verify installation:
```powershell
yt-dlp --version
```

### 2. Install ffmpeg-static (Node.js wrapper for ffmpeg)

From the `backend/` directory, run:

```powershell
npm install ffmpeg-static fluent-ffmpeg
```

- `ffmpeg-static` provides a cross-platform ffmpeg binary for Node.js
- `fluent-ffmpeg` is a Node.js wrapper for ffmpeg

### 3. Install other dependencies

From the `backend/` and `frontend/` directories, run:

```powershell
npm install
```

## Usage

1. Start the backend server:
   ```powershell
   cd backend
   npm start
   ```
2. Start the frontend:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open your browser to the frontend URL (usually http://localhost:5173)

## Troubleshooting
- If you see `yt-dlp error: spawn yt-dlp ENOENT`, ensure yt-dlp is installed and in your PATH.
- For ffmpeg errors, ensure `ffmpeg-static` is installed in `backend/node_modules`.

## License
MIT
