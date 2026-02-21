import { useEffect, useMemo, useState } from 'react'
import { marksApi, studentsApi, type Mark, type Student } from '../api/client'
import { showToast } from '../utils/toast'

const SUBJECTS = ['Ms Word', 'Ms Excel', 'C', 'C++', 'Python', 'Java']
const ROW_OPTIONS = [10, 25, 50]

export default function Marks() {
  const [students, setStudents] = useState<Student[]>([])
  const [rollNoInput, setRollNoInput] = useState('')
  const [marks, setMarks] = useState<Mark[]>([])
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [markValue, setMarkValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState('')
  const [editSubject, setEditSubject] = useState(SUBJECTS[0])
  const [editMarkValue, setEditMarkValue] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [viewMode, setViewMode] = useState<'recent' | 'all'>('recent')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [showList, setShowList] = useState(true)

  useEffect(() => {
    studentsApi.list().then((r) => setStudents(r.data)).catch(() => {})
  }, [])

  const selectedStudent = useMemo(() => {
    const val = rollNoInput.trim().toLowerCase()
    if (!val) return null
    return students.find((s) => String(s.rollNo || '').trim().toLowerCase() === val) || null
  }, [rollNoInput, students])

  useEffect(() => {
    if (!selectedStudent?._id) {
      setMarks([])
      return
    }
    setLoading(true)
    marksApi
      .list({ studentId: selectedStudent._id })
      .then((r) => setMarks(r.data))
      .catch(() => setMarks([]))
      .finally(() => setLoading(false))
  }, [selectedStudent?._id])

  useEffect(() => {
    setPage(1)
  }, [selectedStudent?._id, searchText, filterSubject, fromDate, toDate, viewMode, rowsPerPage])

  async function handleAddMark(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent?._id) {
      showToast({ message: 'Enter valid roll no', type: 'error' })
      return
    }
    const parsed = Number(markValue)
    if (!Number.isFinite(parsed)) {
      showToast({ message: 'Enter valid mark', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const { data } = await marksApi.create({
        studentId: selectedStudent._id,
        subject,
        marks: parsed,
      })
      setMarks((prev) => [data, ...prev])
      setMarkValue('')
      setViewMode('recent')
      setPage(1)
      showToast({ message: 'Mark added', type: 'success' })
    } catch (err) {
      showToast({ message: (err as Error).message || 'Failed to save mark', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(m: Mark) {
    setEditId(m._id)
    setEditSubject(m.subject)
    setEditMarkValue(String(m.marks))
  }

  async function handleUpdate(id: string) {
    const parsed = Number(editMarkValue)
    if (!Number.isFinite(parsed)) {
      showToast({ message: 'Enter valid mark', type: 'error' })
      return
    }
    try {
      const { data } = await marksApi.update(id, { subject: editSubject, marks: parsed })
      setMarks((prev) => prev.map((m) => (m._id === id ? data : m)))
      setEditId('')
      showToast({ message: 'Mark updated', type: 'success' })
    } catch (err) {
      showToast({ message: (err as Error).message || 'Failed to update mark', type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this mark?')) return
    try {
      await marksApi.delete(id)
      setMarks((prev) => prev.filter((m) => m._id !== id))
      showToast({ message: 'Mark deleted', type: 'success' })
    } catch (err) {
      showToast({ message: (err as Error).message || 'Failed to delete mark', type: 'error' })
    }
  }

  const sortedMarks = useMemo(
    () => [...marks].sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()),
    [marks]
  )

  const filteredMarks = useMemo(() => {
    const search = searchText.trim().toLowerCase()
    return sortedMarks.filter((m) => {
      const subjectOk = filterSubject === 'all' || m.subject === filterSubject
      const dateTs = new Date(m.examDate).getTime()
      const fromOk = !fromDate || dateTs >= new Date(`${fromDate}T00:00:00`).getTime()
      const toOk = !toDate || dateTs <= new Date(`${toDate}T23:59:59`).getTime()
      const searchOk = !search || m.subject.toLowerCase().includes(search) || String(m.marks).includes(search)
      return subjectOk && fromOk && toOk && searchOk
    })
  }, [sortedMarks, filterSubject, fromDate, toDate, searchText])

  const scopedMarks = useMemo(
    () => (viewMode === 'recent' ? filteredMarks.slice(0, 10) : filteredMarks),
    [filteredMarks, viewMode]
  )

  const totalPages = Math.max(1, Math.ceil(scopedMarks.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const paginatedMarks = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return scopedMarks.slice(start, start + rowsPerPage)
  }, [scopedMarks, currentPage, rowsPerPage])

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Marks</h1>

      <div className="bg-white rounded-lg border border-slate-200 shadow p-4 mb-6 max-w-2xl">
        <label className="block text-sm font-medium text-slate-700 mb-1">Roll No</label>
        <input
          value={rollNoInput}
          onChange={(e) => setRollNoInput(e.target.value)}
          placeholder="Enter roll no"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3"
        />

        <div className="mb-4">
          <p className="text-sm text-slate-500">Student Name</p>
          <p className="text-base font-semibold text-slate-800">
            {selectedStudent ? selectedStudent.name : rollNoInput.trim() ? 'Student not found' : '-'}
          </p>
        </div>

        <form onSubmit={handleAddMark} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mark</label>
            <input
              value={markValue}
              onChange={(e) => setMarkValue(e.target.value)}
              placeholder="Enter mark"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </form>
      </div>

      {selectedStudent && (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-slate-800">Marks List</h2>
            <button
              type="button"
              onClick={() => setShowList((prev) => !prev)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {showList ? 'Hide List' : 'Show List'}
            </button>
          </div>

          {showList && (
            <>
              <div className="p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search subject / mark"
                  className="md:col-span-2 border border-slate-300 rounded-lg px-3 py-2"
                />
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="all">All Subjects</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                />
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'recent' | 'all')}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="recent">Recent 10</option>
                  <option value="all">View All</option>
                </select>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 text-left text-sm text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Mark</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="p-4 text-slate-500" colSpan={4}>Loading...</td></tr>
                    ) : paginatedMarks.length === 0 ? (
                      <tr><td className="p-4 text-slate-500" colSpan={4}>No marks found</td></tr>
                    ) : (
                      paginatedMarks.map((m) => (
                        <tr key={m._id} className="border-t border-slate-200">
                          <td className="p-3">
                            {editId === m._id ? (
                              <select
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1"
                              >
                                {SUBJECTS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            ) : m.subject}
                          </td>
                          <td className="p-3">
                            {editId === m._id ? (
                              <input
                                value={editMarkValue}
                                onChange={(e) => setEditMarkValue(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 w-24"
                              />
                            ) : m.marks}
                          </td>
                          <td className="p-3">{new Date(m.examDate).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 space-x-3">
                            {editId === m._id ? (
                              <>
                                <button
                                  type="button"
                                  title="Update"
                                  onClick={() => handleUpdate(m._id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                  </svg>
                                  <span className="sr-only">Update</span>
                                </button>
                                <button
                                  type="button"
                                  title="Cancel"
                                  onClick={() => setEditId('')}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  <span className="sr-only">Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  title="Update"
                                  onClick={() => startEdit(m)}
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
                                  onClick={() => handleDelete(m._id)}
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-slate-600">
                  Showing {scopedMarks.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                  {' '}-{' '}
                  {Math.min(currentPage * rowsPerPage, scopedMarks.length)} of {scopedMarks.length}
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Rows</label>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-1"
                  >
                    {ROW_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-600">Page {currentPage}/{totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
