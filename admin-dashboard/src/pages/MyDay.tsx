import { useEffect, useMemo, useState } from 'react'
import { staffActivitiesApi, type StaffActivity, type StaffActivityStatus, type StaffActivityType } from '../api/client'
import { showToast } from '../utils/toast'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const typeOptions: Array<{ value: StaffActivityType; label: string }> = [
  { value: 'call', label: 'Call' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'admission', label: 'Admission' },
  { value: 'fee_collection', label: 'Fee Collection' },
  { value: 'class_support', label: 'Class Support' },
  { value: 'other', label: 'Other' },
]

const statusOptions: StaffActivityStatus[] = ['pending', 'completed']

export default function MyDay() {
  const [list, setList] = useState<StaffActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(today())
  const [statusFilter, setStatusFilter] = useState<StaffActivityStatus | ''>('')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    activityDate: today(),
    type: 'follow_up' as StaffActivityType,
    title: '',
    studentName: '',
    notes: '',
    status: 'pending' as StaffActivityStatus,
  })

  useEffect(() => {
    setLoading(true)
    staffActivitiesApi.me({
      date: dateFilter || undefined,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
    })
      .then((r) => setList(r.data))
      .catch(() => showToast({ message: 'Failed to load your activities', type: 'error' }))
      .finally(() => setLoading(false))
  }, [dateFilter, search, statusFilter])

  const counts = useMemo(() => {
    const completed = list.filter((x) => x.status === 'completed').length
    return { total: list.length, completed, pending: list.length - completed }
  }, [list])

  function resetForm() {
    setEditId(null)
    setForm({
      activityDate: today(),
      type: 'follow_up',
      title: '',
      studentName: '',
      notes: '',
      status: 'pending',
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      showToast({ message: 'Title is required', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        activityDate: form.activityDate,
        type: form.type,
        title: form.title.trim(),
        studentName: form.studentName.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      }

      if (editId) {
        const { data } = await staffActivitiesApi.update(editId, payload)
        setList((prev) => prev.map((x) => (x._id === editId ? data : x)))
        showToast({ message: 'Activity updated', type: 'success' })
      } else {
        const { data } = await staffActivitiesApi.create(payload)
        setList((prev) => [data, ...prev])
        showToast({ message: 'Activity added', type: 'success' })
      }
      resetForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save activity'
      showToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: StaffActivity) {
    setEditId(item._id)
    setForm({
      activityDate: String(item.activityDate).slice(0, 10),
      type: item.type,
      title: item.title,
      studentName: item.studentName || '',
      notes: item.notes || '',
      status: item.status,
    })
  }

  async function remove(item: StaffActivity) {
    if (!confirm('Delete this activity?')) return
    try {
      await staffActivitiesApi.delete(item._id)
      setList((prev) => prev.filter((x) => x._id !== item._id))
      showToast({ message: 'Activity deleted', type: 'success' })
      if (editId === item._id) resetForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete activity'
      showToast({ message: msg, type: 'error' })
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Day Activity</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-xl font-semibold text-slate-800">{counts.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-xl font-semibold text-green-700">{counts.completed}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-xl font-semibold text-amber-700">{counts.pending}</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-lg shadow border border-slate-200 p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-slate-800">{editId ? 'Edit Activity' : 'Add Activity'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" value={form.activityDate} onChange={(e) => setForm((f) => ({ ...f, activityDate: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" />
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as StaffActivityType }))} className="border border-slate-300 rounded-lg px-3 py-2">
            {typeOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
          <input value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} placeholder="Student Name (optional)" className="border border-slate-300 rounded-lg px-3 py-2" />
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StaffActivityStatus }))} className="border border-slate-300 rounded-lg px-3 py-2">
            {statusOptions.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title *" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        <div className="flex gap-2">
          <button disabled={saving} type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving...' : editId ? 'Update' : 'Add'}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StaffActivityStatus | '')} className="border border-slate-300 rounded-lg px-3 py-2">
          <option value="">All Status</option>
          {statusOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title / notes / student" className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2" />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Title</th>
                <th className="p-3">Student</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item._id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3">{String(item.activityDate).slice(0, 10)}</td>
                  <td className="p-3">{item.type}</td>
                  <td className="p-3 font-medium">
                    <div>{item.title}</div>
                    {item.notes && <div className="text-xs text-slate-500 mt-1">{item.notes}</div>}
                  </td>
                  <td className="p-3">{item.studentName || '-'}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">
                    <div className="inline-flex gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="px-2 py-1 border border-slate-300 rounded text-sm hover:bg-slate-100">Edit</button>
                      <button type="button" onClick={() => remove(item)} className="px-2 py-1 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-6 text-slate-500 text-center">No activities found</p>}
        </div>
      )}
    </div>
  )
}
