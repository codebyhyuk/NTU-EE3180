// src/App.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState([]);
  const singleInputRef = useRef(null);
  const multiInputRef = useRef(null);
  const navigate = useNavigate();

  // === upload handling ===
  const chooseSingle = () => {
    setShowModal(false);
    navigate("/single-processing")
  };
  const chooseMultiple = () => {
    setShowModal(false);
    navigate("/batch-processing")
  };

  const handleFiles = (e, mode) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);

    // clear input so same file can be re-selected later
    e.target.value = "";

    if (mode === "single" && picked.length > 0) {
      // navigate to single processing page
      navigate("/single-processing", { state: { file: picked[0] } });
    }
    if (mode === "multi" && picked.length > 0) {
      navigate("/batch-processing", { state: { files: picked } });
    }
  };

  const firstPreviewUrl = files.length ? URL.createObjectURL(files[0]) : null;

  return (
    <div
      className="
        min-h-screen
        bg-[linear-gradient(180deg,#7488f1_0%,#6f63d9_45%,#6a4fc7_100%)]
        text-white
        relative
      "
    >
      {/* faint glow */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_25%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <span className="font-semibold tracking-tight">PhotoPro</span>
          </div>
          
          
          {/* Nav pills (swap <a> for <NavLink> if you want routing awareness) */}
          <nav className="flex items-center gap-2 text-[15px]">
            <a
              href="#"
              className="px-4 py-1.5 rounded-full bg-indigo-500/90 text-white shadow-sm hover:bg-indigo-500"
            >
              Home
            </a>
            <Link to="/single-processing" className="hover:text-gray-900">
              Single Processing
            </Link>
            <Link  to="/batch-processing" className="hover:text-gray-900">
              Batch Processing
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-5xl mx-auto px-6 pt-[16vh] pb-[18vh] text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
            Welcome to PhotoPro
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-white/90 text-[17px] leading-relaxed">
            Professional AI-powered image processing for e-commerce, social media,
            and marketing. Remove backgrounds, apply brand kits, and create stunning
            visuals in minutes.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowModal(true)}
              className="
                inline-flex items-center gap-2
                rounded-full bg-white text-indigo-700
                px-6 py-3
                font-semibold
                shadow-lg shadow-black/20 ring-1 ring-black/5
                hover:translate-y-[1px] hover:bg-white
                transition
              "
            >
              <span>📸</span>
              <span>Upload Your Product Photo</span>
            </button>
          </div>

          {/* File preview (optional inline feedback) */}
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
        </section>
      </main>

      {/* hidden inputs */}
      <input
        ref={singleInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e, "single")}
      />
      <input
        ref={multiInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e, "multi")}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          {/* dialog */}
          <div className="relative z-10 w-[92vw] max-w-[460px] rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-2xl font-extrabold text-center">
                Choose Upload Type
              </h2>
            </div>

            <div className="px-5 pb-5">
              {/* Single Photo card */}
              <button
                onClick={chooseSingle}
                className="w-full border rounded-xl px-5 py-6 mb-4 hover:bg-gray-50 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-600/40"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📷</span>
                  <div className="text-blue-600 font-semibold text-lg">
                    Single Photo
                  </div>
                  <div className="text-gray-500 text-sm">
                    Upload one product photo
                  </div>
                </div>
              </button>

              {/* Multiple Photos card */}
              <button
                onClick={chooseMultiple}
                className="w-full border rounded-xl px-5 py-6 hover:bg-gray-50 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-600/40"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📁</span>
                  <div className="text-blue-600 font-semibold text-lg">
                    Multiple Photos
                  </div>
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
