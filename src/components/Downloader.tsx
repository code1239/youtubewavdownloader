"use client";

import { useState, useCallback } from "react";

interface VideoItem {
  id: string;
  url: string;
  title: string | null;
  status: "idle" | "fetching" | "ready" | "downloading" | "done" | "error";
  progress: string;
  error?: string;
  downloadId?: string;
}

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const addVideo = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const id = Math.random().toString(36).substring(2, 15);
    const newItem: VideoItem = {
      id,
      url: trimmed,
      title: null,
      status: "fetching",
      progress: "",
    };

    setVideos((prev) => [...prev, newItem]);
    setUrl("");

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (data.title) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, title: data.title, status: "ready" } : v
          )
        );
      } else {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === id
              ? { ...v, title: "Bilinmeyen Video", status: "ready" }
              : v
          )
        );
      }
    } catch {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, title: "Bilinmeyen Video", status: "ready" }
            : v
        )
      );
    }
  }, [url]);

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const confirmAndDownload = async () => {
    const readyVideos = videos.filter((v) => v.status === "ready");
    if (readyVideos.length === 0) return;

    const confirmed = window.confirm(
      `${readyVideos.length} video indirilecek. Emin misin?`
    );
    if (!confirmed) return;

    setIsDownloading(true);

    for (const video of readyVideos) {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id ? { ...v, status: "downloading", progress: "0%" } : v
        )
      );

      try {
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: video.url,
            title: video.title,
          }),
        });
        const data = await res.json();
        const downloadId = data.id;

        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id ? { ...v, downloadId } : v
          )
        );

        await pollProgress(video.id, downloadId);
      } catch {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id
              ? { ...v, status: "error", error: "Indirme baslatilamadi" }
              : v
          )
        );
      }
    }

    setIsDownloading(false);
  };

  const pollProgress = async (itemId: string, downloadId: string) => {
    return new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/download?id=${downloadId}`);
          const data = await res.json();

          if (data.status === "done") {
            clearInterval(interval);
            setVideos((prev) =>
              prev.map((v) =>
                v.id === itemId
                  ? { ...v, status: "done", progress: "100%" }
                  : v
              )
            );
            resolve();
          } else if (data.status === "error") {
            clearInterval(interval);
            setVideos((prev) =>
              prev.map((v) =>
                v.id === itemId
                  ? { ...v, status: "error", error: data.error }
                  : v
              )
            );
            resolve();
          } else {
            setVideos((prev) =>
              prev.map((v) =>
                v.id === itemId
                  ? { ...v, progress: data.progress || v.progress }
                  : v
              )
            );
          }
        } catch {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addVideo();
    }
  };

  const readyCount = videos.filter((v) => v.status === "ready").length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="YouTube linkini yapistir..."
          className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          disabled={isDownloading}
        />
        <button
          onClick={addVideo}
          disabled={!url.trim() || isDownloading}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          Ekle
        </button>
      </div>

      {videos.length > 0 && (
        <div className="space-y-3 mb-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg border border-zinc-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {video.status === "fetching"
                    ? "Baslik yukleniyor..."
                    : video.title}
                </p>
                <p className="text-zinc-500 text-sm truncate">{video.url}</p>
                {video.status === "downloading" && (
                  <div className="mt-2">
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: video.progress }}
                      />
                    </div>
                    <p className="text-zinc-400 text-xs mt-1">
                      {video.progress} indiriliyor...
                    </p>
                  </div>
                )}
                {video.status === "done" && (
                  <p className="text-green-400 text-xs mt-1">
                    Tamamlandi
                  </p>
                )}
                {video.status === "error" && (
                  <p className="text-red-400 text-xs mt-1">{video.error}</p>
                )}
              </div>

              {(video.status === "ready" || video.status === "idle") &&
                !isDownloading && (
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}

              {video.status === "fetching" && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-600 border-t-red-500" />
              )}
            </div>
          ))}
        </div>
      )}

      {readyCount > 0 && (
        <button
          onClick={confirmAndDownload}
          disabled={isDownloading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isDownloading
            ? "Indiriliyor..."
            : `${readyCount} Videoyu Indir (WAV)`}
        </button>
      )}

      {videos.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto mb-4 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <p className="text-lg">YouTube linklerini yukariya yapistir</p>
          <p className="text-sm mt-2">
            Kayipsiz WAV formatinda indirilecek
          </p>
        </div>
      )}
    </div>
  );
}
