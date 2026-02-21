import { useEffect, useMemo, useState } from 'react'
import { studentsApi, type Student } from '../api/client'
import { showToast } from '../utils/toast'

export default function Certificates() {
  const [list, setList] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    studentsApi.list({ status: 'completed' })
      .then((r) => setList(r.data))
      .catch(() => setErr('Failed to load certificates'))
      .finally(() => setLoading(false))
  }, [])

  const notIssued = useMemo(() => list.filter((s) => !s.certificateIssued), [list])
  const issued = useMemo(() => list.filter((s) => s.certificateIssued), [list])

  async function setIssued(student: Student, value: boolean) {
    try {
      const { data } = await studentsApi.update(student._id, { certificateIssued: value } as never)
      setList((prev) => prev.map((x) => (x._id === student._id ? data : x)))
      showToast({ message: value ? 'Certificate marked as issued' : 'Certificate marked as not issued', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    }
  }

  function renderTable(items: Student[], actionLabel: string, actionValue: boolean) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-100 text-left text-sm text-slate-600">
            <tr>
              <th className="p-3">Roll No</th>
              <th className="p-3">Name</th>
              <th className="p-3">Course</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-medium">{s.rollNo || '-'}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3">{(s.courses || []).map((c) => c.name).join(', ') || '-'}</td>
                <td className="p-3">{(s.courses || []).map((c) => c.duration || '-').join(', ') || '-'}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => setIssued(s, actionValue)}
                    className={`px-3 py-1 rounded text-sm ${actionValue ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                  >
                    {actionLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-6 text-slate-500 text-center">No students</p>}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Certificates</h1>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Not Issued</h2>
          {renderTable(notIssued, 'Issued', true)}

          <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Issued</h2>
          {renderTable(issued, 'Not Issued', false)}
        </>
      )}
    </div>
  )
}
