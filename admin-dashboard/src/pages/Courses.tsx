import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { coursesApi, type Course } from '../api/client'
import { showToast } from '../utils/toast'

export default function Courses() {
  const [list, setList] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    coursesApi.list().then((r) => setList(r.data)).catch(() => setErr('Failed to load')).finally(() => setLoading(false))
  }, [])

  async function remove(c: Course) {
    if (!confirm(`Delete "${c.name}"?`)) return
    try {
      await coursesApi.delete(c._id)
      setList((prev) => prev.filter((x) => x._id !== c._id))
      showToast({ message: 'Course deleted', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Courses</h1>
        <Link to="/courses/new" className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700">
          Add Course
        </Link>
      </div>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Fee (₹)</th>
                <th className="p-3">Description</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.duration || '-'}</td>
                  <td className="p-3">{c.fee}</td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{c.description || '-'}</td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/courses/${c._id}`}
                        title="Update"
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
                        onClick={() => remove(c)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-6 text-slate-500 text-center">No courses</p>}
        </div>
      )}
    </div>
  )
}
