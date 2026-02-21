import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { saveFileWithAuth, studentsApi, type Student } from '../api/client'
import { showToast } from '../utils/toast'

function rollNoSortValue(rollNo?: string) {
  const normalized = String(rollNo || '').toUpperCase().replace(/^CA/, '')
  const numeric = Number.parseInt(normalized, 10)
  return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric
}

function sortStudentsByRollNoDesc(items: Student[]) {
  return [...items].sort((a, b) => {
    const n1 = rollNoSortValue(a.rollNo)
    const n2 = rollNoSortValue(b.rollNo)
    if (n1 !== n2) return n2 - n1
    return String(b.rollNo || '').localeCompare(String(a.rollNo || ''), undefined, { numeric: true, sensitivity: 'base' })
  })
}

export default function Students() {
  const PAGE_SIZE = 10
  const [list, setList] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [exporting, setExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    studentsApi.list({ search: search || undefined })
      .then((r) => {
        const sorted = sortStudentsByRollNoDesc(r.data)
        setList(sorted)
        setCurrentPage(1)
      })
      .catch(() => setErr('Failed to load'))
      .finally(() => setLoading(false))
  }, [search])

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pagedList = list.slice(startIndex, startIndex + PAGE_SIZE)

  async function remove(s: Student) {
    if (!confirm(`Delete "${s.name}"?`)) return
    try {
      await studentsApi.delete(s._id)
      setList((prev) => prev.filter((x) => x._id !== s._id))
      showToast({ message: 'Student deleted', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    }
  }

  function normalizeStatus(status?: string) {
    if (status === 'completed') return 'completed'
    if (status === 'drop_out' || status === 'inactive') return 'drop_out'
    return 'active'
  }

  async function updateStatus(s: Student, status: 'active' | 'completed' | 'drop_out') {
    try {
      const { data } = await studentsApi.update(s._id, { status } as never)
      setList((prev) => sortStudentsByRollNoDesc(prev.map((x) => (x._id === s._id ? data : x))))
      showToast({ message: 'Student status updated', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    }
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const q = new URLSearchParams()
      if (search.trim()) q.set('search', search.trim())
      const url = `/students/export/excel${q.toString() ? `?${q.toString()}` : ''}`
      await saveFileWithAuth(url, 'students-report.xlsx')
      showToast({ message: 'Students Excel exported', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message || 'Failed to export', type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Students</h1>
        <Link
          to="/students/new"
          title="Add Student"
          aria-label="Add Student"
          className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-slate-800 text-white hover:bg-slate-700 shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M3 18c0-3 2.7-5 6-5" />
            <path d="M18 16v6" />
            <path d="M15 19h6" />
          </svg>
          <span className="sr-only">Add Student</span>
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow p-4 mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting}
          title={exporting ? 'Exporting...' : 'Export Excel'}
          aria-label={exporting ? 'Exporting Excel' : 'Export Excel'}
          className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {exporting ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3.2-6.9" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          )}
          <span className="sr-only">{exporting ? 'Exporting Excel' : 'Export Excel'}</span>
        </button>
        <input
          type="search"
          placeholder="Search by roll no, name, mobile, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-lg border border-slate-300 rounded-lg px-3 py-2 md:ml-auto"
        />
      </div>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-100 text-left text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Qualification</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Admission</th>
                  <th className="px-4 py-3">Courses</th>
                  <th className="px-4 py-3">Total Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedList.map((s) => (
                  <tr key={s._id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-sm break-words">{s.rollNo ? s.rollNo.replace(/CA+$/i, '') : '-'}</td>
                    <td className="px-3 py-3 font-medium text-sm break-words">{s.name}</td>
                    <td className="px-3 py-3 text-sm break-words">{s.mobile}</td>
                    <td className="px-3 py-3 text-sm break-words">{s.qualification || '-'}</td>
                    <td className="px-3 py-3 text-sm capitalize">{s.mode || '-'}</td>
                    <td className="px-3 py-3 text-sm">{new Date(s.admissionDate).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-sm break-words">{(s.courses || []).map((c: { name: string }) => c.name).join(', ') || '-'}</td>
                    <td className="px-3 py-3 text-sm break-words">Rs {s.totalFees}</td>
                    <td className="px-4 py-3">
                      <select
                        value={normalizeStatus(s.status)}
                        onChange={(e) => updateStatus(s, e.target.value as 'active' | 'completed' | 'drop_out')}
                        className="w-[96px] border border-slate-300 rounded px-1.5 py-1 text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="drop_out">Drop Out</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          title="Actions"
                          aria-label="Actions"
                          onClick={() => setOpenActionsId((prev) => (prev === s._id ? null : s._id))}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          <span className="text-base leading-none">...</span>
                        </button>
                        {openActionsId === s._id && (
                          <>
                            <Link
                              to={`/students/${s._id}`}
                              title="Update"
                              onClick={() => setOpenActionsId(null)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                              <span className="sr-only">Update</span>
                            </Link>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => {
                                setOpenActionsId(null)
                                remove(s)
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                              <span className="sr-only">Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && <p className="p-6 text-slate-500 text-center">No students</p>}
          {list.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, list.length)} of {list.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-700">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
