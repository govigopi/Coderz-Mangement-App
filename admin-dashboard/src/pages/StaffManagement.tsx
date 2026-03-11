import { useEffect, useState } from 'react'
import { auth, type User } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../utils/toast'

export default function StaffManagement() {
  const { user } = useAuth()
  const canManageStaff = user?.role === 'admin' || user?.role === 'superadmin'
  const [staff, setStaff] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
  })

  async function loadStaff() {
    setLoading(true)
    try {
      const { data } = await auth.listManagedUsers()
      setStaff(data)
    } catch {
      showToast({ message: 'Failed to load staff users', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManageStaff) {
      loadStaff()
    }
  }, [canManageStaff])

  function resetForm() {
    setEditingId(null)
    setForm({ name: '', email: '', password: '', role: 'staff' })
  }

  function startEdit(s: User) {
    setEditingId(s.id)
    setForm({
      name: s.name,
      email: s.email,
      password: '',
      role: s.role === 'admin' ? 'admin' : 'staff',
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      showToast({ message: 'Name and email are required', type: 'error' })
      return
    }
    if (!editingId && !form.password.trim()) {
      showToast({ message: 'Password is required for new staff user', type: 'error' })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const { data } = await auth.updateManagedUser(editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim() || undefined,
          role: form.role,
        })
        setStaff((prev) => prev.map((x) => (x.id === data.id ? data : x)))
        showToast({ message: 'User updated', type: 'success' })
      } else {
        const { data } = await auth.registerUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
        setStaff((prev) => [data.user, ...prev])
        showToast({ message: 'User created', type: 'success' })
      }
      resetForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (editingId ? 'Failed to update staff user' : 'Failed to create staff user')
      showToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function removeStaff(s: User) {
    if (!confirm(`Delete ${s.role} user "${s.name}"?`)) return
    try {
      await auth.deleteManagedUser(s.id)
      setStaff((prev) => prev.filter((x) => x.id !== s.id))
      if (editingId === s.id) resetForm()
      showToast({ message: 'User deleted', type: 'success' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete staff user'
      showToast({ message: msg, type: 'error' })
    }
  }

  if (!canManageStaff) {
    return <p className="text-red-600">Only owner/admin can access Staff Management.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Staff Management</h1>

      <form onSubmit={submit} className="bg-white rounded-lg shadow border border-slate-200 p-4 mb-6 space-y-3 max-w-2xl">
        <h2 className="font-semibold text-slate-800">{editingId ? 'Edit User' : 'Create User'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name"
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={editingId ? 'New Password (optional)' : 'Password'}
            className="border border-slate-300 rounded-lg px-3 py-2"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            {user?.role === 'superadmin' && <option value="admin">Admin</option>}
            <option value="staff">Staff</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update User' : 'Create User')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">{s.role}</td>
                  <td className="p-3">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-sm hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStaff(s)}
                        title="Delete"
                        aria-label="Delete"
                        className="inline-flex items-center justify-center w-8 h-8 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                      >
                        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                          <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2H13a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 9.615 15H6.385a2 2 0 0 1-1.994-1.84L3.538 3H3a.5.5 0 0 1 0-1h3V1.5a.5.5 0 0 1 .5-.5" />
                          <path d="M7 2h2v-.5h-2zM4.537 3l.85 10.63a1 1 0 0 0 .998.87h3.23a1 1 0 0 0 .998-.87L11.463 3z" />
                          <path d="M6.5 5.5A.5.5 0 0 1 7 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 0A.5.5 0 0 1 10 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && <p className="p-6 text-slate-500 text-center">No users</p>}
        </div>
      )}
    </div>
  )
}

