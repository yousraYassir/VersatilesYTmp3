---
mode: agent
---
# SYSTEM GUIDE FOR AI AGENT

## Purpose:
You are building a YouTube MP3 Downloader web app with full playlist support. You must always ensure:

- All features are implemented fully.
- No placeholders or future stubs are allowed.
- Use only free, open-source tools.
- Separate frontend and backend.
- Always update `.copilot/tasks.md` with progress.

## Frontend:
- Built with React + Vite (No TypeScript).
- Must allow full user control: input YouTube links, download single/multiple/all MP3s.
- Include real-time feedback (loading, errors, success).

## Backend:
- Handle conversion via `yt-dlp` or alternative.
- Convert to MP3 using `ffmpeg`.
- Support batch downloads (ZIP optional).
- Clean up old files.

## Prohibited:
- Do not write tests.
- Do not leave TODOs.
- Do not use paid services or APIs.
- Do not delay any feature.

Every time you take an action, look at this guide. Every step must reflect its rules.
