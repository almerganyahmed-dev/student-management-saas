import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiFetch, ApiError, getTokens, setTokens } from "./api"

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = vi.fn()
})

describe("apiFetch", () => {
  it("attaches the access token to the request", async () => {
    setTokens({ access_token: "access-1", refresh_token: "refresh-1" })
    global.fetch.mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    await apiFetch("/students")

    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer access-1")
  })

  it("retries once through /auth/refresh on a 401, then succeeds", async () => {
    setTokens({ access_token: "expired", refresh_token: "refresh-1" })
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" })) // first call, expired token
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "fresh", refresh_token: "refresh-2" })) // refresh call
      .mockResolvedValueOnce(jsonResponse(200, { data: "ok" })) // retried original call

    const result = await apiFetch("/students")

    expect(result).toEqual({ data: "ok" })
    expect(getTokens().access_token).toBe("fresh")
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it("clears tokens and throws when the refresh itself fails", async () => {
    setTokens({ access_token: "expired", refresh_token: "stale" })
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "refresh also invalid" }))

    await expect(apiFetch("/students")).rejects.toThrow(ApiError)
    expect(getTokens()).toBeNull()
  })

  it("returns null for a 204 response", async () => {
    setTokens({ access_token: "access-1", refresh_token: "refresh-1" })
    global.fetch.mockResolvedValueOnce({ status: 204, ok: true })

    const result = await apiFetch("/students/123", { method: "DELETE" })
    expect(result).toBeNull()
  })

  it("throws an ApiError with the server's detail message on failure", async () => {
    setTokens({ access_token: "access-1", refresh_token: "refresh-1" })
    global.fetch.mockResolvedValueOnce(jsonResponse(409, { detail: "Email already in use for this tenant" }))

    await expect(apiFetch("/users", { method: "POST" })).rejects.toMatchObject({
      status: 409,
      detail: "Email already in use for this tenant",
    })
  })
})
