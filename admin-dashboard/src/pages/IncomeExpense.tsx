import { useEffect, useState } from 'react'
import { expensesApi, incomeApi, type Expense, type Income } from '../api/client'
import { showToast } from '../utils/toast'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function IncomeExpense() {
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [income, setIncome] = useState<Income[]>([])
  const [expense, setExpense] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [savingExpense, setSavingExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: '',
    amount: '',
    description: '',
  })

  useEffect(() => {
    setLoading(true)
    const params: { startDate?: string; endDate?: string } = {}
    if (start) params.startDate = start
    if (end) params.endDate = end
    Promise.all([incomeApi.list(params), expensesApi.list(params)])
      .then(([ir, er]) => {
        setIncome(ir.data)
        setExpense(er.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [start, end])

  function openNewExpense() {
    setEditingExpense(null)
    setExpenseForm({
      date: new Date().toISOString().slice(0, 10),
      category: '',
      amount: '',
      description: '',
    })
    setShowExpenseForm(true)
  }

  function openEditExpense(e: Expense) {
    setEditingExpense(e)
    setExpenseForm({
      date: e.date ? e.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      category: e.category || '',
      amount: String(e.amount ?? ''),
      description: e.description || '',
    })
    setShowExpenseForm(true)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expenseForm.date || !expenseForm.category.trim() || !expenseForm.amount) {
      showToast({ message: 'Date, category, and amount are required', type: 'error' })
      return
    }
    setSavingExpense(true)
    try {
      const payload = {
        date: expenseForm.date,
        category: expenseForm.category.trim(),
        amount: Number(expenseForm.amount),
        description: expenseForm.description.trim() || undefined,
      }
      if (editingExpense) {
        const { data } = await expensesApi.update(editingExpense._id, payload)
        setExpense((prev) => prev.map((x) => (x._id === data._id ? data : x)))
        showToast({ message: 'Expense updated', type: 'success' })
      } else {
        const { data } = await expensesApi.create(payload)
        setExpense((prev) => [data, ...prev])
        showToast({ message: 'Expense added', type: 'success' })
      }
      setShowExpenseForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save expense'
      showToast({ message: msg, type: 'error' })
    } finally {
      setSavingExpense(false)
    }
  }

  async function removeExpense(e: Expense) {
    if (!confirm(`Delete expense "${e.category || 'Expense'}"?`)) return
    try {
      await expensesApi.delete(e._id)
      setExpense((prev) => prev.filter((x) => x._id !== e._id))
      showToast({ message: 'Expense deleted', type: 'success' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete expense'
      showToast({ message: msg, type: 'error' })
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Income & Expense</h1>
      <div className="flex gap-4 mb-4 flex-wrap">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2" />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2" />
        <button type="button" onClick={() => { setStart(''); setEnd('') }} className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">Clear</button>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('income')} className={`px-4 py-2 rounded-lg ${tab === 'income' ? 'bg-green-700 text-white' : 'bg-slate-200'}`}>Income</button>
        <button onClick={() => setTab('expense')} className={`px-4 py-2 rounded-lg ${tab === 'expense' ? 'bg-orange-600 text-white' : 'bg-slate-200'}`}>Expense</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : tab === 'income' ? (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Source / Description</th>
              </tr>
            </thead>
            <tbody>
              {income.map((i) => (
                <tr key={i._id} className="border-t border-slate-200">
                  <td className="p-3">{new Date(i.date).toLocaleDateString()}</td>
                  <td className="p-3 text-green-600 font-medium">{fmt(i.amount)}</td>
                  <td className="p-3">{i.description || i.source || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {income.length === 0 && <p className="p-6 text-slate-500 text-center">No income</p>}
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-3">
            <button type="button" onClick={openNewExpense} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">+ Add Expense</button>
          </div>
          <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 text-left text-sm text-slate-600">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expense.map((e) => (
                  <tr key={e._id} className="border-t border-slate-200">
                    <td className="p-3">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-3 text-orange-600 font-medium">{fmt(e.amount)}</td>
                    <td className="p-3">{e.category || '-'}</td>
                    <td className="p-3">{e.description || '-'}</td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          title="Update"
                          onClick={() => openEditExpense(e)}
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
                          onClick={() => removeExpense(e)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                            <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expense.length === 0 && <p className="p-6 text-slate-500 text-center">No expenses</p>}
          </div>
        </div>
      )}

      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <form onSubmit={saveExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <input required value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input type="number" required min={1} value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <input value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={savingExpense} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {savingExpense ? 'Saving...' : editingExpense ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
