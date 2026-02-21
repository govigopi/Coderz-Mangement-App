import { type Invoice, type PaymentReceipt } from '../api/client'
import coderzLogo from '../assets/coderz-logo.svg'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

interface PaymentReceiptViewProps {
  invoice: Invoice
  receipt: PaymentReceipt
  studentLabel: string
  onClose?: () => void
  onSavePdf?: () => void
  savingPdf?: boolean
  showPrint?: boolean
}

export default function PaymentReceiptView({ invoice, receipt, studentLabel, onClose, onSavePdf, savingPdf = false, showPrint = true }: PaymentReceiptViewProps) {
  const handlePrint = () => window.print()

  return (
    <div id="receipt-print-area" className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto p-8 print:shadow-none print:p-0">
      <div className="flex justify-between items-start mb-6 print:mb-4">
        <div>
          <img src={coderzLogo} alt="Coderz Academy" className="h-16 w-auto mb-2" />
          <p className="text-slate-600 text-sm leading-5">44B,SG DEVANATHAN STREET,</p>
          <p className="text-slate-600 text-sm leading-5">PANRUTI - 607106</p>
          <p className="text-slate-500 text-sm">Payment Receipt</p>
        </div>
        {showPrint && onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="no-print inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-red-600 text-white hover:bg-red-500"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Paid By</p>
          <p className="font-semibold text-slate-800">{studentLabel}</p>
        </div>
        <div className="text-right">
          <p><span className="text-slate-500">Invoice:</span> <strong>{receipt.invoiceNumber || invoice.invoiceNumber || invoice._id.slice(-8)}</strong></p>
          <p><span className="text-slate-500">Bill:</span> <strong>{receipt.billNo}</strong></p>
          <p><span className="text-slate-500">Payment Date:</span> {new Date(receipt.date).toLocaleDateString('en-IN')}</p>
          {receipt.paymentMethod && (
            <p><span className="text-slate-500">Method:</span> {receipt.paymentMethod}</p>
          )}
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 text-left text-sm text-slate-600">
            <th className="p-3 border-b border-slate-200">Description</th>
            <th className="p-3 border-b border-slate-200 text-right w-40">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 border-b border-slate-100">Payment Received</td>
            <td className="p-3 border-b border-slate-100 text-right">{fmt(receipt.amountPaid)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="text-right space-y-1 min-w-[240px]">
          <p className="flex justify-between"><span className="text-slate-500">Total Fees:</span> {fmt(invoice.amount)}</p>
          <p className="flex justify-between"><span className="text-slate-500">Already Paid:</span> {fmt(receipt.alreadyPaid)}</p>
          <p className="flex justify-between"><span className="text-slate-500">This Payment:</span> <strong>{fmt(receipt.amountPaid)}</strong></p>
          <p className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="text-slate-700 font-medium">Remaining Pending:</span>
            <strong className={receipt.remainingPending > 0 ? 'text-amber-600' : 'text-green-600'}>{fmt(receipt.remainingPending)}</strong>
          </p>
        </div>
      </div>

      <p className="text-slate-700 text-xs mt-8 print:mt-6">Thank you for your payment.</p>
      {showPrint && (
        <div className="no-print mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrint}
            title="Print Receipt"
            aria-label="Print Receipt"
            className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-slate-800 text-white hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V4h12v5" />
              <rect x="6" y="14" width="12" height="6" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            </svg>
            <span className="sr-only">Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={onSavePdf}
            disabled={!onSavePdf || savingPdf}
            title={savingPdf ? 'Saving...' : 'Save as PDF'}
            aria-label={savingPdf ? 'Saving PDF' : 'Save as PDF'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-[5px] bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-50"
          >
            {savingPdf ? (
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
            <span className="sr-only">{savingPdf ? 'Saving PDF' : 'Save as PDF'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
