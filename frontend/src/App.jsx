// src/App.jsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import SiteFooter from "./components/SiteFooter";

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col lux-canvas text-[var(--lux-ink)]">
      {/* Header */}
      <header className="sticky top-0 z-30">
        <div className="lux-container py-3">
          {/* Brighter glass, softer shadow */}
          <div className="lux-glass rounded-2xl px-5 py-3 flex items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,.06)]">
            <Link to="/" className="flex items-center gap-2" aria-label="PhotoPro home">
              <span className="text-2xl leading-none">📷</span>
              <span className="font-semibold tracking-tight">PhotoPro</span>
            </Link>

            <nav className="flex items-center gap-5 text-sm" aria-label="Primary">
              <Link to="/" className="lux-link">Home</Link>
              <Link to="/single-processing" className="lux-link">Processing</Link>
            </nav>
          </div>
        </div>
        {/* hairline separator under header for crispness */}
        <div className="lux-sep" />
      </header>

      {/* Hero (main expands to push footer down) */}
      <main className="flex-1 relative">
        {/* soft ambient halo (pure CSS, non-interactive) */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-24 w-[70vw] max-w-[900px] aspect-square rounded-full blur-3xl opacity-30"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(202,168,91,.20) 0%, transparent 70%)" }}
            aria-hidden
          />
        </div>

        <section className="lux-container pt-[14vh] pb-[18vh] text-center">
          {/* hero title */}
          <h1 className="lux-hero-title text-5xl md:text-7xl font-extrabold leading-tight tracking-[-0.01em] lux-title-glow">
            Elevate your <span className="lux-gold-text">Product Visuals</span>
          </h1>

          {/* subcopy */}
          <p className="mt-6 max-w-xl md:max-w-2xl mx-auto lux-subtle text-[17px] md:text-[18px] leading-[1.75]">
            AI-powered enhancement for e-commerce and branding. Remove backgrounds,
            generate scenes, and export platform-perfect crops — in minutes.
          </p>

          {/* primary CTA */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/single-processing")}
              className="lux-btn lux-btn-shimmer lux-ring-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lux-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lux-bg)]"
            >
              <span className="text-xl mr-2">📸</span>
              Upload Your Product Photo
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
