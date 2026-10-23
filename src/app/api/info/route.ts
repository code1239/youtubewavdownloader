import { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return Response.json({ error: "URL gerekli" }, { status: 400 });
    }

    const { stdout } = await execFileAsync("yt-dlp", [
      "--get-title",
      "--no-warnings",
      url,
    ], { timeout: 30000 });

    const title = stdout.trim();

    return Response.json({ title });
  } catch {
    return Response.json(
      { error: "Video bilgisi alinamadi" },
      { status: 500 }
    );
  }
}
