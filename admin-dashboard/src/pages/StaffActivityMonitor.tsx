import { useEffect, useMemo, useState } from 'react'
import { staffActivitiesApi, type StaffActivity, type StaffActivityStatus, type StaffActivitySummaryRow, type StaffActivityType } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../utils/toast'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const typeOptions: StaffActivityType[] = ['call', 'follow_up', 'admission', 'fee_collection', 'class_support', 'other']
const statusOptions: StaffActivityStatus[] = ['pending', 'completed']

export default function StaffActivityMonitor() {
  const { user } = useAuth()
  const canViewAll = user?.role === 'admin' || user?.role === 'superadmin'
  const [list, setList] = useState<StaffActivity[]>([])
  const [summary, setSummary] = useState<StaffActivitySummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateFrom: today(),
    dateTo: today(),
    staffId: '',
    type: '' as StaffActivityType | '',
    status: '' as StaffActivityStatus | '',
    search: '',
  })

  useEffect(() => {
    if (!canViewAll) return
    setLoading(true)
    Promise.all([
      staffActivitiesApi.list({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        staffId: filters.staffId || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        search: filters.search.trim() || undefined,
      }),
      staffActivitiesApi.summary({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
    ])
      .then(([logs, stats]) => {
        setList(logs.data)
        setSummary(stats.data)
      })
      .catch(() => showToast({ message: 'Failed to load staff activity data', type: 'error' }))
      .finally(() => setLoading(false))
  }, [canViewAll, filters.dateFrom, filters.dateTo, filters.staffId, filters.type, filters.status, filters.search])

  const totals = useMemo(() => {
    const completed = list.filter((x) => x.status === 'completed').length
    return { total: list.length, completed, pending: list.length - completed }
  }, [list])

  const staffOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>()
    for (const item of list) {
      const info = typeof item.staffId === 'string' ? null : item.staffId
      if (info?._id && !map.has(info._id)) {
        map.set(info._id, {
          id: info._id,
          label: info.name ? `${info.name} (${info.email || '-'})` : info.email || info._id,
        })
      }
    }
    return Array.from(map.values())
  }, [list])

  if (!canViewAll) {
    return <p className="text-red-600">Only owner/admin can access Staff Activity Monitor.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Staff Activity Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Activities</p>
          <p className="text-xl font-semibold text-slate-800">{totals.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-xl font-semibold text-green-700">{totals.completed}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-xl font-semibold text-amber-700">{totals.pending}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2" />
          <select value={filters.staffId} onChange={(e) => setFilters((f) => ({ ...f, staffId: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2">
            <option value="">All Staff</option>
            {staffOptions.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as StaffActivityType | '' }))} className="border border-slate-300 rounded-lg px-3 py-2">
            <option value="">All Types</option>
            {typeOptions.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StaffActivityStatus | '' }))} className="border border-slate-300 rounded-lg px-3 py-2">
            <option value="">All Status</option>
            {statusOptions.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <input type="search" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search title/notes/student" className="border border-slate-300 rounded-lg px-3 py-2" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mb-6">
        <h2 className="p-4 font-semibold text-slate-800 border-b border-slate-200">Staff Summary</h2>
        <table className="w-full">
          <thead className="bg-slate-100 text-left text-sm text-slate-600">
            <tr>
              <th className="p-3">Staff</th>
              <th className="p-3">Total</th>
              <th className="p-3">Completed</th>
              <th className="p-3">Pending</th>
              <th className="p-3">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.staffId} className="border-t border-slate-200">
                <td className="p-3 font-medium">
                  <div>{row.staffName}</div>
                  <div className="text-xs text-slate-500">{row.staffEmail || '-'}</div>
                </td>
                <td className="p-3">{row.total}</td>
                <td className="p-3 text-green-700">{row.completed}</td>
                <td className="p-3 text-amber-700">{row.pending}</td>
                <td className="p-3">{row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.length === 0 && <p className="p-6 text-slate-500 text-center">No summary data</p>}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <h2 className="p-4 font-semibold text-slate-800 border-b border-slate-200">Activity Logs</h2>
          <table className="w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Staff</th>
                <th className="p-3">Type</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const staff = typeof item.staffId === 'string' ? null : item.staffId
                return (
                  <tr key={item._id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3">{String(item.activityDate).slice(0, 10)}</td>
                    <td className="p-3">
                      <div>{staff?.name || '-'}</div>
                      <div className="text-xs text-slate-500">{staff?.email || '-'}</div>
                    </td>
                    <td className="p-3">{item.type}</td>
                    <td className="p-3">
                      <div className="font-medium">{item.title}</div>
                      {item.studentName && <div className="text-xs text-slate-500">Student: {item.studentName}</div>}
                      {item.notes && <div className="text-xs text-slate-500 mt-1">{item.notes}</div>}
                    </td>
                    <td className="p-3">{item.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-6 text-slate-500 text-center">No activity logs</p>}
        </div>
      )}
    </div>
  )
}

