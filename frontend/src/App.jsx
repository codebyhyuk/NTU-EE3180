import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  // modal + uploads
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState([]);         // File[]
  const singleInputRef = useRef(null);
  const multiInputRef = useRef(null);
  const navigate = useNavigate();

  // open the right hidden input
  const chooseSingle = () => {setShowModal(false);
    navigate("/single-processing");
  };
  const chooseMultiple = () => multiInputRef.current?.click();

  // when user picks files
  const handleFiles = (e, close = true) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
    if (close) setShowModal(false);
    // clear input so the same file can be re-selected later
    e.target.value = "";
  };

  // small helper for preview URL
  const firstPreviewUrl = files.length ? URL.createObjectURL(files[0]) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6a86f5] via-[#6f63d9] to-[#6a4fc7] text-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow">
            <span className="text-xl">⚡️</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">PhotoPro</span>
        </div>

        <div className="hidden sm:flex items-center gap-7 text-sm/none text-white/90">
          <a className="hover:text-white" href="#">Home</a>
          <a className="hover:text-white" href="#">Single Process</a>
          <a className="hover:text-white" href="#">Batch Process</a>
        </div>

        <button className="ml-4 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2 text-sm font-semibold shadow">
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <section className="w-full max-w-3xl mx-auto px-6 text-center">
          {/* Camera icon circle */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
            <span className="text-3xl">📷</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Welcome to PhotoPro
          </h1>

          <p className="text-white/90 text-lg md:text-xl leading-relaxed mb-8">
            Transform your product photos with AI-powered editing
          </p>

          <p className="text-white/90 max-w-2xl mx-auto mb-8">
            Remove backgrounds, enhance colors, add professional effects, and create
            stunning product images that sell
          </p>

          {/* Upload CTA */}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-purple-700 font-semibold px-6 py-3 shadow-lg hover:bg-purple-50 transition"
          >
            <span>📸</span>
            <span>Upload Your Product Photo</span>
          </button>

          {/* Results / preview */}
          {files.length > 0 && (
            <div className="mt-6 text-white/95">
              <p className="text-sm mb-3">
                ✅ Selected {files.length} {files.length === 1 ? "file" : "files"}:
                <span className="block mt-1 text-white">
                  {files.map((f) => f.name).join(", ")}
                </span>
              </p>

              {firstPreviewUrl && (
                <div className="mx-auto w-24 h-32 border border-white/30 rounded-md shadow-md overflow-hidden">
                  <img
                    src={firstPreviewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onLoad={() => URL.revokeObjectURL(firstPreviewUrl)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Feature ticks */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/90">
            <span>✅ AI Background Removal</span>
            <span>✅ Professional Effects</span>
            <span>✅ Batch Processing</span>
          </div>
        </section>
      </main>

      {/* Hidden file inputs */}
      <input
        ref={singleInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e)}
      />
      <input
        ref={multiInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e)}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />
          {/* dialog */}
          <div className="relative z-10 w-[92vw] max-w-[460px] rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-2xl font-extrabold text-center">Choose Upload Type</h2>
            </div>

            <div className="px-5 pb-5">
              {/* Single Photo card */}
              <button
                onClick={chooseSingle}
                className="w-full border rounded-xl px-5 py-6 mb-4 hover:bg-gray-50 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-600/40"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📷</span>
                  <div className="text-blue-600 font-semibold text-lg">Single Photo</div>
                  <div className="text-gray-500 text-sm">Upload one product photo</div>
                </div>
              </button>

              {/* Multiple Photos card */}
              <button
                onClick={chooseMultiple}
                className="w-full border rounded-xl px-5 py-6 hover:bg-gray-50 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-600/40"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📁</span>
                  <div className="text-blue-600 font-semibold text-lg">Multiple Photos</div>
                  <div className="text-gray-500 text-sm">
                    Upload multiple product photos
                  </div>
                </div>
              </button>

              {/* Cancel */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full text-center text-gray-500 hover:text-red-600 py-3 mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}