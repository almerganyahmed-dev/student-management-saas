const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
const TOKENS_KEY = "sms_tokens"

export function getTokens() {
  const raw = localStorage.getItem(TOKENS_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setTokens(tokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_KEY)
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed")
    this.status = status
    this.detail = detail
  }
}

async function rawRequest(path, options) {
  const tokens = getTokens()
  const headers = { "Content-Type": "application/json", ...options.headers }
  if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`
  return fetch(`${API_URL}${path}`, { ...options, headers })
}

async function refreshTokens() {
  const tokens = getTokens()
  if (!tokens?.refresh_token) return false
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  })
  if (!res.ok) return false
  setTokens(await res.json())
  return true
}

// Every call attaches the access token, retries once through a refresh on a
// 401 (access token expired but refresh token still valid), and clears
// stored tokens if that retry also fails so the app falls back to logged-out.
export async function apiFetch(path, options = {}) {
  let res = await rawRequest(path, options)

  if (res.status === 401 && getTokens()?.refresh_token) {
    if (await refreshTokens()) {
      res = await rawRequest(path, options)
    }
  }

  if (res.status === 204) return null

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) clearTokens()
    throw new ApiError(res.status, body?.detail ?? res.statusText)
  }

  return body
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, data) => apiFetch(path, { method: "POST", body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
}
