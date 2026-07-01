import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { api, clearTokens, getTokens, setTokens } from "./api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadCurrentUser = useCallback(async () => {
    if (!getTokens()?.access_token) {
      setUser(null)
      setTenant(null)
      setLoading(false)
      return
    }
    try {
      const [me, myTenant] = await Promise.all([api.get("/auth/me"), api.get("/tenants/me")])
      setUser(me)
      setTenant(myTenant)
    } catch {
      clearTokens()
      setUser(null)
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  async function login({ tenantSlug, email, password }) {
    const tokens = await api.post("/auth/login", { tenant_slug: tenantSlug, email, password })
    setTokens(tokens)
    await loadCurrentUser()
  }

  async function register({ tenantName, tenantSlug, adminEmail, adminPassword, adminFullName }) {
    const tokens = await api.post("/auth/register", {
      tenant_name: tenantName,
      tenant_slug: tenantSlug,
      admin_email: adminEmail,
      admin_password: adminPassword,
      admin_full_name: adminFullName,
    })
    setTokens(tokens)
    await loadCurrentUser()
  }

  function logout() {
    clearTokens()
    setUser(null)
    setTenant(null)
  }

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, logout, refresh: loadCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
