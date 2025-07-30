# ✅ COPILOT TASK TRACKER

## PHASE 1 - BACKEND SETUP
- [x] Research best tool for YouTube to MP3 (yt-dlp vs others)
- [x] Choose audio conversion tool (ffmpeg vs others)
- [x] Set up Node server using Express
- [x] Create API to accept YouTube URL(s)
- [x] Integrate yt-dlp for metadata and audio
- [x] Convert audio to MP3
- [x] Expose download endpoints
- [x] Enable ZIP packaging for batch download

## PHASE 2 - FRONTEND (REACT + VITE)
- [x] Setup Vite project with React
- [x] Build input form for YouTube link(s)
- [x] Fetch and display video/playlist info
- [x] Add MP3 download buttons per item
- [x] Add multi-select + Download Selected / All
- [ ] Polish UI and add loading/error states to download buttons
- [ ] Ensure CORS and cross-origin requests work in production

## PHASE 3 - POLISH & CLEANUP
- [ ] Auto-delete old temp files
- [ ] Add loading indicators
- [ ] Test live video compatibility
- [ ] Final styling and responsiveness

---

## RESEARCH SUMMARY

### YouTube Download & Extraction
- **yt-dlp**: Actively maintained, supports playlists, best for audio extraction, works with both Python and Node.js (via child process). Superior to youtube-dl and pytube for reliability and speed. Node alternatives (ytdl-core) lack playlist support and are less robust.

### MP3 Conversion
- **ffmpeg**: Industry standard, free, stable, supports all required audio conversions. Use `ffmpeg-static` for Node.js to avoid system dependencies. `fluent-ffmpeg` (Node wrapper) simplifies usage.

### Serving MP3s & Batch Download
- Use Node.js to serve files. For batch/multi-select, use `archiver` (Node) to create ZIPs on the fly for download.

### Node.js Framework
- **Express.js**: Most popular, mature, and has best middleware support for file handling. Fastify is faster for some cases, but Express is more widely supported and easier for file/stream handling.

**Selected stack:**
- yt-dlp (via child process)
- ffmpeg-static + fluent-ffmpeg
- Express.js
- archiver (for ZIP)

---

_Phase 1 backend setup complete:_
- All backend code and dependencies are now inside backend/.
- API endpoints for /list, /download/:id, /download-all are implemented.
- yt-dlp and ffmpeg integration is done.
- Ready for frontend setup and further backend polish (temp file cleanup, error handling, etc).

---

_Phase 2 frontend setup started:_
- Vite + React (JavaScript) project initialized in frontend/.
- Next: Build input form, fetch video/playlist info, and implement download features.

---

_Polish phase started:_
- UI improvements and download button states in progress.
- CORS and production readiness to be ensured next.
