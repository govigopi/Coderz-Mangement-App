import { useEffect, useState } from 'react'
import { invoicesApi, invoicePdfUrl, downloadWithAuth, saveFileWithAuth, studentsApi, type Invoice, type Student, type PaymentHistory, type PaymentReceipt } from '../api/client'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import BillView from '../components/BillView'
import PaymentReceiptView from '../components/PaymentReceiptView'
import { showToast } from '../utils/toast'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeRollNo(value: string) {
  const raw = value.trim().toUpperCase().replace(/\s+/g, '')
  if (!raw) return ''
  return raw.startsWith('CA') ? raw : `CA${raw}`
}

function extractApiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error).message || fallback
}

export default function Invoices() {
  const PAGE_SIZE = 10
  const [list, setList] = useState<Invoice[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filter, setFilter] = useState<'outstanding' | 'paid' | 'payment_history'>('outstanding')
  const [loading, setLoading] = useState(true)
  const [collectTarget, setCollectTarget] = useState<Invoice | null>(null)
  const [collectAmount, setCollectAmount] = useState('')
  const [collectMethod, setCollectMethod] = useState('')
  const [collectDate, setCollectDate] = useState(todayISO())
  const [collectSaving, setCollectSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [savingBillPdf, setSavingBillPdf] = useState(false)
  const [savingReceiptPdf, setSavingReceiptPdf] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [viewBill, setViewBill] = useState<Invoice | null>(null)
  const [viewReceipt, setViewReceipt] = useState<{ invoice: Invoice; receipt: PaymentReceipt; studentLabel: string } | null>(null)
  const [genForm, setGenForm] = useState({
    rollNo: '',
    studentId: '',
    studentName: '',
    totalFees: '',
    alreadyPaid: '',
    paidFees: '',
    paymentMethod: '',
    paymentDate: todayISO(),
  })
  const [genSaving, setGenSaving] = useState(false)
  const [historyRollNo, setHistoryRollNo] = useState('')
  const [history, setHistory] = useState<PaymentHistory[]>([])
  const [allPayments, setAllPayments] = useState<PaymentHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editPaymentTarget, setEditPaymentTarget] = useState<PaymentHistory | null>(null)
  const [editPaymentForm, setEditPaymentForm] = useState({ updateAmount: '', paymentMethod: '', paymentDate: todayISO() })
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [exportingExcel, setExportingExcel] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  async function refreshInvoices() {
    try {
      const r = await invoicesApi.list()
      setList(r.data)
    } catch {
      setList([])
    }
  }

  useEffect(() => {
    if (filter === 'payment_history') return
    setLoading(true)
    setCurrentPage(1)
    refreshInvoices().finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    studentsApi.list().then((r) => setStudents(r.data)).catch(() => {})
  }, [])

  async function refreshAllPayments() {
    try {
      const { data } = await invoicesApi.payments()
      setAllPayments(data)
    } catch {
      setAllPayments([])
    }
  }

  useEffect(() => {
    refreshAllPayments()
  }, [])

  const normalizedHistoryRollNo = historyRollNo.trim().toUpperCase()
  const selectedHistoryStudent = students.find((s) => (s.rollNo || '').toUpperCase() === normalizedHistoryRollNo)
  const historyStudentId = selectedHistoryStudent?._id || ''
  const normalizedGenRollNo = normalizeRollNo(genForm.rollNo)
  const selectedGenStudent = students.find((s) => (s.rollNo || '').toUpperCase() === normalizedGenRollNo)

  useEffect(() => {
    if (filter !== 'payment_history') return
    setHistoryLoading(true)
    setCurrentPage(1)
    invoicesApi.payments(historyStudentId || undefined)
      .then((r) => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [filter, historyStudentId])

  const studentLabelFromInvoice = (inv: Invoice) => {
    const student = inv.studentId && typeof inv.studentId === 'object' ? inv.studentId : null
    const roll = student?.rollNo ? `${student.rollNo} ` : ''
    return `${roll}${student?.name || 'Student'}`
  }

  const visibleInvoices = list.filter((inv) =>
    filter === 'outstanding'
      ? inv.status === 'pending' || inv.status === 'partial'
      : inv.status === 'paid'
  )

  const normalizedInvoiceSearch = invoiceSearch.trim().toLowerCase()
  const filteredInvoices = normalizedInvoiceSearch
    ? visibleInvoices.filter((inv) => {
        const student = inv.studentId && typeof inv.studentId === 'object' ? inv.studentId : null
        const invoiceNo = (inv.invoiceNumber || '').toLowerCase()
        const rollNo = (student?.rollNo || '').toLowerCase()
        const studentName = (student?.name || '').toLowerCase()
        return (
          invoiceNo.includes(normalizedInvoiceSearch) ||
          rollNo.includes(normalizedInvoiceSearch) ||
          studentName.includes(normalizedInvoiceSearch)
        )
      })
    : visibleInvoices
  const invoiceTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE))
  const invoiceSafePage = Math.min(currentPage, invoiceTotalPages)
  const invoiceStart = (invoiceSafePage - 1) * PAGE_SIZE
  const pagedInvoices = filteredInvoices.slice(invoiceStart, invoiceStart + PAGE_SIZE)
  const historyTotalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE))
  const historySafePage = Math.min(currentPage, historyTotalPages)
  const historyStart = (historySafePage - 1) * PAGE_SIZE
  const pagedHistory = history.slice(historyStart, historyStart + PAGE_SIZE)

  async function collectPayment(inv: Invoice) {
    if (!collectAmount.trim()) {
      showToast({ message: 'Enter bill amount', type: 'error' })
      return
    }
    if (!collectDate) {
      showToast({ message: 'Select payment date', type: 'error' })
      return
    }
    const amt = Number(collectAmount)
    const pendingAmount = inv.amount - inv.paidAmount
    if (!amt || amt <= 0) {
      showToast({ message: 'Enter valid bill amount', type: 'error' })
      return
    }
    if (amt > pendingAmount) {
      showToast({ message: `Amount exceeds pending fee (${fmt(pendingAmount)})`, type: 'error' })
      return
    }
    setCollectSaving(true)
    try {
      const { data } = await invoicesApi.pay(inv._id, amt, collectMethod.trim() || undefined, collectDate || undefined)
      setList((prev) => prev.map((i) => (i._id === inv._id ? data.invoice : i)))
      const studentLabel = studentLabelFromInvoice(data.invoice)
      setViewReceipt({ invoice: data.invoice, receipt: data.payment, studentLabel })
      setCollectAmount('')
      setCollectMethod('')
      setCollectDate(todayISO())
      setCollectTarget(null)
      refreshAllPayments()
      showToast({ message: 'Payment recorded', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    } finally {
      setCollectSaving(false)
    }
  }

  const pending = (inv: Invoice) => inv.amount - inv.paidAmount

  async function openPdf(inv: Invoice) {
    setPdfLoading(inv._id)
    try {
      const url = await downloadWithAuth(invoicePdfUrl(inv._id))
      window.open(url)
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    } finally {
      setPdfLoading(null)
    }
  }

  async function openBill(inv: Invoice) {
    try {
      const { data } = await invoicesApi.get(inv._id)
      setViewBill(data)
    } catch (e) {
      showToast({ message: (e as Error).message, type: 'error' })
    }
  }

  async function removeInvoice(inv: Invoice) {
    const invoiceLabel = inv.invoiceNumber || inv._id.slice(-6)
    if (!confirm(`Delete invoice ${invoiceLabel}?`)) return

    setDeletingId(inv._id)
    try {
      await invoicesApi.delete(inv._id)
      setList((prev) => prev.filter((i) => i._id !== inv._id))
      if (viewBill?._id === inv._id) setViewBill(null)
      showToast({ message: 'Invoice deleted', type: 'success' })
    } catch (e) {
      showToast({ message: extractApiError(e, 'Failed to delete invoice'), type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  function openEditPayment(h: PaymentHistory) {
    setEditPaymentTarget(h)
    setEditPaymentForm({
      updateAmount: String(h.amountPaid || ''),
      paymentMethod: h.paymentMethod || '',
      paymentDate: h.date ? String(h.date).slice(0, 10) : todayISO(),
    })
  }

  async function savePaymentEdit() {
    if (!editPaymentTarget) return
    const amount = Number(editPaymentForm.updateAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ message: 'Enter valid update amount', type: 'error' })
      return
    }

    setPaymentSaving(true)
    try {
      await invoicesApi.updatePayment(editPaymentTarget._id, {
        amount,
        paymentMethod: editPaymentForm.paymentMethod.trim() || undefined,
        paymentDate: editPaymentForm.paymentDate || undefined,
      })
      await Promise.all([
        refreshInvoices(),
        refreshAllPayments(),
        invoicesApi.payments(historyStudentId || undefined).then((r) => setHistory(r.data)).catch(() => setHistory([])),
      ])
      setEditPaymentTarget(null)
      showToast({ message: 'Payment updated', type: 'success' })
    } catch (e) {
      showToast({ message: extractApiError(e, 'Failed to update payment'), type: 'error' })
    } finally {
      setPaymentSaving(false)
    }
  }

  async function removePayment(h: PaymentHistory) {
    if (!confirm(`Delete payment ${h.billNo || h._id.slice(-6)}?`)) return
    setDeletingPaymentId(h._id)
    try {
      await invoicesApi.deletePayment(h._id)
      await Promise.all([
        refreshInvoices(),
        refreshAllPayments(),
        invoicesApi.payments(historyStudentId || undefined).then((r) => setHistory(r.data)).catch(() => setHistory([])),
      ])
      showToast({ message: 'Payment deleted and totals adjusted', type: 'success' })
    } catch (e) {
      showToast({ message: extractApiError(e, 'Failed to delete payment'), type: 'error' })
    } finally {
      setDeletingPaymentId(null)
    }
  }

  async function exportElementAsPdf(sourceId: string, fileName: string) {
    const source = document.getElementById(sourceId)
    if (!source) {
      showToast({ message: 'View not ready', type: 'error' })
      return
    }
    // Capture a print-style clone so downloaded PDF matches print layout.
    const cloneWrapper = document.createElement('div')
    cloneWrapper.style.position = 'fixed'
    cloneWrapper.style.left = '-10000px'
    cloneWrapper.style.top = '0'
    cloneWrapper.style.background = '#ffffff'
    cloneWrapper.style.padding = '0 0 24px 0'
    cloneWrapper.style.zIndex = '-1'

    const clone = source.cloneNode(true) as HTMLElement
    clone.classList.remove('shadow-lg')
    clone.style.boxShadow = 'none'
    clone.style.borderRadius = '0'
    clone.style.overflow = 'visible'
    clone.querySelectorAll('.no-print').forEach((node) => node.remove())

    cloneWrapper.appendChild(clone)
    document.body.appendChild(cloneWrapper)

    // Preserve rendered image sizes (especially SVG logo) during html2canvas capture.
    const sourceImgs = Array.from(source.querySelectorAll('img')) as HTMLImageElement[]
    const cloneImgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[]
    cloneImgs.forEach((img, index) => {
      const sourceImg = sourceImgs[index]
      if (!sourceImg) return
      const rect = sourceImg.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        img.style.width = `${rect.width}px`
        img.style.height = `${rect.height}px`
        img.style.maxWidth = 'none'
      }
    })

    await Promise.all(
      cloneImgs.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
      })
    )

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    })

    cloneWrapper.remove()

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'pt', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const usableWidth = pageWidth - margin * 2
    const usableHeight = pageHeight - margin * 2
    // Keep a small safety margin to avoid bottom text clipping due to raster rounding.
    const scale = Math.min(usableWidth / canvas.width, usableHeight / canvas.height) * 0.98
    const imgWidth = canvas.width * scale
    const imgHeight = canvas.height * scale
    const x = (pageWidth - imgWidth) / 2
    const y = Math.max(margin, (pageHeight - imgHeight) / 2)

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)

    pdf.save(`${fileName}.pdf`)
  }

  async function saveBillAsPdf(inv: Invoice) {
    const student = inv.studentId && typeof inv.studentId === 'object' ? inv.studentId : null
    const baseName = (student?.rollNo || inv.invoiceNumber || `invoice-${inv._id.slice(-6)}`).trim()
    const safeName = baseName.replace(/[^\w-]/g, '_')

    setSavingBillPdf(true)
    try {
      await exportElementAsPdf('bill-print-area', safeName)
      showToast({ message: 'Bill PDF saved', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message || 'Failed to save PDF', type: 'error' })
    } finally {
      setSavingBillPdf(false)
    }
  }

  async function saveReceiptAsPdf(invoice: Invoice, receipt: PaymentReceipt) {
    const student = invoice.studentId && typeof invoice.studentId === 'object' ? invoice.studentId : null
    const baseRoll = (student?.rollNo || '').trim()
    const baseBill = (receipt.billNo || '').trim()
    const baseName = `${baseRoll || 'receipt'}${baseBill ? `-${baseBill}` : ''}`
    const safeName = baseName.replace(/[^\w-]/g, '_')

    setSavingReceiptPdf(true)
    try {
      await exportElementAsPdf('receipt-print-area', safeName)
      showToast({ message: 'Receipt PDF saved', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message || 'Failed to save PDF', type: 'error' })
    } finally {
      setSavingReceiptPdf(false)
    }
  }

  async function generateBill(e: React.FormEvent) {
    e.preventDefault()
    const studentId = selectedGenStudent?._id || ''
    const totalFees = Number(genForm.totalFees)
    const alreadyPaid = Number(genForm.alreadyPaid || 0)
    const paidFees = Number(genForm.paidFees || 0)
    if (!studentId) {
      showToast({ message: 'Enter a valid existing roll no', type: 'error' })
      return
    }
    if (!totalFees || totalFees <= 0) {
      showToast({ message: 'Total fees is not valid for this student', type: 'error' })
      return
    }
    if (paidFees <= 0) {
      showToast({ message: 'Enter payment amount', type: 'error' })
      return
    }
    if (!genForm.paymentDate) {
      showToast({ message: 'Select payment date', type: 'error' })
      return
    }
    if (alreadyPaid + paidFees > totalFees) {
      showToast({ message: 'Payment exceeds total fees', type: 'error' })
      return
    }
    setGenSaving(true)
    try {
      const existing = await invoicesApi.list({ studentId })
      let invoice = existing.data[0]
      if (!invoice) {
        const created = await invoicesApi.create({
          studentId,
          amount: totalFees,
          description: `Course Fee: ${totalFees}`,
          dueDate: todayISO(),
        })
        invoice = created.data
      }

      const paidRes = await invoicesApi.pay(invoice._id, paidFees, genForm.paymentMethod.trim() || undefined, genForm.paymentDate || undefined)
      setList((prev) => {
        const updated = prev.map((i) => (i._id === invoice._id ? paidRes.data.invoice : i))
        return updated.some((i) => i._id === invoice._id) ? updated : [paidRes.data.invoice, ...updated]
      })
      const studentLabel = studentLabelFromInvoice(paidRes.data.invoice)
      setViewReceipt({ invoice: paidRes.data.invoice, receipt: paidRes.data.payment, studentLabel })
      setShowGenerator(false)
      setGenForm({ rollNo: '', studentId: '', studentName: '', totalFees: '', alreadyPaid: '', paidFees: '', paymentMethod: '', paymentDate: todayISO() })
      refreshAllPayments()
      showToast({ message: 'Receipt generated', type: 'success' })
    } catch (err: unknown) {
      showToast({
        message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create payment',
        type: 'error',
      })
    } finally {
      setGenSaving(false)
    }
  }

  async function exportExcel() {
    setExportingExcel(true)
    try {
      const params = new URLSearchParams()
      params.set('view', filter)
      if (invoiceSearch.trim()) params.set('search', invoiceSearch.trim())
      if (filter === 'payment_history' && historyStudentId) params.set('studentId', historyStudentId)
      const url = `/invoices/export/excel?${params.toString()}`
      await saveFileWithAuth(url, `billing-${filter}-report.xlsx`)
      showToast({ message: 'Billing Excel exported', type: 'success' })
    } catch (e) {
      showToast({ message: (e as Error).message || 'Failed to export', type: 'error' })
    } finally {
      setExportingExcel(false)
    }
  }

  const pendingFees = Math.max(0, Number(genForm.totalFees || 0) - (Number(genForm.alreadyPaid || 0) + Number(genForm.paidFees || 0)))
  const totalOutstanding = list
    .filter((x) => x.status === 'pending' || x.status === 'partial')
    .reduce((sum, x) => sum + Math.max(0, x.amount - x.paidAmount), 0)
  const overdueCount = list.filter((x) => x.status === 'pending' || x.status === 'partial').length
  const now = new Date()
  const collectedThisMonth = allPayments
    .filter((x) => {
      const d = new Date(x.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, x) => sum + x.amountPaid, 0)
  const collectedToday = allPayments
    .filter((x) => new Date(x.date).toDateString() === now.toDateString())
    .reduce((sum, x) => sum + x.amountPaid, 0)

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Billing / Invoices</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow p-4">
          <p className="text-sm text-slate-500">Total Outstanding</p>
          <p className="text-xl font-semibold text-amber-700">{fmt(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow p-4">
          <p className="text-sm text-slate-500">Outstanding Invoices</p>
          <p className="text-xl font-semibold text-slate-800">{overdueCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow p-4">
          <p className="text-sm text-slate-500">Collected This Month</p>
          <p className="text-xl font-semibold text-green-700">{fmt(collectedThisMonth)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow p-4">
          <p className="text-sm text-slate-500">Collected Today</p>
          <p className="text-xl font-semibold text-green-700">{fmt(collectedToday)}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowGenerator(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Generate Bill
          </button>
          <div className="flex gap-2 flex-wrap">
            {(['outstanding', 'paid', 'payment_history'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                {f === 'outstanding' ? 'Outstanding' : f === 'paid' ? 'Paid' : 'Payment History'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportExcel}
            disabled={exportingExcel}
            title={exportingExcel ? 'Exporting...' : 'Export Excel'}
            aria-label={exportingExcel ? 'Exporting Excel' : 'Export Excel'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50 ml-auto"
          >
            {exportingExcel ? (
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
            <span className="sr-only">{exportingExcel ? 'Exporting Excel' : 'Export Excel'}</span>
          </button>
        </div>
        {filter !== 'payment_history' && (
          <div className="max-w-md mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => {
                setInvoiceSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by invoice, roll no, student name"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        )}
      </div>
      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Generate Payment</h2>
            <form onSubmit={generateBill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Roll No *</label>
                <input
                  type="text"
                  required
                  value={genForm.rollNo}
                  onChange={(e) => {
                    const rollNo = e.target.value.toUpperCase().replace(/\s+/g, '')
                    const student = students.find((s) => (s.rollNo || '').toUpperCase() === normalizeRollNo(rollNo))
                    setGenForm((f) => ({
                      ...f,
                      rollNo,
                      studentId: student?._id || '',
                      studentName: student?.name || '',
                      totalFees: student?.totalFees ? String(student.totalFees) : '',
                      alreadyPaid: student?.paidAmount ? String(student.paidAmount) : '0',
                      paidFees: '',
                    }))
                  }}
                  placeholder="Enter roll no (e.g. CA11)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
                {genForm.rollNo.trim() && !selectedGenStudent && (
                  <p className="text-xs text-red-600 mt-1">Roll no not found in students list.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={genForm.studentName}
                  readOnly
                  tabIndex={-1}
                  onFocus={(e) => e.currentTarget.blur()}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 cursor-default caret-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Fees (INR)</label>
                <input
                  type="number"
                  value={genForm.totalFees}
                  readOnly
                  tabIndex={-1}
                  onFocus={(e) => e.currentTarget.blur()}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 cursor-default caret-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paid Now (INR) *</label>
                <input
                  type="number"
                  min={1}
                  value={genForm.paidFees}
                  onChange={(e) => setGenForm((f) => ({ ...f, paidFees: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <input
                  type="text"
                  value={genForm.paymentMethod}
                  onChange={(e) => setGenForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Cash / UPI / Bank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={genForm.paymentDate}
                  onChange={(e) => setGenForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pending Fees (INR)</label>
                <input
                  type="number"
                  readOnly
                  value={pendingFees}
                  tabIndex={-1}
                  onFocus={(e) => e.currentTarget.blur()}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 cursor-default caret-transparent"
                />
              </div>
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-2 -mx-6 px-6 border-t border-slate-200">
                <button type="submit" disabled={genSaving} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {genSaving ? 'Creating...' : 'Generate Receipt'}
                </button>
                <button type="button" onClick={() => setShowGenerator(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {collectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Collect Payment</h2>
            <p className="text-sm text-slate-500 mb-4">{studentLabelFromInvoice(collectTarget)} | {collectTarget.invoiceNumber || collectTarget._id.slice(-6)}</p>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-slate-500">Invoice Amount</p>
                <p className="font-semibold">{fmt(collectTarget.amount)}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-amber-700">Pending</p>
                <p className="font-semibold text-amber-700">{fmt(pending(collectTarget))}</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                placeholder="Amount"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value)}
                placeholder="Payment Method (Cash/UPI/Bank)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={collectDate}
                onChange={(e) => setCollectDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                disabled={collectSaving}
                onClick={() => collectPayment(collectTarget)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {collectSaving ? 'Saving...' : 'Confirm Payment'}
              </button>
              <button
                type="button"
                onClick={() => setCollectTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {viewBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto print:bg-white print:block">
          <div onClick={() => setViewBill(null)} className="absolute inset-0 no-print" aria-hidden />
          <div onClick={(e) => e.stopPropagation()} className="relative print:block">
            <BillView
              invoice={viewBill}
              onClose={() => setViewBill(null)}
              onSavePdf={() => saveBillAsPdf(viewBill)}
              savingPdf={savingBillPdf}
              showPrint
            />
          </div>
        </div>
      )}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto print:bg-white print:block">
          <div onClick={() => setViewReceipt(null)} className="absolute inset-0 no-print" aria-hidden />
          <div onClick={(e) => e.stopPropagation()} className="relative print:block">
            <PaymentReceiptView
              invoice={viewReceipt.invoice}
              receipt={viewReceipt.receipt}
              studentLabel={viewReceipt.studentLabel}
              onClose={() => setViewReceipt(null)}
              onSavePdf={() => saveReceiptAsPdf(viewReceipt.invoice, viewReceipt.receipt)}
              savingPdf={savingReceiptPdf}
              showPrint
            />
          </div>
        </div>
      )}
      {editPaymentTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Edit Payment</h2>
            <p className="text-sm text-slate-500 mb-4">
              {editPaymentTarget.billNo || editPaymentTarget._id.slice(-6)} | {editPaymentTarget.invoiceNumber || '-'}
            </p>
            <p className="text-xs text-slate-500 -mt-2 mb-3">This will update only this selected bill/payment entry.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Update Amount</label>
                <input
                  type="number"
                  min={1}
                  value={editPaymentForm.updateAmount}
                  onChange={(e) => setEditPaymentForm((f) => ({ ...f, updateAmount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <input
                  type="text"
                  value={editPaymentForm.paymentMethod}
                  onChange={(e) => setEditPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  placeholder="Cash / UPI / Bank"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={editPaymentForm.paymentDate}
                  onChange={(e) => setEditPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                disabled={paymentSaving}
                onClick={savePaymentEdit}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {paymentSaving ? 'Saving...' : 'Update'}
              </button>
              <button
                type="button"
                onClick={() => setEditPaymentTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {filter === 'payment_history' ? (
        <div>
          <div className="bg-white rounded-lg border border-slate-200 shadow p-4 mb-4 max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1">Roll No (Optional)</label>
            <input
              type="text"
              value={historyRollNo}
              onChange={(e) => {
                setHistoryRollNo(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Type roll no to filter (e.g. CA11)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          {historyLoading ? (
            <p>Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-slate-500">No payments found.</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
              <div className="md:hidden p-3 space-y-3">
                {pagedHistory.map((h) => (
                  <div key={h._id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{h.billNo || h._id.slice(-6)}</p>
                        <p className="text-sm text-slate-600">{new Date(h.date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{fmt(h.amountPaid)}</p>
                    </div>
                    <p className="text-sm text-slate-700 mt-2">
                      {`${h.student?.rollNo ? `${h.student.rollNo} ` : ''}${h.student?.name || '-'}`}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <p className="text-slate-500">Invoice</p>
                        <p className="font-medium text-slate-700 break-words">{h.invoiceNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Method</p>
                        <p className="font-medium text-slate-700 break-words">{h.paymentMethod || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500">Remaining Pending</p>
                        <p className="font-medium text-slate-700">{h.remainingPending == null ? '-' : fmt(h.remainingPending)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          const student = h.student || selectedHistoryStudent
                          if (!student) return
                          const invoice: Invoice = {
                            _id: h.invoiceId || '',
                            invoiceNumber: h.invoiceNumber || undefined,
                            studentId: {
                              _id: student._id,
                              rollNo: student.rollNo,
                              name: student.name,
                              mobile: student.mobile,
                            },
                            amount: h.invoiceAmount,
                            paidAmount: h.alreadyPaid + h.amountPaid,
                            date: h.date,
                            status: h.remainingPending && h.remainingPending > 0 ? 'partial' : 'paid',
                          }
                          const receipt: PaymentReceipt = {
                            _id: h._id,
                            date: h.date,
                            billNo: h.billNo || '',
                            amountPaid: h.amountPaid,
                            alreadyPaid: h.alreadyPaid,
                            remainingPending: h.remainingPending ?? 0,
                            invoiceId: h.invoiceId || '',
                            invoiceNumber: h.invoiceNumber || undefined,
                            paymentMethod: h.paymentMethod || undefined,
                          }
                          const studentLabel = `${student.rollNo ? `${student.rollNo} ` : ''}${student.name || 'Student'}`
                          setViewReceipt({ invoice, receipt, studentLabel })
                        }}
                        className="text-slate-700 underline"
                      >
                        Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPayment(h)}
                        className="text-blue-700 underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingPaymentId === h._id}
                        onClick={() => removePayment(h)}
                        className="text-red-700 underline disabled:opacity-50"
                      >
                        {deletingPaymentId === h._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-slate-100 text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Bill</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Remaining Pending</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistory.map((h) => (
                    <tr key={h._id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 break-words">{new Date(h.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 break-words">{`${h.student?.rollNo ? `${h.student.rollNo} ` : ''}${h.student?.name || '-'}`}</td>
                      <td className="px-4 py-3">{h.billNo || '-'}</td>
                      <td className="px-4 py-3 break-words">{fmt(h.amountPaid)}</td>
                      <td className="px-4 py-3 break-words">{h.invoiceNumber || '-'}</td>
                      <td className="px-4 py-3 break-words">{h.paymentMethod || '-'}</td>
                      <td className="px-4 py-3 break-words">{h.remainingPending == null ? '-' : fmt(h.remainingPending)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const student = h.student || selectedHistoryStudent
                              if (!student) return
                              const invoice: Invoice = {
                                _id: h.invoiceId || '',
                                invoiceNumber: h.invoiceNumber || undefined,
                                studentId: {
                                  _id: student._id,
                                  rollNo: student.rollNo,
                                  name: student.name,
                                  mobile: student.mobile,
                                },
                                amount: h.invoiceAmount,
                                paidAmount: h.alreadyPaid + h.amountPaid,
                                date: h.date,
                                status: h.remainingPending && h.remainingPending > 0 ? 'partial' : 'paid',
                              }
                              const receipt: PaymentReceipt = {
                                _id: h._id,
                                date: h.date,
                                billNo: h.billNo || '',
                                amountPaid: h.amountPaid,
                                alreadyPaid: h.alreadyPaid,
                                remainingPending: h.remainingPending ?? 0,
                                invoiceId: h.invoiceId || '',
                                invoiceNumber: h.invoiceNumber || undefined,
                                paymentMethod: h.paymentMethod || undefined,
                              }
                              const studentLabel = `${student.rollNo ? `${student.rollNo} ` : ''}${student.name || 'Student'}`
                              setViewReceipt({ invoice, receipt, studentLabel })
                            }}
                            className="text-slate-600 hover:underline"
                          >
                            Receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPayment(h)}
                            className="text-blue-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingPaymentId === h._id}
                            onClick={() => removePayment(h)}
                            className="text-red-700 hover:underline disabled:opacity-50"
                          >
                            {deletingPaymentId === h._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {history.length > 0 && (
                <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Showing {historyStart + 1}-{Math.min(historyStart + PAGE_SIZE, history.length)} of {history.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={historySafePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-slate-700">Page {historySafePage} / {historyTotalPages}</span>
                    <button
                      type="button"
                      disabled={historySafePage === historyTotalPages}
                      onClick={() => setCurrentPage((p) => Math.min(historyTotalPages, p + 1))}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
          <div className="md:hidden p-3 space-y-3">
            {pagedInvoices.map((inv) => {
              const p = pending(inv)
              return (
                <div key={inv._id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{inv.invoiceNumber || inv._id.slice(-6)}</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      inv.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : inv.status === 'partial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{studentLabelFromInvoice(inv)}</p>
                  <p className="text-sm text-slate-500">{new Date(inv.date).toLocaleDateString()}</p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                    <div><p className="text-slate-500">Amount</p><p className="font-medium">{fmt(inv.amount)}</p></div>
                    <div><p className="text-slate-500">Paid</p><p className="font-medium">{fmt(inv.paidAmount)}</p></div>
                    <div><p className="text-slate-500">Pending</p><p className="font-medium text-amber-700">{fmt(p)}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm">
                    <button type="button" onClick={() => openBill(inv)} className="text-slate-700 underline">View</button>
                    <button type="button" onClick={() => openPdf(inv)} className="text-slate-700 underline">PDF</button>
                    <button
                      type="button"
                      disabled={deletingId === inv._id}
                      onClick={() => removeInvoice(inv)}
                      className="text-red-700 underline disabled:opacity-50"
                      title="Delete invoice"
                    >
                      {deletingId === inv._id ? 'Deleting...' : 'Delete'}
                    </button>
                    {p > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCollectTarget(inv)
                          setCollectAmount(String(pending(inv)))
                          setCollectMethod('')
                          setCollectDate(todayISO())
                        }}
                        className="text-green-700 underline"
                      >
                        Collect
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedInvoices.map((inv) => {
                const p = pending(inv)
                return (
                  <tr key={inv._id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium break-words">{inv.invoiceNumber || inv._id.slice(-6)}</td>
                    <td className="px-4 py-3 break-words">{studentLabelFromInvoice(inv)}</td>
                    <td className="px-4 py-3 break-words">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 break-words">{fmt(inv.amount)}</td>
                    <td className="px-4 py-3 break-words">{fmt(inv.paidAmount)}</td>
                    <td className="px-4 py-3 break-words">{p > 0 ? <span className="text-amber-600">{fmt(p)}</span> : fmt(0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                      <button type="button" onClick={() => openBill(inv)} className="text-slate-600 hover:underline">
                        View Bill
                      </button>
                      <button type="button" onClick={() => openPdf(inv)} disabled={pdfLoading === inv._id} className="text-slate-600 hover:underline disabled:opacity-50">
                        {pdfLoading === inv._id ? '...' : 'PDF'}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === inv._id}
                        onClick={() => removeInvoice(inv)}
                        className="text-red-700 hover:underline disabled:opacity-50"
                        title="Delete invoice"
                      >
                        {deletingId === inv._id ? 'Deleting...' : 'Delete'}
                      </button>
                      {p > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCollectTarget(inv)
                              setCollectAmount(String(pending(inv)))
                              setCollectMethod('')
                              setCollectDate(todayISO())
                            }}
                            className="text-green-700 hover:underline"
                          >
                            Collect
                          </button>
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
          {filteredInvoices.length === 0 && <p className="p-6 text-slate-500 text-center">No invoices found</p>}
          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {invoiceStart + 1}-{Math.min(invoiceStart + PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={invoiceSafePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-700">Page {invoiceSafePage} / {invoiceTotalPages}</span>
                <button
                  type="button"
                  disabled={invoiceSafePage === invoiceTotalPages}
                  onClick={() => setCurrentPage((p) => Math.min(invoiceTotalPages, p + 1))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
