import { useEffect, useMemo, useState } from 'react'
import { marksApi, studentsApi, type Mark, type Student } from '../api/client'
import Pagination from '../components/Pagination'
import { showToast } from '../utils/toast'

const SUBJECTS = ['Ms Word', 'Ms Excel', 'C', 'C++', 'Python', 'Java']
const ROW_OPTIONS = [10, 25, 50]

function normalizeRollNo(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function markStudentId(mark: Mark) {
  return typeof mark.studentId === 'string' ? mark.studentId : mark.studentId?._id || ''
}

export default function Marks() {
  const [students, setStudents] = useState<Student[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [rollNoInput, setRollNoInput] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [markValue, setMarkValue] = useState('')
  const [editId, setEditId] = useState('')
  const [editSubject, setEditSubject] = useState(SUBJECTS[0])
  const [editMarkValue, setEditMarkValue] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)

  async function refreshStudents() {
    try {
      const { data } = await studentsApi.list()
      setStudents(data)
    } catch {
      setStudents([])
    }
  }

  async function refreshMarks() {
    try {
      const { data } = await marksApi.list()
      setMarks(data)
    } catch {
      setMarks([])
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([refreshStudents(), refreshMarks()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [searchText, filterSubject, rowsPerPage])

  const studentsById = useMemo(
    () => new Map(students.map((student) => [student._id, student])),
    [students]
  )

  const selectedStudent = useMemo(() => {
    const normalized = normalizeRollNo(rollNoInput)
    if (!normalized) return null
    return students.find((student) => normalizeRollNo(student.rollNo || '') === normalized) || null
  }, [rollNoInput, students])

  const marksWithStudent = useMemo(() => (
    marks.map((mark) => {
      const student = studentsById.get(markStudentId(mark))
      return {
        ...mark,
        resolvedStudent: student || null,
      }
    }).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
  ), [marks, studentsById])

  const filteredMarks = useMemo(() => {
    const search = searchText.trim().toLowerCase()
    return marksWithStudent.filter((mark) => {
      const subjectOk = filterSubject === 'all' || mark.subject === filterSubject
      const studentName = (mark.resolvedStudent?.name || (typeof mark.studentId === 'object' ? mark.studentId?.name : '') || '').toLowerCase()
      const studentRollNo = (mark.resolvedStudent?.rollNo || '').toLowerCase()
      const searchOk = !search || (
        mark.subject.toLowerCase().includes(search) ||
        String(mark.marks).includes(search) ||
        studentName.includes(search) ||
        studentRollNo.includes(search)
      )
      return subjectOk && searchOk
    })
  }, [marksWithStudent, filterSubject, searchText])

  const totalPages = Math.max(1, Math.ceil(filteredMarks.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const paginatedMarks = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredMarks.slice(start, start + rowsPerPage)
  }, [filteredMarks, currentPage, rowsPerPage])

  const topScore = marks.length ? Math.max(...marks.map((mark) => Number(mark.marks) || 0)) : 0
  const averageScore = marks.length
    ? Math.round((marks.reduce((sum, mark) => sum + (Number(mark.marks) || 0), 0) / marks.length) * 10) / 10
    : 0

  function openCreate() {
    setRollNoInput('')
    setSubject(SUBJECTS[0])
    setMarkValue('')
    setShowForm(true)
  }

  function closeForm() {
    if ((rollNoInput || markValue) && !saving && !confirm('Discard unsaved changes?')) return
    setShowForm(false)
    setRollNoInput('')
    setSubject(SUBJECTS[0])
    setMarkValue('')
  }

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
      setShowForm(false)
      setRollNoInput('')
      setSubject(SUBJECTS[0])
      setMarkValue('')
      showToast({ message: 'Mark added', type: 'success' })
    } catch (err) {
      showToast({ message: (err as Error).message || 'Failed to save mark', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(mark: Mark) {
    setEditId(mark._id)
    setEditSubject(mark.subject)
    setEditMarkValue(String(mark.marks))
  }

  async function handleUpdate(id: string) {
    const parsed = Number(editMarkValue)
    if (!Number.isFinite(parsed)) {
      showToast({ message: 'Enter valid mark', type: 'error' })
      return
    }
    try {
      const { data } = await marksApi.update(id, { subject: editSubject, marks: parsed })
      setMarks((prev) => prev.map((mark) => (mark._id === id ? data : mark)))
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
      setMarks((prev) => prev.filter((mark) => mark._id !== id))
      showToast({ message: 'Mark deleted', type: 'success' })
    } catch (err) {
      showToast({ message: (err as Error).message || 'Failed to delete mark', type: 'error' })
    }
  }

  return (
    <div>
      <div className="surface-card p-4 md:p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Performance Hub</p>
            <h1 className="text-2xl font-bold text-slate-800">Marks</h1>
            <p className="text-sm text-slate-600 mt-1">Track subject-wise scores for all students from one list.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            title="Add Mark"
            aria-label="Add Mark"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] shadow-sm"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Total Entries</p>
            <p className="text-lg font-semibold text-slate-800">{marks.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Students Covered</p>
            <p className="text-lg font-semibold text-slate-800">{new Set(marks.map((mark) => markStudentId(mark))).size}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Top Score</p>
            <p className="text-lg font-semibold text-emerald-700">{topScore}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Average Score</p>
            <p className="text-lg font-semibold text-blue-700">{averageScore}</p>
          </div>
        </div>
      </div>

      <div className="surface-card p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search roll no, student, subject, mark"
          className="md:col-span-2 min-h-11 px-4 py-3"
        />
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="min-h-11 px-4 py-3"
        >
          <option value="all">All Subjects</option>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-slate-100/80 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Mark</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Loading...</td></tr>
              ) : paginatedMarks.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500 text-center" colSpan={6}>No marks found</td></tr>
              ) : (
                paginatedMarks.map((mark) => {
                  const student = mark.resolvedStudent
                  const fallbackName = typeof mark.studentId === 'object' ? mark.studentId?.name : ''
                  return (
                    <tr key={mark._id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">{student?.rollNo || '-'}</td>
                      <td className="px-4 py-3 text-sm">{student?.name || fallbackName || 'Student'}</td>
                      <td className="px-4 py-3 text-sm">
                        {editId === mark._id ? (
                          <select
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="rounded-lg px-2 py-1"
                          >
                            {SUBJECTS.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        ) : mark.subject}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editId === mark._id ? (
                          <input
                            value={editMarkValue}
                            onChange={(e) => setEditMarkValue(e.target.value)}
                            className="w-24 rounded-lg px-2 py-1"
                          />
                        ) : mark.marks}
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(mark.examDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editId === mark._id ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              title="Update"
                              onClick={() => handleUpdate(mark._id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              onClick={() => setEditId('')}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              title="Update"
                              onClick={() => startEdit(mark)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => handleDelete(mark._id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                                <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2H13a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 9.615 15H6.385a2 2 0 0 1-1.994-1.84L3.538 3H3a.5.5 0 0 1 0-1h3V1.5a.5.5 0 0 1 .5-.5" />
                                <path d="M7 2h2v-.5h-2zM4.537 3l.85 10.63a1 1 0 0 0 .998.87h3.23a1 1 0 0 0 .998-.87L11.463 3z" />
                                <path d="M6.5 5.5A.5.5 0 0 1 7 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 0A.5.5 0 0 1 10 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-600">
            Showing {filteredMarks.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            {' '}-{' '}
            {Math.min(currentPage * rowsPerPage, filteredMarks.length)} of {filteredMarks.length}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Rows</label>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="rounded-lg px-2 py-1"
            >
              {ROW_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="surface-card my-4 w-full max-w-2xl overflow-hidden p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Add Mark</h2>
                <p className="text-sm text-slate-500 mt-1">Enter a student roll number and record the latest mark.</p>
              </div>
              <button
                type="button"
                onClick={closeForm}
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

            <form onSubmit={handleAddMark} className="grid grid-cols-1 gap-4 overflow-visible md:grid-cols-2 max-h-none">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Roll No *</label>
                <input
                  value={rollNoInput}
                  onChange={(e) => setRollNoInput(e.target.value)}
                  placeholder="Enter roll no"
                  className="w-full min-h-11 px-4 py-3"
                />
                {rollNoInput.trim() && !selectedStudent && (
                  <p className="mt-1 text-xs text-red-600">Roll no not found in students list.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Student Name</label>
                <input
                  value={selectedStudent?.name || ''}
                  readOnly
                  tabIndex={-1}
                  onFocus={(e) => e.currentTarget.blur()}
                  className="w-full min-h-11 px-4 py-3 bg-slate-50 cursor-default caret-transparent"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Subject *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full min-h-11 px-4 py-3"
                >
                  {SUBJECTS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mark *</label>
                <input
                  value={markValue}
                  onChange={(e) => setMarkValue(e.target.value)}
                  placeholder="Enter mark"
                  className="w-full min-h-11 px-4 py-3"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
