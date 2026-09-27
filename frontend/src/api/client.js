const BASE = '/api';

const EMPTY = {};

function buildQuery(params) {
  const q = params || EMPTY;
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, query, raw } = {}) {
  const url = `${BASE}${path}${buildQuery(query)}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError('Could not reach the server. Is the backend running?');
  }

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      const errBody = data && data.error ? data.error : {};
      throw new ApiError(
        errBody.message || `Request failed with status ${res.status}`,
        res.status,
        errBody.code,
        errBody.details
      );
    }
    const text = await res.text().catch(() => '');
    throw new ApiError(text || `Request failed with status ${res.status}`, res.status);
  }

  if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
    const blob = await res.blob();
    return { blob, filename: parseFilename(res) };
  }

  if (raw) {
    return res.text();
  }

  const data = await res.json().catch(() => null);
  return data;
}

function parseFilename(res) {
  const disp = res.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename\*?=(?:UTF-8''|")?([^";]+)"/i);
  if (m) return m[1];
  const m2 = disp.match(/filename="?([^";]+)"?/i);
  return m2 ? m2[1] : 'download.csv';
}

export const api = {
  get: (path, query) => request(path, { query }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};