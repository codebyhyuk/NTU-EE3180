import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function SingleProcessing() {
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);

  const [removeBg, setRemoveBg] = useState(true);
  const [brandText, setBrandText] = useState("");
  const [addShadow, setAddShadow] = useState(true);
  const [activeVariant, setActiveVariant] = useState("A");

  const fileInputRef = useRef(null);

  const onPick = () => fileInputRef.current?.click();
  const onChangeFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreviewURL(url);
    }
  };

  const variantBtn = (id, title) => {
    const isActive = activeVariant === id;
    return (
      <button
        onClick={() => setActiveVariant(id)}
        className={`w-full rounded-xl border bg-white shadow-sm hover:shadow-md transition p-4 text-center ${
          isActive ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="h-28 rounded-md bg-gray-100 mb-3 flex items-center justify-center text-gray-400">
          {title}
        </div>
        <div className="text-sm font-medium">
          {`Variant ${id}${isActive ? " ✓" : ""}`}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      {/* Top nav (light) */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">⚡</div>
            <Link to="/" className="font-semibold">PhotoPro</Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link className="hover:text-gray-900" to="/">Home</Link>
            <a className="hover:text-gray-900" href="#">Templates</a>
            <span className="font-medium text-gray-900">Single Processing</span>
            <a className="hover:text-gray-900" href="#">Batch Processing</a>
            <a className="hover:text-gray-900" href="#">Platforms</a>
            <a className="hover:text-gray-900" href="#">Analytics</a>
          </nav>
          <div className="text-xs text-gray-500 pr-2">Page 1</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-8">
          Single Photo Processing
        </h1>

        {/* Drop area / file info */}
        <section className="rounded-2xl border-2 border-dashed border-blue-300 bg-white p-6 md:p-8 mb-8">
          <div className="text-center mb-4">
            {file ? (
              <>
                <div className="text-3xl mb-2">✅</div>
                <div className="font-semibold">File Selected</div>
                <div className="text-sm text-gray-500 truncate max-w-full">
                  {file.name}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">⬆️</div>
                <div className="font-semibold mb-1">No file selected</div>
                <div className="text-sm text-gray-500">Choose a product image to start</div>
              </>
            )}
          </div>

          <div className="h-40 md:h-44 bg-gray-200/60 rounded-lg flex items-center justify-center text-gray-500">
            {previewURL ? (
              <img
                src={previewURL}
                alt="preview"
                className="h-full object-contain"
              />
            ) : (
              "Image Preview"
            )}
          </div>

          <div className="mt-5 flex items-center justify-center">
            <button
              onClick={onPick}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700"
            >
              {file ? "Change File" : "Select File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onChangeFile}
              className="hidden"
            />
          </div>
        </section>

        {/* Step 1: Background Removal */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 1: Background Removal</div>
            <p className="text-sm text-gray-600 mt-1">
              Would you like to remove the background from your image?
            </p>
          </div>
          <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setRemoveBg(true)}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md ${
                removeBg ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
              }`}
            >
              <div className="text-3xl mb-2">✅</div>
              <div className="font-medium">Yes, Remove Background</div>
            </button>

            <button
              onClick={() => setRemoveBg(false)}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md ${
                !removeBg ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
              }`}
            >
              <div className="text-3xl mb-2">❌</div>
              <div className="font-medium">Keep Original Background</div>
            </button>
          </div>
        </section>

        {/* Step 2: Brand Kit */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 2: Brand Kit Setup</div>
            <p className="text-sm text-gray-600 mt-1">
              Would you like to create a brand kit based on text description?
            </p>
          </div>
          <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
            <button
              className="rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md ring-2 ring-blue-500 bg-blue-50"
            >
              <div className="text-3xl mb-2">🎨</div>
              <div className="font-medium">Create Brand Kit</div>
            </button>

            <button
              className="rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md bg-white"
            >
              <div className="text-3xl mb-2">⏭️</div>
              <div className="font-medium">Skip Brand Kit</div>
            </button>
          </div>

          <div className="px-5 md:px-6 pb-6">
            <input
              type="text"
              value={brandText}
              onChange={(e) => setBrandText(e.target.value)}
              placeholder="minimalist"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Step 3: Shadow Effects */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 3: Shadow Effects</div>
            <p className="text-sm text-gray-600 mt-1">
              Would you like to add shadow effects to your image?
            </p>
          </div>

          <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setAddShadow(true)}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md ${
                addShadow ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
              }`}
            >
              <div className="text-3xl mb-2">✨</div>
              <div className="font-medium">Add Shadow</div>
            </button>

            <button
              onClick={() => setAddShadow(false)}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md ${
                !addShadow ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
              }`}
            >
              <div className="text-3xl mb-2">🚫</div>
              <div className="font-medium">No Shadow</div>
            </button>
          </div>
        </section>

        {/* Processing Complete / Variants */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 flex items-center justify-between">
            <div className="font-semibold">Processing Complete!</div>
            <div className="flex items-center gap-2 text-sm">
              <button className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50">↩︎ Undo</button>
              <button className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50">🗂 History</button>
            </div>
          </div>

          <div className="px-5 md:px-6 pb-6 grid md:grid-cols-3 gap-4">
            {variantBtn("A", "Original")}
            {variantBtn("B", "Enhanced")}
            {variantBtn("C", "Premium")}
          </div>

          <div className="px-5 md:px-6 pb-6">
            <button className="w-full md:w-auto px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow">
              ⬇️ Download Selected Variant
            </button>
          </div>
        </section>

        {/* Smart Crop */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold">Smart Crop for Platforms <span className="text-gray-400 text-sm">(Optional)</span></div>
            <p className="text-sm text-gray-600 mt-1">
              Want to optimize for specific platforms? Choose a crop format below and download the cropped version.
            </p>
          </div>

          <div className="px-5 md:px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Square", "Amazon", "Story", "Thumbnail"].map((label) => (
              <div key={label} className="rounded-xl border bg-white p-4 text-center">
                <div className="h-12 rounded bg-gray-100 mb-2 mx-auto w-16" />
                <div className="text-sm text-gray-700">{label}</div>
              </div>
            ))}
          </div>

          <div className="px-5 md:px-6 pb-6">
            <div className="rounded-xl border bg-white p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-green-600 mt-0.5">✅</div>
                <div>
                  <div className="font-medium text-green-700">Accessibility Check Passed</div>
                  <div className="text-sm text-green-700/80">
                    Good contrast ratio between product and background
                  </div>
                </div>
              </div>
            </div>

            <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow">
              ⬇️ Download Cropped
            </button>
          </div>
        </section>

        {/* Platform previews + actions */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold mb-3">Preview on Platforms</div>
            <p className="text-sm text-gray-600 mb-4">
              See how your processed image looks on different platforms
            </p>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {["Amazon", "Shopee", "Instagram", "TikTok"].map((p) => (
                <div key={p} className="rounded-xl border p-4 text-center">
                  <div className="h-16 rounded bg-gray-100 mb-2" />
                  <div className="text-sm">{p}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <button className="flex-1 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow">
                ⬇️ Download Image
              </button>
              <button className="flex-1 px-5 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium shadow">
                ☁️ Save to Cloud
              </button>
            </div>
          </div>
        </section>

        {/* 1-Click Export */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-4">
            <button className="w-full px-5 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow">
              🛒 Amazon
            </button>
            <button className="w-full px-5 py-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow">
              🛍 Shopee
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}