import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Enquiries from './pages/Enquiries'
import Students from './pages/Students'
import StudentForm from './pages/StudentForm'
import Courses from './pages/Courses'
import CourseForm from './pages/CourseForm'
import Invoices from './pages/Invoices'
import IncomeExpense from './pages/IncomeExpense'
import Marks from './pages/Marks'
import Reports from './pages/Reports'
import Certificates from './pages/Certificates'
import MyDay from './pages/MyDay'
import StaffActivityMonitor from './pages/StaffActivityMonitor'
import StaffManagement from './pages/StaffManagement'

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

export default function App() {
  return (
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
  )
}

