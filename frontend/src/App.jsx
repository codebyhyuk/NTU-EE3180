import { useRef, useState } from "react";

export default function App() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleButtonClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setSelectedFile(f);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6a86f5] via-[#6f63d9] to-[#6a4fc7] text-white flex flex-col">
      {/* NAV */}
      <nav className="w-full bg-white/10 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            
            <div className="w-9 h-9 rounded-xl bg-white/90 text-purple-700 flex items-center justify-center">
              <span className="text-lg">◯</span>
            </div>
            <span className="text-xl font-semibold">PhotoPro</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-white">
            <a className="hover:opacity-80" href="#">Home</a>
            <a className="hover:opacity-80" href="#">Single Processing</a>
            <a className="hover:opacity-80" href="#">Batch Processing</a>
            
          </div>
          <button className="rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2 text-sm font-semibold shadow">
            Sign In
          </button>
        </div>
      </nav>

      {/* HERO */}
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 text-center pt-24 md:pt-40">
          <div className="mx-auto mb-8 w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
            <span className="text-3xl">📷</span>
          </div>
          

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Welcome to PhotoPro
          </h1>

          <p className="text-white/90 text-lg md:text-2xl mb-4">
            Transform your product photos with AI-powered editing
          </p>
          <p className="text-white/90 max-w-2xl mx-auto mb-8">
            Remove backgrounds, enhance colors, add professional effects, and create
            stunning product images that sell
          </p>

          <button
            onClick={handleButtonClick}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-purple-900 px-6 py-3 font-semibold shadow hover:bg-white/90"
          >
            <span>📸</span>
            <span>Upload Your Product Photo</span>
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile && (
            <div className="mt-5 text-center">
              <p className="text-sm">
                📂 File chosen: <span className="font-semibold">{selectedFile.name}</span>
              </p>
              <div className="mx-auto mt-2 w-24 h-32 border border-white/30 rounded-md shadow-md overflow-hidden">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-col md:flex-row items-center justify-center gap-8 text-sm text-white">
            <span className="flex items-center gap-2"><span className="opacity-70">✓</span> AI Background Removal</span>
            <span className="flex items-center gap-2"><span className="opacity-70">✓</span> Professional Effects</span>
            <span className="flex items-center gap-2"><span className="opacity-70">✓</span> Batch Processing</span>
          </div>
        </section>
      </main>
    </div>
  );
}
