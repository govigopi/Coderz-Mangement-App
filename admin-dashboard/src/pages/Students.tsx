import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { coursesApi, saveFileWithAuth, studentsApi, type Course, type Student } from '../api/client'
import Pagination from '../components/Pagination'
import { showToast } from '../utils/toast'

type Mode = 'online' | 'offline'
type StudentStatus = 'active' | 'completed' | 'drop_out'
const ROLL_NO_START = 479
type StudentFormState = {
  rollNo: string
  name: string
  mobile: string
  gender: 'male' | 'female' | ''
  email: string
  qualification: string
  dateOfBirth: string
  mode: Mode
  guardianName: string
  guardianMobile: string
  address: string
  admissionDate: string
  selectedCourseId: string
  courses: string[]
  courseFee: number
  totalFees: number
  status: StudentStatus
}

function rollNoSortValue(rollNo?: string) {
  const normalized = String(rollNo || '').toUpperCase().replace(/^CA/, '')
  const numeric = Number.parseInt(normalized, 10)
  return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric
}

function nextAutoRollNo(items: Student[]) {
  const maxExisting = items.reduce((max, student) => {
    const numeric = Number.parseInt(String(student.rollNo || '').toUpperCase().replace(/^CA/, ''), 10)
    return Number.isNaN(numeric) ? max : Math.max(max, numeric)
  }, ROLL_NO_START - 1)

  return String(Math.max(ROLL_NO_START, maxExisting + 1))
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
  const location = useLocation()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const PAGE_SIZE = 10
  const [list, setList] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [exporting, setExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [initialForm, setInitialForm] = useState<StudentFormState>({
    rollNo: '',
    name: '',
    mobile: '',
    gender: '',
    email: '',
    qualification: '',
    dateOfBirth: '',
    mode: 'offline' as Mode,
    guardianName: '',
    guardianMobile: '',
    address: '',
    admissionDate: today,
    selectedCourseId: '',
    courses: [] as string[],
    courseFee: 0,
    totalFees: 0,
    status: 'active' as StudentStatus,
  })
  const [form, setForm] = useState<StudentFormState>({
    rollNo: '',
    name: '',
    mobile: '',
    gender: '',
    email: '',
    qualification: '',
    dateOfBirth: '',
    mode: 'offline' as Mode,
    guardianName: '',
    guardianMobile: '',
    address: '',
    admissionDate: today,
    selectedCourseId: '',
    courses: [] as string[],
    courseFee: 0,
    totalFees: 0,
    status: 'active' as StudentStatus,
  })
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm)
  const normalizedRollNo = form.rollNo.trim().toUpperCase().replace(/^CA/, '').replace(/CA+$/, '')
  const duplicateRollStudent = list.find((student) => {
    const currentRoll = String(student.rollNo || '').toUpperCase().replace(/^CA/, '')
    return currentRoll === normalizedRollNo && student._id !== editing?._id
  })

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

  useEffect(() => {
    coursesApi.list()
      .then((r) => setCourses(r.data))
      .catch(() => setCourses([]))
  }, [])

  useEffect(() => {
    if (!location.state || !(location.state as { openStudentModal?: boolean }).openStudentModal) return
    openCreate()
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!openActionsId) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-action-menu]')) return
      setOpenActionsId(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [openActionsId])

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pagedList = list.slice(startIndex, startIndex + PAGE_SIZE)
  const activeCount = list.filter((s) => normalizeStatus(s.status) === 'active').length
  const completedCount = list.filter((s) => normalizeStatus(s.status) === 'completed').length
  const dropCount = list.filter((s) => normalizeStatus(s.status) === 'drop_out').length

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

  function openCreate() {
    setEditing(null)
    const nextForm: StudentFormState = {
      rollNo: nextAutoRollNo(list),
      name: '',
      mobile: '',
      gender: '',
      email: '',
      qualification: '',
      dateOfBirth: '',
      mode: 'offline',
      guardianName: '',
      guardianMobile: '',
      address: '',
      admissionDate: today,
      selectedCourseId: '',
      courses: [],
      courseFee: 0,
      totalFees: 0,
      status: 'active',
    }
    setForm(nextForm)
    setInitialForm(nextForm)
    setShowForm(true)
  }

  function openEdit(student: Student) {
    const selectedCourse = Array.isArray(student.courses) && student.courses.length > 0 ? (student.courses[0] as Course)._id : ''
    setEditing(student)
    const nextForm: StudentFormState = {
      rollNo: (student.rollNo || '').replace(/^CA/i, '').replace(/CA+$/i, ''),
      name: student.name || '',
      mobile: student.mobile || '',
      gender: student.gender || '',
      email: student.email || '',
      qualification: student.qualification || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      mode: (student.mode === 'online' ? 'online' : 'offline') as Mode,
      guardianName: student.guardianName || '',
      guardianMobile: student.guardianMobile || '',
      address: student.address || '',
      admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : today,
      selectedCourseId: selectedCourse,
      courses: selectedCourse ? [selectedCourse] : [],
      courseFee: student.courseFee ?? student.totalFees ?? 0,
      totalFees: student.totalFees || 0,
      status: normalizeStatus(student.status) as StudentStatus,
    }
    setForm(nextForm)
    setInitialForm(nextForm)
    setShowForm(true)
  }

  function closeForm() {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return
    setShowForm(false)
    setEditing(null)
  }

  function onCourseChange(courseId: string) {
    const selected = courses.find((course) => course._id === courseId)
    const fee = selected?.fee ?? 0
    setForm((prev) => ({
      ...prev,
      selectedCourseId: courseId,
      courses: courseId ? [courseId] : [],
      courseFee: fee,
      totalFees: fee,
    }))
  }

  async function submitStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!normalizedRollNo) {
      showToast({ message: 'Roll No is required', type: 'error' })
      return
    }
    if (duplicateRollStudent) {
      showToast({ message: 'Roll No already exists', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        rollNo: `CA${normalizedRollNo}`,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        gender: form.gender || undefined,
        email: form.email.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        mode: form.mode,
        guardianName: form.guardianName.trim() || undefined,
        guardianMobile: form.guardianMobile.trim() || undefined,
        address: form.address.trim() || undefined,
        admissionDate: form.admissionDate,
        courses: form.courses,
        courseFee: form.courseFee,
        totalFees: form.totalFees,
        status: form.status,
      }
      if (editing) {
        const { data } = await studentsApi.update(editing._id, payload as never)
        setList((prev) => sortStudentsByRollNoDesc(prev.map((student) => (student._id === data._id ? data : student))))
        showToast({ message: 'Student updated', type: 'success' })
      } else {
        const { data } = await studentsApi.create(payload as never)
        setList((prev) => sortStudentsByRollNoDesc([data, ...prev]))
        showToast({ message: 'Student created', type: 'success' })
      }
      setShowForm(false)
      setEditing(null)
      setInitialForm(form)
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save'
      showToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="surface-card p-4 md:p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Admissions Hub</p>
            <h1 className="text-2xl font-bold text-slate-800">Students</h1>
            <p className="text-sm text-slate-600 mt-1">Manage enrollment, progress status, and contact details.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            title="Add Student"
            aria-label="Add Student"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] shadow-sm"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M12.5 5.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
              <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1z" />
              <path d="M15 8a.5.5 0 0 1-.5.5H13v1.5a.5.5 0 0 1-1 0V8.5h-1.5a.5.5 0 0 1 0-1H12V6a.5.5 0 0 1 1 0v1.5h1.5A.5.5 0 0 1 15 8z" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-semibold text-slate-800">{list.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-lg font-semibold text-emerald-700">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="text-lg font-semibold text-blue-700">{completedCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Drop Out</p>
            <p className="text-lg font-semibold text-amber-700">{dropCount}</p>
          </div>
        </div>
      </div>

      <div className="surface-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting}
          title={exporting ? 'Exporting...' : 'Export Excel'}
          aria-label={exporting ? 'Exporting Excel' : 'Export Excel'}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
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
          className="w-full max-w-xl px-3 py-2 md:ml-auto"
        />
      </div>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="md:hidden p-3 space-y-3">
            {pagedList.map((s) => (
              <div key={s._id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-sm text-slate-600">{s.rollNo ? s.rollNo.replace(/CA+$/i, '') : '-'}</p>
                  </div>
                  <select
                    value={normalizeStatus(s.status)}
                    onChange={(e) => updateStatus(s, e.target.value as 'active' | 'completed' | 'drop_out')}
                    className="w-[96px] border border-slate-300 rounded px-1.5 py-1 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="drop_out">Drop Out</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-slate-500">Mobile</p>
                    <p className="font-medium text-slate-700 break-words">{s.mobile || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Mode</p>
                    <p className="font-medium text-slate-700 capitalize">{s.mode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Admission</p>
                    <p className="font-medium text-slate-700">{new Date(s.admissionDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Fee</p>
                    <p className="font-medium text-slate-700 break-words">Rs {s.totalFees}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2 break-words">
                  <span className="text-slate-500">Courses: </span>
                  {(s.courses || []).map((c: { name: string }) => c.name).join(', ') || '-'}
                </p>
                <div className="flex items-center gap-3 mt-3 text-sm">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="text-slate-700 underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    title="Delete"
                    aria-label="Delete"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                      <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2H13a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 9.615 15H6.385a2 2 0 0 1-1.994-1.84L3.538 3H3a.5.5 0 0 1 0-1h3V1.5a.5.5 0 0 1 .5-.5" />
                      <path d="M7 2h2v-.5h-2zM4.537 3l.85 10.63a1 1 0 0 0 .998.87h3.23a1 1 0 0 0 .998-.87L11.463 3z" />
                      <path d="M6.5 5.5A.5.5 0 0 1 7 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 0A.5.5 0 0 1 10 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-100/80 text-left text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Qualification</th>
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
                      <div className="inline-flex items-center gap-2" data-action-menu>
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
                            <button
                              type="button"
                              title="Update"
                              onClick={() => {
                                setOpenActionsId(null)
                                openEdit(s)
                              }}
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
                              onClick={() => {
                                setOpenActionsId(null)
                                remove(s)
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                                <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2H13a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 9.615 15H6.385a2 2 0 0 1-1.994-1.84L3.538 3H3a.5.5 0 0 1 0-1h3V1.5a.5.5 0 0 1 .5-.5" />
                                <path d="M7 2h2v-.5h-2zM4.537 3l.85 10.63a1 1 0 0 0 .998.87h3.23a1 1 0 0 0 .998-.87L11.463 3z" />
                                <path d="M6.5 5.5A.5.5 0 0 1 7 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 0A.5.5 0 0 1 10 6v5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5" />
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
              <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="surface-card my-4 max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-hidden p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Student' : 'Add Student'}</h2>
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

            <form onSubmit={submitStudent} className="grid grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Admission Date *</label>
                <input type="date" required value={form.admissionDate} onChange={(e) => setForm((prev) => ({ ...prev, admissionDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Roll No *</label>
                <div className="flex">
                  <span className="rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 py-2 text-slate-700">CA</span>
                  <input
                    required
                    value={form.rollNo}
                    onChange={(e) => setForm((prev) => ({ ...prev, rollNo: e.target.value.replace(/\s/g, '').toUpperCase().replace(/^CA/, '').replace(/CA+$/, '') }))}
                    className="w-full rounded-r-lg border border-slate-300 px-3 py-2"
                    placeholder="Auto generated roll no"
                  />
                </div>
                {duplicateRollStudent && (
                  <p className="mt-1 text-xs text-red-600">This roll number already exists.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
                <input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
                <div className="flex gap-6 rounded-lg border border-slate-300 px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="student-gender" checked={form.gender === 'male'} onChange={() => setForm((prev) => ({ ...prev, gender: 'male' }))} />
                    <span>Male</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="student-gender" checked={form.gender === 'female'} onChange={() => setForm((prev) => ({ ...prev, gender: 'female' }))} />
                    <span>Female</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mobile *</label>
                <input required value={form.mobile} onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Qualification</label>
                <input value={form.qualification} onChange={(e) => setForm((prev) => ({ ...prev, qualification: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
                <select value={form.selectedCourseId} onChange={(e) => onCourseChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Course Fee (Rs)</label>
                <input type="number" min={0} value={form.courseFee || ''} readOnly className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total Fees (Rs)</label>
                <input
                  type="number"
                  min={0}
                  value={form.totalFees || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalFees: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mode</label>
                <div className="flex gap-6 rounded-lg border border-slate-300 px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.mode === 'online'} onChange={() => setForm((prev) => ({ ...prev, mode: 'online' }))} />
                    <span>Online</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.mode === 'offline'} onChange={() => setForm((prev) => ({ ...prev, mode: 'offline' }))} />
                    <span>Offline</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Guardian Name</label>
                <input value={form.guardianName} onChange={(e) => setForm((prev) => ({ ...prev, guardianName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Guardian Mobile</label>
                <input value={form.guardianMobile} onChange={(e) => setForm((prev) => ({ ...prev, guardianMobile: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as StudentStatus }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="drop_out">Drop Out</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} />
              </div>
              <div className="sticky bottom-0 flex gap-2 bg-white pt-2 md:col-span-2">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50">
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
