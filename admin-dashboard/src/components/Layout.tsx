import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ToastHost from './ToastHost'
import instituteLogo from '../assets/coderz-logo.svg'

type NavItem = {
  to: string
  label: string
  icon: string
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const role = String(user?.role || '').toLowerCase()
  const nav: NavItem[] = role === 'superadmin'
    ? [
      { to: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
      { to: '/enquiries', label: 'Enquiry', icon: '\u{1F4DE}' },
      { to: '/students', label: 'Students', icon: '\u{1F465}' },
      { to: '/invoices', label: 'Billing / Invoices', icon: '\u{1F4B0}' },
      { to: '/income-expense', label: 'Income & Expense', icon: '\u{1F4C8}' },
      { to: '/marks', label: 'Marks', icon: '\u{1F4DD}' },
      { to: '/certificates', label: 'Certificates', icon: '\u{1F3C5}' },
      { to: '/my-day', label: 'My Day', icon: '\u{1F4C5}' },
      { to: '/staff-management', label: 'Staff Management', icon: '\u{1F465}' },
      { to: '/staff-activity', label: 'Staff Activity', icon: '\u{1F4DD}' },
      { to: '/courses', label: 'Courses', icon: '\u{1F4DA}' },
      { to: '/reports', label: 'Reports', icon: '\u{1F4CB}' },
    ]
    : role === 'admin'
      ? [
        { to: '/enquiries', label: 'Enquiry', icon: '\u{1F4DE}' },
        { to: '/students', label: 'Students', icon: '\u{1F465}' },
        { to: '/invoices', label: 'Billing / Invoices', icon: '\u{1F4B0}' },
        { to: '/marks', label: 'Marks', icon: '\u{1F4DD}' },
        { to: '/certificates', label: 'Certificates', icon: '\u{1F3C5}' },
        { to: '/staff-management', label: 'Staff Management', icon: '\u{1F465}' },
        { to: '/staff-activity', label: 'Staff Activity', icon: '\u{1F4DD}' },
        { to: '/courses', label: 'Courses', icon: '\u{1F4DA}' },
      ]
      : [
        { to: '/my-day', label: 'My Day', icon: '\u{1F4C5}' },
        { to: '/marks', label: 'Marks', icon: '\u{1F4DD}' },
      ]

  useEffect(() => {
    setSidebarOpen(false)
  }, [role])

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.pathname])

  return (
    <div className="min-h-screen md:h-screen flex bg-slate-100 overflow-hidden">
      <ToastHost />

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="md:hidden fixed top-3 left-3 z-50 bg-slate-800 text-white rounded-lg w-10 h-10 flex items-center justify-center text-lg shadow"
        >
          {'\u2630'}
        </button>
      )}

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-56 min-h-screen md:h-screen shrink-0 bg-slate-800 text-white flex flex-col fixed inset-y-0 left-0 z-40 overflow-hidden transform transition-transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-slate-700">
          <div className="inline-flex bg-white rounded-md px-2 py-1">
            <img src={instituteLogo} alt="Institute Logo" className="h-12 w-auto" />
          </div>
          <p className="text-slate-400 text-sm truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto no-scrollbar">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="w-5 text-center" aria-hidden>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-700">
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false)
              logout()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            <span className="w-5 text-center" aria-hidden>{'\u21A9'}</span>
            Logout
          </button>
        </div>
      </aside>

      <main ref={mainRef} className="flex-1 min-h-screen md:h-screen overflow-y-auto px-3 pb-4 pt-16 sm:px-4 md:p-6 md:pt-6 md:ml-56">
        <Outlet />
      </main>
    </div>
  )
}

