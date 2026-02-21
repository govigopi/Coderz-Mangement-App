import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import coderzLogo from '../assets/coderz-logo.svg'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-200">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <img src={coderzLogo} alt="Coderz Academy" className="h-16 w-auto mx-auto mb-3" />
        <p className="text-slate-500 text-center text-sm mb-6">Sign in to continue</p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'superadmin' | 'admin' | 'staff')}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 bg-white"
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
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4"
          required
        />
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Enter password"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-6"
          required
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-6">
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
          className="w-full bg-slate-800 text-white py-2 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

