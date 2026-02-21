import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useBeforeUnload } from 'react-router-dom'
import { studentsApi, coursesApi, type Course } from '../api/client'
import { showToast } from '../utils/toast'

type Mode = 'online' | 'offline'
type StudentStatus = 'active' | 'completed' | 'drop_out'

function useUnsavedChangesWarning(when: boolean) {
  const onBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!when) return
    event.preventDefault()
    event.returnValue = ''
  }, [when])

  useBeforeUnload(onBeforeUnload, { capture: true })
}

export default function StudentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [courses, setCourses] = useState<Course[]>([])
  const [, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    rollNo: '',
    name: '',
    mobile: '',
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
  const [initialForm, setInitialForm] = useState(form)
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm)

  useUnsavedChangesWarning(hasUnsavedChanges && !saving)

  useEffect(() => {
    coursesApi.list().then((r) => setCourses(r.data)).catch(() => {})
    if (id) {
      studentsApi.get(id).then((r) => {
        const s = r.data
        const selectedCourse = Array.isArray(s.courses) && s.courses.length > 0 ? (s.courses[0] as Course)._id : ''
        const nextForm = {
          rollNo: (s.rollNo || '').replace(/^CA/i, '').replace(/CA+$/i, ''),
          name: s.name,
          mobile: s.mobile,
          email: s.email || '',
          qualification: s.qualification || '',
          dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
          mode: (s.mode === 'online' ? 'online' : 'offline') as Mode,
          guardianName: s.guardianName || '',
          guardianMobile: s.guardianMobile || '',
          address: s.address || '',
          admissionDate: s.admissionDate ? s.admissionDate.slice(0, 10) : today,
          selectedCourseId: selectedCourse,
          courses: selectedCourse ? [selectedCourse] : [],
          courseFee: s.courseFee ?? s.totalFees ?? 0,
          totalFees: s.totalFees || 0,
          status: s.status === 'inactive' ? 'drop_out' : ((s.status || 'active') as StudentStatus),
        }
        setForm(nextForm)
        setInitialForm(nextForm)
      }).catch(() => {}).finally(() => setLoading(false))
    } else {
      setInitialForm(form)
      setLoading(false)
    }
  }, [id, today])

  function onCourseChange(courseId: string) {
    const selected = courses.find((c) => c._id === courseId)
    const fee = selected?.fee ?? 0
    setForm((f) => ({
      ...f,
      selectedCourseId: courseId,
      courses: courseId ? [courseId] : [],
      courseFee: fee,
      totalFees: fee,
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedRollNo = form.rollNo.trim().toUpperCase().replace(/^CA/, '').replace(/CA+$/, '')
    if (!normalizedRollNo) {
      showToast({ message: 'Roll No is required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        rollNo: `CA${normalizedRollNo}`,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
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
      if (isNew) {
        await studentsApi.create(payload as never)
        showToast({ message: 'Student created', type: 'success' })
        navigate('/students')
      } else {
        await studentsApi.update(id!, payload as never)
        showToast({ message: 'Student updated', type: 'success' })
        navigate('/students')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save'
      showToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto flex items-center gap-4 mb-6">
        <Link
          to="/students"
          title="Back to Students"
          aria-label="Back to Students"
          className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] border border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="sr-only">Back to Students</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'Add Student' : 'Edit Student'}</h1>
      </div>
      <form onSubmit={submit} className="max-w-2xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Admission Date *</label>
          <input type="date" required value={form.admissionDate} onChange={(e) => setForm((f) => ({ ...f, admissionDate: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Roll No *</label>
          <div className="flex">
            <span className="border border-r-0 border-slate-300 rounded-l-lg px-3 py-2 bg-slate-100 text-slate-700">CA</span>
            <input
              required
              value={form.rollNo}
              onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value.replace(/\s/g, '').toUpperCase().replace(/^CA/, '').replace(/CA+$/, '') }))}
              className="w-full border border-slate-300 rounded-r-lg px-3 py-2"
              placeholder="Enter roll no"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mobile *</label>
          <input required value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
          <input value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.mode === 'online'}
                onChange={() => setForm((f) => ({ ...f, mode: 'online' }))}
              />
              <span>Online</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.mode === 'offline'}
                onChange={() => setForm((f) => ({ ...f, mode: 'offline' }))}
              />
              <span>Offline</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Name</label>
          <input value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Mobile</label>
          <input value={form.guardianMobile} onChange={(e) => setForm((f) => ({ ...f, guardianMobile: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" rows={2} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
          <select
            value={form.selectedCourseId}
            onChange={(e) => onCourseChange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Course Fee (Rs)</label>
          <input
            type="number"
            min={0}
            value={form.courseFee || ''}
            readOnly
            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Total Fees (Rs)</label>
          <input
            type="number"
            min={0}
            value={form.totalFees || ''}
            onChange={(e) => {
              const fee = Number(e.target.value) || 0
              setForm((f) => ({ ...f, totalFees: fee }))
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StudentStatus }))}
            className="border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="drop_out">Drop Out</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving...' : isNew ? 'Add Student' : 'Update'}
          </button>
          <Link to="/students" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
