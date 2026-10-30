// Anonymous per-browser ID used to scope saved chat history.
export function getClientId() {
  let id = localStorage.getItem("darkgpt:clientId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("darkgpt:clientId", id);
  }
  return id;
}

export async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function renderMarkdown(text) {
  const html = window.marked ? window.marked.parse(text) : escapeHtml(text);
  return window.DOMPurify ? window.DOMPurify.sanitize(html) : escapeHtml(text);
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
