import { ApiError } from '../api/client.js';

const BASE = '/api';

function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') sp.set(key, String(value));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadCsv(path, query) {
  const url = `${BASE}${path}${buildQuery(query)}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new ApiError('Could not reach the server. Is the backend running?');
  }

  if (!res.ok) {
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json().catch(() => null);
      const errBody = data && data.error ? data.error : {};
      throw new ApiError(errBody.message || `Export failed (${res.status})`, res.status);
    }
    throw new ApiError(`Export failed (${res.status})`, res.status);
  }

  const blob = await res.blob();
  const disp = res.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename\*?=(?:UTF-8''|")?([^";]+)"/i);
  const filename = m ? m[1] : path.split('/').pop();
  triggerDownload(blob, filename);
}