import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Enquiries = lazy(() => import('./pages/Enquiries'))
const Students = lazy(() => import('./pages/Students'))
const StudentForm = lazy(() => import('./pages/StudentForm'))
const Courses = lazy(() => import('./pages/Courses'))
const CourseForm = lazy(() => import('./pages/CourseForm'))
const Invoices = lazy(() => import('./pages/Invoices'))
const IncomeExpense = lazy(() => import('./pages/IncomeExpense'))
const Marks = lazy(() => import('./pages/Marks'))
const Reports = lazy(() => import('./pages/Reports'))
const Certificates = lazy(() => import('./pages/Certificates'))
const MyDay = lazy(() => import('./pages/MyDay'))
const StaffActivityMonitor = lazy(() => import('./pages/StaffActivityMonitor'))
const StaffManagement = lazy(() => import('./pages/StaffManagement'))

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleProtected({ allowedRoles, children }: { allowedRoles: Array<'superadmin' | 'admin' | 'staff'>; children: React.ReactNode }) {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase() as 'superadmin' | 'admin' | 'staff'
  if (!allowedRoles.includes(role)) {
    return <Navigate to={role === 'staff' ? '/my-day' : role === 'admin' ? '/enquiries' : '/'} replace />
  }
  return <>{children}</>
}

function HomeRoute() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  if (role === 'staff') return <Navigate to="/my-day" replace />
  if (role === 'admin') return <Navigate to="/enquiries" replace />
  return <Navigate to="/dashboard" replace />
}

function PageLoading() {
  return <div className="min-h-screen flex items-center justify-center">Loading...</div>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<HomeRoute />} />
          <Route path="dashboard" element={<RoleProtected allowedRoles={['superadmin']}><Dashboard /></RoleProtected>} />
          <Route path="my-day" element={<RoleProtected allowedRoles={['superadmin', 'staff']}><MyDay /></RoleProtected>} />
          <Route path="marks" element={<RoleProtected allowedRoles={['superadmin', 'admin', 'staff']}><Marks /></RoleProtected>} />

          <Route path="enquiries" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><Enquiries /></RoleProtected>} />
          <Route path="students" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><Students /></RoleProtected>} />
          <Route path="students/new" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><StudentForm /></RoleProtected>} />
          <Route path="students/:id" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><StudentForm /></RoleProtected>} />
          <Route path="courses" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><Courses /></RoleProtected>} />
          <Route path="courses/new" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><CourseForm /></RoleProtected>} />
          <Route path="courses/:id" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><CourseForm /></RoleProtected>} />
          <Route path="invoices" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><Invoices /></RoleProtected>} />
          <Route path="income-expense" element={<RoleProtected allowedRoles={['superadmin']}><IncomeExpense /></RoleProtected>} />
          <Route path="staff-activity" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><StaffActivityMonitor /></RoleProtected>} />
          <Route path="staff-management" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><StaffManagement /></RoleProtected>} />
          <Route path="reports" element={<RoleProtected allowedRoles={['superadmin']}><Reports /></RoleProtected>} />
          <Route path="certificates" element={<RoleProtected allowedRoles={['superadmin', 'admin']}><Certificates /></RoleProtected>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

