import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { coursesApi } from '../api/client'
import { showToast } from '../utils/toast'

export default function CourseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', duration: '', fee: 0, description: '' })

  useEffect(() => {
    if (id) {
      coursesApi.get(id).then((r) => {
        setForm({
          name: r.data.name,
          duration: r.data.duration || '',
          fee: r.data.fee || 0,
          description: r.data.description || '',
        })
      }).catch(() => {}).finally(() => setLoading(false))
    } else setLoading(false)
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await coursesApi.create(form)
        showToast({ message: 'Course created', type: 'success' })
        navigate('/courses')
      } else {
        await coursesApi.update(id!, form)
        showToast({ message: 'Course updated', type: 'success' })
        navigate('/courses')
      }
    } catch (err: unknown) {
      showToast({
        message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/courses" className="text-slate-600 hover:underline">← Courses</Link>
        <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Add Course' : 'Edit Course'}</h1>
      </div>
      <form onSubmit={submit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
          <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 6 months" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fee (₹) *</label>
          <input type="number" min={0} required value={form.fee || ''} onChange={(e) => setForm((f) => ({ ...f, fee: Number(e.target.value) || 0 }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" rows={3} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving...' : isNew ? 'Add Course' : 'Update'}
          </button>
          <Link to="/courses" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
