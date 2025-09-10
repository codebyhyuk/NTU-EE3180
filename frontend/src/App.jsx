export default function App() {
  return (
    <div className="min-h-screen bg-photopro text-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow">
            <span className="text-xl">⚡️</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">PhotoPro</span>
        </div>

        {/* Links */}
        <div className="hidden sm:flex items-center gap-7 text-sm/none text-white/90">
          <a className="hover:text-white" href="#">Home</a>
          <a className="hover:text-white" href="#">Single Process</a>
          <a className="hover:text-white" href="#">Batch Process</a>
        </div>

        {/* Sign in */}
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

          <button className="inline-flex items-center gap-2 rounded-xl bg-[#ffd54a] hover:bg-[#ffcc33] text-purple-900 font-semibold px-5 py-3 shadow-lg">
            <span>📸</span>
            <span>Upload Your Product Photo</span>
          </button>

          {/* Feature ticks */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/90">
            <span>✅ AI Background Removal</span>
            <span>✅ Professional Effects</span>
            <span>✅ Batch Processing</span>
          </div>
        </section>
      </main>
    </div>
  );
}

