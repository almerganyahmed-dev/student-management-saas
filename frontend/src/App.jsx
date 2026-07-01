import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './lib/AuthContext'

const TAB_SHAPE = { clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%)' }

function Layout({ children }) {
  const { user, tenant, logout } = useAuth()
  const navigate = useNavigate()
  const tabs = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/students', label: 'Students' },
    { to: '/profile', label: 'Profile' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-chalk">
      <div className="bg-slate px-4 pt-3">
        <div className="mx-auto flex max-w-5xl items-end gap-1">
          <span className="mb-2 mr-2 hidden font-mono text-xs tracking-wider text-manila uppercase sm:inline">
            {tenant?.name ?? '…'}
          </span>
          {tabs.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={TAB_SHAPE}
              className={({ isActive }) =>
                `px-5 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-chalk text-slate'
                    : 'bg-manila-dark/80 text-chalk hover:bg-manila-dark'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="ml-auto mb-2 px-2 py-1 text-xs text-manila hover:text-chalk"
          >
            Sign out
          </button>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
