import Downloader from "@/components/Downloader";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-2xl font-bold text-white">
            YouTube WAV Downloader
          </h1>
          <p className="text-zinc-400 mt-1">
            Kayipsiz ses indirme
          </p>
        </div>
      </header>

      <main className="flex-1 py-10 px-6">
        <Downloader />
      </main>

      <footer className="border-t border-zinc-800 py-4">
        <div className="max-w-4xl mx-auto px-6 text-center text-zinc-600 text-sm">
          yt-dlp + ffmpeg ile WAV formatinda kayipsiz indirme
        </div>
      </footer>
    </div>
  );
}
