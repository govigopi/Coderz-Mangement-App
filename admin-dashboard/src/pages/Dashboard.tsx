import { useEffect, useState } from 'react'
import { reportsApi, type DashboardData } from '../api/client'
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [monthly, setMonthly] = useState<{ month: string; total: number }[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    reportsApi.dashboard().then((r) => setData(r.data)).catch(() => setErr('Failed to load'))
    reportsApi.monthlyIncome().then((r) => {
      const raw = (r.data || []) as { _id: { year: number; month: number }; total: number }[]
      setMonthly(raw.map((x) => ({ month: `${x._id.month}/${x._id.year}`, total: x.total })))
    }).catch(() => {})
  }, [])

  if (err) return <p className="text-red-600">{err}</p>
  if (!data) return <p>Loading...</p>

  const overviewCards = [
    { label: 'Total Students', value: data.totalStudents, tone: 'bg-[var(--brand-soft)] text-[var(--brand-strong)]' },
    { label: 'Active Students', value: data.activeStudents, tone: 'bg-[#edf7fe] text-[#2f6f9f]' },
    { label: 'Monthly Income', value: fmt(data.monthlyIncome), tone: 'bg-[#e7f4fb] text-[#2f7db9]' },
    { label: 'Monthly Expense', value: fmt(data.monthlyExpense), tone: 'bg-[#eef3f6] text-[var(--brand-strong)]' },
    { label: 'Pending Fees', value: fmt(data.totalPendingFees), tone: 'bg-[#f0f5f7] text-[#5d7487]' },
    { label: 'Today Income', value: fmt(data.todayIncome), tone: 'bg-[#dff0fb] text-[#2c3e50]' },
  ]

  const financeSnapshot = [
    { name: 'Monthly Income', value: data.monthlyIncome },
    { name: 'Monthly Expense', value: data.monthlyExpense },
    { name: 'Pending Fees', value: data.totalPendingFees },
    { name: 'Today Income', value: data.todayIncome },
    { name: 'Today Expense', value: data.todayExpense },
  ]

  const studentSnapshot = [
    { name: 'Total Students', value: data.totalStudents },
    { name: 'Active Students', value: data.activeStudents },
  ]

  const monthlyTrend = monthly.map((x) => ({
    month: x.month,
    income: x.total,
  }))

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {overviewCards.map((c) => (
          <div key={c.label} className={`rounded-xl border border-white/70 p-4 shadow-sm ${c.tone}`}>
            <p className="text-sm">{c.label}</p>
            <p className="text-2xl font-semibold mt-1">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {monthlyTrend.length > 0 && (
          <div className="surface-card p-4">
            <h2 className="text-base font-semibold text-slate-800 mb-3">Fee Collection Express</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e5" />
                  <XAxis dataKey="month" tick={{ fill: '#5f7488', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `Rs ${v}`} tick={{ fill: '#5f7488', fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Income']} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#3498db" strokeWidth={3} dot={{ r: 2, fill: '#2c3e50' }} activeDot={{ r: 5, fill: '#2c3e50' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="surface-card p-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Revenue Snapshot</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeSnapshot}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e5" />
                <XAxis dataKey="name" tick={{ fill: '#5f7488', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `Rs ${v}`} tick={{ fill: '#5f7488', fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [fmt(v), 'Amount']} />
                <Legend />
                <Bar dataKey="value" name="Amount" fill="#7ec8f4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-4 xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Student Overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studentSnapshot}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e5" />
                <XAxis dataKey="name" tick={{ fill: '#5f7488', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#5f7488', fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v, 'Students']} />
                <Legend />
                <Line type="monotone" dataKey="value" name="Students" stroke="#2c3e50" strokeWidth={3} dot={{ r: 3, fill: '#3498db' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
