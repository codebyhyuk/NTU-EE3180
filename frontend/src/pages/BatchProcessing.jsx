// src/pages/BatchProcessing.jsx
import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";

/** ------- tiny canvas helpers (client-side mock processing) -------- */
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** center-crop cover to target WxH */
async function cropTo(imgSrc, targetW, targetH) {
  const img = await loadImage(imgSrc);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // cover-fit math
  const targetRatio = targetW / targetH;
  const srcRatio = srcW / srcH;

  let drawW, drawH, sx, sy;
  if (srcRatio > targetRatio) {
    // source wider than target -> crop width
    drawH = srcH;
    drawW = Math.floor(targetRatio * drawH);
    sx = Math.floor((srcW - drawW) / 2);
    sy = 0;
  } else {
    // source taller/narrower -> crop height
    drawW = srcW;
    drawH = Math.floor(drawW / targetRatio);
    sx = 0;
    sy = Math.floor((srcH - drawH) / 2);
  }

  const c = document.createElement("canvas");
  c.width = targetW;
  c.height = targetH;
  const ctx = c.getContext("2d");

  // (mock) shadow toggle or brand overlay could be drawn here later
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, drawW, drawH, 0, 0, targetW, targetH);

  return new Promise((resolve) =>
    c.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
  );
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ---------------- Batch Component ---------------- */
export default function BatchProcessing() {
  const inputRef = useRef(null);

  // files & previews
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // string[] (object URLs)

  // batch toggles
  const [removeBg, setRemoveBg] = useState(true);
  const [addShadow, setAddShadow] = useState(true);

  // brand kit
  const [brandKitChoice, setBrandKitChoice] = useState(null); // "create" | "skip" | null
  const [brandText, setBrandText] = useState("");

  // smart crop
  const CROP_OPTIONS = [
    { id: "square", label: "⬜ Square", width: 1080, height: 1080 },
    { id: "amazon", label: "🛒 Amazon", width: 2000, height: 2000 },
    { id: "story", label: "📱 Story", width: 1080, height: 1920 },

  ];
  const [selectedCrop, setSelectedCrop] = useState(null);

  const onPick = () => inputRef.current?.click();

  const onChangeFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
    // make object URLs for preview
    const urls = picked.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    e.target.value = "";
  };

  // clean up object URLs
  React.useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  // derived: simple status text
  const batchSummary = useMemo(() => {
    const pieces = [];
    if (removeBg) pieces.push("Removing background");
    if (addShadow) pieces.push("Adding shadow");
    if (brandKitChoice === "create" && brandText.trim())
      pieces.push(`Brand kit: "${brandText.trim()}"`);
    if (brandKitChoice === "skip") pieces.push("Brand kit: skipped");
    return pieces.join(" • ");
  }, [removeBg, addShadow, brandKitChoice, brandText]);

  /** Mock per-image "processed" download: we just re-save the preview for now */
  async function downloadOne(idx) {
    if (!previews[idx]) return;
    // NOTE: Here you would call your backend with the toggles + brand text, etc.
    // For now we just export the current image as-is.
    const blob = await (await fetch(previews[idx])).blob();
    const base = files[idx]?.name?.replace(/\.[^.]+$/, "") || `image-${idx + 1}`;
    downloadBlob(blob, `${base}__processed.jpg`);
  }

  async function downloadAll() {
    for (let i = 0; i < previews.length; i++) {
      // run sequentially to be gentle; parallel also fine
      await downloadOne(i);
    }
  }

  /** Smart-crop (client-side) all images to selected size */
  async function downloadCroppedAll() {
    if (!selectedCrop) {
      alert("Pick a crop format first.");
      return;
    }
    const opt = CROP_OPTIONS.find((o) => o.id === selectedCrop);
    if (!opt) return;

    for (let i = 0; i < previews.length; i++) {
      const src = previews[i];
      const blob = await cropTo(src, opt.width, opt.height);

      const base = files[i]?.name?.replace(/\.[^.]+$/, "") || `image-${i + 1}`;
      downloadBlob(blob, `${base}__${opt.id}_${opt.width}x${opt.height}.jpg`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f7fb] text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">
              📷
            </div>
            <Link to="/" className="font-semibold tracking-tight">
              PhotoPro
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">
              Home
            </Link>
            <Link to="/single-processing" className="hover:text-gray-900">
              Single Processing
            </Link>
            <span className="font-medium text-gray-900">Batch Processing</span>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-8">
          Batch Processing
        </h1>

        {/* Uploader */}
        <section className="rounded-2xl border-2 border-dashed border-blue-300 bg-white p-6 md:p-8 mb-8">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">{files.length ? "✅" : "⬆️"}</div>
            <div className="font-semibold">
              {files.length ? `${files.length} file(s) selected` : "No files selected"}
            </div>
            {!!files.length && (
              <div className="text-sm text-gray-500 mt-1 truncate">
                {files.map((f) => f.name).join(", ")}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onPick}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700"
            >
              {files.length ? "Add/Replace Files" : "Select Files"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onChangeFiles}
              className="hidden"
            />
          </div>

          {/* Preview grid */}
          {!!previews.length && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-gray-50 aspect-square overflow-hidden grid place-items-center"
                >
                  <img src={src} alt={`preview-${i}`} className="h-full object-contain" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Step 1: Background Removal (batch toggle) */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 1: Background Removal</div>
            <p className="text-sm text-gray-600 mt-1">
              Applies to all selected photos.
            </p>
          </div>
          <div className="p-5 md:p-6">
            <button
              onClick={() => setRemoveBg((v) => !v)}
              className={`w-full rounded-xl border p-6 md:p-7 text-center transition-all duration-300 shadow-sm hover:shadow-md
                flex flex-col items-center justify-center min-h-[120px]
                ${removeBg ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"}`}
            >
              <div className="text-3xl mb-2">{removeBg ? "✅" : "⬜️"}</div>
              <div className="font-medium">
                {removeBg ? "Backgrounds Will Be Removed" : "Click to Enable Background Removal"}
              </div>
            </button>
          </div>
        </section>

        {/* Step 2: Shadow Effects */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 2: Shadow Effects</div>
            <p className="text-sm text-gray-600 mt-1">Applies to all photos.</p>
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

        {/* Step 3: Brand Kit */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 3: Brand Kit</div>
            <p className="text-sm text-gray-600 mt-1">
              Choose whether to create a brand kit from text and apply it to all photos.
            </p>
          </div>

          <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setBrandKitChoice("create")}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md 
                ${brandKitChoice === "create" ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"}`}
            >
              <div className="text-3xl mb-2">🎨</div>
              <div className="font-medium">Create Brand Kit</div>
            </button>

            <button
              onClick={() => setBrandKitChoice("skip")}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md 
                ${brandKitChoice === "skip" ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"}`}
            >
              <div className="text-3xl mb-2">⏭️</div>
              <div className="font-medium">Skip Brand Kit</div>
            </button>
          </div>

          {brandKitChoice === "create" && (
            <div className="px-5 md:px-6 pb-6">
              <input
                type="text"
                value={brandText}
                onChange={(e) => setBrandText(e.target.value)}
                placeholder="Describe your brand style (e.g., minimalist, luxury, vibrant)"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </section>

        {/* Step 4: Processing & Download */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 flex items-center justify-between">
            <div className="font-semibold">Step 4: Processed Photos</div>
            <div className="text-xs text-gray-500">{batchSummary || "No options selected yet."}</div>
          </div>

          {!!previews.length && (
            <>
              <div className="px-5 md:px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {previews.map((src, i) => (
                  <div key={i} className="rounded-xl border bg-white shadow-sm p-3 flex flex-col">
                    <div className="aspect-square rounded-md bg-gray-100 overflow-hidden grid place-items-center mb-3">
                      <img src={src} alt={`prev-${i}`} className="h-full object-contain" />
                    </div>
                    <button
                      onClick={() => downloadOne(i)}
                      className="rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                    >
                      ⬇️ Download
                    </button>
                  </div>
                ))}
              </div>

              <div className="px-5 md:px-6 pb-6">
                <button
                  onClick={downloadAll}
                  className="w-full md:w-auto px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow"
                >
                  ⬇️ Download All Processed Photos
                </button>
              </div>
            </>
          )}
        </section>

        {/* Step 5: Smart Crop */}
        <section className="bg-white rounded-2xl shadow-sm border mb-12">
          <div className="p-5 md:p-6">
            <div className="font-semibold">
              Step 5: Smart Crop for Platforms{" "}
              <span className="text-gray-400 text-sm">(Optional)</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Choose a crop format and export cropped versions for all selected photos.
            </p>
          </div>

          <div className="px-5 md:px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {CROP_OPTIONS.map((opt) => {
              const active = selectedCrop === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedCrop(opt.id)}
                  className={`rounded-xl border p-4 text-center transition shadow-sm hover:shadow-md
                    ${active ? "ring-2 ring-violet-500 bg-violet-50" : "bg-white"}`}
                >
                  <div className="h-12 w-16 mx-auto rounded bg-gray-100 mb-2" />
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500">
                    {opt.width}×{opt.height}px
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-5 md:px-6 pb-8">
            <button
              onClick={downloadCroppedAll}
              disabled={!selectedCrop || previews.length === 0}
              className={`px-4 py-2 rounded-lg font-medium shadow
                ${!selectedCrop || previews.length === 0
                  ? "bg-emerald-300 cursor-not-allowed text-white/80"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
            >
              ⬇️ Download Cropped (All)
            </button>
          </div>
        </section>
      </main>

      <SiteFooter
        className="border-t border-gray-200 bg-white"
        containerClassName="max-w-6xl mx-auto px-4 text-sm text-gray-600"
      />
    </div>
  );
}
