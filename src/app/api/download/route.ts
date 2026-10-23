import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const DEFAULT_FFMPEG_DIR = path.join(
  process.env.LOCALAPPDATA || "",
  "Microsoft",
  "WinGet",
  "Packages",
  "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
  "ffmpeg-9.0-full_build",
  "bin"
);
const DEFAULT_DENO_DIR = path.join(process.env.USERPROFILE || "", ".deno", "bin");

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR
  ? path.resolve(process.env.DOWNLOAD_DIR)
  : path.join(process.cwd(), "youtubedownloads");
const FFMPEG_DIR = process.env.FFMPEG_DIR || DEFAULT_FFMPEG_DIR;
const DENO_BIN_DIR = process.env.DENO_BIN_DIR || DEFAULT_DENO_DIR;

const YT_DLP_ENV = {
  ...process.env,
  PATH: `${DENO_BIN_DIR}${path.delimiter}${FFMPEG_DIR}${path.delimiter}${process.env.PATH || ""}`,
};

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

interface DownloadJob {
  url: string;
  title: string;
  status: "pending" | "downloading" | "done" | "error";
  progress: string;
  error?: string;
}

const jobs = new Map<string, DownloadJob>();

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function POST(request: NextRequest) {
  try {
    const { url, title } = await request.json();

    if (!url) {
      return Response.json({ error: "URL gerekli" }, { status: 400 });
    }

    const id = generateId();
    const job: DownloadJob = {
      url,
      title: title || "Bilinmeyen Video",
      status: "pending",
      progress: "0%",
    };
    jobs.set(id, job);

    const safeName = sanitizeFilename(job.title);

    const ytDlp = spawn("yt-dlp", [
      "-f", "bestaudio",
      "-x",
      "--audio-format", "wav",
      "--audio-quality", "0",
      "--no-playlist",
      "--newline",
      "--no-overwrites",
      "--ffmpeg-location", FFMPEG_DIR,
      "--remote-components", "ejs:github",
      "--impersonate", "Chrome-131",
      "--print", "after_move:filepath",
      "-o", path.join(DOWNLOAD_DIR, "%(id)s.%(ext)s"),
      url,
    ], { shell: false, env: YT_DLP_ENV });

    jobs.set(id, { ...job, status: "downloading" });

    let stderrData = "";
    let downloadedFilePath = "";

    ytDlp.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      const progressMatch = output.match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        const updated = jobs.get(id);
        if (updated) {
          jobs.set(id, { ...updated, progress: `${progressMatch[1]}%` });
        }
      }
      const lines = output.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        if (line.includes(DOWNLOAD_DIR) || line.endsWith(".wav")) {
          downloadedFilePath = line.trim();
        }
      }
    });

    ytDlp.stderr?.on("data", (data: Buffer) => {
      stderrData += data.toString();
    });

    ytDlp.on("close", (code) => {
      const updated = jobs.get(id);
      if (updated) {
        if (code === 0) {
          try {
            if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
              const ext = path.extname(downloadedFilePath);
              const finalPath = path.join(DOWNLOAD_DIR, `${safeName}${ext}`);
              if (downloadedFilePath !== finalPath) {
                fs.renameSync(downloadedFilePath, finalPath);
              }
            }
          } catch {}
          jobs.set(id, { ...updated, status: "done", progress: "100%" });
        } else {
          jobs.set(id, {
            ...updated,
            status: "error",
            error: stderrData || "Indirme basarisiz",
          });
        }
      }
    });

    ytDlp.on("error", (err) => {
      const updated = jobs.get(id);
      if (updated) {
        jobs.set(id, {
          ...updated,
          status: "error",
          error: err.message,
        });
      }
    });

    return Response.json({ id, status: "downloading" });
  } catch {
    return Response.json(
      { error: "Indirme baslatilamadi" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (id) {
    const job = jobs.get(id);
    if (!job) {
      return Response.json({ error: "Is bulunamadi" }, { status: 404 });
    }
    return Response.json({ id, ...job });
  }

  const allJobs = Array.from(jobs.entries()).map(([jid, job]) => ({
    id: jid,
    ...job,
  }));
  return Response.json({ jobs: allJobs });
}
