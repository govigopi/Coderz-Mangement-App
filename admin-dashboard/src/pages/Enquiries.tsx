import { useEffect, useState } from 'react'
import { coursesApi, enquiriesApi, type Enquiry } from '../api/client'
import { showToast } from '../utils/toast'

export default function Enquiries() {
  const [list, setList] = useState<Enquiry[]>([])
  const [courseNames, setCourseNames] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'joined' | 'not_joined'>('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Enquiry | null>(null)
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    course: '',
    qualification: '',
    description: '',
    status: 'not_joined' as 'joined' | 'not_joined',
  })

  useEffect(() => {
    setLoading(true)
    const params: { search?: string; status?: string } = {}
    if (search.trim()) params.search = search.trim()
    if (status !== 'all') params.status = status

    enquiriesApi.list(params)
      .then((r) => setList(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, status])

  useEffect(() => {
    coursesApi.list()
      .then((r) => {
        const names = Array.from(new Set(r.data.map((c) => c.name.trim()).filter(Boolean)))
        setCourseNames(names)
      })
      .catch(() => {
        setCourseNames([])
      })
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', phoneNumber: '', course: '', qualification: '', description: '', status: 'not_joined' })
    setShowForm(true)
  }

  function openEdit(e: Enquiry) {
    setEditing(e)
    setForm({
      name: e.name,
      phoneNumber: e.phoneNumber,
      course: e.course,
      qualification: e.qualification,
      description: e.description || '',
      status: e.status,
    })
    setShowForm(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        course: form.course.trim(),
        qualification: form.qualification.trim(),
        description: form.description.trim(),
        status: form.status,
      }

      if (editing) {
        const { data } = await enquiriesApi.update(editing._id, payload)
        setList((prev) => prev.map((x) => (x._id === data._id ? data : x)))
        showToast({ message: 'Enquiry updated', type: 'success' })
      } else {
        const { data } = await enquiriesApi.create(payload)
        setList((prev) => [data, ...prev])
        showToast({ message: 'Enquiry created', type: 'success' })
      }
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save enquiry'
      showToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(e: Enquiry) {
    if (!confirm(`Delete enquiry for "${e.name}"?`)) return
    try {
      await enquiriesApi.delete(e._id)
      setList((prev) => prev.filter((x) => x._id !== e._id))
      showToast({ message: 'Enquiry deleted', type: 'success' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete enquiry'
      showToast({ message: msg, type: 'error' })
    }
  }

  return (
    <div>
      <div className="surface-card p-4 md:p-5 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Lead Management</p>
            <h1 className="text-2xl font-bold text-slate-800">Enquiries</h1>
            <p className="text-sm text-slate-600 mt-1">Capture and convert incoming leads with status tracking.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-strong)]">
            Add Enquiry
          </button>
        </div>
      </div>

      <div className="surface-card p-4 flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, course, qualification, description"
          className="w-full max-w-xl px-3 py-2"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'joined' | 'not_joined')} className="px-3 py-2 min-w-[170px]">
          <option value="all">All</option>
          <option value="joined">Joined</option>
          <option value="not_joined">Not Joined</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full crm-table">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Course</th>
                <th className="p-3">Qualification</th>
                <th className="p-3">Description</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e._id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-medium">{e.name}</td>
                  <td className="p-3">{e.phoneNumber}</td>
                  <td className="p-3">{e.course}</td>
                  <td className="p-3">{e.qualification}</td>
                  <td className="p-3">{e.description || '-'}</td>
                  <td className="p-3">
                    <span className={`crm-pill ${e.status === 'joined' ? 'bg-[var(--ok-soft)] text-[#165e3f]' : 'bg-[var(--warn-soft)] text-[#705819]'}`}>
                      {e.status === 'joined' ? 'Joined' : 'Not Joined'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        title="Update"
                        onClick={() => openEdit(e)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                        <span className="sr-only">Update</span>
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => remove(e)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                          <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2H13a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 9.615 15H6.385a2 2 0 0 1-1.994-1.84L3.538 3H3a.5.5 0 0 1 0-1h3V1.5a.5.5 0 0 1 .5-.5" />
                          <path d="M7 2h2v-.5h-2zM4.537 3l.85 10.63a1 1 0 0 0 .998.87h3.23a1 1 0 0 0 .998-.87L11.463 3z" />
                          <path d="M6.5 5.5A.5.5 0 0 1 7 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 0A.5.5 0 0 1 10 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5" />
                        </svg>
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-6 text-slate-500 text-center">No enquiries</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="surface-card max-w-2xl w-full p-6 my-4 max-h-[calc(100dvh-2rem)] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Enquiry' : 'Add Enquiry'}</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                title="Close"
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4l8 8" />
                  <path d="M12 4 4 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input required value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
                <select
                  required
                  value={form.course}
                  onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">Select course</option>
                  {courseNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {courseNames.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">No courses found. Add courses in Course module first.</p>
                )}
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Qualification *</label>
                <input required value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Optional notes about this enquiry"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'joined' | 'not_joined' }))} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                  <option value="not_joined">Not Joined</option>
                  <option value="joined">Joined</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2 pt-2 sticky bottom-0 bg-white">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
