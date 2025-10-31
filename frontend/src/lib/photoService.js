import { api } from "./api";

function ensureLeadingSlash(path) {
  if (!path) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

function resolveBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE;
  const axiosBase = api.defaults?.baseURL;
  const base = envBase || axiosBase || "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export async function uploadOriginals(files, { batchId, step = "input" } = {}) {
  if (!files?.length) throw new Error("No files provided");
  const fd = new FormData();
  files.forEach((file) => fd.append("files", file));
  fd.append("step", step);
  if (batchId) fd.append("batch_id", batchId);
  const { data } = await api.post("/io/uploads", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removeBackgroundBatch({
  batchId,
  sourceStep = "input",
  filenames,
  size = "auto",
  bgColor,
  bgImageUrl,
  asZip = false,
  concurrent = 3,
}) {
  if (!batchId) throw new Error("batchId is required");
  if (!filenames?.length) throw new Error("filenames are required");
  const fd = new FormData();
  fd.append("batch_id", batchId);
  fd.append("source_step", sourceStep);
  fd.append("filenames", JSON.stringify(filenames));
  const params = new URLSearchParams();
  params.set("size", size);
  params.set("as_zip", asZip ? "1" : "0");
  params.set("concurrent", String(concurrent));
  if (bgColor) params.set("bg_color", bgColor);
  if (bgImageUrl) params.set("bg_image_url", bgImageUrl);
  const { data } = await api.post(`/remove-bg?${params.toString()}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function generateBackgrounds({
  batchId,
  sourceStep = "remove_bg",
  filenames,
  option,
  prompt,
  foreground,
  mask,
}) {
  if (!batchId) throw new Error("batchId is required");
  if (!filenames?.length && !foreground) {
    throw new Error("Provide filenames or a foreground upload");
  }
  const fd = new FormData();
  fd.append("option", String(option));
  fd.append("prompt", prompt);
  if (batchId) fd.append("batch_id", batchId);
  fd.append("source_step", sourceStep);
  if (filenames?.length) fd.append("filenames", JSON.stringify(filenames));
  if (foreground) fd.append("foreground", foreground);
  if (mask) fd.append("mask", mask);
  const { data } = await api.post("/text2image/generate", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function cropPresetBatch({
  batchId,
  sourceStep,
  filenames,
  preset,
  boxes,
  asZip = false,
}) {
  if (!batchId) throw new Error("batchId is required");
  if (!sourceStep) throw new Error("sourceStep is required");
  if (!filenames?.length) throw new Error("filenames are required");
  if (!preset) throw new Error("preset is required");
  const fd = new FormData();
  fd.append("batch_id", batchId);
  fd.append("source_step", sourceStep);
  fd.append("filenames", JSON.stringify(filenames));
  if (boxes && Object.keys(boxes).length) {
    fd.append("boxes", JSON.stringify(boxes));
  }
  const params = new URLSearchParams();
  params.set("preset", preset);
  params.set("as_zip", asZip ? "1" : "0");
  const responseType = asZip ? "blob" : "json";
  const { data } = await api.post(`/crop/custom?${params.toString()}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType,
  });
  return data;
}

export async function fetchImageBlob(publicUrl) {
  if (!publicUrl) throw new Error("publicUrl is required");
  const { data } = await api.get(publicUrl, { responseType: "blob" });
  return data;
}

export function buildDownloadUrl(pathOrFullUrl) {
  if (!pathOrFullUrl) return pathOrFullUrl;
  if (/^https?:\/\//i.test(pathOrFullUrl)) return pathOrFullUrl;
  const base = resolveBaseUrl();
  return `${base}${ensureLeadingSlash(pathOrFullUrl)}`;
}
