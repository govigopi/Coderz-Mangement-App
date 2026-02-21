import { useEffect, useState } from 'react'
import { reportsApi, type DashboardData } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import coderzLogo from '../assets/coderz-logo.svg'

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

  const cards = [
    { label: 'Total Students', value: data.totalStudents },
    { label: 'Active Students', value: data.activeStudents },
    { label: 'Monthly Income', value: fmt(data.monthlyIncome), green: true },
    { label: 'Monthly Expense', value: fmt(data.monthlyExpense), orange: true },
    { label: 'Pending Fees', value: fmt(data.totalPendingFees), amber: true },
    { label: 'Today Income', value: fmt(data.todayIncome) },
  ]

  return (
    <div>
      <div className="bg-white rounded-lg shadow border border-slate-200 p-4 mb-6">
        <img src={coderzLogo} alt="Coderz Academy" className="h-24 w-auto mx-auto" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg shadow p-4 border border-slate-200">
            <p className="text-slate-500 text-sm">{c.label}</p>
            <p className={`text-xl font-semibold ${c.green ? 'text-green-600' : c.orange ? 'text-orange-600' : c.amber ? 'text-amber-600' : 'text-slate-800'}`}>
              {typeof c.value === 'number' ? c.value : c.value}
            </p>
          </div>
        ))}
      </div>
      {monthly.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Monthly Income (last 12 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v: number) => [fmt(v), 'Income']} />
                <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
