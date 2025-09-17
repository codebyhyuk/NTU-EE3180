import { api } from "./api";

/** Upload an image (multipart) */
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);               // <-- backend expects field name 'file'
  const { data } = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // e.g. { fileId, url }
  return data;
}

/** Start processing (e.g., background removal + options) */
export async function startProcessing({ fileId, removeBg, brandText, shadow }) {
  const { data } = await api.post("/process/single", {
    fileId,
    options: { removeBackground: removeBg, brandText, shadow },
  });
  // e.g. { jobId }
  return data;
}

/** Poll job status */
export async function getJobStatus(jobId) {
  const { data } = await api.get(`/process/${jobId}/status`);
  // e.g. { status: 'processing'|'done'|'failed', progress, variants: [...] }
  return data;
}

/** Smart crop (optional) */
export async function smartCrop({ jobId, variantId, preset }) {
  const { data } = await api.post("/crop/smart", { jobId, variantId, preset });
  // e.g. { width, height, previewUrl, downloadUrl, contrastOk }
  return data;
}

/** Build a download URL for a variant/crop the backend returns */
export function buildDownloadUrl(pathOrFullUrl) {
  // If backend returns a full URL, just return it. If it returns a path, prefix with baseURL.
  if (/^https?:\/\//i.test(pathOrFullUrl)) return pathOrFullUrl;
  return `${import.meta.env.VITE_API_BASE}${pathOrFullUrl}`;
}
