import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

/* ============================================
   🔌 Fake backend simulation — replace later
   Each function must resolve to a Blob.
============================================ */
async function apiRemoveBg(blob)                { await new Promise(r=>setTimeout(r,800)); return blob; }
async function apiAddShadow(blob)               { await new Promise(r=>setTimeout(r,600)); return blob; }
async function apiApplyBrand(blob, description) { await new Promise(r=>setTimeout(r,700)); return blob; }
async function apiCrop(blob, { width, height }) { await new Promise(r=>setTimeout(r,700)); return blob; }
async function apiCropServer(blob, { width, height, id }, viewport) {
  await new Promise(r => setTimeout(r, 600));
  return blob;
}

/* ============================================
   🧠 Fake AI description generator (replace later)
============================================ */
async function apiGenerateDescription(blob, tone = "default") {
  await new Promise(r => setTimeout(r, 850));
  const toneMap = {
    default: { title: "Premium Product", vibe: "clean, benefit-led copy" },
    luxury:  { title: "Luxury Edition", vibe: "elegant, refined tone" },
    minimal: { title: "Minimal Series", vibe: "simple, modern tone" },
    playful: { title: "Playful Pick",  vibe: "fun, friendly tone" },
    tech:    { title: "Pro Tech",      vibe: "spec-forward, precise tone" },
  };
  const t = toneMap[tone] || toneMap.default;
  return `${t.title} — crafted for everyday performance.\n\n• Key Benefits: durable build, smooth finish, easy to clean\n• Use Cases: home, studio, travel\n• Materials: premium-grade components\n• Care: wipe clean with a soft cloth\n\nWhy you'll love it: ${t.vibe} highlighting quality, versatility, and a polished presentation.\n\nSEO Tags: modern, premium, durable, versatile`;
}

/* =========================
   Small utilities
========================= */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
function getPoint(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}
function clampToCover(track, frameW, frameH) {
  const w = track.natW * track.scale;
  const h = track.natH * track.scale;
  const minX = Math.min(0, frameW - w);
  const maxX = Math.max(0, frameW - w);
  const minY = Math.min(0, frameH - h);
  const maxY = Math.max(0, frameH - h);
  if (track.x < minX) track.x = minX;
  if (track.x > maxX) track.x = maxX;
  if (track.y < minY) track.y = minY;
  if (track.y > maxY) track.y = maxY;
}
function toNormalizedViewport(track, frameW, frameH) {
  const x0 = (-track.x) / track.scale;
  const y0 = (-track.y) / track.scale;
  const wImg = frameW / track.scale;
  const hImg = frameH / track.scale;
  return {
    x: Math.max(0, x0 / track.natW),
    y: Math.max(0, y0 / track.natH),
    width: Math.min(1, wImg / track.natW),
    height: Math.min(1, hImg / track.natH),
  };
}

/* =========================
   Manual Cropper Component
========================= */
function InteractiveCropper({ cropper, setCropper, options, onClose }) {
  const opt = options.find(o => o.id === cropper.optId);
  const frameRef = useRef(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setFrameSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!frameSize.w || !frameSize.h) return;
    setCropper(prev => {
      const tracks = prev.tracks.map(t => {
        const sx = frameSize.w / t.natW;
        const sy = frameSize.h / t.natH;
        const cover = Math.max(sx, sy);
        const x = (frameSize.w - t.natW * cover) / 2;
        const y = (frameSize.h - t.natH * cover) / 2;
        return { ...t, scale: cover, x, y };
      });
      return { ...prev, tracks };
    });
  }, [frameSize.w, frameSize.h, setCropper]);

  const t = cropper.tracks[cropper.index];

  const startDrag = (e) => { e.preventDefault(); setCropper(prev => ({ ...prev, dragging: true, last: getPoint(e) })); };
  const moveDrag = (e) => {
    if (!cropper.dragging) return;
    const p = getPoint(e);
    const dx = p.x - cropper.last.x;
    const dy = p.y - cropper.last.y;
    setCropper(prev => {
      const tracks = prev.tracks.slice();
      const cur = { ...tracks[prev.index] };
      cur.x += dx; cur.y += dy;
      clampToCover(cur, frameSize.w, frameSize.h);
      tracks[prev.index] = cur;
      return { ...prev, tracks, last: p };
    });
  };
  const endDrag = () => setCropper(prev => ({ ...prev, dragging: false }));

  const wheelZoom = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = Math.exp(delta * 0.0012);
    setCropper(prev => {
      const tracks = prev.tracks.slice();
      const cur = { ...tracks[prev.index] };
      const cx = frameSize.w / 2, cy = frameSize.h / 2;

      const beforeW = cur.natW * cur.scale;
      const beforeH = cur.natH * cur.scale;

      cur.scale *= zoomFactor;

      const minScale = Math.max(frameSize.w / cur.natW, frameSize.h / cur.natH);
      if (cur.scale < minScale) cur.scale = minScale;

      const afterW = cur.natW * cur.scale;
      const afterH = cur.natH * cur.scale;

      cur.x = cx - (cx - cur.x) * (afterW / beforeW);
      cur.y = cy - (cy - cur.y) * (afterH / beforeH);

      clampToCover(cur, frameSize.w, frameSize.h);
      tracks[prev.index] = cur;
      return { ...prev, tracks };
    });
  };

  const downloadAll = async () => {
    if (!frameSize.w || !frameSize.h) return;
    const tasks = cropper.tracks.map(async (tr, i) => {
      const vp = toNormalizedViewport(tr, frameSize.w, frameSize.h);
      const out = await apiCropServer(tr.baseBlob, opt, vp);
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url; a.download = `cropped_${i + 1}_${opt.id}.png`; a.click();
      URL.revokeObjectURL(url);
    });
    await Promise.all(tasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-[141] h-full w-full grid place-items-center p-4">
        <div className="w-full max-w-3xl lux-panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--lux-border)]">
            <div className="font-semibold">Manual Crop – {opt.label} ({opt.width}×{opt.height})</div>
            <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center hover:bg-[rgba(255,255,255,.06)]" aria-label="Close">✖️</button>
          </div>

          <div className="p-5 md:p-6">
            <div
              ref={frameRef}
              className="relative mx-auto bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] rounded-xl overflow-hidden touch-none select-none"
              style={{ width: "100%", maxWidth: "720px", aspectRatio: `${opt.width} / ${opt.height}` }}
              onMouseDown={startDrag}
              onMouseMove={moveDrag}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              onTouchStart={startDrag}
              onTouchMove={moveDrag}
              onTouchEnd={endDrag}
              onWheel={wheelZoom}
            >
              {t && (
                <img
                  src={t.img.src}
                  alt="to-crop"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
                    transformOrigin: "top left",
                    width: `${t.natW}px`,
                    height: `${t.natH}px`,
                    willChange: "transform",
                    userSelect: "none",
                    pointerEvents: "none"
                  }}
                />
              )}
              <div className="absolute inset-0 ring-1 ring-black/20 pointer-events-none" />
            </div>

            {cropper.tracks.length > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setCropper(p => ({ ...p, index: Math.max(0, p.index - 1) }))}
                  disabled={cropper.index === 0}
                  className={`px-3 py-2 rounded-lg border border-[var(--lux-border)] ${cropper.index===0?"opacity-40 cursor-not-allowed":"hover:bg-[rgba(255,255,255,.06)]"}`}
                >
                  ◀ Prev
                </button>
                <div className="text-sm lux-subtle">Image {cropper.index + 1} of {cropper.tracks.length}</div>
                <button
                  onClick={() => setCropper(p => ({ ...p, index: Math.min(p.tracks.length - 1, p.index + 1) }))}
                  disabled={cropper.index >= cropper.tracks.length - 1}
                  className={`px-3 py-2 rounded-lg border border-[var(--lux-border)] ${cropper.index>=cropper.tracks.length-1?"opacity-40 cursor-not-allowed":"hover:bg-[rgba(255,255,255,.06)]"}`}
                >
                  Next ▶
                </button>
              </div>
            )}

            <p className="text-xs lux-subtle mt-3">
              Tip: drag to position. Use mouse wheel to zoom. Your server receives an exact viewport for {opt.width}×{opt.height}.
            </p>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--lux-border)]">
            <button onClick={onClose} className="lux-btn-ghost">Cancel</button>
            <button onClick={downloadAll} className="lux-btn">⬇️ Download Cropped</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main Page
