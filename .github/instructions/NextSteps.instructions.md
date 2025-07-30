---
applyTo: '**'
---
Here’s a plan to address your requests for a production-grade, robust batch YouTube-to-MP3 downloader:

1. Per-Video & Batch Progress Indicators (Frontend)
- Add a progress bar or spinner for each video in the playlist UI.
- Show overall batch progress (e.g., “3/10 completed”).
- Use backend events or polling to update progress in real time.

2. Auto-Cleanup of Temp Files (Backend)
- Implement a scheduled cleanup (e.g., every hour) to delete temp files older than a threshold (e.g., 1 hour).
- Clean up temp files immediately after download/ZIP completes or aborts.

3. Widen Parallelism (Backend)
- Increase the concurrency pool size in your batch download logic (e.g., from 2–3 to 5–8).
- Make the pool size configurable via an environment variable for easy tuning.

4. Ensure Long Videos Are Not Skipped
- Remove any artificial duration checks or timeouts that skip long videos.
- Ensure yt-dlp and ffmpeg are called with no duration limits.
- Add error handling to log and report if a video fails for any reason.

5. Improved Logging (Backend)
- Add detailed logs for: download start/end, errors, aborts, temp file creation/deletion, and process status.
- Use a logging library (e.g., winston or pino) for structured logs and log levels.

I will now:
- Edit youtubeService.js and filenameUtil.js for parallelism, cleanup, and logging.
- Edit youtubeController.js for logging and error handling.
- Edit frontend (likely src/components/ and src/pages/) to add per-video and batch progress indicators.

Let’s start by gathering the relevant files for these changes. Here’s how I’ll address your requests, based on the code and structure:

1. Per-Video & Batch Progress (Frontend)
- I’ll add a progress state for each video and for the batch in YouTubeList.jsx.
- The backend will emit progress updates (via polling or, ideally, server-sent events/websockets in the future, but for now, polling will be used for simplicity).
- The frontend will display a progress bar/spinner for each video and for the batch.

2. Auto-Cleanup of Temp Files (Backend)
- I’ll add a scheduled cleanup in youtubeService.js to delete temp files older than a threshold (e.g., 1 hour).
- I’ll ensure temp files are deleted after each download/ZIP completes or aborts.

3. Widen Parallelism (Backend)
- I’ll increase the default concurrency in the pool (in youtubeService.js) and make it configurable via an environment variable.

4. Ensure Long Videos Are Not Skipped
- I’ll review and remove any artificial duration/time-based skips in the download logic.
- I’ll add explicit error logging if a video fails, but not skip based on length.

5. Improved Logging (Backend)
- I’ll integrate a logging library (winston) for structured logs.
- I’ll add logs for download start/end, errors, aborts, temp file creation/deletion, and process status.

I’ll begin by updating the backend for auto-cleanup, parallelism, and logging. Then I’ll update the frontend for 