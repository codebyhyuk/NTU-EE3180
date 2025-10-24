// src/App.jsx

import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function App() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen relative bg-gradient-to-b from-indigo-500 via-indigo-600 to-violet-700 text-white overflow-hidden">
      {/* Glow overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_25%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />

      {/* Floating subtle particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-sm">📷</span>
            <span className="font-bold tracking-tight text-white text-lg">
              PhotoPro
            </span>
          </div>

          <nav className="flex items-center gap-4 text-[15px]">
            <Link
              to="/"
              className="px-4 py-1.5 rounded-full bg-white/20 text-white shadow-sm hover:bg-white/30 transition"
            >
              Home
            </Link>
            <Link
              to="/single-processing"
              className="hover:text-yellow-200 transition"
            >
              Processing
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-[16vh] pb-[18vh]">
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight drop-shadow-[0_2px_5px_rgba(0,0,0,0.25)]">
          Welcome to <span className="text-yellow-300">PhotoPro</span>
        </h1>

        <p className="mt-6 max-w-2xl text-white/90 text-lg md:text-[18px] leading-relaxed">
          AI-powered image enhancement for e-commerce, social media, and branding.
          Remove backgrounds, apply brand kits, and create stunning visuals in minutes.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/single-processing")}
            className="
              inline-flex items-center justify-center gap-2
              rounded-full
              bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500
              text-gray-900 font-semibold
              px-7 py-3.5
              shadow-lg shadow-yellow-500/30
              hover:scale-[1.03] hover:shadow-yellow-400/40
              active:scale-[0.97]
              transition-all duration-200
            "
          >
            <span className="text-xl">📸</span>
            <span>Upload Your Product Photo</span>
          </button>


        </div>

      </main>

      {/* Footer */}
      <footer className="text-center text-white/60 text-sm py-6">
        © {new Date().getFullYear()} PhotoPro. All rights reserved.
      </footer>
    </div>
  );
}