========================= */
export default function ProcessingAdaptive() {
  /* ---------- core states ---------- */
  const [files, setFiles] = useState([]);        // original File[] (or Blobs)
  const [working, setWorking] = useState([]);    // [{ url, blob }] aligned with files (only accepted bg-removed)
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");

  /* ---------- steps ---------- */
  const [removeBg, setRemoveBg] = useState(false);
  const [addShadow, setAddShadow] = useState(false);
  const [brandKitChoice, setBrandKitChoice] = useState(null);
  const [brandText, setBrandText] = useState("");
  const [bgShadowOption, setBgShadowOption] = useState(null);

  /* ---------- smart crop ---------- */
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropper, setCropper] = useState(null);
  const CROP_OPTIONS = [
    { id: "amazon", label: "🛒 Amazon",    width: 2000, height: 2000 },
    { id: "shopee", label: "🛍️ Shopee",    width: 1080, height: 1080 },
    { id: "igpost", label: "📱 Instagram",  width: 1080, height: 1920 },
  ];

  /* ---------- NEW: Step 7 (Descriptions) ---------- */
  const [tone, setTone] = useState("default");
  const [descs, setDescs] = useState([]);
  const [descLoading, setDescLoading] = useState([]);
  const [descError, setDescError] = useState([]);

  const ensureDescArrays = (len) => {
    setDescs(Array.from({ length: len }, (_, i) => descs[i] || ""));
    setDescLoading(Array.from({ length: len }, (_, i) => descLoading[i] || false));
    setDescError(Array.from({ length: len }, (_, i) => descError[i] || ""));
  };

  const setDescAt = (i, text) =>
    setDescs((prev) => { const next = prev.slice(); next[i] = text; return next; });

  const setDescLoadingAt = (i, val) =>
    setDescLoading((prev) => { const next = prev.slice(); next[i] = val; return next; });

  const setDescErrorAt = (i, val) =>
    setDescError((prev) => { const next = prev.slice(); next[i] = val; return next; });

  async function generateDescFor(index) {
    if (!files.length) return alert("Please select image(s) first.");
    if (!allAccepted) return alert("Please Accept background removal for all images before continuing.");
    ensureDescArrays(files.length);
    try {
      setDescErrorAt(index, "");
      setDescLoadingAt(index, true);
      const base = (working[index]?.blob) || files[index];
      const text = await apiGenerateDescription(base, tone);
      setDescAt(index, text);
    } catch (e) {
      setDescErrorAt(index, e?.message || "Generation failed");
    } finally {
      setDescLoadingAt(index, false);
    }
  }

  async function generateDescForAll() {
    if (!files.length) return alert("Please select image(s) first.");
    if (!allAccepted) return alert("Please Accept background removal for all images before continuing.");
    ensureDescArrays(files.length);
    await Promise.all(files.map(async (_, i) => {
      try {
        setDescErrorAt(i, ""); setDescLoadingAt(i, true);
        const base = (working[i]?.blob) || files[i];
        const text = await apiGenerateDescription(base, tone);
        setDescAt(i, text);
      } catch (e) {
        setDescErrorAt(i, e?.message || "Generation failed");
      } finally {
        setDescLoadingAt(i, false);
      }
    }));
  }

  const copyCurrentDesc = async (i) => {
    const t = descs[i] || "";
    if (!t.trim()) return;
    try {
      await navigator.clipboard.writeText(t);
      setStatus("Copied ✓");
      setTimeout(() => setStatus(""), 900);
    } catch {
      alert("Could not copy. Please select and copy manually.");
    }
  };

  /* ---------- platform preview ---------- */
  const [previewModal, setPreviewModal] = useState({ open: false, platform: null, index: 0 });
  const openPreview  = (platform) => setPreviewModal({ open: true, platform, index: 0 });
  const closePreview = () => setPreviewModal({ open: false, platform: null, index: 0 });

  /* ---------- refs ---------- */
  const inputRef = useRef(null);

  /* ---------- derived ---------- */
  const isBatch = files.length > 1;

  // Original URLs for display
  const originalUrls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => { originalUrls.forEach(u => URL.revokeObjectURL(u)); }, [originalUrls]);

  // Helper available BEFORE any usage (e.g., openCropper, modal)
  const displayUrlAt = (i) => (working[i]?.url || originalUrls[i] || null);

  const firstPreview = useMemo(() => {
    if (!files.length) return null;
    return displayUrlAt(0);
  }, [files, working, originalUrls]);

  /* ---------- file picking ---------- */
  const [replaceIndex, setReplaceIndex] = useState(null);

  const pickFiles = () => inputRef.current?.click();

  const onChangeFiles = (e) => {
    const picked = Array.from(e.target.files || []);

    // Single replace inside modal
    if (replaceIndex != null && picked.length === 1) {
      const newFile = picked[0];

      setFiles(prev => { const next = prev.slice(); next[replaceIndex] = newFile; return next; });
      setWorking(prev => { const next = prev.slice(); if (next[replaceIndex]?.url) URL.revokeObjectURL(next[replaceIndex].url); next[replaceIndex] = undefined; return next; });

      (async () => {
        try {
          setBgReview(prev => {
            const cache = prev.cache.slice();
            cache[replaceIndex] = { ...(cache[replaceIndex] || {}), loading: true, error: null, url: null, blob: null, accepted: false };
            return { ...prev, cache };
          });

          const outBlob = await apiRemoveBg(newFile);
          const url = URL.createObjectURL(outBlob);

          setBgReview(prev => {
            const cache = prev.cache.slice();
            cache[replaceIndex] = { blob: outBlob, url, loading: false, error: null, accepted: false };
            return { ...prev, cache };
          });
        } catch (err) {
          setBgReview(prev => {
            const cache = prev.cache.slice();
            cache[replaceIndex] = { ...(cache[replaceIndex] || {}), loading: false, error: err?.message || "Processing failed", accepted: false };
            return { ...prev, cache };
          });
        } finally {
          setReplaceIndex(null);
        }
      })();

      e.target.value = "";
      return;
    }

    // Default: full replace
    setFiles(picked);
    // Revoke any working object URLs we created
    setWorking(prev => { prev?.forEach(x => x?.url && URL.revokeObjectURL(x.url)); return []; });
    setRemoveBg(false);
    setAddShadow(false);
    setBrandKitChoice(null);
    setSelectedCrop(null);
    setStatus("");
    setBgReview({ open: false, index: 0, cache: [] });

    // reset Step 7 caches
    setDescs([]); setDescLoading([]); setDescError([]);
    e.target.value = "";
  };

  /* ---------- REMOVE ONE IMAGE ---------- */
  function removeImageAt(idx) {
    if (idx < 0 || idx >= files.length) return;

    const w = working[idx];
    if (w?.url) URL.revokeObjectURL(w.url);

    const reviewItem = bgReview.cache?.[idx];
    if (reviewItem?.url) URL.revokeObjectURL(reviewItem.url);

    setFiles(prev => prev.filter((_, i) => i !== idx));
    setWorking(prev => prev.filter((_, i) => i !== idx));
    setDescs(prev => prev.filter((_, i) => i !== idx));
    setDescLoading(prev => prev.filter((_, i) => i !== idx));
    setDescError(prev => prev.filter((_, i) => i !== idx));

    setActiveIndex(prev => {
      if (prev > idx) return prev - 1;
      return Math.min(prev, Math.max(0, files.length - 2));
    });

    setReplaceIndex(prev => (prev === idx ? null : (prev != null && prev > idx ? prev - 1 : prev)));

    setBgReview(prev => {
      if (!prev.open) return prev;
      const nextCache = prev.cache.filter((_, i) => i !== idx);
      let nextIndex = prev.index;
      if (prev.index === idx) nextIndex = Math.min(idx, Math.max(0, nextCache.length - 1));
      else if (prev.index > idx) nextIndex = prev.index - 1;
      return { ...prev, cache: nextCache, index: nextIndex };
    });
  }

  /* ---------- blob helpers ---------- */
  const getBlobAt = async (i) => working[i]?.blob || files[i];
  const setWorkingAt = (i, blob) => {
    const url = URL.createObjectURL(blob);
    setWorking((prev) => {
      const next = prev.slice();
      if (next[i]?.url) URL.revokeObjectURL(next[i].url);
      next[i] = { url, blob };
      return next;
    });
  };

  /* ---------- all-accepted gate ---------- */
  const allAccepted = files.length > 0 && files.every((_, i) => Boolean(working[i]?.blob));

  /* ---------- generic runner ---------- */
  async function runStep(stepFn) {
    if (!files.length) return alert("Please select image(s) first.");
    if (!allAccepted) return alert("Please Accept background removal for all images before continuing.");
    setIsBusy(true); setStatus("Processing...");
    try {
      if (files.length === 1) {
        const out = await stepFn(await getBlobAt(0));
        setWorkingAt(0, out);
      } else {
        await Promise.all(files.map(async (_, i) => {
          const out = await stepFn(await getBlobAt(i));
          setWorkingAt(i, out);
        }));
      }
      setStatus("Done ✓");
    } catch (e) {
      console.error(e); setStatus("Failed");
    } finally {
      setIsBusy(false);
      setTimeout(() => setStatus(""), 900);
    }
  }

  /* ---------- step actions ---------- */
  const onAddShadow = async () => {
    if (!files.length) return alert("Please select image(s) first.");
    setAddShadow(true);
    await runStep(apiAddShadow);
  };
  const onNoShadow = () => setAddShadow(false);
  const onCreateBrandKit = async () => {
    if (!brandText.trim()) return alert("Describe your brand style first.");
    setBrandKitChoice("create");
    await runStep((blob) => apiApplyBrand(blob, brandText.trim()));
  };
  const onSkipBrandKit = () => setBrandKitChoice("skip");

  /* ---------- downloads ---------- */
  const downloadAll = () => {
    if (!files.length) return;
    const save = (blob, name) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    };
    if (files.length === 1) {
      const entry = working[0];
      save(entry?.blob || files[0], entry ? "processed.png" : (files[0].name || "original.png"));
    } else {
      files.forEach((f, i) => {
        const entry = working[i];
        save(entry?.blob || f, entry ? `processed_${i + 1}.png` : (f.name || `original_${i + 1}.png`));
      });
    }
  };

  async function downloadCropped() {
    if (!selectedCrop) return alert("Choose a crop option first.");
    if (!files.length) return alert("Pick image(s) first.");
    if (!allAccepted) return alert("Finish Step 1 (Accept all) first.");
    const opt = CROP_OPTIONS.find(o => o.id === selectedCrop);
    setIsCropping(true);
    try {
      if (files.length > 1) {
        await Promise.all(files.map(async (_, i) => {
          const base = working[i]?.blob || files[i];
          const out  = await apiCrop(base, opt);
          const url  = URL.createObjectURL(out);
          const a = document.createElement("a");
          a.href = url; a.download = `cropped_${i + 1}_${opt.id}.png`; a.click();
          URL.revokeObjectURL(url);
        }));
      } else {
        const base = working[0]?.blob || files[0];
        const out  = await apiCrop(base, opt);
        const url  = URL.createObjectURL(out);
        const a = document.createElement("a");
        a.href = url; a.download = `cropped_${opt.id}.png`; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsCropping(false);
    }
  }

  /* --- Manual crop: open & prepare tracks --- */
  const openCropper = async () => {
    if (!selectedCrop) return alert("Choose a crop option first.");
    if (!files.length) return alert("Pick image(s) first.");
    if (!allAccepted) return alert("Finish Step 1 (Accept all) first.");
    const opt = CROP_OPTIONS.find(o => o.id === selectedCrop);
    const urls = files.map((_, i) => displayUrlAt(i));
    const imgs = await Promise.all(urls.map(loadImage));
    const tracks = await Promise.all(imgs.map(async (img, i) => ({
      x: 0, y: 0, scale: 1,
      natW: img.naturalWidth, natH: img.naturalHeight,
      img,
      baseBlob: working[i]?.blob || files[i]
    })));
    setCropper({ open: true, index: 0, optId: opt.id, tracks, dragging: false, last: { x: 0, y: 0 } });
  };

  /* ======================================================
     STEP 1: Background Removal — Review Modal
  ======================================================= */
  const [bgReview, setBgReview] = useState({
    open: false,
    index: 0,
    cache: [], // [{ url, blob, loading, error, accepted }]
  });

  function findNextUnaccepted(cache, from = 0) {
    for (let i = from; i < cache.length; i++) {
      if (!cache[i]?.accepted) return i;
    }
    return -1;
  }

  async function openRemoveBgReview() {
    if (!files.length) return alert("Please select image(s) first.");
    setStatus("Removing backgrounds...");

    const results = await Promise.all(files.map(async (_, i) => {
      try {
        const base = files[i];
        const outBlob = await apiRemoveBg(base);
        const url = URL.createObjectURL(outBlob);
        return { blob: outBlob, url, loading: false, error: null, accepted: false };
      } catch (e) {
        return { blob: null, url: null, loading: false, error: e?.message || "Processing failed", accepted: false };
      }
    }));

    setBgReview({ open: true, index: 0, cache: results });
    setStatus("Done ✓"); setTimeout(() => setStatus(""), 900);
  }

  function cancelBgReview() {
    setBgReview(prev => {
      prev.cache?.forEach(entry => entry?.url && URL.revokeObjectURL(entry.url));
      return { open: false, index: 0, cache: [] };
    });
    setWorking([]);        // discard accepted outputs
    setRemoveBg(false);    // step 1 is undone
    setStatus("Background review canceled — changes discarded");
    setTimeout(() => setStatus(""), 1200);
  }

  function finishBgReview() {
    setBgReview(prev => {
      prev.cache?.forEach(entry => entry?.url && URL.revokeObjectURL(entry.url));
      return { open: false, index: 0, cache: [] };
    });
    setStatus("All images accepted ✓");
    setTimeout(() => setStatus(""), 900);
  }

  function acceptCurrentBg() {
    const i = bgReview.index;
    const entry = bgReview.cache[i];
    if (!entry?.blob) return;

    setBgReview(prev => {
      const cache = prev.cache.slice();
      cache[i] = { ...cache[i], accepted: true };
      return { ...prev, cache };
    });

    setWorkingAt(i, entry.blob);
    setRemoveBg(true);

    setBgReview(prev => {
      const nextIdx = findNextUnaccepted(prev.cache, i + 1);
      if (nextIdx === -1) {
        queueMicrotask(() => finishBgReview());
        return prev;
      }
      return { ...prev, index: nextIdx };
    });
  }

  const tryAgainCurrentBg = async () => {
    const i = bgReview.index;

    setBgReview(prev => {
      const cache = prev.cache.slice();
      cache[i] = { ...(cache[i] || {}), loading: true, error: null, accepted: false };
      return { ...prev, cache };
    });
    setWorking(prev => { const next = prev.slice(); if (next[i]?.url) URL.revokeObjectURL(next[i].url); next[i] = undefined; return next; });

    try {
      const base = files[i];
      const outBlob = await apiRemoveBg(base);
      const url = URL.createObjectURL(outBlob);

      setBgReview(prev => {
        const cache = prev.cache.slice();
        const old = cache[i];
        if (old?.url && old.url !== url) URL.revokeObjectURL(old.url);
        cache[i] = { blob: outBlob, url, loading: false, error: null, accepted: false };
        return { ...prev, cache };
      });
    } catch (e) {
      setBgReview(prev => {
        const cache = prev.cache.slice();
        cache[i] = { ...(cache[i] || {}), loading: false, error: e?.message || "Processing failed", accepted: false };
        return { ...prev, cache };
      });
    }
  };

  function retakeOrChangePhoto() {
    setReplaceIndex(bgReview.index);
    inputRef.current?.click();
  }

  const gotoPrevReview = () => {
    setBgReview(prev => {
      let j = prev.index - 1;
      while (j >= 0 && prev.cache[j]?.accepted) j--;
      return { ...prev, index: Math.max(0, j >= 0 ? j : 0) };
    });
  };
  const gotoNextReview = () => {
    setBgReview(prev => {
      let j = prev.index + 1;
      while (j < files.length && prev.cache[j]?.accepted) j++;
      return { ...prev, index: Math.min(files.length - 1, j) };
    });
  };

  /* ===========================
     Gallery helpers for Step 4
  ============================ */
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => { setActiveIndex(0); }, [files.length]);

  const downloadOne = (i) => {
    const entry = working[i];
    const blob = entry?.blob || files[i];
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = entry ? `processed_${i + 1}.png` : (files[i].name || `image_${i + 1}.png`);
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen flex flex-col lux-canvas text-[var(--lux-ink)]">
      {/* Header */}
      <header className="sticky top-0 z-30">
        <div className="lux-container py-3">
          <div className="lux-glass rounded-2xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,.08)] grid place-items-center">📷</div>
              <Link to="/" className="font-semibold tracking-tight">PhotoPro</Link>
            </div>
            <div className="text-xs lux-subtle">{status}</div>
          </div>
        </div>
        <div className="lux-sep" />
      </header>

      <main className="lux-container flex-1 py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-8 lux-title-glow">
          {isBatch ? `Batch Processing (${files.length})` : "Photo Processing"}
        </h1>

        {/* Upload Section */}
        <section className="lux-panel p-6 md:p-8 mb-8">
          {isBatch ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {files.map((f, i) => {
                const src = displayUrlAt(i);
                return (
                  <div key={i} className="relative rounded-xl bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] h-44 md:h-48 flex items-center justify-center p-2">
                    <img src={src} alt={`p${i}`} className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-600 text-white text-sm leading-none grid place-items-center shadow hover:brightness-110"
                      title="Remove this photo"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative rounded-xl bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] h-56 md:h-64 flex items-center justify-center mb-4 p-2">
              {firstPreview
                ? <img src={firstPreview} alt="preview" className="w-full h-full object-contain" />
                : <span className="lux-subtle">Image Preview</span>}
              {files.length === 1 && (
                <button
                  type="button"
                  onClick={() => removeImageAt(0)}
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-600 text-white text-sm leading-none grid place-items-center shadow hover:brightness-110"
                  title="Remove this photo"
                >
                  ×
                </button>
              )}
            </div>
          )}

          <div className="text-center">
            <button onClick={pickFiles} className="lux-btn">
              {files.length ? "Change File(s)" : "Select File(s)"}
            </button>
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={onChangeFiles} className="hidden" />
            {files.length > 0 && (
              <div className="mt-2 text-xs lux-subtle">
                Selected {files.length} file{files.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </section>

        {/* Step 1: Background Removal */}
        <section className="lux-panel mb-8 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-[var(--lux-border)] flex items-center gap-2"
               style={{ background: "linear-gradient(90deg, rgba(231,193,95,.10), transparent)" }}>
            <span className="text-xl">🧼</span>
            <div>
              <div className="font-semibold">Step 1: Background Removal</div>
              <p className="text-sm lux-subtle mt-0.5">
                Review each image. Accept to keep it. Try Again to reprocess. Retake to upload a replacement.
                Closing with ✖️ discards all progress.
              </p>
            </div>
          </div>
          <div className="p-6 md:p-8 flex flex-col items-center justify-center">
            <button
              onClick={openRemoveBgReview}
              disabled={!files.length}
              className={`relative group w-full max-w-sm rounded-2xl px-8 py-10 border-2 transition-all duration-300
                flex flex-col items-center justify-center font-semibold text-lg lux-hover
                ${!files.length ? "opacity-60 cursor-not-allowed bg-[rgba(255,255,255,.03)] text-[var(--lux-ink-dim)] border-[var(--lux-border)]"
                                 : "bg-[rgba(255,255,255,.04)] text-[var(--lux-ink)] border-[var(--lux-border)]"}`}
            >
              <div className="text-5xl mb-3">🪄</div>
              <span>Remove Backgrounds</span>
            </button>
            {!files.length && <p className="mt-4 text-sm lux-subtle italic">Please upload one or more images first.</p>}
          </div>
        </section>

        {/* Step 2 + 3 */}
        <section className="lux-panel mb-8">
          <div className="p-5 md:p-6 border-b border-[var(--lux-border)]"
               style={{ background: "linear-gradient(90deg, transparent, rgba(231,193,95,.10))" }}>
            <div className="font-semibold">Step 2 + 3: Background Generation + Shadow Options</div>
            <p className="text-sm lux-subtle mt-1">Choose how you want to combine background generation and shadow style.</p>
            {!allAccepted && files.length > 0 && (
              <p className="text-xs text-black-300/90 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1 mt-2 inline-block">
                Finish Step 1 (Accept all) to enable this step.
              </p>
            )}
          </div>

          <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setBgShadowOption("shadow-text")}
              disabled={!files.length || isBusy || !allAccepted}
              className={`rounded-xl border border-[var(--lux-border)] p-6 text-center transition lux-hover
                ${bgShadowOption === "shadow-text" ? "ring-2 ring-[var(--lux-gold)] bg-[rgba(255,255,255,.06)]" : "bg-[rgba(255,255,255,.03)]"} ${(isBusy || !allAccepted) ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <div className="text-3xl mb-2">🌤️</div>
              <div className="font-medium">Shadow + New Background Based on Text</div>
            </button>

            <button
              onClick={() => setBgShadowOption("no-shadow-text")}
              disabled={!files.length || isBusy || !allAccepted}
              className={`rounded-xl border border-[var(--lux-border)] p-6 text-center transition lux-hover
                ${bgShadowOption === "no-shadow-text" ? "ring-2 ring-[var(--lux-gold)] bg-[rgba(255,255,255,.06)]" : "bg-[rgba(255,255,255,.03)]"} ${(isBusy || !allAccepted) ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <div className="text-3xl mb-2">🎨</div>
              <div className="font-medium">No Shadow + New Background Based on Text</div>
            </button>

            <button
              onClick={async () => {
                setBgShadowOption("shadow-white");
                setAddShadow(true);
                await onAddShadow();
                setBrandKitChoice("white");
              }}
              disabled={!files.length || isBusy || !allAccepted}
              className={`rounded-xl border border-[var(--lux-border)] p-6 text-center transition lux-hover
                ${bgShadowOption === "shadow-white" ? "ring-2 ring-[var(--lux-gold)] bg-[rgba(255,255,255,.06)]" : "bg-[rgba(255,255,255,.03)]"} ${(isBusy || !allAccepted) ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <div className="text-3xl mb-2">⚪️</div>
              <div className="font-medium">Shadow + White Background</div>
            </button>

            <button
              onClick={() => {
                setBgShadowOption("skip");
                setAddShadow(false);
                setBrandKitChoice("skip");
              }}
              disabled={!files.length || isBusy || !allAccepted}
              className={`rounded-xl border border-[var(--lux-border)] p-6 text-center transition lux-hover
                ${bgShadowOption === "skip" ? "ring-2 ring-[var(--lux-gold)] bg-[rgba(255,255,255,.06)]" : "bg-[rgba(255,255,255,.03)]"} ${(isBusy || !allAccepted) ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <div className="text-3xl mb-2">⏭️</div>
              <div className="font-medium">Skip</div>
            </button>
          </div>
        </section>

        {/* Text-based background popup */}
        {(bgShadowOption === "shadow-text" || bgShadowOption === "no-shadow-text") && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setBgShadowOption(null)} />
            <div className="relative lux-panel w-[90%] max-w-md p-6">
              <h2 className="text-xl font-semibold mb-3">Describe Your Desired Background</h2>
              <p className="text-sm lux-subtle mb-4">Example: “minimalist wooden tabletop”, “bright pastel room”, “dark studio lighting”</p>
              <input
                type="text"
                value={brandText}
                onChange={(e) => setBrandText(e.target.value)}
                placeholder="Enter your background style..."
                className="lux-input mb-5"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setBgShadowOption(null)} className="lux-btn-ghost">Cancel</button>
                <button
                  onClick={async () => {
                    if (!brandText.trim()) return alert("Please describe your background first.");
                    if (bgShadowOption === "shadow-text") {
                      setAddShadow(true);
                      await onAddShadow();
                    } else {
                      setAddShadow(false);
                    }
                    await onCreateBrandKit();
                    setBgShadowOption(null);
                  }}
                  className="lux-btn"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Processing / Download (gallery) */}
        <section className="lux-panel mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold">Step 4: Processing your image{isBatch ? "s" : ""}!</div>
            {isBatch && files.length > 0 && (
              <p className="text-sm lux-subtle mt-1">Click a thumbnail below to preview another image.</p>
            )}
          </div>

          <div className="px-5 md:px-6">
            <div className="rounded-xl bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] h-64 md:h-80 flex items-center justify-center overflow-hidden p-2">
              {files.length ? (
                displayUrlAt(activeIndex) ? (
                  <img src={displayUrlAt(activeIndex)} alt={`result_${activeIndex + 1}`} className="w-full h-full object-contain" />
                ) : (
                  <span className="lux-subtle">Preparing preview…</span>
                )
              ) : (
                <span className="lux-subtle">AI-Enhanced Image</span>
              )}
            </div>
          </div>

          {isBatch && files.length > 0 && (
            <div className="px-5 md:px-6 mt-3">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {files.map((_, i) => {
                  const url = displayUrlAt(i);
                  const processed = Boolean(working[i]);
                  const selected = i === activeIndex;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className="shrink-0"
                      title={processed ? "Processed" : "Original"}
                    >
                      <div
                        className={[
                          "relative h-20 w-20 md:h-24 md:w-24 rounded-lg",
                          "border border-[var(--lux-border)] bg-[rgba(255,255,255,.04)] overflow-hidden",
                          selected ? "ring-2 ring-[var(--lux-gold)] ring-offset-2 ring-offset-[var(--lux-bg)]" : "hover:shadow-sm"
                        ].join(" ")}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={`thumb_${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center text-xs lux-subtle">…</span>
                        )}

                        <span
                          className={[
                            "absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded",
                            processed ? "bg-emerald-600 text-white" : "bg-[rgba(255,255,255,.6)] text-black/80"
                          ].join(" ")}
                        >
                          {processed ? "Processed" : "Original"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-5 md:px-6 py-5 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => downloadOne(activeIndex)}
              disabled={!files.length || isBusy}
              className="w-full sm:w-auto lux-btn disabled:opacity-60"
            >
              ⬇️ Download This
            </button>

            <button
              onClick={downloadAll}
              disabled={!files.length || isBusy}
              className="w-full sm:w-auto lux-btn disabled:opacity-60"
            >
              ⬇️ {isBatch ? "Download All" : "Download Image"}
            </button>
          </div>
        </section>

        {/* Step 5: Smart Crop */}
        <section className="lux-panel mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold">
              Step 5: Smart Crop for Platforms <span className="lux-subtle text-sm">(Optional)</span>
            </div>
            <p className="text-sm lux-subtle mt-1">
              Pick a preset, then either bulk-export or open the manual cropper to drag & center each image.
            </p>
            {!allAccepted && files.length > 0 && (
              <p className="text-xs text-black-300/90 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1 mt-2 inline-block">
                Finish Step 1 (Accept all) to enable this step.
              </p>
            )}
          </div>

          <div className="px-5 md:px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {CROP_OPTIONS.map(opt => {
              const active = selectedCrop === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedCrop(opt.id)}
                  className={`rounded-xl border border-[var(--lux-border)] p-4 text-center transition lux-hover
                    ${active ? "ring-2 ring-[var(--lux-gold)] bg-[rgba(255,255,255,.06)]" : "bg-[rgba(255,255,255,.03)]"}`}
                >
                  <div className="h-12 w-16 mx-auto rounded bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] mb-2" />
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs lux-subtle">{opt.width}×{opt.height}px</div>
                </button>
              );
            })}
          </div>

          <div className="px-5 md:px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadCropped}
              disabled={!selectedCrop || !files.length || isCropping || !allAccepted}
              className="lux-btn disabled:opacity-60"
            >
              {isCropping ? "Cropping..." : "⬇️ Download Cropped (Auto)"}
            </button>

            <button
              onClick={openCropper}
              disabled={!selectedCrop || !files.length || !allAccepted}
              className="lux-btn disabled:opacity-60"
            >
              ✂️ Open Manual Cropper
            </button>
          </div>
        </section>

        {/* Step 6: Platform Preview */}
        <section className="lux-panel mb-8">
          <div className="p-5 md:p-6">
            <div className="font-semibold mb-3">🛍 Step 6: Platform Preview</div>
            <p className="text-sm lux-subtle mb-4">See how your processed image could look on different platforms. Click to preview.</p>
            {!allAccepted && files.length > 0 && (
              <p className="text-xs text-black-300/90 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1 -mt-2 mb-2 inline-block">
                Finish Step 1 (Accept all) to enable this step.
              </p>
            )}

            <div className="grid md:grid-cols-3 gap-5">
              <button onClick={() => allAccepted && openPreview("amazon")} disabled={!allAccepted}
                className={`group rounded-2xl border border-[var(--lux-border)] transition lux-hover bg-[rgba(255,255,255,.03)] overflow-hidden text-left ${!allAccepted ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--lux-gold)]"}`}>
                <div className="h-44 bg-[rgba(255,255,255,.06)] grid place-items-center text-4xl">🛒</div>
                <div className="px-4 py-3">
                  <div className="font-medium">Amazon</div>
                  <div className="text-xs lux-subtle">Product listing layout</div>
                </div>
              </button>

              <button onClick={() => allAccepted && openPreview("shopee")} disabled={!allAccepted}
                className={`group rounded-2xl border border-[var(--lux-border)] transition lux-hover bg-[rgba(255,255,255,.03)] overflow-hidden text-left ${!allAccepted ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--lux-gold)]"}`}>
                <div className="h-44 bg-[rgba(255,255,255,.06)] grid place-items-center text-4xl">🛍️</div>
                <div className="px-4 py-3">
                  <div className="font-medium">Shopee</div>
                  <div className="text-xs lux-subtle">Mobile-first design</div>
                </div>
              </button>

              <button onClick={() => allAccepted && openPreview("instagram")} disabled={!allAccepted}
                className={`group rounded-2xl border border-[var(--lux-border)] transition lux-hover bg-[rgba(255,255,255,.03)] overflow-hidden text-left ${!allAccepted ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--lux-gold)]"}`}>
                <div className="h-44 bg-[rgba(255,255,255,.06)] grid place-items-center text-4xl">📸</div>
                <div className="px-4 py-3">
                  <div className="font-medium">Instagram</div>
                  <div className="text-xs lux-subtle">Social media posts</div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 🆕 Step 7: AI Product Description 
        {/*<section className="lux-panel mb-8 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-[var(--lux-border)]"
               style={{ background: "linear-gradient(90deg, rgba(231,193,95,.10), transparent)" }}>
            <div className="font-semibold">Step 7: AI Product Description</div>
            <p className="text-sm lux-subtle mt-1">
              Generate SEO-friendly, tone-controlled descriptions from your final image.
            </p>
            {!allAccepted && files.length > 0 && (
              <p className="text-xs text-black-300/90 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1 mt-2 inline-block">
                Finish Step 1 (Accept all) to enable this step.
              </p>
            )}
          </div>

          <div className="px-5 md:px-6 py-5 grid md:grid-cols-[1fr_1.2fr] gap-5">
            {/* Left: image + controls 
            <div>
              <div className="rounded-xl bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] h-56 md:h-64 flex items-center justify-center overflow-hidden p-2">
                {files.length ? (
                  displayUrlAt(activeIndex) ? (
                    <img src={displayUrlAt(activeIndex)} alt={`desc_${activeIndex+1}`} className="w-full h-full object-contain" />
                  ) : <span className="lux-subtle">Preparing preview…</span>
                ) : (
                  <span className="lux-subtle">Upload an image to generate text</span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="lux-input"
                  disabled={!files.length || !allAccepted}
                >
                  <option value="default">Tone: Default</option>
                  <option value="luxury">Tone: Luxury</option>
                  <option value="minimal">Tone: Minimal</option>
                  <option value="playful">Tone: Playful</option>
                  <option value="tech">Tone: Tech</option>
                </select>

                <div className="flex gap-3">
                  <button
                    onClick={() => generateDescFor(activeIndex)}
                    disabled={!files.length || descLoading[activeIndex] || !allAccepted}
                    className="lux-btn disabled:opacity-60 flex-1"
                  >
                    {descs[activeIndex] ? "🔁 Regenerate" : "✨ Generate"}
                  </button>
                  {isBatch && (
                    <button
                      onClick={generateDescForAll}
                      disabled={!files.length || descLoading.some(Boolean) || !allAccepted}
                      className="lux-btn disabled:opacity-60"
                    >
                      ✨ All
                    </button>
                  )}
                </div>
              </div>

              {isBatch && files.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {files.map((_, i) => {
                    const url = displayUrlAt(i);
                    const selected = i === activeIndex;
                    const hasDesc = !!descs[i];
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className="shrink-0"
                        title={hasDesc ? "Description ready" : "No description yet"}
                      >
                        <div
                          className={[
                            "relative h-16 w-16 rounded-lg",
                            "border border-[var(--lux-border)] bg-[rgba(255,255,255,.04)] overflow-hidden",
                            selected ? "ring-2 ring-[var(--lux-gold)] ring-offset-2 ring-offset-[var(--lux-bg)]" : "hover:shadow-sm"
                          ].join(" ")}
                        >
                          {url ? <img src={url} alt={`mini_${i+1}`} className="w-full h-full object-cover" /> : null}
                          <span className={[
                            "absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded",
                            hasDesc ? "bg-emerald-600 text-white" : "bg-[rgba(255,255,255,.6)] text-black/80"
                          ].join(" ")}>
                            {hasDesc ? "Ready" : "Empty"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: output editor 
            <div className="flex flex-col">
              <label className="text-sm lux-subtle mb-1">Generated Description</label>
              <div className="relative">
                <textarea
                  value={descs[activeIndex] || ""}
                  onChange={(e) => setDescAt(activeIndex, e.target.value)}
                  placeholder={descLoading[activeIndex] ? "Generating…" : "Click Generate to create a product description..."}
                  className="w-full min-h-[220px] rounded-xl border border-[var(--lux-border)] bg-[rgba(255,255,255,.03)] px-3 py-3 focus:ring-2 focus:ring-[var(--lux-gold)] outline-none"
                  disabled={!allAccepted}
                />
                {descLoading[activeIndex] && (
                  <div className="absolute inset-0 grid place-items-center bg-[rgba(0,0,0,.25)] rounded-xl">
                    <div className="animate-pulse">✨ Thinking…</div>
                  </div>
                )}
              </div>

              {descError[activeIndex] && (
                <div className="mt-2 text-sm text-red-400">{descError[activeIndex]}</div>
              )}

              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => copyCurrentDesc(activeIndex)}
                  disabled={!descs[activeIndex] || !allAccepted}
                  className="lux-btn-outline disabled:opacity-60"
                >
                  📋 Copy
                </button>

               {/*} <button
                  onClick={() => generateDescFor(activeIndex)}
                  disabled={!files.length || descLoading[activeIndex] || !allAccepted}
                  className="lux-btn disabled:opacity-60"
                >
                  🔁 Regenerate
                </button>*
              </div>

              <p className="mt-3 text-xs lux-subtle">
                Tip: Edit the text directly to fine-tune keywords or add dimensions, SKU, or warranty info before copying.
              </p>
            </div>
          </div>
        </section> */}
      </main>

      {/* Platform Preview Modal */}
      {previewModal.open && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50" onClick={closePreview} aria-hidden />
          <div className="relative z-[101] h-full w-full grid place-items-center p-4">
            <div className="relative w-full max-w-xl md:max-w-3xl lux-panel overflow-hidden max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--lux-border)]">
                <div className="font-semibold">
                  {previewModal.platform === "amazon"    && "Amazon Listing Preview"}
                  {previewModal.platform === "shopee"    && "Shopee Product Preview"}
                  {previewModal.platform === "instagram" && "Instagram Post Preview"}
                </div>
                <button onClick={closePreview} className="h-8 w-8 rounded-full grid place-items-center hover:bg-[rgba(255,255,255,.06)]" aria-label="Close">✖️</button>
              </div>

              <div className="p-5 md:p-6">
                {(() => {
                  const currentUrl = files.length ? displayUrlAt(previewModal.index) : null;

                  const ArrowControls = () => {
                    if (files.length <= 1) return null;
                    const canPrev = previewModal.index > 0;
                    const canNext = previewModal.index < files.length - 1;
                    return (
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <button
                          onClick={() => setPreviewModal(p => ({ ...p, index: Math.max(0, p.index - 1) }))}
                          disabled={!canPrev}
                          className={`px-3 py-1.5 rounded-lg border border-[var(--lux-border)] ${!canPrev ? "opacity-40 cursor-not-allowed" : "hover:bg-[rgba(255,255,255,.06)]"}`}
                        >◀ Prev</button>
                        <div className="text-xs lux-subtle">Image {previewModal.index + 1} of {files.length}</div>
                        <button
                          onClick={() => setPreviewModal(p => ({ ...p, index: Math.min(files.length - 1, p.index + 1) }))}
                          disabled={!canNext}
                          className={`px-3 py-1.5 rounded-lg border border-[var(--lux-border)] ${!canNext ? "opacity-40 cursor-not-allowed" : "hover:bg-[rgba(255,255,255,.06)]"}`}
                        >Next ▶</button>
                      </div>
                    );
                  };

                  return (
                    <>
                      {previewModal.platform === "amazon" && (
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <div className="aspect-square rounded-xl bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] overflow-hidden">
                              {currentUrl ? <img src={currentUrl} alt="prev" className="w-full h-full object-contain" /> : <div className="w-full h-full grid place-items-center text-5xl">✨</div>}
                            </div>
                            <ArrowControls />
                          </div>
                          <div className="flex flex-col gap-3">
                            <h3 className="text-xl font-semibold">Premium Product – AI Enhanced</h3>
                            <div className="text-2xl font-bold lux-gold-text">$29.99</div>
                            <div className="text-emerald-400 text-sm">✅ In Stock</div>
                            <div className="text-xs lux-subtle">FREE delivery tomorrow if you order within 4 hrs 23 mins</div>
                            <div className="mt-2 flex flex-col gap-3">
                              <button className="lux-btn-outline">Add to Cart</button>
                              <button className="lux-btn">Buy Now</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewModal.platform === "shopee" && (
                        <div className="rounded-xl border border-[var(--lux-border)] overflow-hidden">
                          <div className="aspect-[16/10] bg-[rgba(255,255,255,.06)]">
                            {currentUrl ? <img src={currentUrl} alt="prev" className="w-full h-full object-contain" /> : <div className="w-full h-full grid place-items-center text-5xl">✨</div>}
                          </div>
                          <div className="p-4 md:p-5">
                            <div className="font-medium">Premium Product – AI Enhanced</div>
                            <div className="text-2xl font-bold lux-gold-text mt-1">$29.99</div>
                            <div className="flex items-center gap-2 text-xs lux-subtle mt-1">⭐⭐⭐⭐⭐ <span>4.8 (234 reviews)</span></div>
                            <div className="mt-4 grid md:grid-cols-2 gap-3">
                              <button className="lux-btn-outline">Add to Cart</button>
                              <button className="lux-btn">Buy Now</button>
                            </div>
                            <ArrowControls />
                          </div>
                        </div>
                      )}

                      {previewModal.platform === "instagram" && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#f99 0%,#f09 30%,#90f 70%,#69f 100%)" }}>
                          <div className="max-w-sm w-full mx-auto my-6 lux-panel overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--lux-border)]">
                              <div className="h-7 w-7 rounded-full bg-[rgba(255,255,255,.12)] grid place-items-center text-xs font-bold">P</div>
                              <div className="text-sm font-medium">your_brand</div>
                            </div>
                            <div className="w-full aspect-[4/5] bg-[rgba(255,255,255,.06)] border-b border-[var(--lux-border)]">
                              {currentUrl ? <img src={currentUrl} alt="prev" className="w-full h-full object-contain" /> : <div className="w-full h-full grid place-items-center text-5xl">✨</div>}
                            </div>
                            <div className="px-4 pt-3 pb-4">
                              <div className="flex items-center gap-4 text-xl mb-2">❤️ 💬 📨</div>
                              <div className="text-sm"><span className="font-semibold">your_brand</span> Check out our latest product! ✨</div>
                              <div className="mt-3">
                                <button className="lux-btn w-full">Shop Now</button>
                              </div>
                              <ArrowControls />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end px-5 py-4 border-t border-[var(--lux-border)]">
                <button onClick={closePreview} className="lux-btn-ghost">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Removal Review Modal */}
      {bgReview.open && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/50" onClick={cancelBgReview} aria-hidden />
          <div className="relative z-[121] h-full w-full grid place-items-center p-4">
            <div className="w-full max-w-3xl lux-panel overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--lux-border)]">
                <div className="font-semibold">
                  Background Removal Review
                  <span className="ml-2 text-sm lux-subtle">({bgReview.index + 1} of {files.length})</span>
                </div>
                <button onClick={cancelBgReview} className="h-8 w-8 rounded-full grid place-items-center hover:bg-[rgba(255,255,255,.06)]" aria-label="Close">✖️</button>
              </div>

              <div className="p-5 md:p-6">
                <div className="grid grid-cols-[40px_1fr_40px] gap-3 items-center">
                  <button onClick={gotoPrevReview} disabled={bgReview.index === 0}
                          className={`h-10 w-10 rounded-full grid place-items-center border border-[var(--lux-border)] ${bgReview.index===0?"opacity-40 cursor-not-allowed":"hover:bg-[rgba(255,255,255,.06)]"}`} aria-label="Previous">◀</button>

                  <div className="w-full h-[60vh] min-h-[280px] rounded-xl bg-[rgba(255,255,255,.06)] border border-[var(--lux-border)] flex items-center justify-center p-2 relative">
                    {(() => {
                      const entry = bgReview.cache[bgReview.index];
                      if (!entry || entry.loading) return <div className="text-2xl lux-subtle animate-pulse">⏳ Processing…</div>;
                      if (entry.error) {
                        return (
                          <div className="p-4 text-center">
                            <div className="text-red-400 font-medium mb-1">Failed</div>
                            <div className="text-sm text-red-300/90">{entry.error}</div>
                            <button onClick={tryAgainCurrentBg} className="lux-btn mt-3 text-black">Try Again</button>
                          </div>
                        );
                      }
                      return (
                        <>
                          <img src={entry.url} alt="Processed preview" className="w-full h-full object-contain" />
                          {entry.accepted && (
                            <div className="absolute top-3 right-3 px-2 py-1 text-xs rounded bg-emerald-600 text-white">Accepted</div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <button onClick={gotoNextReview} disabled={bgReview.index >= files.length - 1}
                          className={`h-10 w-10 rounded-full grid place-items-center border border-[var(--lux-border)] ${bgReview.index>=files.length-1?"opacity-40 cursor-not-allowed":"hover:bg-[rgba(255,255,255,.06)]"}`} aria-label="Next">▶</button>
                </div>

                <p className="text-sm lux-subtle mt-4">Accept to keep this result. Or Try Again / Change the source.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-2 justify-end px-5 py-4 border-t border-[var(--lux-border)]">
                {bgReview.cache[bgReview.index]?.accepted ? (
                  <div className="flex items-center text-emerald-400 text-sm mr-auto">✅ Accepted</div>
                ) : null}

                <button onClick={tryAgainCurrentBg} className="lux-btn-outline">Try Again</button>
                <button onClick={retakeOrChangePhoto} className="lux-btn-outline">Change This Photo</button>

                {!bgReview.cache[bgReview.index]?.accepted && (
                  <button onClick={acceptCurrentBg} className="lux-btn">Accept</button>
                )}
                {bgReview.cache[bgReview.index]?.accepted && (
                  <button
                    onClick={() => {
                      const next = findNextUnaccepted(bgReview.cache, bgReview.index + 1);
                      if (next === -1) finishBgReview(); else setBgReview(p => ({ ...p, index: next }));
                    }}
                    className="lux-btn"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Cropper Modal (server-viewport) */}
      {cropper?.open && (
        <InteractiveCropper
          cropper={cropper}
          setCropper={setCropper}
          options={CROP_OPTIONS}
          onClose={() => setCropper(null)}
        />
      )}
    </div>
  );
}



