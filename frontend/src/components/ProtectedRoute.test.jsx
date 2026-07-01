import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import ProtectedRoute from "./ProtectedRoute"
import { useAuth } from "../lib/AuthContext"

vi.mock("../lib/AuthContext", () => ({ useAuth: vi.fn() }))

function renderAt(initialPath, roles) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute roles={roles}>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  it("renders nothing while auth state is loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true })
    renderAt("/protected")
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument()
    expect(screen.queryByText("Login page")).not.toBeInTheDocument()
  })

  it("redirects to /login when there is no user", () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderAt("/protected")
    expect(screen.getByText("Login page")).toBeInTheDocument()
  })

  it("renders children when a user is present and no role restriction applies", () => {
    useAuth.mockReturnValue({ user: { role: "teacher" }, loading: false })
    renderAt("/protected")
    expect(screen.getByText("Secret content")).toBeInTheDocument()
  })

  it("redirects to /dashboard when the user's role isn't in the allowlist", () => {
    useAuth.mockReturnValue({ user: { role: "teacher" }, loading: false })
    renderAt("/protected", ["admin"])
    expect(screen.getByText("Dashboard page")).toBeInTheDocument()
  })

  it("renders children when the user's role is in the allowlist", () => {
    useAuth.mockReturnValue({ user: { role: "admin" }, loading: false })
    renderAt("/protected", ["admin"])
    expect(screen.getByText("Secret content")).toBeInTheDocument()
  })
})
