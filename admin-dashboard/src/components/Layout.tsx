import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ToastHost from './ToastHost'
import instituteLogo from '../assets/coderz-logo.svg'

type NavItem = {
  to: string
  label: string
  icon: 'dashboard' | 'enquiry' | 'students' | 'billing' | 'finance' | 'marks' | 'certificate' | 'calendar' | 'staff' | 'activity' | 'courses' | 'reports'
}

function NavGlyph({ icon }: { icon: NavItem['icon'] }) {
  switch (icon) {
    case 'dashboard':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="10" width="7" height="11" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
    case 'enquiry':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .8 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 5.9 5.9l1.3-1.3a2 2 0 0 1 2.1-.4c.9.4 1.9.7 2.9.8A2 2 0 0 1 22 16.9z" /></svg>
    case 'students':
    case 'staff':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></svg>
    case 'billing':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><path d="M6 15h2" /></svg>
    case 'finance':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>
    case 'marks':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    case 'certificate':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16v4" /></svg>
    case 'calendar':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
    case 'activity':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9-5-18-3 9H2" /></svg>
    case 'courses':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l10-5 10 5-10 5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
    case 'reports':
      return <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="6" /><rect x="12" y="7" width="3" height="9" /><rect x="17" y="5" width="3" height="11" /></svg>
    default:
      return null
  }
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const role = String(user?.role || '').toLowerCase()
  const nav: NavItem[] = role === 'superadmin'
    ? [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/enquiries', label: 'Enquiry', icon: 'enquiry' },
      { to: '/students', label: 'Students', icon: 'students' },
      { to: '/invoices', label: 'Billing / Invoices', icon: 'billing' },
      { to: '/income-expense', label: 'Income & Expense', icon: 'finance' },
      { to: '/marks', label: 'Marks', icon: 'marks' },
      { to: '/certificates', label: 'Certificates', icon: 'certificate' },
      { to: '/my-day', label: 'My Day', icon: 'calendar' },
      { to: '/staff-management', label: 'Staff Management', icon: 'staff' },
      { to: '/staff-activity', label: 'Staff Activity', icon: 'activity' },
      { to: '/courses', label: 'Courses', icon: 'courses' },
      { to: '/reports', label: 'Reports', icon: 'reports' },
    ]
    : role === 'admin'
      ? [
        { to: '/enquiries', label: 'Enquiry', icon: 'enquiry' },
        { to: '/students', label: 'Students', icon: 'students' },
        { to: '/invoices', label: 'Billing / Invoices', icon: 'billing' },
        { to: '/marks', label: 'Marks', icon: 'marks' },
        { to: '/certificates', label: 'Certificates', icon: 'certificate' },
        { to: '/staff-management', label: 'Staff Management', icon: 'staff' },
        { to: '/staff-activity', label: 'Staff Activity', icon: 'activity' },
        { to: '/courses', label: 'Courses', icon: 'courses' },
      ]
      : [
        { to: '/my-day', label: 'My Day', icon: 'calendar' },
        { to: '/marks', label: 'Marks', icon: 'marks' },
      ]
  const roleLabel = role ? `${role[0].toUpperCase()}${role.slice(1)}` : 'User'
  const pathname = location.pathname
  const pageTitleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/enquiries': 'Enquiries',
    '/students': 'Students',
    '/students/new': 'Add Student',
    '/invoices': 'Billing',
    '/income-expense': 'Income & Expense',
    '/marks': 'Marks',
    '/certificates': 'Certificates',
    '/my-day': 'My Day',
    '/staff-management': 'Staff Management',
    '/staff-activity': 'Staff Activity',
    '/courses': 'Courses',
    '/courses/new': 'Add Course',
    '/reports': 'Reports',
  }
  const pageTitle = pageTitleMap[pathname] || (pathname.startsWith('/students/') ? 'Edit Student' : pathname.startsWith('/courses/') ? 'Edit Course' : 'Workspace')
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const hideGlobalHeader = pathname !== '/dashboard'

  useEffect(() => {
    setSidebarOpen(false)
  }, [role])

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.pathname])

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-transparent">
      <ToastHost />

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="md:hidden fixed top-3 left-3 z-50 bg-[var(--brand)] text-white rounded-lg w-10 h-10 flex items-center justify-center text-lg shadow-lg"
        >
          {'\u2630'}
        </button>
      )}

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="md:hidden fixed inset-0 bg-black/45 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-[15rem] min-h-screen md:h-screen shrink-0 text-white flex flex-col fixed inset-y-0 left-0 z-40 overflow-hidden transform transition-transform duration-200 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: 'linear-gradient(180deg, var(--nav-bg) 0%, var(--nav-accent) 100%)' }}
      >
        <div className="px-4 py-4 border-b border-white/10 text-center">
          <div className="bg-white rounded-lg px-2 py-1 inline-flex mx-auto">
            <img src={instituteLogo} alt="Institute Logo" className="h-9 w-auto" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60 mt-3">CRM Workspace</p>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `mx-auto flex w-full max-w-[13rem] items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  isActive
                    ? 'bg-[rgba(52,152,219,0.2)] text-white shadow-[0_10px_24px_rgba(22,36,50,0.26)]'
                    : 'text-[#d7e5ee] hover:bg-[rgba(52,152,219,0.14)] hover:text-white'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#a9dcff]" aria-hidden><NavGlyph icon={icon} /></span>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false)
              logout()
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-center text-sm text-white bg-white/10 hover:bg-white/20 rounded-lg"
          >
            <span className="w-5 h-5 inline-flex items-center justify-center" aria-hidden>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v1" /></svg>
            </span>
            Logout
          </button>
        </div>
      </aside>

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-4 pt-14 sm:px-3 md:px-4 md:pt-3 md:ml-[15rem]">
        {!hideGlobalHeader && (
          <div className="surface-card mb-3 px-3.5 py-2.5 sm:px-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Institute CRM</p>
                <h1 className="text-xl font-extrabold text-slate-800">{pageTitle}</h1>
                <p className="text-sm text-slate-600">{todayLabel}</p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">{user?.name || roleLabel}</p>
                  <p className="text-xs text-slate-600">{user?.email}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{roleLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {(role === 'superadmin' || role === 'admin') && (
                  <>
                    <Link to="/students" state={{ openStudentModal: true }} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-strong)]">
                      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <path d="M12.5 5.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
                        <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1z" />
                        <path d="M15 8a.5.5 0 0 1-.5.5H13v1.5a.5.5 0 0 1-1 0V8.5h-1.5a.5.5 0 0 1 0-1H12V6a.5.5 0 0 1 1 0v1.5h1.5A.5.5 0 0 1 15 8z" />
                      </svg>
                      New Student
                    </Link>
                    <Link to="/enquiries" className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-strong)]">
                      Enquiry Queue
                    </Link>
                  </>
                )}
                <Link to="/invoices" className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-strong)]">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M4 1.5 5 2.5 6 1.5 7 2.5 8 1.5 9 2.5 10 1.5 11 2.5 12 1.5v13l-1-1-1 1-1-1-1 1-1-1-1 1-1-1-1 1v-13Z" />
                    <path d="M5.5 5h5" strokeLinecap="round" />
                    <path d="M5.5 7.5h5" strokeLinecap="round" />
                    <path d="M5.5 10h3.5" strokeLinecap="round" />
                  </svg>
                  Billing
                </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
