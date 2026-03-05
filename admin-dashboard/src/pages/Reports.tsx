import { useEffect, useMemo, useState } from 'react'
import {
  reportsApi,
  incomeExpenseExcelUrl,
  downloadWithAuth,
  coursesApi,
  type IncomeExpenseSummary,
  type BusinessSummary,
  type Course,
} from '../api/client'
import { showToast } from '../utils/toast'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Reports() {
  const now = new Date()
  const [courses, setCourses] = useState<Course[]>([])
  const [businessData, setBusinessData] = useState<BusinessSummary | null>(null)
  const [businessLoading, setBusinessLoading] = useState(true)
  const [err, setErr] = useState('')
  const [excelLoading, setExcelLoading] = useState(false)
  const [businessExcelLoading, setBusinessExcelLoading] = useState(false)
  const [monthWiseExcelLoading, setMonthWiseExcelLoading] = useState(false)

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState('')
  const [courseId, setCourseId] = useState('')
  const [mode, setMode] = useState('')

  const [incomeExpense, setIncomeExpense] = useState<IncomeExpenseSummary | null>(null)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    coursesApi.list().then((r) => setCourses(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setBusinessLoading(true)
    reportsApi
      .businessSummary({
        year,
        month: month ? Number(month) : undefined,
        courseId: courseId || undefined,
        mode: mode || undefined,
      })
      .then((r) => setBusinessData(r.data))
      .catch(() => setErr('Failed to load business report'))
      .finally(() => setBusinessLoading(false))
  }, [year, month, courseId, mode])

  useEffect(() => {
    if (!fromDate || !toDate) return
    setRangeLoading(true)
    reportsApi
      .incomeExpense({ startDate: fromDate, endDate: toDate })
      .then((r) => setIncomeExpense(r.data))
      .catch(() => setIncomeExpense(null))
      .finally(() => setRangeLoading(false))
  }, [fromDate, toDate])

  const excelUrl = useMemo(
    () => incomeExpenseExcelUrl({ startDate: fromDate, endDate: toDate }),
    [fromDate, toDate]
  )

  function escCsv(v: string | number) {
    const s = String(v ?? '')
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  function downloadCsv(fileName: string, headers: string[], rows: Array<Array<string | number>>) {
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escCsv(cell)).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  if (err) return <p className="text-red-600">{err}</p>
  if (businessLoading && !businessData) return <p>Loading...</p>
  if (!businessData) return null

  const years = Array.from({ length: 8 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Reports</h1>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">Business Filters</h2>
          <button
            type="button"
            onClick={() => {
              setBusinessExcelLoading(true)
              try {
                downloadCsv(
                  `business-summary-${year}${month ? `-m${month}` : ''}.csv`,
                  ['Metric', 'Value'],
                  [
                    ['Business Value', businessData.summary.businessValue],
                    ['Collection', businessData.summary.collection],
                    ['Expense', businessData.summary.expense],
                    ['Profit', businessData.summary.profit],
                    ['Admissions', businessData.summary.admissions],
                    ['Active Students', businessData.summary.activeStudents],
                    ['Pending Fees', businessData.summary.pendingFees],
                    ['YoY Collection %', businessData.growth.yoyCollectionPct],
                    ['MoM Collection %', businessData.growth.momCollectionPct ?? ''],
                    ['YoY Admissions %', businessData.growth.yoyAdmissionsPct],
                    ['MoM Admissions %', businessData.growth.momAdmissionsPct ?? ''],
                  ]
                )
              } finally {
                setBusinessExcelLoading(false)
              }
            }}
            disabled={businessExcelLoading}
            title={businessExcelLoading ? 'Exporting...' : 'Export Business Summary (CSV)'}
            aria-label={businessExcelLoading ? 'Exporting Business Summary' : 'Export Business Summary (CSV)'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {businessExcelLoading ? (
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
            <span className="sr-only">{businessExcelLoading ? 'Exporting Business Summary' : 'Export Business Summary (CSV)'}</span>
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="">Full Year</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="">All Courses</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="">All Modes</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        <MetricCard label="Business Value" value={fmt(businessData.summary.businessValue)} tone="green" />
        <MetricCard label="Collection" value={fmt(businessData.summary.collection)} tone="green" />
        <MetricCard label="Expense" value={fmt(businessData.summary.expense)} tone="red" />
        <MetricCard label="Profit" value={fmt(businessData.summary.profit)} />
        <MetricCard label="Admissions" value={String(businessData.summary.admissions)} />
        <MetricCard label="Active Students" value={String(businessData.summary.activeStudents)} />
        <MetricCard label="Pending Fees" value={fmt(businessData.summary.pendingFees)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <MetricCard
          label="Collection Growth"
          value={`${businessData.growth.yoyCollectionPct}% YoY${businessData.growth.momCollectionPct === null ? '' : `, ${businessData.growth.momCollectionPct}% MoM`}`}
          tone="green"
        />
        <MetricCard
          label="Admissions Growth"
          value={`${businessData.growth.yoyAdmissionsPct}% YoY${businessData.growth.momAdmissionsPct === null ? '' : `, ${businessData.growth.momAdmissionsPct}% MoM`}`}
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">Month-wise Report ({year})</h2>
          <button
            type="button"
            onClick={() => {
              setMonthWiseExcelLoading(true)
              try {
                downloadCsv(
                  `month-wise-report-${year}.csv`,
                  ['Month', 'Business Value', 'Collection', 'Expense', 'Profit', 'Admissions', 'Avg/Admission'],
                  businessData.monthWise.map((m) => [
                    MONTHS[m.month - 1],
                    m.businessValue,
                    m.income,
                    m.expense,
                    m.profit,
                    m.admissions,
                    m.avgFeePerAdmission,
                  ])
                )
              } finally {
                setMonthWiseExcelLoading(false)
              }
            }}
            disabled={monthWiseExcelLoading}
            title={monthWiseExcelLoading ? 'Exporting...' : 'Export Month-wise Report (CSV)'}
            aria-label={monthWiseExcelLoading ? 'Exporting Month-wise Report' : 'Export Month-wise Report (CSV)'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {monthWiseExcelLoading ? (
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
            <span className="sr-only">{monthWiseExcelLoading ? 'Exporting Month-wise Report' : 'Export Month-wise Report (CSV)'}</span>
          </button>
        </div>
        <div className="md:hidden p-3 space-y-3">
          {businessData.monthWise.map((m) => (
            <div key={m.month} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-semibold text-slate-800">{MONTHS[m.month - 1]}</p>
                <p className="text-sm text-slate-600">Admissions: {m.admissions}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-slate-500">Business Value</p><p className="font-medium text-emerald-700">{fmt(m.businessValue)}</p></div>
                <div><p className="text-slate-500">Collection</p><p className="font-medium text-green-700">{fmt(m.income)}</p></div>
                <div><p className="text-slate-500">Expense</p><p className="font-medium text-red-700">{fmt(m.expense)}</p></div>
                <div><p className="text-slate-500">Profit</p><p className="font-medium text-slate-800">{fmt(m.profit)}</p></div>
                <div className="col-span-2"><p className="text-slate-500">Avg/Admission</p><p className="font-medium text-slate-800">{fmt(m.avgFeePerAdmission)}</p></div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-slate-100 text-left text-sm text-slate-600">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Business Value</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Expense</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Admissions</th>
              <th className="px-4 py-3">Avg/Admission</th>
            </tr>
          </thead>
          <tbody>
            {businessData.monthWise.map((m) => (
              <tr key={m.month} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{MONTHS[m.month - 1]}</td>
                <td className="px-4 py-3 text-emerald-700 whitespace-nowrap">{fmt(m.businessValue)}</td>
                <td className="px-4 py-3 text-green-700 whitespace-nowrap">{fmt(m.income)}</td>
                <td className="px-4 py-3 text-red-700 whitespace-nowrap">{fmt(m.expense)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmt(m.profit)}</td>
                <td className="px-4 py-3">{m.admissions}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmt(m.avgFeePerAdmission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <h2 className="p-4 font-semibold text-slate-800 border-b border-slate-200">Course-wise Breakdown</h2>
          <div className="md:hidden p-3 space-y-3">
            {businessData.courseBreakdown.length === 0 ? (
              <p className="text-slate-500">No data</p>
            ) : businessData.courseBreakdown.map((c) => (
              <div key={c.courseName} className="border border-slate-200 rounded-lg p-3">
                <p className="font-semibold text-slate-800">{c.courseName}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div><p className="text-slate-500">Admissions</p><p className="font-medium text-slate-800">{c.admissions}</p></div>
                  <div><p className="text-slate-500">Collected</p><p className="font-medium text-green-700">{fmt(c.collected)}</p></div>
                  <div><p className="text-slate-500">Pending</p><p className="font-medium text-amber-700">{fmt(c.pending)}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Admissions</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Pending</th>
              </tr>
            </thead>
            <tbody>
              {businessData.courseBreakdown.length === 0 ? (
                <tr><td className="p-4 text-slate-500" colSpan={4}>No data</td></tr>
              ) : businessData.courseBreakdown.map((c) => (
                <tr key={c.courseName} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">{c.courseName}</td>
                  <td className="px-4 py-3">{c.admissions}</td>
                  <td className="px-4 py-3 text-green-700 whitespace-nowrap">{fmt(c.collected)}</td>
                  <td className="px-4 py-3 text-amber-700 whitespace-nowrap">{fmt(c.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <h2 className="p-4 font-semibold text-slate-800 border-b border-slate-200">Year-wise Summary</h2>
          <div className="md:hidden p-3 space-y-3">
            {businessData.yearlySummary.map((y) => (
              <div key={y.year} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{y.year}</p>
                  <p className="text-sm text-slate-600">Admissions: {y.admissions}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div><p className="text-slate-500">Business Value</p><p className="font-medium text-emerald-700">{fmt(y.businessValue)}</p></div>
                  <div><p className="text-slate-500">Collection</p><p className="font-medium text-green-700">{fmt(y.collection)}</p></div>
                  <div className="col-span-2"><p className="text-slate-500">Expense</p><p className="font-medium text-red-700">{fmt(y.expense)}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Business Value</th>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Expense</th>
                <th className="px-4 py-3">Admissions</th>
              </tr>
            </thead>
            <tbody>
              {businessData.yearlySummary.map((y) => (
                <tr key={y.year} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">{y.year}</td>
                  <td className="px-4 py-3 text-emerald-700 whitespace-nowrap">{fmt(y.businessValue)}</td>
                  <td className="px-4 py-3 text-green-700 whitespace-nowrap">{fmt(y.collection)}</td>
                  <td className="px-4 py-3 text-red-700 whitespace-nowrap">{fmt(y.expense)}</td>
                  <td className="px-4 py-3">{y.admissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopList title="Top Paid Students" rows={businessData.topPaid} />
        <TopList title="Top Pending Students" rows={businessData.topPending} />
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Custom Duration Income & Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div className="text-sm text-slate-500 md:col-span-2">
            {rangeLoading ? 'Loading duration summary...' : `Showing from ${fromDate} to ${toDate}`}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <MetricCard label="Income (Duration)" value={fmt(incomeExpense?.income ?? 0)} tone="green" />
          <MetricCard label="Expense (Duration)" value={fmt(incomeExpense?.expense ?? 0)} tone="red" />
          <MetricCard label="Profit (Duration)" value={fmt(incomeExpense?.profit ?? 0)} />
        </div>

        <button
          type="button"
          onClick={async () => {
            setExcelLoading(true)
            try {
              const url = await downloadWithAuth(excelUrl)
              const a = document.createElement('a')
              a.href = url
              a.download = 'income-expense-report.xlsx'
              a.click()
              URL.revokeObjectURL(url)
            } catch (e) {
              showToast({ message: (e as Error).message, type: 'error' })
            } finally {
              setExcelLoading(false)
            }
          }}
          disabled={excelLoading}
          title={excelLoading ? 'Exporting...' : 'Download Income & Expense (Excel)'}
          aria-label={excelLoading ? 'Exporting Excel' : 'Download Income & Expense (Excel)'}
          className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {excelLoading ? (
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
          <span className="sr-only">{excelLoading ? 'Exporting Excel' : 'Download Income & Expense (Excel)'}</span>
        </button>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' | 'amber' }) {
  const color = tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-800'
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
      <p className="text-slate-500 text-sm whitespace-nowrap">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function TopList({ title, rows }: { title: string; rows: Array<{ rollNo: string; name: string; amount: number }> }) {
  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
      <h2 className="p-4 font-semibold text-slate-800 border-b border-slate-200">{title}</h2>
      <div className="md:hidden p-3 space-y-3">
        {rows.length === 0 ? (
          <p className="text-slate-500">No data</p>
        ) : rows.map((r) => (
          <div key={`${r.rollNo}-${r.name}`} className="border border-slate-200 rounded-lg p-3">
            <p className="font-semibold text-slate-800">{r.name}</p>
            <p className="text-sm text-slate-600">{r.rollNo}</p>
            <p className="text-sm font-medium text-slate-800 mt-1">{fmt(r.amount)}</p>
          </div>
        ))}
      </div>
      <table className="hidden md:table w-full">
        <thead className="bg-slate-100 text-left text-sm text-slate-600">
          <tr>
            <th className="p-3">Roll No</th>
            <th className="p-3">Name</th>
            <th className="p-3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="p-4 text-slate-500" colSpan={3}>No data</td></tr>
          ) : rows.map((r) => (
            <tr key={`${r.rollNo}-${r.name}`} className="border-t border-slate-200">
              <td className="p-3 font-medium">{r.rollNo}</td>
              <td className="p-3">{r.name}</td>
              <td className="p-3">{fmt(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
