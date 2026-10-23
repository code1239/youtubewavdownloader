# 🎵 YouTube WAV Downloader

Paste a YouTube link, confirm, and get a **lossless WAV** file on your machine. That's it — no clutter, no menus: a clean dark UI where you queue up multiple videos, watch the progress bars fill in, and collect your audio from a single folder.

Powered under the hood by [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org), wrapped in a friendly [Next.js](https://nextjs.org) web app.

## ✨ Features

- **Lossless audio** — downloads the best available audio stream and converts it to WAV with zero quality loss
- **Queue-first workflow** — paste multiple links, review the auto-fetched titles, remove the ones you changed your mind about, then download everything in one confirmed batch
- **Live progress** — each download reports its percentage in real time
- **Clean filenames** — files are saved as `<video title>.wav` with illegal characters sanitized
- **Self-contained** — the app creates its own download folder and cleans up after itself

## 🚀 Getting Started (local)

You'll need Node.js 20+, plus `yt-dlp`, `ffmpeg` and `deno` available on your system (Windows users: `winget install yt-dlp.yt-dlp Gyan.FFmpeg DenoLand.Deno` works nicely).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a link, and you're off. 💚

### Optional configuration

The app works with zero configuration. If you want to change where downloads are saved (or point it at your own tool installations), copy `.env.example` to `.env` and adjust:

| Variable       | Description                                       | Default                        |
| -------------- | ------------------------------------------------- | ------------------------------ |
| `DOWNLOAD_DIR` | Where finished `.wav` files are saved             | `./youtubedownloads`           |
| `FFMPEG_DIR`   | Folder containing the ffmpeg binaries             | Windows WinGet install path    |
| `DENO_BIN_DIR` | Folder containing the deno binary (used by yt-dlp) | `~/.deno/bin`                 |

## 🐳 Running with Docker

Everything (ffmpeg, yt-dlp, deno) is baked into the image, so no local setup is needed:

```bash
docker build -t youtubewavdownloader .
docker run --rm -p 3000:3000 -v youtubewavdownloader-data:/app/youtubedownloads youtubewavdownloader
```

Mount the volume so your WAV files survive container restarts.

## 🧰 How it works

- The UI lives in `src/components/Downloader.tsx` — paste from clipboard, hold Enter, remove, repeat
- `POST /api/info` fetches the video title before you commit to a download
- `POST /api/download` spawns `yt-dlp` (with `ffmpeg` for the WAV conversion), tracks progress in memory, and renames the finished file to the sanitized video title
- Downloads land in `youtubedownloads/` (or `DOWNLOAD_DIR`), which is git-ignored by default

## 📌 A note on responsibility

This tool is for saving audio you have the right to download — your own content, Creative Commons material, and so on. Please respect creators and YouTube's Terms of Service.

## Built with

- [Next.js](https://nextjs.org) (App Router) + React 19
- [Tailwind CSS](https://tailwindcss.com)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) & [ffmpeg](https://ffmpeg.org) doing the heavy lifting
