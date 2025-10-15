import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function SingleProcessing() {
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);

  const [removeBg, setRemoveBg] = useState(true);
  const [brandText, setBrandText] = useState("");
  const [addShadow, setAddShadow] = useState(true);
  const [activeVariant, setActiveVariant] = useState("A");
  const [brandKitChoice, setBrandKitChoice] = useState(null); // "create" | "skip" | null
  const fileInputRef = useRef(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [previewModal, setPreviewModal] = useState({ open: false, platform: null });

    // Open/close helpers
  const openPreview = (platform) => setPreviewModal({ open: true, platform });
  const closePreview = () => setPreviewModal({ open: false, platform: null });
  const previewImg = previewURL || null;

  const CROP_OPTIONS = [
  { id: "square", label: "⬜Square", width: 1080, height: 1080 },
  { id: "amazon", label: "🛒Amazon", width: 2000, height: 2000 },
  { id: "story", label: "📱Story", width: 1080, height: 1920 },
  
];

function downloadCropped() {
  if (!selectedCrop) {
    alert("Please choose a crop option first!");
    return;
  }

  const opt = CROP_OPTIONS.find(o => o.id === selectedCrop);
  alert(`You selected: ${opt.label} (${opt.width}x${opt.height}px)\n(Backend will handle actual cropping later)`);
}

  
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
          {` ${id}${isActive ? " ✓" : ""}`}
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
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">📷</div>
            <Link to="/" className="font-semibold tracking-tight">PhotoPro</Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link className="hover:text-gray-900" to="/">Home</Link>

            <span className="font-medium text-gray-900">Single Processing</span>
            <Link  to="/batch-processing" className="hover:text-gray-900">
                          Batch Processing
            </Link>
          </nav>
          
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

          <div className="p-5 md:p-6">
            <button
              onClick={() => setRemoveBg((prev) => !prev)}   // toggle state
              className={`w-full rounded-xl border p-6 md:p-7 text-center transition-all duration-300 shadow-sm hover:shadow-md
                flex flex-col items-center justify-center min-h-[120px]
                ${removeBg ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"}`}
            >
              <div className="text-3xl mb-2">{removeBg ? "✅" : "⬜️"}</div>
              <div className="font-medium">
                {removeBg ? "Background Will Be Removed" : "Click to Remove Background"}
              </div>
            </button>
          </div>
        </section>


        {/* Step 2: Shadow Effects */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 2: Shadow Effects</div>
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
        

        
        {/* Step 3: Brand Kit */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 border-b">
            <div className="font-semibold">Step 3: Brand Kit Setup</div>
            <p className="text-sm text-gray-600 mt-1">
              Would you like to create a brand kit based on text description?
            </p>
          </div>

          <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
            {/* Create Brand Kit Button */}
            <button
              onClick={() => setBrandKitChoice("create")}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md 
                ${brandKitChoice === "create" ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"}`}
            >
              <div className="text-3xl mb-2">🎨</div>
              <div className="font-medium">Create Brand Kit</div>
            </button>

            {/* Skip Brand Kit Button */}
            <button
              onClick={() => setBrandKitChoice("skip")}
              className={`rounded-xl border p-6 text-center transition shadow-sm hover:shadow-md 
                ${brandKitChoice === "skip" ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"}`}
            >
              <div className="text-3xl mb-2">⏭️</div>
              <div className="font-medium">Skip Brand Kit</div>
            </button>
          </div>

          {/* Only show input if Create is selected */}
          {brandKitChoice === "create" && (
            <div className="px-5 md:px-6 pb-6">
              <input
                type="text"
                value={brandText}
                onChange={(e) => setBrandText(e.target.value)}
                placeholder="Describe your brand style (e.g., modern, minimalist, luxury, vibrant)"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </section>



        {/* Processing Complete / Variants */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6 flex items-center justify-between">
            <div className="font-semibold">Step 4: Processing your image!</div>
          </div>

          <div className="px-5 md:px-6 pb-6 grid md:grid-cols-3 gap-4">
            
            {variantBtn("", "AI-Enhanced Image")}
            
          </div>

          <div className="px-5 md:px-6 pb-6">
            <button className="w-full md:w-auto px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow">
              ⬇️ Download Image
            </button>
          </div>
        </section>

        {/* Smart Crop */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold">
              Step 5: Smart Crop for Platforms{" "}
              <span className="text-gray-400 text-sm">(Optional)</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Want to optimize for specific platforms? Choose a crop format below and download the cropped version.
            </p>
          </div>

          <div className="px-5 md:px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {CROP_OPTIONS.map(opt => {
              const active = selectedCrop === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedCrop(opt.id)}
                  className={`rounded-xl border p-4 text-center transition shadow-sm hover:shadow-md
                    ${active ? "ring-2 ring-violet-500 bg-violet-50" : "bg-white"}`}
                >
                  <div className="h-12 w-16 mx-auto rounded bg-gray-100 mb-2" />
                  <div className="text-sm text-gray-800 font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.width}×{opt.height}px</div>
                </button>
              );
            })}
          </div>

          <div className="px-5 md:px-6 pb-6">
            <button
              onClick={downloadCropped}
              disabled={!selectedCrop}
              className={`px-4 py-2 rounded-lg font-medium shadow
                ${!selectedCrop
                  ? "bg-emerald-300 cursor-not-allowed text-white/80"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
            >
              ⬇️ Download Cropped
            </button>
          </div>
        </section>


        {/* Step 7: Platform Preview */}
        <section className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold mb-3">🛍 Step 6: Platform Preview</div>
            <p className="text-sm text-gray-600 mb-4">
              See how your processed image could look on different platforms. Click to preview.
            </p>

            {/* Clickable cards */}
            <div className="grid md:grid-cols-3 gap-5">
              {/* Amazon */}
              <button
                onClick={() => openPreview("amazon")}
                className="group rounded-2xl border hover:border-blue-400 transition shadow-sm hover:shadow-md bg-white overflow-hidden text-left"
              >
                <div className="h-44 bg-gray-100 grid place-items-center text-4xl">
                  🛒
                </div>
                <div className="px-4 py-3">
                  <div className="font-medium">Amazon</div>
                  <div className="text-xs text-gray-500">Product listing layout</div>
                </div>
              </button>

              {/* Shopee */}
              <button
                onClick={() => openPreview("shopee")}
                className="group rounded-2xl border hover:border-orange-400 transition shadow-sm hover:shadow-md bg-white overflow-hidden text-left"
              >
                <div className="h-44 bg-gray-100 grid place-items-center text-4xl">
                  🛍️
                </div>
                <div className="px-4 py-3">
                  <div className="font-medium">Shopee</div>
                  <div className="text-xs text-gray-500">Mobile-first design</div>
                </div>
              </button>

              {/* Instagram */}
              <button
                onClick={() => openPreview("instagram")}
                className="group rounded-2xl border hover:border-pink-400 transition shadow-sm hover:shadow-md bg-white overflow-hidden text-left"
              >
                <div className="h-44 bg-gray-100 grid place-items-center text-4xl">
                  📸
                </div>
                <div className="px-4 py-3">
                  <div className="font-medium">Instagram</div>
                  <div className="text-xs text-gray-500">Social media posts</div>
                </div>
              </button>
            </div>
          </div>
        </section>

          {/* Platform Preview Modal */}
          {previewModal.open && (
            <div className="fixed inset-0 z-[100]">
              {/* overlay */}
              <div
                className="absolute inset-0 bg-black/50"
                onClick={closePreview}
                aria-hidden
              />

              {/* centered dialog */}
              <div className="relative z-[101] h-full w-full grid place-items-center p-4">
                <div className="
                    relative w-full 
                    max-w-xl md:max-w-3xl      /* smaller panel */
                    bg-white rounded-2xl shadow-2xl overflow-hidden
                    max-h-[90vh]              /* never grows taller than viewport */
                  ">
                  {/* header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="font-semibold">
                      {previewModal.platform === "amazon"    && "Amazon Listing Preview"}
                      {previewModal.platform === "shopee"    && "Shopee Product Preview"}
                      {previewModal.platform === "instagram" && "Instagram Post Preview"}
                    </div>
                    <button
                      onClick={closePreview}
                      className="h-8 w-8 rounded-full grid place-items-center hover:bg-gray-100"
                      aria-label="Close"
                    >
                      ✖️
                    </button>
                  </div>

                  {/* body */}
                  <div className="p-5 md:p-6">
                    {/* AMAZON */}
                    {previewModal.platform === "amazon" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* fixed square preview area */}
                        <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden">
                          {previewImg ? (
                            <img
                              src={previewImg}
                              alt="preview"
                              className="w-full h-full object-contain"  /* key line */
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-5xl">✨</div>
                          )}
                        </div>

                        <div className="flex flex-col gap-3">
                          <h3 className="text-xl font-semibold text-blue-700">
                            Premium Product – AI Enhanced
                          </h3>
                          <div className="text-2xl font-bold">$29.99</div>
                          <div className="text-green-600 text-sm">✅ In Stock</div>
                          <div className="text-xs text-gray-500">
                            FREE delivery tomorrow if you order within 4 hrs 23 mins
                          </div>

                          <div className="mt-2 flex flex-col gap-3">
                            <button className="w-full rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3">
                              Add to Cart
                            </button>
                            <button className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3">
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SHOPEE */}
                    {previewModal.platform === "shopee" && (
                      <div className="rounded-xl border overflow-hidden">
                        {/* fixed 16:10 area */}
                        <div className="aspect-[16/10] bg-gray-100">
                          {previewImg ? (
                            <img
                              src={previewImg}
                              alt="preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-5xl">✨</div>
                          )}
                        </div>

                        <div className="p-4 md:p-5 bg-white">
                          <div className="font-medium">Premium Product – AI Enhanced</div>
                          <div className="text-2xl font-bold text-orange-600 mt-1">$29.99</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            ⭐⭐⭐⭐⭐ <span>4.8 (234 reviews)</span>
                          </div>

                          <div className="mt-4 grid md:grid-cols-2 gap-3">
                            <button className="rounded-lg border py-2.5 hover:bg-gray-50">
                              Add to Cart
                            </button>
                            <button className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-2.5">
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INSTAGRAM */}
                    {previewModal.platform === "instagram" && (
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #f99 0%, #f09 30%, #90f 70%, #69f 100%)" }}
                      >
                        <div className="max-w-sm w-full mx-auto my-6 bg-white/90 rounded-xl overflow-hidden shadow-xl">
                          {/* header */}
                          <div className="flex items-center gap-2 px-4 py-3 border-b">
                            <div className="h-7 w-7 rounded-full bg-violet-500 text-white grid place-items-center text-xs font-bold">P</div>
                            <div className="text-sm font-medium">your_brand</div>
                          </div>

                          {/* fixed 4:5 image area */}
                          <div className="w-full aspect-[4/5] bg-gray-100">
                            {previewImg ? (
                              <img
                                src={previewImg}
                                alt="preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-5xl">✨</div>
                            )}
                          </div>

                          {/* actions */}
                          <div className="px-4 pt-3 pb-4">
                            <div className="flex items-center gap-4 text-xl mb-2">❤️ 💬 📨</div>
                            <div className="text-sm">
                              <span className="font-semibold">your_brand</span>{" "}
                              Check out our latest product! AI-enhanced and ready to shine ✨ #product #ai #enhanced
                            </div>
                            <div className="mt-3">
                              <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5">
                                Shop Now
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* footer */}
                  <div className="flex justify-end px-5 py-4 border-t">
                    <button
                      onClick={closePreview}
                      className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </main>
    </div>
  );
}