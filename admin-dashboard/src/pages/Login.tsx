import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import coderzLogo from '../assets/coderz-logo-white.svg'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'superadmin' | 'admin' | 'staff'>('superadmin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password, role, rememberMe)
      navigate('/')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number }; message?: string; code?: string }
      if (e.response?.data?.error) {
        setError(e.response.data.error)
      } else if (e.code === 'ERR_NETWORK' || !e.response) {
        setError('Cannot reach server. Is the backend running at http://localhost:5000?')
      } else {
        setError(e.message || 'Login failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-[100dvh] flex items-center justify-center px-4 py-3 overflow-hidden">
      <form onSubmit={handleSubmit} className="surface-card fade-in-up w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-hidden p-6 md:p-6">
        <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-4 mb-5 text-white">
          <img src={coderzLogo} alt="Coderz Academy" className="h-14 w-auto mb-2 mx-auto" />
          <h1 className="text-xl font-semibold text-center">Sign in to continue</h1>
        </div>
        {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4">{error}</p>}
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'superadmin' | 'admin' | 'staff')}
          className="w-full px-3 py-2 mb-3 bg-white"
        >
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="you@example.com"
          className="w-full px-3 py-2 mb-3"
          required
        />
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Enter password"
          className="w-full px-3 py-2 mb-4"
          required
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white py-2.5 rounded-xl font-medium hover:from-teal-800 hover:to-cyan-800 disabled:opacity-50 shadow-sm"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

