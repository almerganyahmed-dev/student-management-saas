import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Login from "./Login"
import { useAuth } from "../lib/AuthContext"
import { ApiError } from "../lib/api"

const navigate = vi.fn()

vi.mock("../lib/AuthContext", () => ({ useAuth: vi.fn() }))
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => navigate }
})

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  navigate.mockClear()
})

describe("Login page", () => {
  it("submits the school code, email, and password to login()", async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    useAuth.mockReturnValue({ login })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/school code/i), "acme-school")
    await userEvent.type(screen.getByLabelText(/email/i), "admin@acmeschool.com")
    await userEvent.type(screen.getByLabelText(/password/i), "supersecret123")
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }))

    expect(login).toHaveBeenCalledWith({
      tenantSlug: "acme-school",
      email: "admin@acmeschool.com",
      password: "supersecret123",
    })
  })

  it("navigates to /dashboard after a successful login", async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    useAuth.mockReturnValue({ login })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/school code/i), "acme-school")
    await userEvent.type(screen.getByLabelText(/email/i), "admin@acmeschool.com")
    await userEvent.type(screen.getByLabelText(/password/i), "supersecret123")
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }))

    expect(navigate).toHaveBeenCalledWith("/dashboard")
  })

  it("shows the server's error message and does not navigate on failed login", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, "Invalid tenant, email, or password"))
    useAuth.mockReturnValue({ login })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/school code/i), "acme-school")
    await userEvent.type(screen.getByLabelText(/email/i), "admin@acmeschool.com")
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass")
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }))

    expect(await screen.findByText("Invalid tenant, email, or password")).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
